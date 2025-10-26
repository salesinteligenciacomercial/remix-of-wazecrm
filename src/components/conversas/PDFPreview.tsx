import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configurar o worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFPreviewProps {
  url: string;
  fileName?: string;
  onClick?: () => void;
}

export function PDFPreview({ url, fileName, onClick }: PDFPreviewProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
    setError(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error('Erro ao carregar PDF:', error);
    setError(true);
    setLoading(false);
  }

  return (
    <div 
      className="relative cursor-pointer hover:opacity-90 transition-opacity border border-border rounded overflow-hidden bg-muted/30"
      onClick={onClick}
      style={{ width: '200px', height: '260px' }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 p-4">
          <FileText className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-xs text-center text-muted-foreground">
            {fileName || 'Documento PDF'}
          </p>
        </div>
      )}

      {!error && (
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading=""
        >
          <Page
            pageNumber={1}
            width={200}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading=""
          />
        </Document>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2 pointer-events-none">
        <div className="text-white text-xs font-medium truncate w-full">
          <FileText className="h-4 w-4 inline mr-1" />
          {fileName || 'Documento PDF'}
          {numPages && <span className="ml-1 opacity-70">({numPages} pág{numPages > 1 ? 's' : ''})</span>}
        </div>
      </div>
    </div>
  );
}