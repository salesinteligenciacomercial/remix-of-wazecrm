import { useState, useEffect } from 'react';
import { FileText, Loader2, Eye } from 'lucide-react';

interface PDFPreviewProps {
  url: string;
  fileName?: string;
  onClick?: () => void;
}

export function PDFPreview({ url, fileName, onClick }: PDFPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [showFallback, setShowFallback] = useState(false);

  // Timeout para mostrar fallback se o PDF não carregar em 2 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setShowFallback(true);
        setLoading(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [loading, url]);

  // Reset quando URL muda
  useEffect(() => {
    setLoading(true);
    setShowFallback(false);
  }, [url]);

  return (
    <div 
      className="relative cursor-pointer hover:opacity-90 transition-opacity border border-border rounded-lg overflow-hidden bg-muted/30"
      onClick={onClick}
      style={{ width: '200px', height: '260px' }}
    >
      {/* Loading state */}
      {loading && !showFallback && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <span className="text-xs text-muted-foreground">Carregando...</span>
        </div>
      )}

      {/* Fallback estático - sempre funciona */}
      {showFallback ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-muted/30 to-muted/60 p-4">
          <FileText className="h-16 w-16 text-red-500 mb-3" />
          <p className="text-xs text-center text-muted-foreground font-medium line-clamp-2 px-2">
            {fileName || 'Documento PDF'}
          </p>
          <div className="flex items-center gap-1 mt-3 text-primary bg-background/80 px-3 py-1.5 rounded-full">
            <Eye className="h-3 w-3" />
            <span className="text-xs font-medium">Clique para abrir</span>
          </div>
        </div>
      ) : (
        /* Preview usando iframe com PDF */
        <iframe
          src={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          className="w-full h-full pointer-events-none border-0"
          title={fileName || 'PDF Preview'}
          onLoad={() => {
            setLoading(false);
          }}
          onError={() => {
            setShowFallback(true);
            setLoading(false);
          }}
        />
      )}

      {/* Overlay com nome do arquivo - sempre visível */}
      {!showFallback && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pointer-events-none">
          <div className="text-white text-xs font-medium truncate flex items-center gap-1">
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{fileName || 'Documento PDF'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
