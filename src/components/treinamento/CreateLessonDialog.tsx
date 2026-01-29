import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractYouTubeId } from "@/hooks/useTraining";
import { Youtube, AlertCircle, CheckCircle2 } from "lucide-react";

interface CreateLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { 
    title: string; 
    description?: string; 
    youtube_url: string;
    duration_minutes?: number;
  }) => Promise<void>;
  editingLesson?: { 
    id: string; 
    title: string; 
    description: string | null; 
    youtube_url: string;
    duration_minutes: number | null;
  } | null;
}

export function CreateLessonDialog({ 
  open, 
  onOpenChange, 
  onSubmit,
  editingLesson 
}: CreateLessonDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);

  const videoId = extractYouTubeId(youtubeUrl);
  const isValidUrl = youtubeUrl.length > 0 && videoId !== null;

  useEffect(() => {
    if (editingLesson) {
      setTitle(editingLesson.title);
      setDescription(editingLesson.description || "");
      setYoutubeUrl(editingLesson.youtube_url);
      setDurationMinutes(editingLesson.duration_minutes || undefined);
    } else {
      setTitle("");
      setDescription("");
      setYoutubeUrl("");
      setDurationMinutes(undefined);
    }
  }, [editingLesson, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !isValidUrl) return;
    
    setLoading(true);
    try {
      await onSubmit({ 
        title, 
        description: description || undefined, 
        youtube_url: youtubeUrl,
        duration_minutes: durationMinutes
      });
      setTitle("");
      setDescription("");
      setYoutubeUrl("");
      setDurationMinutes(undefined);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            {editingLesson ? "Editar Aula" : "Adicionar Aula"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título da Aula *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Como cadastrar leads"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="youtube_url">Link do YouTube *</Label>
            <div className="relative">
              <Input
                id="youtube_url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className={youtubeUrl.length > 0 ? (isValidUrl ? "border-green-500 pr-10" : "border-red-500 pr-10") : ""}
                required
              />
              {youtubeUrl.length > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isValidUrl ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {youtubeUrl.length > 0 && !isValidUrl && (
              <p className="text-xs text-red-500">
                URL inválida. Use um link do YouTube válido.
              </p>
            )}
            {isValidUrl && (
              <p className="text-xs text-muted-foreground">
                ID do vídeo: {videoId}
              </p>
            )}
          </div>

          {/* Preview do vídeo */}
          {isValidUrl && (
            <div className="rounded-lg overflow-hidden border">
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="Preview"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="duration">Duração (minutos)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={durationMinutes || ""}
              onChange={(e) => setDurationMinutes(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Ex: 15"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o conteúdo desta aula..."
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !title.trim() || !isValidUrl}>
              {loading ? "Salvando..." : editingLesson ? "Salvar" : "Adicionar Aula"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
