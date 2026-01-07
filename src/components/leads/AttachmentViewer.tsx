import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  X, 
  ZoomIn, 
  ZoomOut,
  Calendar,
  FileText
} from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { downloadFile } from '@/utils/downloadFile';
import type { LeadAttachment } from './LeadAttachments';

interface AttachmentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachment: LeadAttachment;
  allAttachments: LeadAttachment[];
  onNavigate: (attachment: LeadAttachment) => void;
}

export function AttachmentViewer({
  open,
  onOpenChange,
  attachment,
  allAttachments,
  onNavigate
}: AttachmentViewerProps) {
  const [zoom, setZoom] = useState(1);
  const currentIndex = allAttachments.findIndex(a => a.id === attachment.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allAttachments.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      onNavigate(allAttachments[currentIndex - 1]);
      setZoom(1);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onNavigate(allAttachments[currentIndex + 1]);
      setZoom(1);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'antes': return 'bg-orange-500/10 text-orange-500';
      case 'depois': return 'bg-green-500/10 text-green-500';
      case 'durante': return 'bg-blue-500/10 text-blue-500';
      case 'exame': return 'bg-purple-500/10 text-purple-500';
      case 'laudo': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleDownload = () => {
    downloadFile(attachment.file_url, attachment.file_name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'Escape') onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-5xl max-h-[95vh] p-0 overflow-hidden" 
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              {attachment.category && (
                <Badge className={getCategoryColor(attachment.category)}>
                  {attachment.category.charAt(0).toUpperCase() + attachment.category.slice(1)}
                </Badge>
              )}
              <span className="font-medium">{attachment.file_name}</span>
            </div>
            <div className="flex items-center gap-2">
              {attachment.file_type === 'image' && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={handleZoomOut}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs">{Math.round(zoom * 100)}%</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={handleZoomIn}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        {hasPrev && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}
        {hasNext && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
            onClick={handleNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}

        {/* Content */}
        <div className="flex items-center justify-center min-h-[500px] bg-black/90 overflow-auto">
          {attachment.file_type === 'image' ? (
            <img
              src={attachment.file_url}
              alt={attachment.file_name}
              className="max-w-full max-h-[80vh] object-contain transition-transform"
              style={{ transform: `scale(${zoom})` }}
            />
          ) : attachment.file_type === 'video' ? (
            <video
              src={attachment.file_url}
              controls
              autoPlay
              className="max-w-full max-h-[80vh]"
            />
          ) : attachment.file_type === 'audio' ? (
            <div className="p-8">
              <audio src={attachment.file_url} controls autoPlay className="w-80" />
            </div>
          ) : (
            <div className="p-8 text-center text-white">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="mb-4">{attachment.file_name}</p>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Baixar Arquivo
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between text-white text-sm">
            <div className="flex items-center gap-4">
              {attachment.treatment_name && (
                <span>Tratamento: {attachment.treatment_name}</span>
              )}
              {attachment.treatment_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(attachment.treatment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              )}
            </div>
            <span className="opacity-70">
              {currentIndex + 1} de {allAttachments.length}
            </span>
          </div>
          {attachment.description && (
            <p className="text-white/70 text-xs mt-2">{attachment.description}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
