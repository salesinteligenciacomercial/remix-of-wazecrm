import { CheckCircle2, Circle, Clock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrainingLesson } from "@/hooks/useTraining";
import { cn } from "@/lib/utils";

interface TrainingLessonListProps {
  lessons: TrainingLesson[];
  selectedLessonId?: string;
  onSelectLesson: (lesson: TrainingLesson) => void;
  onMarkComplete?: (lessonId: string) => void;
}

export function TrainingLessonList({ 
  lessons, 
  selectedLessonId, 
  onSelectLesson,
  onMarkComplete 
}: TrainingLessonListProps) {
  if (lessons.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhuma aula disponível neste módulo</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-2">
        {lessons.map((lesson, index) => (
          <div
            key={lesson.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent/50",
              selectedLessonId === lesson.id && "bg-accent border-primary"
            )}
            onClick={() => onSelectLesson(lesson)}
          >
            <div className="flex-shrink-0 mt-0.5">
              {lesson.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : selectedLessonId === lesson.id ? (
                <Play className="h-5 w-5 text-primary" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">
                  Aula {index + 1}
                </span>
                {lesson.duration_minutes && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {lesson.duration_minutes} min
                  </span>
                )}
              </div>
              <h4 className="font-medium text-sm line-clamp-1">{lesson.title}</h4>
              {lesson.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {lesson.description}
                </p>
              )}
            </div>
            
            {!lesson.completed && onMarkComplete && selectedLessonId === lesson.id && (
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkComplete(lesson.id);
                }}
              >
                Concluir
              </Button>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
