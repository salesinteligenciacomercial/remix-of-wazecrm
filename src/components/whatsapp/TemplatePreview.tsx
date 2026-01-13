import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image, Video, FileText, Phone, ExternalLink, MessageSquare } from "lucide-react";

interface TemplatePreviewProps {
  components: any[];
  name: string;
}

export function TemplatePreview({ components, name }: TemplatePreviewProps) {
  const getHeader = () => components.find(c => c.type === 'HEADER');
  const getBody = () => components.find(c => c.type === 'BODY');
  const getFooter = () => components.find(c => c.type === 'FOOTER');
  const getButtons = () => components.find(c => c.type === 'BUTTONS');

  const header = getHeader();
  const body = getBody();
  const footer = getFooter();
  const buttons = getButtons();

  const renderMediaPlaceholder = (format: string) => {
    const icons: Record<string, any> = {
      IMAGE: Image,
      VIDEO: Video,
      DOCUMENT: FileText
    };
    const Icon = icons[format] || Image;
    
    return (
      <div className="bg-muted rounded-lg p-8 flex items-center justify-center mb-2">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  };

  const highlightVariables = (text: string) => {
    if (!text) return '';
    return text.replace(/\{\{(\d+)\}\}/g, '<span class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">{{$1}}</span>');
  };

  return (
    <div className="space-y-4">
      {/* WhatsApp-like preview container */}
      <div className="bg-[#e5ddd5] dark:bg-gray-800 p-4 rounded-lg">
        <Card className="max-w-[320px] mx-auto bg-white dark:bg-gray-700 shadow-md rounded-lg overflow-hidden">
          {/* Header */}
          {header && (
            <div className="p-3 border-b">
              {header.format && header.format !== 'TEXT' ? (
                renderMediaPlaceholder(header.format)
              ) : header.text ? (
                <p className="font-bold text-sm">{header.text}</p>
              ) : null}
            </div>
          )}

          {/* Body */}
          {body && (
            <div className="p-3">
              <p 
                className="text-sm whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: highlightVariables(body.text || '') }}
              />
            </div>
          )}

          {/* Footer */}
          {footer && footer.text && (
            <div className="px-3 pb-2">
              <p className="text-xs text-muted-foreground">{footer.text}</p>
            </div>
          )}

          {/* Timestamp */}
          <div className="px-3 pb-2 flex justify-end">
            <span className="text-[10px] text-muted-foreground">
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Buttons */}
          {buttons && buttons.buttons && buttons.buttons.length > 0 && (
            <div className="border-t divide-y">
              {buttons.buttons.map((btn: any, index: number) => (
                <button
                  key={index}
                  className="w-full py-3 px-4 text-sm text-blue-500 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center gap-2 transition-colors"
                >
                  {btn.type === 'URL' && <ExternalLink className="h-4 w-4" />}
                  {btn.type === 'PHONE_NUMBER' && <Phone className="h-4 w-4" />}
                  {btn.type === 'QUICK_REPLY' && <MessageSquare className="h-4 w-4" />}
                  {btn.text}
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Template Info */}
      <div className="text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Nome:</span>
          <code className="bg-muted px-2 py-0.5 rounded text-xs">{name}</code>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Componentes:</span>
          <span>{components.length}</span>
        </div>
      </div>

      {/* Variable Examples */}
      {body?.text?.includes('{{') && (
        <div className="border rounded-lg p-3 bg-yellow-50 dark:bg-yellow-900/20">
          <p className="text-sm font-medium mb-2">Variáveis detectadas:</p>
          <div className="text-xs text-muted-foreground">
            {(body.text.match(/\{\{(\d+)\}\}/g) || []).map((v: string, i: number) => (
              <span key={i} className="inline-block mr-2 mb-1">
                <code className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">{v}</code>
                {' → '}
                <span className="italic">Valor dinâmico {i + 1}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}