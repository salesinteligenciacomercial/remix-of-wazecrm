import { useState } from "react";
import { Workflow, Edit2, Trash2, Save, Plus, Clock, MessageCircle, Phone, Mail, MessageSquare, Linkedin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Step {
  day: number;
  action: string;
  channel: string;
}

interface CadenceData {
  name: string;
  type: string;
  channels: string[];
  steps: Step[];
}

interface InlineCadenceProps {
  content: CadenceData;
  onUpdate: (data: CadenceData) => void;
  onRemove: () => void;
}

const typeLabels: Record<string, string> = {
  prospeccao: "Prospecção",
  follow_up: "Follow-up",
  reativacao: "Reativação",
  onboarding: "Onboarding",
  pos_venda: "Pós-venda"
};

const channelIcons: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle className="h-4 w-4 text-green-500" />,
  telefone: <Phone className="h-4 w-4 text-blue-500" />,
  email: <Mail className="h-4 w-4 text-red-500" />,
  sms: <MessageSquare className="h-4 w-4 text-purple-500" />,
  linkedin: <Linkedin className="h-4 w-4 text-blue-600" />
};

const allChannels = ["whatsapp", "telefone", "email", "sms", "linkedin"];

export function InlineCadence({ content, onUpdate, onRemove }: InlineCadenceProps) {
  const [isEditing, setIsEditing] = useState(!content.name);
  const [data, setData] = useState<CadenceData>({
    name: content.name || "",
    type: content.type || "prospeccao",
    channels: content.channels || [],
    steps: content.steps?.length ? content.steps : [{ day: 1, action: "", channel: "whatsapp" }]
  });

  const handleSave = () => {
    if (!data.name.trim()) return;
    onUpdate(data);
    setIsEditing(false);
  };

  const addStep = () => {
    const lastDay = data.steps.length > 0 ? data.steps[data.steps.length - 1].day : 0;
    setData(prev => ({
      ...prev,
      steps: [...prev.steps, { day: lastDay + 1, action: "", channel: "whatsapp" }]
    }));
  };

  const removeStep = (index: number) => {
    setData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const updateStep = (index: number, field: keyof Step, value: any) => {
    setData(prev => ({
      ...prev,
      steps: prev.steps.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }));
  };

  if (isEditing) {
    return (
      <div className="border rounded-xl p-4 bg-card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Workflow className="h-5 w-5 text-purple-500" />
          <span className="font-semibold">Nova Cadência</span>
        </div>
        
        <Input
          placeholder="Nome da cadência"
          value={data.name}
          onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
        />
        
        <Select value={data.type} onValueChange={(v) => setData(prev => ({ ...prev, type: v }))}>
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(typeLabels).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Canais</label>
          <div className="flex flex-wrap gap-3">
            {allChannels.map(channel => (
              <label key={channel} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={data.channels.includes(channel)}
                  onCheckedChange={(checked) => {
                    setData(prev => ({
                      ...prev,
                      channels: checked 
                        ? [...prev.channels, channel]
                        : prev.channels.filter(c => c !== channel)
                    }));
                  }}
                />
                <span className="flex items-center gap-1 text-sm">
                  {channelIcons[channel]} {channel}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Etapas</label>
            <Button type="button" variant="outline" size="sm" onClick={addStep}>
              <Plus className="h-3 w-3 mr-1" />
              Adicionar
            </Button>
          </div>
          <div className="space-y-2">
            {data.steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Input
                  type="number"
                  min="1"
                  className="w-16"
                  placeholder="Dia"
                  value={step.day}
                  onChange={(e) => updateStep(idx, 'day', parseInt(e.target.value) || 1)}
                />
                <Input
                  className="flex-1"
                  placeholder="Ação (ex: Enviar mensagem)"
                  value={step.action}
                  onChange={(e) => updateStep(idx, 'action', e.target.value)}
                />
                <Select value={step.channel} onValueChange={(v) => updateStep(idx, 'channel', v)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allChannels.map(c => (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center gap-1">
                          {channelIcons[c]} {c}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {data.steps.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeStep(idx)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4 mr-1" />
            Remover
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!data.name.trim()}>
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
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Workflow className="h-5 w-5 text-purple-500" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold">{data.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {typeLabels[data.type] || data.type}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {data.steps.length} etapa{data.steps.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {data.channels.map((channel, idx) => (
                <span key={idx} title={channel}>
                  {channelIcons[channel] || channel}
                </span>
              ))}
            </div>
            {data.steps.length > 0 && (
              <div className="flex items-center gap-2 mt-3 overflow-x-auto">
                {data.steps.slice(0, 4).map((step, idx) => (
                  <div key={idx} className="flex items-center">
                    <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs">
                      <span className="font-bold text-purple-500">D{step.day}</span>
                      {channelIcons[step.channel]}
                    </div>
                    {idx < Math.min(data.steps.length - 1, 3) && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />
                    )}
                  </div>
                ))}
                {data.steps.length > 4 && (
                  <Badge variant="outline" className="text-xs">+{data.steps.length - 4}</Badge>
                )}
              </div>
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
