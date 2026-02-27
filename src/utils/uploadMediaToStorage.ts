/**
 * Upload media files to Supabase Storage instead of saving Base64 in the database.
 * This prevents storage bloat from large Base64 strings in the conversas table.
 */
import { supabase } from "@/integrations/supabase/client";

/**
 * Sanitize filename to avoid Storage InvalidKey errors
 */
function sanitizeFileName(name: string): string {
  const withoutAccents = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return withoutAccents.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
}

/**
 * Upload a file (or blob) to the conversation-media bucket and return the public URL.
 * 
 * @param file - File or Blob to upload
 * @param companyId - Company ID for path namespacing
 * @param options - Optional fileName and contentType overrides
 * @returns Public URL string of the uploaded file
 */
export async function uploadMediaToStorage(
  file: File | Blob,
  companyId: string,
  options?: { fileName?: string; contentType?: string }
): Promise<string> {
  const timestamp = Date.now();
  const fileName = options?.fileName || (file instanceof File ? file.name : `media_${timestamp}`);
  const sanitized = sanitizeFileName(fileName);
  const filePath = `${companyId}/${timestamp}_${sanitized}`;

  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('conversation-media')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: options?.contentType || (file instanceof File ? file.type : undefined),
    });

  if (uploadError) {
    console.error('❌ [UPLOAD-STORAGE] Erro ao fazer upload:', uploadError);
    throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase
    .storage
    .from('conversation-media')
    .getPublicUrl(uploadData.path);

  console.log('✅ [UPLOAD-STORAGE] Upload concluído:', { path: uploadData.path, url: publicUrl });
  return publicUrl;
}
