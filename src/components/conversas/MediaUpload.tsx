import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";

interface MediaUploadProps {
  onFileSelected: (file: File, caption: string, type: string) => void;
}

export function MediaUpload({ onFileSelected }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // ⚡ CORREÇÃO: Determinar tipo do arquivo baseado no mimeType
      let fileType = 'document';
      if (file.type.startsWith('image/')) {
        fileType = 'image';
      } else if (file.type.startsWith('video/')) {
        fileType = 'video';
      } else if (file.type.startsWith('audio/')) {
        fileType = 'audio';
      } else if (file.type === 'application/pdf') {
        fileType = 'pdf';
      }

      onFileSelected(file, '', fileType);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
              <input
                type="file"
        id="media-upload"
                className="hidden"
        onChange={handleFileChange}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        disabled={uploading}
              />
                <Button
        type="button"
        variant="ghost"
                  size="icon"
        onClick={() => document.getElementById('media-upload')?.click()}
                  disabled={uploading}
      >
        <Paperclip className="h-4 w-4" />
                </Button>
              </div>
  );
}
