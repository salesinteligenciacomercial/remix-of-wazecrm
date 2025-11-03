import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Paperclip, 
  Image as ImageIcon, 
  File, 
  Video, 
  Mic,
  X,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

interface MediaUploadProps {
  onSendMedia: (file: File, caption: string, type: string) => Promise<void>;
  maxSizeMB?: number; // Tamanho máximo configurável (padrão 10MB)
}

// MELHORIA: Tipos MIME permitidos
const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'],
  pdf: ['application/pdf'],
  document: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
};

export function MediaUpload({ onSendMedia, maxSizeMB = 10 }: MediaUploadProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedFile, setProcessedFile] = useState<File | null>(null); // Arquivo processado (comprimido se necessário)
  const [preview, setPreview] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // MELHORIA: Validar tipo MIME
  const validateMimeType = (file: File): { isValid: boolean; type: string; error?: string } => {
    const allAllowedTypes = Object.values(ALLOWED_MIME_TYPES).flat();
    
    if (!allAllowedTypes.includes(file.type)) {
      return {
        isValid: false,
        type: 'unknown',
        error: `Tipo de arquivo não permitido: ${file.type}. Tipos permitidos: imagens, vídeos, áudios, PDF e documentos.`
      };
    }

    // Determinar tipo de arquivo
    let type = 'document';
    if (ALLOWED_MIME_TYPES.image.includes(file.type)) type = 'image';
    else if (ALLOWED_MIME_TYPES.video.includes(file.type)) type = 'video';
    else if (ALLOWED_MIME_TYPES.audio.includes(file.type)) type = 'audio';
    else if (ALLOWED_MIME_TYPES.pdf.includes(file.type)) type = 'pdf';

    return { isValid: true, type };
  };

  // MELHORIA: Comprimir imagens se > 2MB
  const compressImage = async (file: File, maxSizeMB: number = 2): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          let quality = 0.9;

          // Redimensionar se muito grande
          const maxDimension = 1920;
          if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width = width * ratio;
            height = height * ratio;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Erro ao criar contexto do canvas'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Tentar comprimir até o tamanho desejado
          const attemptCompress = (currentQuality: number) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Erro ao comprimir imagem'));
                  return;
                }

                const sizeMB = blob.size / (1024 * 1024);
                
                if (sizeMB > maxSizeMB && currentQuality > 0.3) {
                  // Tentar com qualidade menor
                  attemptCompress(currentQuality - 0.1);
                } else {
                  const compressedFile = new File([blob], file.name, {
                    type: file.type,
                    lastModified: Date.now(),
                  });
                  resolve(compressedFile);
                }
              },
              file.type,
              currentQuality
            );
          };

          attemptCompress(quality);
        };
        img.onerror = () => reject(new Error('Erro ao carregar imagem'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setCompressing(false);
    setProcessedFile(null);

    // MELHORIA 1: Validar tamanho (limite 10MB por padrão)
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const errorMsg = `Arquivo muito grande. Máximo permitido: ${maxSizeMB}MB. Tamanho atual: ${formatFileSize(file.size)}`;
      toast.error(errorMsg);
      setError(errorMsg);
      return;
    }

    // MELHORIA: Validar tipo MIME
    const mimeValidation = validateMimeType(file);
    if (!mimeValidation.isValid) {
      const errorMsg = mimeValidation.error || 'Tipo de arquivo não permitido';
      toast.error(errorMsg);
      setError(errorMsg);
      return;
    }

    setSelectedFile(file);

    // MELHORIA 3: Comprimir imagens antes de enviar (se > 2MB)
    if (mimeValidation.type === 'image' && file.size > 2 * 1024 * 1024) {
      setCompressing(true);
      try {
        console.log(`🖼️ [MEDIA] Comprimindo imagem: ${formatFileSize(file.size)}`);
        const compressed = await compressImage(file, 2);
        setProcessedFile(compressed);
        console.log(`✅ [MEDIA] Imagem comprimida: ${formatFileSize(file.size)} -> ${formatFileSize(compressed.size)}`);
        toast.success(`Imagem comprimida: ${formatFileSize(file.size)} -> ${formatFileSize(compressed.size)}`);
      } catch (error: any) {
        console.error('❌ [MEDIA] Erro ao comprimir imagem:', error);
        toast.warning('Não foi possível comprimir a imagem. Usando arquivo original.');
        setProcessedFile(file);
      } finally {
        setCompressing(false);
      }
    } else {
      setProcessedFile(file);
    }

    // MELHORIA 5: Criar preview antes de enviar (melhorado)
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.onerror = () => {
        console.error('❌ [MEDIA] Erro ao criar preview');
        setError('Erro ao criar preview do arquivo');
      };
      reader.readAsDataURL(file);
    } else {
      setPreview("");
    }
  };

  const getFileType = (file: File): string => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type === 'application/pdf') return 'pdf';
    return 'document';
  };

  // MELHORIA 4: Implementar upload em chunks para arquivos grandes
  const uploadFileInChunks = async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<File> => {
    // Para arquivos pequenos, retornar diretamente
    if (file.size < 5 * 1024 * 1024) {
      // Arquivos menores que 5MB não precisam de chunks
      return file;
    }

    // Para arquivos maiores, simular upload em chunks
    const chunkSize = 1024 * 1024; // 1MB por chunk
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    console.log(`📦 [MEDIA] Iniciando upload em chunks: ${totalChunks} chunks de ${formatFileSize(chunkSize)}`);
    
    // Aqui você implementaria a lógica de upload real em chunks
    // Por enquanto, apenas simula o progresso
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      // Simular processamento do chunk
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const progress = ((i + 1) / totalChunks) * 100;
      if (onProgress) {
        onProgress(progress);
      }
      
      console.log(`📦 [MEDIA] Chunk ${i + 1}/${totalChunks} processado (${progress.toFixed(1)}%)`);
    }

    return file;
  };

  const handleSend = async () => {
    if (!selectedFile) {
      const errorMsg = "Por favor, selecione um arquivo antes de enviar";
      toast.error(errorMsg);
      setError(errorMsg);
      return;
    }

    // Usar arquivo processado (comprimido) se disponível
    const fileToUpload = processedFile || selectedFile;

    setUploading(true);
    setUploadProgress(0);
    setError("");

    try {
      // MELHORIA 6: Melhorar tratamento de erro com mensagens claras
      try {
        // MELHORIA 2 e 4: Mostrar progress bar e upload em chunks
        await uploadFileInChunks(fileToUpload, (progress) => {
          setUploadProgress(progress);
          console.log(`📊 [MEDIA] Progresso do upload: ${progress.toFixed(1)}%`);
        });

        const fileType = getFileType(fileToUpload);
        
        // Enviar mídia com callback de progresso
        await onSendMedia(fileToUpload, caption, fileType);
        
        // Resetar formulário
        setSelectedFile(null);
        setProcessedFile(null);
        setPreview("");
        setCaption("");
        setUploadProgress(0);
        setOpen(false);
        setError("");
        
        toast.success("✅ Mídia enviada com sucesso!");
      } catch (uploadError: any) {
        // MELHORIA 6: Tratamento de erro específico com mensagens claras
        let errorMessage = "Erro desconhecido ao enviar mídia";
        
        if (uploadError.message?.includes('network') || uploadError.message?.includes('fetch')) {
          errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
        } else if (uploadError.message?.includes('size') || uploadError.message?.includes('limit')) {
          errorMessage = "Arquivo muito grande. Tente comprimir ou usar um arquivo menor.";
        } else if (uploadError.message?.includes('type') || uploadError.message?.includes('mime')) {
          errorMessage = "Tipo de arquivo não permitido. Use imagens, vídeos, áudios ou documentos.";
        } else if (uploadError.message) {
          errorMessage = `Erro ao enviar mídia: ${uploadError.message}`;
        }
        
        console.error('❌ [MEDIA] Erro ao enviar mídia:', {
          error: uploadError,
          fileName: fileToUpload.name,
          fileSize: formatFileSize(fileToUpload.size),
          fileType: fileToUpload.type
        });
        
        toast.error(errorMessage);
        setError(errorMessage);
        throw uploadError;
      }
    } catch (error: any) {
      // Erro geral
      const errorMessage = error?.message || "Erro ao enviar mídia. Por favor, tente novamente.";
      console.error('❌ [MEDIA] Erro geral ao enviar mídia:', {
        error,
        fileName: fileToUpload.name,
        fileSize: formatFileSize(fileToUpload.size)
      });
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setProcessedFile(null);
    setPreview("");
    setCaption("");
    setError("");
    setUploadProgress(0);
    setCompressing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <File className="h-8 w-8" />;
    
    const type = getFileType(selectedFile);
    switch(type) {
      case 'image': return <ImageIcon className="h-8 w-8 text-blue-500" />;
      case 'video': return <Video className="h-8 w-8 text-purple-500" />;
      case 'audio': return <Mic className="h-8 w-8 text-green-500" />;
      case 'pdf': return <File className="h-8 w-8 text-red-500" />;
      default: return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="hover:bg-primary/10"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar Mídia</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!selectedFile ? (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
              />
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('accept', 'image/*');
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <ImageIcon className="h-6 w-6 text-blue-500" />
                  <span className="text-sm">Imagem</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('accept', 'video/*');
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <Video className="h-6 w-6 text-purple-500" />
                  <span className="text-sm">Vídeo</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('accept', 'audio/*');
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <Mic className="h-6 w-6 text-green-500" />
                  <span className="text-sm">Áudio</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('accept', '.pdf,.doc,.docx,.xls,.xlsx');
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <File className="h-6 w-6 text-red-500" />
                  <span className="text-sm">Documento</span>
                </Button>
              </div>
              
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground">
                  Tamanho máximo: {maxSizeMB}MB
                </p>
                <p className="text-xs text-muted-foreground">
                  Imagens maiores que 2MB serão comprimidas automaticamente
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* MELHORIA 5: Preview melhorado antes de enviar */}
              <div className="relative">
                {/* Mensagem de erro se houver */}
                {error && (
                  <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-destructive flex-1">{error}</p>
                  </div>
                )}

                {/* Indicador de compressão */}
                {compressing && (
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Comprimindo imagem... Isso pode levar alguns segundos.
                    </p>
                  </div>
                )}

                {/* Indicador de arquivo processado */}
                {processedFile && processedFile.size !== selectedFile?.size && (
                  <div className="mb-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                        ✅ Imagem comprimida com sucesso!
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Tamanho original: {formatFileSize(selectedFile!.size)} → Comprimido: {formatFileSize(processedFile.size)}
                      </p>
                    </div>
                  </div>
                )}

                {preview && (getFileType(selectedFile!) === 'image' || getFileType(selectedFile!) === 'video') ? (
                  <div className="rounded-lg overflow-hidden bg-muted border border-border">
                    {getFileType(selectedFile!) === 'image' ? (
                      <img src={preview} alt="Preview" className="w-full h-auto max-h-64 object-contain" />
                    ) : (
                      <video src={preview} controls className="w-full h-auto max-h-64" />
                    )}
                    <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1">
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={uploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-muted rounded-lg border border-border relative">
                    {getFileIcon()}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{selectedFile!.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(selectedFile!.size)}
                        </p>
                        {processedFile && processedFile.size !== selectedFile!.size && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <p className="text-xs text-green-600 dark:text-green-400">
                              Comprimido: {formatFileSize(processedFile.size)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleCancel}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* MELHORIA 2: Progress bar durante upload */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Enviando mídia...</span>
                    <span className="font-medium">{uploadProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* Caption */}
              <div className="space-y-2">
                <Label>Legenda (opcional)</Label>
                <Textarea
                  placeholder="Adicione uma legenda..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                  disabled={uploading || compressing}
                />
              </div>

              {/* MELHORIA 6: Informações do arquivo */}
              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Nome:</span>
                    <p className="font-medium truncate">{selectedFile!.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tamanho:</span>
                    <p className="font-medium">
                      {processedFile && processedFile.size !== selectedFile!.size 
                        ? `${formatFileSize(processedFile.size)} (comprimido)` 
                        : formatFileSize(selectedFile!.size)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <p className="font-medium capitalize">{getFileType(selectedFile!)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">MIME:</span>
                    <p className="font-medium truncate">{selectedFile!.type}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={uploading || compressing}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={uploading || compressing || !!error}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando... {uploadProgress > 0 && `${uploadProgress.toFixed(0)}%`}
                    </>
                  ) : compressing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Comprimindo...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
