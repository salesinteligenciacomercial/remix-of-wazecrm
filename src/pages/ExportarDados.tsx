import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Database, Loader2, CheckCircle2, AlertCircle, Copy, Code, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TableExportConfig {
  key: string;
  label: string;
  description: string;
  table: string;
  category: string;
}

const EXPORT_TABLES: TableExportConfig[] = [
  { key: "leads", label: "Contatos / Leads", description: "Todos os leads e contatos do CRM", table: "leads", category: "CRM" },
  { key: "conversas", label: "Conversas / Mensagens", description: "Histórico de mensagens WhatsApp", table: "conversas", category: "CRM" },
  { key: "customer_sales", label: "Vendas", description: "Registro de vendas por cliente", table: "customer_sales", category: "CRM" },
  { key: "customer_ltv_cache", label: "LTV de Clientes", description: "Lifetime Value calculado dos clientes", table: "customer_ltv_cache", category: "CRM" },
  { key: "lead_value_history", label: "Histórico de Valor dos Leads", description: "Mudanças de valor e status", table: "lead_value_history", category: "CRM" },
  { key: "funis", label: "Funis de Vendas", description: "Funis configurados", table: "funis", category: "Funil" },
  { key: "etapas", label: "Etapas dos Funis", description: "Etapas de cada funil", table: "etapas", category: "Funil" },
  { key: "agendas", label: "Agendas", description: "Agendas configuradas", table: "agendas", category: "Agenda" },
  { key: "compromissos", label: "Compromissos", description: "Todos os agendamentos", table: "compromissos", category: "Agenda" },
  { key: "profissionais", label: "Profissionais", description: "Profissionais cadastrados", table: "profissionais", category: "Agenda" },
  { key: "automation_flows", label: "Fluxos de Automação", description: "Fluxos configurados", table: "automation_flows", category: "Automação" },
  { key: "automation_flow_logs", label: "Logs de Automação", description: "Histórico de execuções", table: "automation_flow_logs", category: "Automação" },
  { key: "profiles", label: "Perfis de Usuários", description: "Dados dos perfis de usuário", table: "profiles", category: "Usuários" },
  { key: "user_roles", label: "Roles de Usuários", description: "Funções e permissões", table: "user_roles", category: "Usuários" },
  { key: "companies", label: "Empresas", description: "Dados das empresas", table: "companies", category: "Empresa" },
  { key: "company_subscriptions", label: "Assinaturas", description: "Planos e assinaturas", table: "company_subscriptions", category: "Empresa" },
  { key: "billing_invoices", label: "Faturas", description: "Faturas emitidas", table: "billing_invoices", category: "Financeiro" },
  { key: "billing_transactions", label: "Transações", description: "Transações financeiras", table: "billing_transactions", category: "Financeiro" },
  { key: "billing_plans", label: "Planos", description: "Planos disponíveis", table: "billing_plans", category: "Financeiro" },
  { key: "produtos_servicos", label: "Produtos e Serviços", description: "Catálogo de produtos", table: "produtos_servicos", category: "Produtos" },
  { key: "categorias_produtos", label: "Categorias de Produtos", description: "Categorias do catálogo", table: "categorias_produtos", category: "Produtos" },
  { key: "ai_process_suggestions", label: "Sugestões IA", description: "Sugestões de processos pela IA", table: "ai_process_suggestions", category: "Processos" },
  { key: "call_history", label: "Histórico de Ligações", description: "Registros de chamadas", table: "call_history", category: "Discador" },
  { key: "disparo_campaigns", label: "Campanhas de Disparo", description: "Campanhas em massa", table: "disparo_campaigns", category: "Disparos" },
  { key: "prospeccao_cadences", label: "Cadências de Prospecção", description: "Cadências configuradas", table: "prospeccao_cadences", category: "Prospecção" },
  { key: "internal_messages", label: "Mensagens Internas", description: "Chat interno da equipe", table: "internal_messages", category: "Chat Interno" },
  { key: "internal_channels", label: "Canais Internos", description: "Canais do chat interno", table: "internal_channels", category: "Chat Interno" },
  { key: "tarefas", label: "Tarefas", description: "Tarefas criadas", table: "tarefas", category: "Tarefas" },
  { key: "whatsapp_connections", label: "Conexões WhatsApp", description: "Instâncias conectadas", table: "whatsapp_connections", category: "Configurações" },
  { key: "permissions", label: "Permissões", description: "Permissões do sistema", table: "permissions", category: "Configurações" },
  { key: "role_permissions", label: "Permissões por Cargo", description: "Vínculo role-permissão", table: "role_permissions", category: "Configurações" },
];

function convertToCSV(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(",")];
  for (const row of data) {
    const values = headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      const str = typeof val === "object" ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  }
  return csvRows.join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadSQL(sql: string, filename: string) {
  const blob = new Blob([sql], { type: "text/sql;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ExportarDados() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState<string | null>(null);
  const [exported, setExported] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [schemaSQL, setSchemaSQL] = useState<string>("");
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [schemaLoaded, setSchemaLoaded] = useState(false);

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === EXPORT_TABLES.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(EXPORT_TABLES.map((t) => t.key)));
    }
  };

  const exportTable = async (config: TableExportConfig) => {
    setExporting(config.key);
    try {
      let allData: Record<string, unknown>[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from(config.table as any)
          .select("*")
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allData = [...allData, ...(data as unknown as Record<string, unknown>[])];
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      if (allData.length === 0) {
        toast({ title: `${config.label}`, description: "Nenhum dado encontrado nesta tabela.", variant: "destructive" });
        setErrors((prev) => new Set(prev).add(config.key));
        return;
      }

      const csv = convertToCSV(allData);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `${config.table}_${date}.csv`);
      setExported((prev) => new Set(prev).add(config.key));
      toast({ title: "Exportação concluída", description: `${config.label}: ${allData.length} registros exportados.` });
    } catch (err: any) {
      console.error(`Erro ao exportar ${config.table}:`, err);
      setErrors((prev) => new Set(prev).add(config.key));
      toast({ title: "Erro na exportação", description: `Erro ao exportar ${config.label}: ${err.message}`, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const exportSelected = async () => {
    const tables = EXPORT_TABLES.filter((t) => selected.has(t.key));
    for (const table of tables) {
      await exportTable(table);
    }
  };

  const loadSchema = async () => {
    setLoadingSchema(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-schema");
      if (error) throw error;
      setSchemaSQL(data.sql);
      setSchemaLoaded(true);
      toast({ title: "Schema carregado", description: `${data.table_count} tabelas encontradas.` });
    } catch (err: any) {
      console.error("Erro ao carregar schema:", err);
      toast({ title: "Erro", description: `Erro ao carregar schema: ${err.message}`, variant: "destructive" });
    } finally {
      setLoadingSchema(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(schemaSQL);
      toast({ title: "Copiado!", description: "SQL copiado para a área de transferência." });
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = schemaSQL;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast({ title: "Copiado!", description: "SQL copiado para a área de transferência." });
    }
  };

  const categories = [...new Set(EXPORT_TABLES.map((t) => t.category))];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Exportar Dados</h1>
        <p className="text-muted-foreground mt-1">Exporte dados em CSV ou obtenha o SQL das tabelas para migração</p>
      </div>

      <Tabs defaultValue="csv" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="csv" className="flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            Exportar CSV
          </TabsTrigger>
          <TabsTrigger value="sql" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Schema SQL
          </TabsTrigger>
        </TabsList>

        {/* CSV Export Tab */}
        <TabsContent value="csv" className="space-y-6 mt-4">
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={selectAll}>
              {selected.size === EXPORT_TABLES.length ? "Desmarcar Todos" : "Selecionar Todos"}
            </Button>
            <Button onClick={exportSelected} disabled={selected.size === 0 || exporting !== null}>
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Exportar Selecionados ({selected.size})
            </Button>
          </div>

          {categories.map((category) => (
            <div key={category}>
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                {category}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {EXPORT_TABLES.filter((t) => t.category === category).map((table) => (
                  <Card
                    key={table.key}
                    className={`cursor-pointer transition-all hover:shadow-md ${selected.has(table.key) ? "border-primary ring-1 ring-primary/30" : ""}`}
                    onClick={() => toggleSelect(table.key)}
                  >
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={selected.has(table.key)} onCheckedChange={() => toggleSelect(table.key)} />
                          <CardTitle className="text-sm font-medium">{table.label}</CardTitle>
                        </div>
                        <div className="flex gap-1">
                          {exported.has(table.key) && <CheckCircle2 className="h-4 w-4 text-primary" />}
                          {errors.has(table.key) && <AlertCircle className="h-4 w-4 text-destructive" />}
                          {exporting === table.key && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <CardDescription className="text-xs">{table.description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* SQL Schema Tab */}
        <TabsContent value="sql" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                SQL de Criação das Tabelas
              </CardTitle>
              <CardDescription>
                Gere o SQL completo (CREATE TABLE) de todas as tabelas do sistema para migrar para outro banco de dados.
                Inclui tipos ENUM, chaves primárias, foreign keys, constraints e valores padrão.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!schemaLoaded ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Database className="h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground text-sm">Clique no botão abaixo para gerar o SQL do schema</p>
                  <Button onClick={loadSchema} disabled={loadingSchema} size="lg">
                    {loadingSchema ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Database className="h-4 w-4 mr-2" />
                    )}
                    {loadingSchema ? "Gerando SQL..." : "Gerar Schema SQL"}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Schema gerado com sucesso. Copie ou baixe o SQL abaixo.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={copyToClipboard}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar SQL
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => downloadSQL(schemaSQL, `schema_${new Date().toISOString().slice(0, 10)}.sql`)}>
                        <Download className="h-4 w-4 mr-2" />
                        Baixar .sql
                      </Button>
                      <Button variant="ghost" size="sm" onClick={loadSchema} disabled={loadingSchema}>
                        {loadingSchema ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-[500px] w-full rounded-md border bg-muted/30">
                    <pre className="p-4 text-xs font-mono text-foreground whitespace-pre-wrap break-words">
                      {schemaSQL}
                    </pre>
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
