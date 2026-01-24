import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Search,
  Loader2,
  Crown,
  Calendar,
  Repeat,
  ArrowUpRight,
  Shuffle,
  Package,
  Clock,
  RefreshCw,
  Eye,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CustomerSalesHistoryDialog } from "./CustomerSalesHistoryDialog";

interface CustomerLTV {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_phone?: string;
  total_gasto: number;
  total_compras: number;
  ticket_medio: number;
  primeira_compra: string | null;
  ultima_compra: string | null;
  dias_como_cliente: number;
  frequencia_compra_dias: number | null;
  produtos_favoritos: Array<{
    produto_nome: string;
    quantidade: number;
    valor_total: number;
  }>;
  total_avulsa: number;
  total_recorrente: number;
  total_upsell: number;
  total_cross_sell: number;
}

interface LTVKPIs {
  totalClientes: number;
  receitaTotal: number;
  ltvMedio: number;
  ticketMedio: number;
  clientesRecorrentes: number;
  taxaRecorrencia: number;
}

interface CustomerLTVAnalyticsProps {
  companyId: string;
  globalFilters?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  };
}

export function CustomerLTVAnalytics({
  companyId,
  globalFilters,
}: CustomerLTVAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerLTV[]>([]);
  const [kpis, setKpis] = useState<LTVKPIs>({
    totalClientes: 0,
    receitaTotal: 0,
    ltvMedio: 0,
    ticketMedio: 0,
    clientesRecorrentes: 0,
    taxaRecorrencia: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"ltv" | "compras" | "recente">("ltv");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerLTV | null>(
    null
  );
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    try {
      // Buscar dados do cache de LTV
      const { data: ltvData, error: ltvError } = await supabase
        .from("customer_ltv_cache")
        .select("*")
        .eq("company_id", companyId)
        .order("total_gasto", { ascending: false });

      if (ltvError) throw ltvError;

      // Buscar nomes dos leads
      const leadIds = (ltvData || []).map((l) => l.lead_id);
      const { data: leadsData } = await supabase
        .from("leads")
        .select("id, name, phone, telefone")
        .in("id", leadIds);

      const leadsMap = new Map(
        (leadsData || []).map((l) => [
          l.id,
          { name: l.name || "Sem nome", phone: l.phone || l.telefone },
        ])
      );

      // Combinar dados
      const combinedData: CustomerLTV[] = (ltvData || []).map((ltv) => ({
        id: ltv.id,
        lead_id: ltv.lead_id,
        lead_name: leadsMap.get(ltv.lead_id)?.name || "Cliente",
        lead_phone: leadsMap.get(ltv.lead_id)?.phone,
        total_gasto: Number(ltv.total_gasto) || 0,
        total_compras: ltv.total_compras || 0,
        ticket_medio: Number(ltv.ticket_medio) || 0,
        primeira_compra: ltv.primeira_compra,
        ultima_compra: ltv.ultima_compra,
        dias_como_cliente: ltv.dias_como_cliente || 0,
        frequencia_compra_dias: ltv.frequencia_compra_dias
          ? Number(ltv.frequencia_compra_dias)
          : null,
        produtos_favoritos: (ltv.produtos_favoritos as any[]) || [],
        total_avulsa: ltv.total_avulsa || 0,
        total_recorrente: ltv.total_recorrente || 0,
        total_upsell: ltv.total_upsell || 0,
        total_cross_sell: ltv.total_cross_sell || 0,
      }));

      setCustomers(combinedData);

      // Calcular KPIs
      const totalClientes = combinedData.length;
      const receitaTotal = combinedData.reduce(
        (sum, c) => sum + c.total_gasto,
        0
      );
      const ltvMedio = totalClientes > 0 ? receitaTotal / totalClientes : 0;

      const totalCompras = combinedData.reduce(
        (sum, c) => sum + c.total_compras,
        0
      );
      const ticketMedio = totalCompras > 0 ? receitaTotal / totalCompras : 0;

      const clientesRecorrentes = combinedData.filter(
        (c) => c.total_compras > 1
      ).length;
      const taxaRecorrencia =
        totalClientes > 0 ? (clientesRecorrentes / totalClientes) * 100 : 0;

      setKpis({
        totalClientes,
        receitaTotal,
        ltvMedio,
        ticketMedio,
        clientesRecorrentes,
        taxaRecorrencia,
      });
    } catch (error) {
      console.error("Erro ao carregar LTV:", error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtrar e ordenar clientes
  const filteredCustomers = customers
    .filter(
      (c) =>
        c.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lead_phone?.includes(searchTerm)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "ltv":
          return b.total_gasto - a.total_gasto;
        case "compras":
          return b.total_compras - a.total_compras;
        case "recente":
          return (
            new Date(b.ultima_compra || 0).getTime() -
            new Date(a.ultima_compra || 0).getTime()
          );
        default:
          return 0;
      }
    });

  const getClienteTier = (ltv: number): { label: string; color: string } => {
    if (ltv >= 10000) return { label: "Ouro", color: "bg-yellow-500" };
    if (ltv >= 5000) return { label: "Prata", color: "bg-gray-400" };
    if (ltv >= 1000) return { label: "Bronze", color: "bg-orange-600" };
    return { label: "Novo", color: "bg-blue-500" };
  };

  const handleViewHistory = (customer: CustomerLTV) => {
    setSelectedCustomer(customer);
    setHistoryDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Total Clientes</span>
            </div>
            <p className="text-2xl font-bold">{kpis.totalClientes}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Receita Total</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(kpis.receitaTotal)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">LTV Médio</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(kpis.ltvMedio)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ShoppingCart className="h-4 w-4" />
              <span className="text-xs">Ticket Médio</span>
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(kpis.ticketMedio)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Repeat className="h-4 w-4" />
              <span className="text-xs">Clientes Recorrentes</span>
            </div>
            <p className="text-2xl font-bold">{kpis.clientesRecorrentes}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <RefreshCw className="h-4 w-4" />
              <span className="text-xs">Taxa Recorrência</span>
            </div>
            <p className="text-2xl font-bold">
              {kpis.taxaRecorrencia.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Clientes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Ranking de Clientes por LTV
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ltv">Maior LTV</SelectItem>
                  <SelectItem value="compras">Mais Compras</SelectItem>
                  <SelectItem value="recente">Mais Recente</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum cliente com vendas registradas</p>
              <p className="text-sm mt-1">
                Registre vendas para ver o LTV dos clientes
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">LTV</TableHead>
                    <TableHead className="text-center">Compras</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                    <TableHead>Última Compra</TableHead>
                    <TableHead>Tipos</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer, index) => {
                    const tier = getClienteTier(customer.total_gasto);
                    return (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{customer.lead_name}</p>
                            {customer.lead_phone && (
                              <p className="text-xs text-muted-foreground">
                                {customer.lead_phone}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${tier.color} text-white`}>
                            {tier.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {formatCurrency(customer.total_gasto)}
                        </TableCell>
                        <TableCell className="text-center">
                          {customer.total_compras}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(customer.ticket_medio)}
                        </TableCell>
                        <TableCell>
                          {customer.ultima_compra ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {format(
                                new Date(customer.ultima_compra),
                                "dd/MM/yyyy",
                                { locale: ptBR }
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {customer.total_avulsa > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                {customer.total_avulsa}
                              </Badge>
                            )}
                            {customer.total_recorrente > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Repeat className="h-3 w-3 mr-1" />
                                {customer.total_recorrente}
                              </Badge>
                            )}
                            {customer.total_upsell > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <ArrowUpRight className="h-3 w-3 mr-1" />
                                {customer.total_upsell}
                              </Badge>
                            )}
                            {customer.total_cross_sell > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Shuffle className="h-3 w-3 mr-1" />
                                {customer.total_cross_sell}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewHistory(customer)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Histórico */}
      {selectedCustomer && (
        <CustomerSalesHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          leadId={selectedCustomer.lead_id}
          leadName={selectedCustomer.lead_name}
          companyId={companyId}
        />
      )}
    </div>
  );
}
