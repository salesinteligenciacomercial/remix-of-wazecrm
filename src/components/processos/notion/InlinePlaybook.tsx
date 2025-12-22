import { useState } from "react";
import { FileText, Edit2, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PlaybookData {
  title: string;
  type: string;
  category: string;
  content: string;
}

interface InlinePlaybookProps {
  content: PlaybookData;
  onUpdate: (data: PlaybookData) => void;
  onRemove: () => void;
}

const typeLabels: Record<string, { label: string; color: string }> = {
  atendimento: { label: "Atendimento", color: "bg-blue-500" },
  prospeccao: { label: "Prospecção", color: "bg-green-500" },
  follow_up: { label: "Follow-up", color: "bg-yellow-500" },
  fechamento: { label: "Fechamento", color: "bg-purple-500" },
  objecoes: { label: "Objeções", color: "bg-orange-500" },
  pos_venda: { label: "Pós-venda", color: "bg-cyan-500" }
};

export function InlinePlaybook({ content, onUpdate, onRemove }: InlinePlaybookProps) {
  const [isEditing, setIsEditing] = useState(!content.title);
  const [data, setData] = useState<PlaybookData>({
    title: content.title || "",
    type: content.type || "atendimento",
    category: content.category || "",
    content: content.content || ""
  });

  const handleSave = () => {
    if (!data.title.trim()) return;
    onUpdate(data);
    setIsEditing(false);
  };

  const typeInfo = typeLabels[data.type] || { label: data.type, color: "bg-gray-500" };

  if (isEditing) {
    return (
      <div className="border rounded-xl p-4 bg-card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5 text-blue-500" />
          <span className="font-semibold">Novo Playbook</span>
        </div>
        
        <Input
          placeholder="Título do playbook"
          value={data.title}
          onChange={(e) => setData(prev => ({ ...prev, title: e.target.value }))}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <Select value={data.type} onValueChange={(v) => setData(prev => ({ ...prev, type: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(typeLabels).map(([key, val]) => (
                <SelectItem key={key} value={key}>{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Categoria (opcional)"
            value={data.category}
            onChange={(e) => setData(prev => ({ ...prev, category: e.target.value }))}
          />
        </div>
        
        <Textarea
          placeholder="Conteúdo do playbook..."
          rows={6}
          value={data.content}
          onChange={(e) => setData(prev => ({ ...prev, content: e.target.value }))}
        />
        
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4 mr-1" />
            Remover
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!data.title.trim()}>
            <Save className="h-4 w-4 mr-1" />
            Salvar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-xl p-4 bg-card hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <FileText className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold">{data.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${typeInfo.color} text-white text-xs`}>
                {typeInfo.label}
              </Badge>
              {data.category && (
                <Badge variant="outline" className="text-xs">{data.category}</Badge>
              )}
            </div>
            {data.content && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3 whitespace-pre-wrap">
                {data.content}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}
