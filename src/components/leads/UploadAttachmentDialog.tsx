import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Image, Video, FileText, Music, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface UploadAttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  companyId: string;
  onUploadComplete: () => void;
  existingTreatments?: string[];
}

const CATEGORIES = [
  { value: 'antes', label: 'Antes' },
  { value: 'depois', label: 'Depois' },
  { value: 'durante', label: 'Durante' },
  { value: 'exame', label: 'Exame' },
  { value: 'laudo', label: 'Laudo' },
  { value: 'outros', label: 'Outros' }
];

interface FilePreview {
  file: File;
  preview: string;
  type: string;
}

export function UploadAttachmentDialog({
  open,
  onOpenChange,
  leadId,
  companyId,
  onUploadComplete,
  existingTreatments = []
}: UploadAttachmentDialogProps) {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [category, setCategory] = useState('');
  const [treatmentName, setTreatmentName] = useState('');
  const [treatmentDate, setTreatmentDate] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const getFileType = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: FilePreview[] = Array.from(fileList).map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      type: getFileType(file.type)
    }));
    setFiles(prev => [...prev, ...newFiles].slice(0, 10)); // Max 10 files
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Selecione pelo menos um arquivo');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const totalFiles = files.length;
      let uploaded = 0;

      for (const filePreview of files) {
        const file = filePreview.file;
        const fileExt = file.name.split('.').pop();
        const fileName = `${leadId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('lead-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('lead-attachments')
          .getPublicUrl(fileName);

        // Insert record
        const { error: insertError } = await supabase
          .from('lead_attachments')
          .insert({
            lead_id: leadId,
            company_id: companyId,
            file_name: file.name,
            file_url: publicUrl,
            file_type: filePreview.type,
            file_size: file.size,
            mime_type: file.type,
            category: category || null,
            description: description || null,
            treatment_name: treatmentName || null,
            treatment_date: treatmentDate || null,
            uploaded_by: user?.id
          });

        if (insertError) throw insertError;

        uploaded++;
        setProgress((uploaded / totalFiles) * 100);
      }

      toast.success(`${uploaded} arquivo(s) enviado(s) com sucesso`);
      onUploadComplete();
      handleClose();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar arquivos');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    files.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    setCategory('');
    setTreatmentName('');
    setTreatmentDate('');
    setDescription('');
    setProgress(0);
    onOpenChange(false);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Adicionar Arquivos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Arraste arquivos aqui ou
            </p>
            <label className="cursor-pointer">
              <span className="text-primary hover:underline text-sm">selecione do computador</span>
              <input
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.pdf"
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </label>
            <p className="text-xs text-muted-foreground mt-2">
              Máximo 10 arquivos, 50MB cada
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  {file.preview ? (
                    <img src={file.preview} alt="" className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-background flex items-center justify-center">
                      {getFileIcon(file.type)}
                    </div>
                  )}
                  <span className="text-sm flex-1 truncate">{file.file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.file.size / 1024 / 1024).toFixed(1)}MB
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data do Tratamento</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={treatmentDate}
                  onChange={(e) => setTreatmentDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nome do Tratamento/Procedimento</Label>
            <Input
              value={treatmentName}
              onChange={(e) => setTreatmentName(e.target.value)}
              placeholder="Ex: Botox, Preenchimento Labial..."
              list="treatments"
            />
            {existingTreatments.length > 0 && (
              <datalist id="treatments">
                {existingTreatments.map(t => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            )}
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Observações sobre o arquivo..."
              rows={2}
            />
          </div>

          {/* Progress */}
          {uploading && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Enviando... {Math.round(progress)}%
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={uploading || files.length === 0}>
            {uploading ? 'Enviando...' : `Enviar ${files.length} arquivo(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
