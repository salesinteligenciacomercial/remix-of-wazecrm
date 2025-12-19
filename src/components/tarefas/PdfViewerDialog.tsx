import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PdfViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  fileName: string;
}

export function PdfViewerDialog({ open, onOpenChange, url, fileName }: PdfViewerDialogProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (open && url) {
      loadPdf();
    }
    
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [open, url]);

  const loadPdf = async () => {
    setLoading(true);
    setError(false);
    setBlobUrl(null);
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro ao carregar PDF');
      
      const blob = await response.blob();
      const newBlobUrl = URL.createObjectURL(blob);
      setBlobUrl(newBlobUrl);
    } catch (err) {
      console.error('Erro ao carregar PDF:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      toast.loading('Baixando...', { id: 'pdf-download' });
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro ao baixar');
      
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      toast.success('PDF baixado!', { id: 'pdf-download' });
    } catch (err) {
      console.error('Erro ao baixar:', err);
      toast.error('Erro ao baixar PDF', { id: 'pdf-download' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b flex-row items-center justify-between">
          <DialogTitle className="text-base truncate flex-1 pr-4">{fileName}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8"
            >
              <Download className="h-4 w-4 mr-1" />
              Baixar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="relative h-[75vh] w-full bg-muted">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando PDF...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-center p-8">
                <p className="text-muted-foreground">
                  Não foi possível exibir o PDF no navegador.
                </p>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF
                </Button>
              </div>
            </div>
          )}
          
          {blobUrl && !loading && !error && (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              title={fileName}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
