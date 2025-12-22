import { useState } from "react";
import { GitBranch, Edit2, Trash2, Save, Plus, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface StageData {
  stage_name: string;
  objectives: string;
  max_time_hours: number;
  checklist: string[];
  dos: string[];
  donts: string[];
}

interface InlineStageProps {
  content: StageData;
  onUpdate: (data: StageData) => void;
  onRemove: () => void;
}

export function InlineStage({ content, onUpdate, onRemove }: InlineStageProps) {
  const [isEditing, setIsEditing] = useState(!content.stage_name);
  const [data, setData] = useState<StageData>({
    stage_name: content.stage_name || "",
    objectives: content.objectives || "",
    max_time_hours: content.max_time_hours || 24,
    checklist: content.checklist || [],
    dos: content.dos || [],
    donts: content.donts || []
  });
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newDo, setNewDo] = useState("");
  const [newDont, setNewDont] = useState("");

  const handleSave = () => {
    if (!data.stage_name.trim()) return;
    onUpdate(data);
    setIsEditing(false);
  };

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setData(prev => ({ ...prev, checklist: [...prev.checklist, newChecklistItem.trim()] }));
      setNewChecklistItem("");
    }
  };

  const addDo = () => {
    if (newDo.trim()) {
      setData(prev => ({ ...prev, dos: [...prev.dos, newDo.trim()] }));
      setNewDo("");
    }
  };

  const addDont = () => {
    if (newDont.trim()) {
      setData(prev => ({ ...prev, donts: [...prev.donts, newDont.trim()] }));
      setNewDont("");
    }
  };

  if (isEditing) {
    return (
      <div className="border rounded-xl p-4 bg-card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="h-5 w-5 text-green-500" />
          <span className="font-semibold">Nova Etapa</span>
        </div>
        
        <Input
          placeholder="Nome da etapa"
          value={data.stage_name}
          onChange={(e) => setData(prev => ({ ...prev, stage_name: e.target.value }))}
        />
        
        <Textarea
          placeholder="Objetivos desta etapa..."
          rows={2}
          value={data.objectives}
          onChange={(e) => setData(prev => ({ ...prev, objectives: e.target.value }))}
        />
        
        <div>
          <label className="text-sm font-medium">Tempo máximo (horas)</label>
          <Input
            type="number"
            min="1"
            className="w-32 mt-1"
            value={data.max_time_hours}
            onChange={(e) => setData(prev => ({ ...prev, max_time_hours: parseInt(e.target.value) || 24 }))}
          />
        </div>

        {/* Checklist */}
        <div>
          <label className="text-sm font-medium mb-2 block">Checklist</label>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Adicionar item..."
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
            />
            <Button type="button" variant="outline" onClick={addChecklistItem}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.checklist.map((item, idx) => (
              <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                {item}
                <button onClick={() => setData(prev => ({ ...prev, checklist: prev.checklist.filter((_, i) => i !== idx) }))}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Do's */}
        <div>
          <label className="text-sm font-medium mb-2 block text-green-600">✓ O que fazer</label>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Adicionar..."
              value={newDo}
              onChange={(e) => setNewDo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDo()}
            />
            <Button type="button" variant="outline" onClick={addDo}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {data.dos.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-green-600">
                <span>✓ {item}</span>
                <button onClick={() => setData(prev => ({ ...prev, dos: prev.dos.filter((_, i) => i !== idx) }))}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Don'ts */}
        <div>
          <label className="text-sm font-medium mb-2 block text-red-600">✗ O que não fazer</label>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Adicionar..."
              value={newDont}
              onChange={(e) => setNewDont(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDont()}
            />
            <Button type="button" variant="outline" onClick={addDont}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {data.donts.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-red-600">
                <span>✗ {item}</span>
                <button onClick={() => setData(prev => ({ ...prev, donts: prev.donts.filter((_, i) => i !== idx) }))}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4 mr-1" />
            Remover
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!data.stage_name.trim()}>
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
          <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
            <GitBranch className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold">{data.stage_name}</h4>
            {data.max_time_hours && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" />
                Máx: {data.max_time_hours}h
              </span>
            )}
            {data.objectives && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{data.objectives}</p>
            )}
            {data.checklist.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium mb-1 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Checklist
                </p>
                <div className="flex flex-wrap gap-1">
                  {data.checklist.slice(0, 3).map((item, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">{item}</Badge>
                  ))}
                  {data.checklist.length > 3 && (
                    <Badge variant="secondary" className="text-xs">+{data.checklist.length - 3}</Badge>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-4 text-xs mt-2">
              {data.dos.length > 0 && (
                <span className="text-green-600">✓ {data.dos.length} do's</span>
              )}
              {data.donts.length > 0 && (
                <span className="text-red-600">✗ {data.donts.length} don'ts</span>
              )}
            </div>
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
