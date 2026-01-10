import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, EyeOff } from "lucide-react";

interface Colaborador {
  id: string;
  userId?: string;
  nome: string;
  email: string;
  setor?: string;
  funcao?: string;
}

interface EditarUsuarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador: Colaborador | null;
  companyId: string;
  onSuccess: () => void;
}

export function EditarUsuarioDialog({
  open,
  onOpenChange,
  colaborador,
  companyId,
  onSuccess,
}: EditarUsuarioDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    funcao: "",
    password: "",
  });

  useEffect(() => {
    if (colaborador) {
      setFormData({
        nome: colaborador.nome || "",
        email: colaborador.email || "",
        telefone: "",
        funcao: colaborador.funcao || "vendedor",
        password: "",
      });
    }
  }, [colaborador]);

  const handleSave = async () => {
    if (!colaborador?.userId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "ID do usuário não encontrado",
      });
      return;
    }

    if (!formData.nome.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O nome é obrigatório",
      });
      return;
    }

    if (!formData.email.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O email é obrigatório",
      });
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Email inválido",
      });
      return;
    }

    // Validar senha se fornecida
    if (formData.password && formData.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
      });
      return;
    }

    setLoading(true);

    try {
      const requestBody: any = {
        userId: colaborador.userId,
        companyId: companyId,
      };

      // Apenas incluir campos que foram alterados
      if (formData.nome !== colaborador.nome) {
        requestBody.full_name = formData.nome;
      }
      if (formData.email !== colaborador.email) {
        requestBody.email = formData.email;
      }
      if (formData.funcao !== colaborador.funcao) {
        requestBody.role = formData.funcao;
      }
      if (formData.password) {
        requestBody.password = formData.password;
      }

      const { data, error } = await supabase.functions.invoke('editar-usuario', {
        body: requestBody,
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao editar usuário:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar usuário",
        description: error.message || "Ocorreu um erro ao atualizar o usuário",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Atualize os dados do usuário. Deixe a senha em branco para mantê-la inalterada.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-nome">Nome Completo *</Label>
            <Input
              id="edit-nome"
              placeholder="Nome do usuário"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-email">Email *</Label>
            <Input
              id="edit-email"
              type="email"
              placeholder="email@exemplo.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-funcao">Perfil</Label>
            <Select
              value={formData.funcao}
              onValueChange={(value) => setFormData(prev => ({ ...prev, funcao: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company_admin">Administrador</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="vendedor">Vendedor/Atendente</SelectItem>
                <SelectItem value="suporte">Suporte</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-password">Nova Senha (opcional)</Label>
            <div className="relative">
              <Input
                id="edit-password"
                type={showPassword ? "text" : "password"}
                placeholder="Deixe em branco para manter a atual"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Mínimo de 6 caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
