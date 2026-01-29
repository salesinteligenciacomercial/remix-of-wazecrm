import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Book, Users, MessageSquare, LayoutDashboard, Settings, 
  Calendar, Bot, Video, PhoneCall, Target, DollarSign,
  GraduationCap, FileText, Zap, HelpCircle
} from "lucide-react";

const iconOptions = [
  { value: 'book', label: 'Livro', icon: Book },
  { value: 'users', label: 'Usuários', icon: Users },
  { value: 'message-square', label: 'Mensagem', icon: MessageSquare },
  { value: 'layout-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { value: 'settings', label: 'Configurações', icon: Settings },
  { value: 'calendar', label: 'Calendário', icon: Calendar },
  { value: 'bot', label: 'Automação', icon: Bot },
  { value: 'video', label: 'Vídeo', icon: Video },
  { value: 'phone-call', label: 'Telefone', icon: PhoneCall },
  { value: 'target', label: 'Alvo', icon: Target },
  { value: 'dollar-sign', label: 'Financeiro', icon: DollarSign },
  { value: 'graduation-cap', label: 'Educação', icon: GraduationCap },
  { value: 'file-text', label: 'Documento', icon: FileText },
  { value: 'zap', label: 'Rápido', icon: Zap },
  { value: 'help-circle', label: 'Ajuda', icon: HelpCircle },
];

interface CreateModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { title: string; description?: string; icon?: string }) => Promise<void>;
  editingModule?: { id: string; title: string; description: string | null; icon: string } | null;
}

export function CreateModuleDialog({ 
  open, 
  onOpenChange, 
  onSubmit,
  editingModule 
}: CreateModuleDialogProps) {
  const [title, setTitle] = useState(editingModule?.title || "");
  const [description, setDescription] = useState(editingModule?.description || "");
  const [icon, setIcon] = useState(editingModule?.icon || "book");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    setLoading(true);
    try {
      await onSubmit({ title, description, icon });
      setTitle("");
      setDescription("");
      setIcon("book");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  // Reset form when dialog opens with editing module
  useState(() => {
    if (editingModule) {
      setTitle(editingModule.title);
      setDescription(editingModule.description || "");
      setIcon(editingModule.icon);
    } else {
      setTitle("");
      setDescription("");
      setIcon("book");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingModule ? "Editar Módulo" : "Novo Módulo de Treinamento"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título do Módulo *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Gestão de Leads"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o conteúdo deste módulo..."
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="icon">Ícone</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um ícone" />
              </SelectTrigger>
              <SelectContent>
                {iconOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4" />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "Salvando..." : editingModule ? "Salvar" : "Criar Módulo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
