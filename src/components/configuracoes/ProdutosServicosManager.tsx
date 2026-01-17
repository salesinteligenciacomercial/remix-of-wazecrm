import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, DollarSign, Loader2, Search } from "lucide-react";

interface ProdutoServico {
  id: string;
  nome: string;
  descricao: string | null;
  preco_sugerido: number;
  categoria: string | null;
  ativo: boolean;
  created_at: string;
}

export function ProdutosServicosManager() {
  const [produtos, setProdutos] = useState<ProdutoServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<ProdutoServico | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    preco_sugerido: "",
    categoria: "",
    ativo: true
  });

  useEffect(() => {
    loadCompanyAndProdutos();
  }, []);

  const loadCompanyAndProdutos = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user?.id) return;

      const { data: role } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', auth.user.id)
        .maybeSingle();

      if (role?.company_id) {
        setCompanyId(role.company_id);
        await loadProdutos(role.company_id);
      }
    } catch (error) {
      console.error('Erro ao carregar empresa:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProdutos = async (companyIdParam?: string) => {
    const cid = companyIdParam || companyId;
    if (!cid) return;

    const { data, error } = await supabase
      .from('produtos_servicos')
      .select('*')
      .eq('company_id', cid)
      .order('nome');

    if (error) {
      toast.error('Erro ao carregar produtos');
      return;
    }

    setProdutos(data || []);
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      preco_sugerido: "",
      categoria: "",
      ativo: true
    });
    setEditingProduto(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (produto: ProdutoServico) => {
    setEditingProduto(produto);
    setFormData({
      nome: produto.nome,
      descricao: produto.descricao || "",
      preco_sugerido: produto.preco_sugerido?.toString() || "",
      categoria: produto.categoria || "",
      ativo: produto.ativo
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!companyId) {
      toast.error('Empresa não encontrada');
      return;
    }

    setSaving(true);

    const produtoData = {
      nome: formData.nome.trim(),
      descricao: formData.descricao.trim() || null,
      preco_sugerido: formData.preco_sugerido ? parseFloat(formData.preco_sugerido) : 0,
      categoria: formData.categoria.trim() || null,
      ativo: formData.ativo,
      company_id: companyId
    };

    try {
      if (editingProduto) {
        const { error } = await supabase
          .from('produtos_servicos')
          .update(produtoData)
          .eq('id', editingProduto.id);

        if (error) throw error;
        toast.success('Produto atualizado!');
      } else {
        const { error } = await supabase
          .from('produtos_servicos')
          .insert(produtoData);

        if (error) throw error;
        toast.success('Produto criado!');
      }

      setDialogOpen(false);
      resetForm();
      loadProdutos();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (produto: ProdutoServico) => {
    if (!confirm(`Excluir "${produto.nome}"?`)) return;

    try {
      const { error } = await supabase
        .from('produtos_servicos')
        .delete()
        .eq('id', produto.id);

      if (error) throw error;
      toast.success('Produto excluído');
      loadProdutos();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir produto');
    }
  };

  const toggleAtivo = async (produto: ProdutoServico) => {
    try {
      const { error } = await supabase
        .from('produtos_servicos')
        .update({ ativo: !produto.ativo })
        .eq('id', produto.id);

      if (error) throw error;
      loadProdutos();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    }
  };

  const filteredProdutos = produtos.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produtos e Serviços
            </CardTitle>
            <CardDescription>
              Cadastre os produtos/serviços que sua empresa oferece para usar nas vendas
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingProduto ? 'Editar Produto/Serviço' : 'Novo Produto/Serviço'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Consultoria Premium"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição do produto ou serviço..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preco">Preço Sugerido</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="preco"
                        type="number"
                        step="0.01"
                        value={formData.preco_sugerido}
                        onChange={(e) => setFormData({ ...formData, preco_sugerido: e.target.value })}
                        placeholder="0,00"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <Input
                      id="categoria"
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      placeholder="Ex: Consultoria"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="ativo">Produto ativo</Label>
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingProduto ? 'Salvar' : 'Criar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {produtos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum produto cadastrado</p>
            <p className="text-sm">Clique em "Novo Produto" para começar</p>
          </div>
        ) : (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProdutos.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{produto.nome}</p>
                        {produto.descricao && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {produto.descricao}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {produto.categoria && (
                        <Badge variant="outline">{produto.categoria}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {formatCurrency(produto.preco_sugerido)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={produto.ativo}
                        onCheckedChange={() => toggleAtivo(produto)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(produto)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(produto)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
