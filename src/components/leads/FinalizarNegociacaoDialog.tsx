import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, XCircle, DollarSign, Calendar, Loader2, Package, Plus } from "lucide-react";

interface ProdutoServico {
  id: string;
  nome: string;
  preco_sugerido: number;
  categoria: string | null;
}

interface FinalizarNegociacaoDialogProps {
  lead: {
    id: string;
    name?: string;
    nome?: string;
    value?: number;
    status?: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  defaultAction?: 'ganho' | 'perdido';
}

const MOTIVOS_PERDA = [
  { value: 'preco', label: 'Preço muito alto' },
  { value: 'concorrencia', label: 'Escolheu concorrente' },
  { value: 'timing', label: 'Não é o momento' },
  { value: 'orcamento', label: 'Sem orçamento' },
  { value: 'sem_resposta', label: 'Sem resposta/Contato perdido' },
  { value: 'nao_qualificado', label: 'Lead não qualificado' },
  { value: 'mudou_prioridade', label: 'Mudou de prioridade' },
  { value: 'outro', label: 'Outro motivo' },
];

export function FinalizarNegociacaoDialog({
  lead,
  open,
  onOpenChange,
  onUpdated,
  defaultAction = 'ganho'
}: FinalizarNegociacaoDialogProps) {
  const [activeTab, setActiveTab] = useState<'ganho' | 'perdido'>(defaultAction);
  const [loading, setLoading] = useState(false);
  
  // Campos para venda ganha
  const [valorFinal, setValorFinal] = useState("");
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [produtoCustom, setProdutoCustom] = useState("");
  const [produtos, setProdutos] = useState<ProdutoServico[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  
  // Campos para venda perdida
  const [motivoPerda, setMotivoPerda] = useState("");
  const [motivoCustom, setMotivoCustom] = useState("");
  const [valorPerdido, setValorPerdido] = useState("");
  const [produtoPerdido, setProdutoPerdido] = useState("");
  
  const leadName = lead.name || lead.nome || "Lead";

  // Carregar produtos ao abrir o dialog
  useEffect(() => {
    if (open) {
      loadProdutos();
      setActiveTab(defaultAction);
      setValorFinal(lead.value?.toString() || "");
      setValorPerdido(lead.value?.toString() || "");
      setMotivoPerda("");
      setMotivoCustom("");
      setProdutoSelecionado("");
      setProdutoCustom("");
      setProdutoPerdido("");
    }
  }, [open, defaultAction, lead.value]);

  const loadProdutos = async () => {
    setLoadingProdutos(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user?.id) return;

      const { data: role } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', auth.user.id)
        .maybeSingle();

      if (role?.company_id) {
        const { data } = await supabase
          .from('produtos_servicos')
          .select('id, nome, preco_sugerido, categoria')
          .eq('company_id', role.company_id)
          .eq('ativo', true)
          .order('nome');

        setProdutos(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoadingProdutos(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleProdutoChange = (value: string) => {
    setProdutoSelecionado(value);
    
    // Se selecionou um produto da lista, preencher o valor sugerido
    if (value && value !== 'custom') {
      const produto = produtos.find(p => p.id === value);
      if (produto && produto.preco_sugerido > 0) {
        setValorFinal(produto.preco_sugerido.toString());
      }
    }
  };

  const handleMarcarGanho = async () => {
    if (!valorFinal || parseFloat(valorFinal) <= 0) {
      toast.error("Informe o valor final da venda");
      return;
    }

    // Verificar se tem produto (seja da lista ou customizado)
    const produtoFinal = produtoSelecionado === 'custom' ? produtoCustom.trim() : produtoSelecionado;
    if (!produtoFinal && produtos.length > 0) {
      toast.error("Selecione o produto/serviço vendido");
      return;
    }

    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      
      // Obter company_id
      let companyId: string | null = null;
      if (auth?.user?.id) {
        const { data: role } = await supabase
          .from('user_roles')
          .select('company_id')
          .eq('user_id', auth.user.id)
          .maybeSingle();
        companyId = role?.company_id || null;
      }

      const valorNumerico = parseFloat(valorFinal);
      const produto = produtoSelecionado && produtoSelecionado !== 'custom' 
        ? produtos.find(p => p.id === produtoSelecionado) 
        : null;
      const produtoNome = produto?.nome || produtoCustom.trim() || 'Produto não especificado';

      // Atualizar lead
      const updateData: Record<string, any> = {
        status: 'ganho',
        value: valorNumerico,
        won_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (produto) {
        updateData.produto_id = produto.id;
        updateData.servico = produto.nome;
      } else if (produtoCustom.trim()) {
        updateData.servico = produtoCustom.trim();
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead.id);

      if (updateError) throw updateError;

      // Registrar na tabela de vendas (customer_sales) para LTV
      if (companyId) {
        const { error: saleError } = await supabase
          .from('customer_sales')
          .insert({
            company_id: companyId,
            lead_id: lead.id,
            produto_id: produto?.id || null,
            produto_nome: produtoNome,
            valor_unitario: valorNumerico,
            quantidade: 1,
            desconto: 0,
            valor_final: valorNumerico,
            tipo: 'avulsa',
            responsavel_id: auth?.user?.id || null,
            categoria: produto?.categoria || null,
          });

        if (saleError) {
          console.error('Erro ao registrar venda no histórico:', saleError);
          // Não bloquear o fluxo, apenas logar
        }
      }

      toast.success(`🎉 Venda ganha! ${formatCurrency(valorNumerico)}${produtoNome ? ` - ${produtoNome}` : ''}`);
      onOpenChange(false);
      onUpdated();
    } catch (error) {
      console.error('Erro ao marcar como ganho:', error);
      toast.error('Erro ao atualizar status do lead');
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarPerdido = async () => {
    if (!motivoPerda) {
      toast.error("Selecione o motivo da perda");
      return;
    }

    if (motivoPerda === 'outro' && !motivoCustom.trim()) {
      toast.error("Descreva o motivo da perda");
      return;
    }

    setLoading(true);
    try {
      const motivoFinal = motivoPerda === 'outro' 
        ? motivoCustom.trim() 
        : MOTIVOS_PERDA.find(m => m.value === motivoPerda)?.label || motivoPerda;

      const updateData: Record<string, any> = {
        status: 'perdido',
        loss_reason: motivoFinal,
        value: valorPerdido ? parseFloat(valorPerdido) : (lead.value || 0),
        lost_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Vincular produto se selecionado
      if (produtoPerdido && produtoPerdido !== 'custom') {
        updateData.produto_id = produtoPerdido;
        const produto = produtos.find(p => p.id === produtoPerdido);
        if (produto) {
          updateData.servico = produto.nome;
        }
      }

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead.id);

      if (error) throw error;

      toast.success(`Lead marcado como perdido - ${motivoFinal}`);
      onOpenChange(false);
      onUpdated();
    } catch (error) {
      console.error('Erro ao marcar como perdido:', error);
      toast.error('Erro ao atualizar status do lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar Negociação</DialogTitle>
          <DialogDescription>
            Marque o resultado da negociação com <strong>{leadName}</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'ganho' | 'perdido')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ganho" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <Trophy className="h-4 w-4 mr-2" />
              Venda Ganha
            </TabsTrigger>
            <TabsTrigger value="perdido" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
              <XCircle className="h-4 w-4 mr-2" />
              Venda Perdida
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ganho" className="space-y-4 mt-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">Parabéns pela venda!</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                Confirme os detalhes para registrar a venda.
              </p>
            </div>

            {/* Seleção de Produto */}
            <div className="space-y-2">
              <Label htmlFor="produto">Produto/Serviço Vendido</Label>
              {loadingProdutos ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando produtos...
                </div>
              ) : produtos.length > 0 ? (
                <Select value={produtoSelecionado} onValueChange={handleProdutoChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto/serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        <div className="flex items-center justify-between gap-2">
                          <span>{produto.nome}</span>
                          {produto.preco_sugerido > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {formatCurrency(produto.preco_sugerido)}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Plus className="h-3 w-3" />
                        Digitar outro...
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={produtoCustom}
                  onChange={(e) => setProdutoCustom(e.target.value)}
                  placeholder="Nome do produto ou serviço"
                />
              )}

              {produtoSelecionado === 'custom' && (
                <Input
                  value={produtoCustom}
                  onChange={(e) => setProdutoCustom(e.target.value)}
                  placeholder="Digite o nome do produto/serviço"
                  className="mt-2"
                />
              )}

              {produtos.length === 0 && !loadingProdutos && (
                <p className="text-xs text-muted-foreground">
                  💡 Cadastre produtos em Configurações → Produtos para selecionar da lista
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorFinal">Valor Final da Venda *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="valorFinal"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={valorFinal}
                  onChange={(e) => setValorFinal(e.target.value)}
                  className="pl-10"
                />
              </div>
              {lead.value && lead.value > 0 && (
                <p className="text-xs text-muted-foreground">
                  Valor estimado anterior: {formatCurrency(lead.value)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Data de fechamento: {new Date().toLocaleDateString('pt-BR')}</span>
            </div>

            <Button 
              onClick={handleMarcarGanho} 
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trophy className="h-4 w-4 mr-2" />
              )}
              Confirmar Venda Ganha
            </Button>
          </TabsContent>

          <TabsContent value="perdido" className="space-y-4 mt-4">
            <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-800 dark:text-red-200">Registrar Perda</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                Informe o motivo para análise futura.
              </p>
            </div>

            {/* Produto que seria vendido */}
            {produtos.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="produtoPerdido">Produto/Serviço (opcional)</Label>
                <Select value={produtoPerdido} onValueChange={setProdutoPerdido}>
                  <SelectTrigger>
                    <SelectValue placeholder="Qual produto era a negociação?" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="motivoPerda">Motivo da Perda *</Label>
              <Select value={motivoPerda} onValueChange={setMotivoPerda}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS_PERDA.map((motivo) => (
                    <SelectItem key={motivo.value} value={motivo.value}>
                      {motivo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {motivoPerda === 'outro' && (
              <div className="space-y-2">
                <Label htmlFor="motivoCustom">Descreva o motivo *</Label>
                <Textarea
                  id="motivoCustom"
                  placeholder="Descreva o motivo da perda..."
                  value={motivoCustom}
                  onChange={(e) => setMotivoCustom(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="valorPerdido">Valor que seria (opcional)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="valorPerdido"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={valorPerdido}
                  onChange={(e) => setValorPerdido(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Este valor será usado para calcular perdas potenciais no relatório.
              </p>
            </div>

            <Button 
              onClick={handleMarcarPerdido} 
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Confirmar como Perdido
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
