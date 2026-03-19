import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Database, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TableExportConfig {
  key: string;
  label: string;
  description: string;
  table: string;
  category: string;
}

const EXPORT_TABLES: TableExportConfig[] = [
  // CRM
  { key: "leads", label: "Contatos / Leads", description: "Todos os leads e contatos do CRM", table: "leads", category: "CRM" },
  { key: "conversas", label: "Conversas / Mensagens", description: "Histórico de mensagens WhatsApp", table: "conversas", category: "CRM" },
  { key: "customer_sales", label: "Vendas", description: "Registro de vendas por cliente", table: "customer_sales", category: "CRM" },
  { key: "customer_ltv_cache", label: "LTV de Clientes", description: "Lifetime Value calculado dos clientes", table: "customer_ltv_cache", category: "CRM" },
  { key: "lead_value_history", label: "Histórico de Valor dos Leads", description: "Mudanças de valor e status", table: "lead_value_history", category: "CRM" },
  
  // Funil
  { key: "funis", label: "Funis de Vendas", description: "Funis configurados", table: "funis", category: "Funil" },
  { key: "etapas", label: "Etapas dos Funis", description: "Etapas de cada funil", table: "etapas", category: "Funil" },
  
  // Agenda
  { key: "agendas", label: "Agendas", description: "Agendas configuradas", table: "agendas", category: "Agenda" },
  { key: "compromissos", label: "Compromissos", description: "Todos os agendamentos", table: "compromissos", category: "Agenda" },
  { key: "profissionais", label: "Profissionais", description: "Profissionais cadastrados", table: "profissionais", category: "Agenda" },
  
  // Automação
  { key: "automation_flows", label: "Fluxos de Automação", description: "Fluxos configurados", table: "automation_flows", category: "Automação" },
  { key: "automation_flow_logs", label: "Logs de Automação", description: "Histórico de execuções", table: "automation_flow_logs", category: "Automação" },
  
  // Usuários
  { key: "profiles", label: "Perfis de Usuários", description: "Dados dos perfis de usuário", table: "profiles", category: "Usuários" },
  { key: "user_roles", label: "Roles de Usuários", description: "Funções e permissões", table: "user_roles", category: "Usuários" },
  
  // Empresa
  { key: "companies", label: "Empresas", description: "Dados das empresas", table: "companies", category: "Empresa" },
  { key: "company_subscriptions", label: "Assinaturas", description: "Planos e assinaturas", table: "company_subscriptions", category: "Empresa" },
  
  // Financeiro
  { key: "billing_invoices", label: "Faturas", description: "Faturas emitidas", table: "billing_invoices", category: "Financeiro" },
  { key: "billing_transactions", label: "Transações", description: "Transações financeiras", table: "billing_transactions", category: "Financeiro" },
  { key: "billing_plans", label: "Planos", description: "Planos disponíveis", table: "billing_plans", category: "Financeiro" },
  
  // Produtos
  { key: "produtos_servicos", label: "Produtos e Serviços", description: "Catálogo de produtos", table: "produtos_servicos", category: "Produtos" },
  { key: "categorias_produtos", label: "Categorias de Produtos", description: "Categorias do catálogo", table: "categorias_produtos", category: "Produtos" },
  
  // Processos
  { key: "ai_process_suggestions", label: "Sugestões IA", description: "Sugestões de processos pela IA", table: "ai_process_suggestions", category: "Processos" },
  
  // Discador
  { key: "call_history", label: "Histórico de Ligações", description: "Registros de chamadas", table: "call_history", category: "Discador" },
  
  // Disparos
  { key: "disparo_campaigns", label: "Campanhas de Disparo", description: "Campanhas em massa", table: "disparo_campaigns", category: "Disparos" },
  
  // Prospecção
  { key: "prospeccao_cadences", label: "Cadências de Prospecção", description: "Cadências configuradas", table: "prospeccao_cadences", category: "Prospecção" },
  
  // Chat Interno
  { key: "internal_messages", label: "Mensagens Internas", description: "Chat interno da equipe", table: "internal_messages", category: "Chat Interno" },
  { key: "internal_channels", label: "Canais Internos", description: "Canais do chat interno", table: "internal_channels", category: "Chat Interno" },
  
  // Tarefas
  { key: "tarefas", label: "Tarefas", description: "Tarefas criadas", table: "tarefas", category: "Tarefas" },
  
  // Configurações
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

export default function ExportarDados() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState<string | null>(null);
  const [exported, setExported] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Set<string>>(new Set());

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

  const categories = [...new Set(EXPORT_TABLES.map((t) => t.category))];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Exportar Dados</h1>
          <p className="text-muted-foreground mt-1">Exporte todos os dados do CRM em formato CSV</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={selectAll}>
            {selected.size === EXPORT_TABLES.length ? "Desmarcar Todos" : "Selecionar Todos"}
          </Button>
          <Button onClick={exportSelected} disabled={selected.size === 0 || exporting !== null}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Exportar Selecionados ({selected.size})
          </Button>
        </div>
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
                      {exported.has(table.key) && <CheckCircle2 className="h-4 w-4 text-green-500" />}
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
    </div>
  );
}
