import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { FileText, Save } from 'lucide-react';

interface PostCallNotesDialogProps {
  open: boolean;
  leadName: string;
  phoneNumber: string;
  duration: number;
  onSave: (notes: string, result: string) => void;
}

const callResults = [
  { value: 'atendida', label: 'Atendida' },
  { value: 'recusada', label: 'Recusada' },
  { value: 'caixa_postal', label: 'Caixa Postal' },
  { value: 'ocupado', label: 'Ocupado' },
  { value: 'nao_atende', label: 'Não Atende' },
  { value: 'numero_invalido', label: 'Número Inválido' },
  { value: 'falha', label: 'Falha na Conexão' }
];

export const PostCallNotesDialog: React.FC<PostCallNotesDialogProps> = ({
  open,
  leadName,
  phoneNumber,
  duration,
  onSave
}) => {
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState('atendida');
  const [isSaving, setIsSaving] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleSave = async () => {
    if (!notes.trim()) return;
    setIsSaving(true);
    await onSave(notes, result);
    setIsSaving(false);
    setNotes('');
    setResult('atendida');
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Resumo da Ligação
          </DialogTitle>
          <DialogDescription>
            Preencha o resumo obrigatório da ligação antes de continuar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Call Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Lead:</span>
              <span className="font-medium">{leadName || 'Desconhecido'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Número:</span>
              <span className="font-medium">{phoneNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duração:</span>
              <span className="font-medium">{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Result Selection */}
          <div className="space-y-2">
            <Label htmlFor="result">Resultado da Ligação</Label>
            <Select value={result} onValueChange={setResult}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o resultado" />
              </SelectTrigger>
              <SelectContent>
                {callResults.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Anotações *</Label>
            <Textarea
              id="notes"
              placeholder="Descreva o que foi tratado na ligação..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Este campo é obrigatório para finalizar a ligação.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={!notes.trim() || isSaving}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar e Finalizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
