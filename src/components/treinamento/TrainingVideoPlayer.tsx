import { Card } from "@/components/ui/card";

interface TrainingVideoPlayerProps {
  videoId: string | null;
  title?: string;
}

export function TrainingVideoPlayer({ videoId, title }: TrainingVideoPlayerProps) {
  if (!videoId) {
    return (
      <Card className="aspect-video flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">Selecione uma aula para assistir</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {title && (
        <h3 className="font-semibold text-lg">{title}</h3>
      )}
      <Card className="overflow-hidden">
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?rel=0`}
            title={title || "Video de treinamento"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </Card>
    </div>
  );
}
