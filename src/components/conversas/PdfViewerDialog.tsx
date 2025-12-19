import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, X, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface PdfViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  fileName?: string;
}

export function PdfViewerDialog({ open, onOpenChange, url, fileName }: PdfViewerDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && url) {
      setLoading(true);
      setError(false);
      loadPdf();
    }

    return () => {
      // Cleanup blob URL when dialog closes
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
    };
  }, [open, url]);

  const loadPdf = async () => {
    try {
      // Se já é uma blob URL, usar diretamente
      if (url.startsWith('blob:')) {
        setBlobUrl(url);
        setLoading(false);
        return;
      }

      // Fazer fetch do PDF e criar blob URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Falha ao carregar PDF');
      }
      
      const blob = await response.blob();
      const newBlobUrl = URL.createObjectURL(blob);
      setBlobUrl(newBlobUrl);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar PDF:', err);
      setError(true);
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      toast.info('Iniciando download...');
      
      let downloadUrl = blobUrl || url;
      
      // Se não temos blob URL, fazer fetch
      if (!blobUrl && !url.startsWith('blob:')) {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Falha ao baixar');
        const blob = await response.blob();
        downloadUrl = URL.createObjectURL(blob);
      }

      const a = document.createElement('a');
      a.href = downloadUrl!;
      a.download = fileName || 'documento.pdf';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Cleanup se criamos uma nova URL
      if (downloadUrl !== blobUrl && downloadUrl !== url) {
        URL.revokeObjectURL(downloadUrl);
      }
      
      toast.success('Download concluído!');
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
      toast.error('Erro ao baixar arquivo');
    }
  };

  const handleOpenExternal = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-600" />
              <DialogTitle className="text-sm font-medium truncate max-w-[300px]">
                {fileName || 'Documento PDF'}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenExternal}
                className="gap-1"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Abrir em nova aba</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-1"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Baixar</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden bg-muted/30">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando PDF...</p>
            </div>
          )}
          
          {error && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Não foi possível carregar o PDF</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadPdf}>
                  Tentar novamente
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar arquivo
                </Button>
              </div>
            </div>
          )}
          
          {!loading && !error && blobUrl && (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              title={fileName || 'Documento PDF'}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
