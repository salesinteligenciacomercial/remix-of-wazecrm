import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import {
  ShoppingCart,
  Loader2,
  Calendar,
  Package,
  Repeat,
  ArrowUpRight,
  Shuffle,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Sale {
  id: string;
  produto_nome: string;
  valor_unitario: number;
  quantidade: number;
  desconto: number;
  valor_final: number;
  tipo: string;
  recorrencia: string | null;
  categoria: string | null;
  subcategoria: string | null;
  notas: string | null;
  created_at: string;
}

interface CustomerSalesHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  companyId: string;
}

const TIPO_ICONS: Record<string, React.ReactNode> = {
  avulsa: <ShoppingCart className="h-4 w-4" />,
  recorrente: <Repeat className="h-4 w-4" />,
  upsell: <ArrowUpRight className="h-4 w-4" />,
  cross_sell: <Shuffle className="h-4 w-4" />,
};

const TIPO_LABELS: Record<string, string> = {
  avulsa: "Avulsa",
  recorrente: "Recorrente",
  upsell: "Upsell",
  cross_sell: "Cross-sell",
};

export function CustomerSalesHistoryDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  companyId,
}: CustomerSalesHistoryDialogProps) {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalGasto, setTotalGasto] = useState(0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const fetchSales = useCallback(async () => {
    if (!leadId || !companyId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("customer_sales")
        .select("*")
        .eq("lead_id", leadId)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const salesData = (data || []).map((s) => ({
        id: s.id,
        produto_nome: s.produto_nome,
        valor_unitario: Number(s.valor_unitario) || 0,
        quantidade: s.quantidade || 1,
        desconto: Number(s.desconto) || 0,
        valor_final: Number(s.valor_final) || 0,
        tipo: s.tipo || "avulsa",
        recorrencia: s.recorrencia,
        categoria: s.categoria,
        subcategoria: s.subcategoria,
        notas: s.notas,
        created_at: s.created_at,
      }));

      setSales(salesData);
      setTotalGasto(salesData.reduce((sum, s) => sum + s.valor_final, 0));
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  }, [leadId, companyId]);

  useEffect(() => {
    if (open) {
      fetchSales();
    }
  }, [open, fetchSales]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Histórico de Compras
          </DialogTitle>
          <DialogDescription>
            Cliente: <strong>{leadName}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Package className="h-12 w-12 mb-3 opacity-50" />
            <p>Nenhuma compra registrada</p>
          </div>
        ) : (
          <>
            {/* Resumo */}
            <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Total de compras</p>
                <p className="text-lg font-bold">{sales.length} compra(s)</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Valor total</p>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(totalGasto)}
                </p>
              </div>
            </div>

            {/* Lista de vendas */}
            <ScrollArea className="flex-1 max-h-[400px]">
              <div className="space-y-3">
                {sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{sale.produto_nome}</span>
                          {sale.quantidade > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              x{sale.quantidade}
                            </Badge>
                          )}
                        </div>
                        {(sale.categoria || sale.subcategoria) && (
                          <p className="text-xs text-muted-foreground">
                            {[sale.categoria, sale.subcategoria]
                              .filter(Boolean)
                              .join(" → ")}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {formatCurrency(sale.valor_final)}
                        </p>
                        {sale.desconto > 0 && (
                          <p className="text-xs text-muted-foreground line-through">
                            {formatCurrency(
                              sale.valor_unitario * sale.quantidade
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(sale.created_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {TIPO_ICONS[sale.tipo]}
                        <span className="ml-1">
                          {TIPO_LABELS[sale.tipo] || sale.tipo}
                        </span>
                      </Badge>
                      {sale.recorrencia && (
                        <Badge variant="secondary" className="text-xs">
                          {sale.recorrencia}
                        </Badge>
                      )}
                    </div>

                    {sale.notas && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        "{sale.notas}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
