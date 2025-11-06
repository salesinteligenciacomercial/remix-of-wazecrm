import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Pencil, Trash2, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NovaSubcontaDialog } from "./NovaSubcontaDialog";
import { EditarSubcontaDialog } from "./EditarSubcontaDialog";
import { UsuariosSubcontaDialog } from "./UsuariosSubcontaDialog";

interface Subconta {
  id: string;
  name: string;
  cnpj: string | null;
  plan: string;
  status: string;
  max_users: number;
  max_leads: number;
  created_at: string;
  settings: any;
}

export function SubcontasManager() {
  const { toast } = useToast();
  const [subcontas, setSubcontas] = useState<Subconta[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaSubcontaOpen, setNovaSubcontaOpen] = useState(false);
  const [editarSubcontaOpen, setEditarSubcontaOpen] = useState(false);
  const [usuariosDialogOpen, setUsuariosDialogOpen] = useState(false);
  const [subcontaSelecionada, setSubcontaSelecionada] = useState<Subconta | null>(null);

  useEffect(() => {
    carregarSubcontas();
  }, []);

  const carregarSubcontas = async () => {
    try {
      setLoading(true);
      
      // Buscar company_id do usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!userRole) return;

      // Buscar subcontas onde parent_company_id é a empresa do usuário
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('parent_company_id', userRole.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setSubcontas(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar subcontas:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar subcontas',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const abrirEditarSubconta = (subconta: Subconta) => {
    setSubcontaSelecionada(subconta);
    setEditarSubcontaOpen(true);
  };

  const abrirGerenciarUsuarios = (subconta: Subconta) => {
    setSubcontaSelecionada(subconta);
    setUsuariosDialogOpen(true);
  };

  const deletarSubconta = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta subconta? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Subconta deletada',
        description: 'A subconta foi removida com sucesso.',
      });

      await carregarSubcontas();
    } catch (error: any) {
      console.error('Erro ao deletar subconta:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao deletar subconta',
        description: error.message,
      });
    }
  };

  const getPlanBadge = (plan: string) => {
    const variants: Record<string, any> = {
      free: 'secondary',
      basic: 'default',
      premium: 'default',
    };
    const labels: Record<string, string> = {
      free: 'Free',
      basic: 'Padrão',
      premium: 'Premium',
    };
    return (
      <Badge variant={variants[plan] || 'default'}>
        {labels[plan] || plan}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: 'default',
      inactive: 'secondary',
      suspended: 'destructive',
    };
    const labels: Record<string, string> = {
      active: 'Ativa',
      inactive: 'Inativa',
      suspended: 'Suspensa',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Subcontas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando subcontas...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gerenciar Subcontas / Licenças SaaS</CardTitle>
              <CardDescription>
                Crie e gerencie licenças de CRM para seus clientes
              </CardDescription>
            </div>
            <Button onClick={() => setNovaSubcontaOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Subconta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {subcontas.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhuma subconta criada</h3>
              <p className="text-muted-foreground mt-2">
                Comece criando sua primeira licença de CRM para um cliente
              </p>
              <Button onClick={() => setNovaSubcontaOpen(true)} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Subconta
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {subcontas.map((subconta) => (
                <div
                  key={subconta.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <h4 className="font-semibold text-lg">{subconta.name}</h4>
                      {getPlanBadge(subconta.plan)}
                      {getStatusBadge(subconta.status)}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                      {subconta.cnpj && (
                        <span>
                          <strong>CNPJ:</strong> {subconta.cnpj}
                        </span>
                      )}
                      <span>
                        <strong>Usuários:</strong> {subconta.max_users}
                      </span>
                      <span>
                        <strong>Leads:</strong> {subconta.max_leads}
                      </span>
                    </div>
                    {subconta.settings?.email && (
                      <div className="text-sm text-muted-foreground mt-1">
                        <strong>Contato:</strong> {subconta.settings.responsavel} • {subconta.settings.email}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => abrirGerenciarUsuarios(subconta)}
                      title="Gerenciar usuários"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => abrirEditarSubconta(subconta)}
                      title="Editar subconta"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deletarSubconta(subconta.id)}
                      title="Deletar subconta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <NovaSubcontaDialog
        open={novaSubcontaOpen}
        onOpenChange={setNovaSubcontaOpen}
        onSuccess={carregarSubcontas}
      />

      {subcontaSelecionada && (
        <>
          <EditarSubcontaDialog
            company={subcontaSelecionada}
            open={editarSubcontaOpen}
            onOpenChange={setEditarSubcontaOpen}
            onSuccess={carregarSubcontas}
          />
          <UsuariosSubcontaDialog
            open={usuariosDialogOpen}
            onOpenChange={setUsuariosDialogOpen}
            company={{
              id: subcontaSelecionada.id,
              name: subcontaSelecionada.name
            }}
          />
        </>
      )}
    </>
  );
}
