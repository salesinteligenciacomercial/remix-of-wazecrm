import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dbUrl = Deno.env.get("SUPABASE_DB_URL")!;
    const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.4/mod.js");
    const sql = postgres(dbUrl);

    // Get all tables
    const tables = await sql`
      SELECT 
        t.table_name,
        json_agg(
          json_build_object(
            'column_name', c.column_name,
            'data_type', c.data_type,
            'udt_name', c.udt_name,
            'is_nullable', c.is_nullable,
            'column_default', c.column_default,
            'character_maximum_length', c.character_maximum_length
          ) ORDER BY c.ordinal_position
        ) as columns
      FROM information_schema.tables t
      JOIN information_schema.columns c ON c.table_name = t.table_name AND c.table_schema = t.table_schema
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      GROUP BY t.table_name
      ORDER BY t.table_name
    `;

    // Get enums
    const enums = await sql`
      SELECT t.typname as enum_name, 
             string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
    `;

    // Get foreign keys
    const fks = await sql`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    `;

    // Get primary keys
    const pks = await sql`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
    `;

    // Get unique constraints
    const uqs = await sql`
      SELECT tc.table_name, 
             string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns,
             tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
      GROUP BY tc.table_name, tc.constraint_name
    `;

    // Build FK lookup
    const fkMap: Record<string, Array<{ column: string; refTable: string; refColumn: string }>> = {};
    for (const fk of fks) {
      if (!fkMap[fk.table_name]) fkMap[fk.table_name] = [];
      fkMap[fk.table_name].push({ column: fk.column_name, refTable: fk.foreign_table_name, refColumn: fk.foreign_column_name });
    }

    // Build PK lookup
    const pkMap: Record<string, string[]> = {};
    for (const pk of pks) {
      if (!pkMap[pk.table_name]) pkMap[pk.table_name] = [];
      pkMap[pk.table_name].push(pk.column_name);
    }

    // Build UQ lookup
    const uqMap: Record<string, string[]> = {};
    for (const uq of uqs) {
      if (!uqMap[uq.table_name]) uqMap[uq.table_name] = [];
      uqMap[uq.table_name].push(uq.columns);
    }

    // === TOPOLOGICAL SORT: order tables by FK dependencies ===
    const tableNames = tables.map((t: any) => t.table_name as string);
    const tableMap = new Map(tables.map((t: any) => [t.table_name, t]));
    
    // Build dependency graph (table -> set of tables it depends on)
    const deps: Record<string, Set<string>> = {};
    for (const name of tableNames) {
      deps[name] = new Set();
      const tableFks = fkMap[name] || [];
      for (const fk of tableFks) {
        // Self-references don't count as dependencies
        if (fk.refTable !== name && tableNames.includes(fk.refTable)) {
          deps[name].add(fk.refTable);
        }
      }
    }

    // Kahn's algorithm for topological sort
    const sorted: string[] = [];
    const remaining = new Set(tableNames);
    
    while (remaining.size > 0) {
      // Find tables with no unresolved dependencies
      const ready: string[] = [];
      for (const name of remaining) {
        const unresolved = [...(deps[name] || [])].filter(d => remaining.has(d));
        if (unresolved.length === 0) {
          ready.push(name);
        }
      }
      
      if (ready.length === 0) {
        // Circular dependency detected — just add remaining tables
        // and use ALTER TABLE for FKs later
        for (const name of remaining) {
          sorted.push(name);
        }
        break;
      }
      
      for (const name of ready) {
        sorted.push(name);
        remaining.delete(name);
      }
    }

    // Detect which FKs need to be deferred (circular deps)
    const sortedSet = new Set<string>();
    const deferredFks: Array<{ table: string; column: string; refTable: string; refColumn: string }> = [];

    // Build SQL output
    let sqlOutput = "-- ============================================\n";
    sqlOutput += "-- Schema SQL gerado automaticamente\n";
    sqlOutput += `-- Data: ${new Date().toISOString()}\n`;
    sqlOutput += "-- IMPORTANTE: Execute este SQL na ordem apresentada\n";
    sqlOutput += "-- As tabelas estão ordenadas por dependência (FK)\n";
    sqlOutput += "-- ============================================\n\n";

    // Enums first
    if (enums.length > 0) {
      sqlOutput += "-- ======== TIPOS ENUM ========\n\n";
      for (const e of enums) {
        const values = e.enum_values.split(", ").map((v: string) => `'${v}'`).join(", ");
        sqlOutput += `DO $$ BEGIN\n  CREATE TYPE public.${e.enum_name} AS ENUM (${values});\nEXCEPTION WHEN duplicate_object THEN NULL;\nEND $$;\n\n`;
      }
    }

    sqlOutput += "-- ======== TABELAS ========\n\n";

    for (const tableName of sorted) {
      sortedSet.add(tableName);
      const table = tableMap.get(tableName);
      if (!table) continue;

      const cols = table.columns as Array<{
        column_name: string; data_type: string; udt_name: string;
        is_nullable: string; column_default: string | null; character_maximum_length: number | null;
      }>;

      sqlOutput += `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`;
      const colDefs: string[] = [];

      for (const col of cols) {
        let typeName = col.data_type;
        if (col.data_type === "uuid") typeName = "UUID";
        else if (col.data_type === "text") typeName = "TEXT";
        else if (col.data_type === "boolean") typeName = "BOOLEAN";
        else if (col.data_type === "integer") typeName = "INTEGER";
        else if (col.data_type === "bigint") typeName = "BIGINT";
        else if (col.data_type === "numeric") typeName = "NUMERIC";
        else if (col.data_type === "real") typeName = "REAL";
        else if (col.data_type === "double precision") typeName = "DOUBLE PRECISION";
        else if (col.data_type === "smallint") typeName = "SMALLINT";
        else if (col.data_type === "jsonb") typeName = "JSONB";
        else if (col.data_type === "json") typeName = "JSON";
        else if (col.data_type === "bytea") typeName = "BYTEA";
        else if (col.data_type === "ARRAY") typeName = col.udt_name.replace(/^_/, "") + "[]";
        else if (col.data_type === "timestamp with time zone") typeName = "TIMESTAMPTZ";
        else if (col.data_type === "timestamp without time zone") typeName = "TIMESTAMP";
        else if (col.data_type === "date") typeName = "DATE";
        else if (col.data_type === "time without time zone") typeName = "TIME";
        else if (col.data_type === "time with time zone") typeName = "TIMETZ";
        else if (col.data_type === "interval") typeName = "INTERVAL";
        else if (col.data_type === "character varying") typeName = col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : "VARCHAR";
        else if (col.data_type === "character") typeName = col.character_maximum_length ? `CHAR(${col.character_maximum_length})` : "CHAR";
        else if (col.data_type === "USER-DEFINED") typeName = `public.${col.udt_name}`;

        let def = `  ${col.column_name} ${typeName}`;
        if (col.column_default) def += ` DEFAULT ${col.column_default}`;
        if (col.is_nullable === "NO") def += " NOT NULL";
        colDefs.push(def);
      }

      // Primary key
      if (pkMap[tableName]) {
        colDefs.push(`  PRIMARY KEY (${pkMap[tableName].join(", ")})`);
      }

      // Unique constraints
      if (uqMap[tableName]) {
        for (const cols of uqMap[tableName]) {
          colDefs.push(`  UNIQUE (${cols})`);
        }
      }

      // Foreign keys — only inline if referenced table already created
      if (fkMap[tableName]) {
        for (const fk of fkMap[tableName]) {
          if (sortedSet.has(fk.refTable) || fk.refTable === tableName) {
            colDefs.push(`  FOREIGN KEY (${fk.column}) REFERENCES public.${fk.refTable}(${fk.refColumn}) ON DELETE CASCADE`);
          } else {
            // Defer this FK to after all tables are created
            deferredFks.push({ table: tableName, column: fk.column, refTable: fk.refTable, refColumn: fk.refColumn });
          }
        }
      }

      sqlOutput += colDefs.join(",\n") + "\n);\n\n";
    }

    // Deferred foreign keys (for circular dependencies)
    if (deferredFks.length > 0) {
      sqlOutput += "-- ======== FOREIGN KEYS (dependências circulares) ========\n\n";
      for (const fk of deferredFks) {
        sqlOutput += `ALTER TABLE public.${fk.table} ADD FOREIGN KEY (${fk.column}) REFERENCES public.${fk.refTable}(${fk.refColumn}) ON DELETE CASCADE;\n`;
      }
      sqlOutput += "\n";
    }

    // RLS
    sqlOutput += "-- ======== ROW LEVEL SECURITY ========\n\n";
    for (const tableName of sorted) {
      sqlOutput += `ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;\n`;
    }

    await sql.end();

    return new Response(JSON.stringify({ sql: sqlOutput, table_count: sorted.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
