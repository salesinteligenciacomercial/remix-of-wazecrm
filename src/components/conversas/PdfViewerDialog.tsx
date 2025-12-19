import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, X, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  fileName?: string;
}

export function PdfViewerDialog({ open, onOpenChange, url, fileName }: PdfViewerDialogProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pdfFile, setPdfFile] = useState<string | null>(null);

  useEffect(() => {
    if (open && url) {
      setLoading(true);
      setError(false);
      setCurrentPage(1);
      loadPdf();
    }

    return () => {
      if (pdfFile && pdfFile.startsWith('blob:')) {
        URL.revokeObjectURL(pdfFile);
      }
    };
  }, [open, url]);

  const loadPdf = async () => {
    try {
      // Se já é uma blob URL, usar diretamente
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        setPdfFile(url);
        return;
      }

      // Fazer fetch do PDF e criar blob URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Falha ao carregar PDF');
      }
      
      const blob = await response.blob();
      const newBlobUrl = URL.createObjectURL(blob);
      setPdfFile(newBlobUrl);
    } catch (err) {
      console.error('Erro ao carregar PDF:', err);
      setError(true);
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      toast.info('Iniciando download...');
      
      let downloadUrl = pdfFile || url;
      let createdUrl = false;
      
      // Se não temos blob URL, fazer fetch
      if (!pdfFile?.startsWith('blob:') && !url.startsWith('blob:')) {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Falha ao baixar');
        const blob = await response.blob();
        downloadUrl = URL.createObjectURL(blob);
        createdUrl = true;
      }

      const a = document.createElement('a');
      a.href = downloadUrl!;
      a.download = fileName || 'documento.pdf';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      if (createdUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
      
      toast.success('Download concluído!');
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
      toast.error('Erro ao baixar arquivo');
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < numPages) setCurrentPage(currentPage + 1);
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-600" />
              <DialogTitle className="text-sm font-medium truncate max-w-[200px]">
                {fileName || 'Documento PDF'}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
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
        
        {/* Controls */}
        {!error && numPages > 0 && (
          <div className="flex items-center justify-center gap-4 p-2 border-b bg-background/50 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm min-w-[80px] text-center">
                {currentPage} / {numPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={goToNextPage}
                disabled={currentPage >= numPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={zoomOut}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm min-w-[50px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={zoomIn}
                disabled={scale >= 3}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-muted/30">
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
          
          {pdfFile && (
            <Document
              file={pdfFile}
              onLoadSuccess={({ numPages }) => {
                setNumPages(numPages);
                setLoading(false);
              }}
              onLoadError={(err) => {
                console.error('Erro ao carregar PDF:', err);
                setError(true);
                setLoading(false);
              }}
              loading={null}
              className={loading ? 'hidden' : ''}
            >
              <Page 
                pageNumber={currentPage} 
                scale={scale}
                className="shadow-lg rounded"
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
