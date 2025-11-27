-- FASE 2: Criar Storage Bucket para mídia de conversas

-- Criar bucket público para armazenar mídias das conversas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conversation-media',
  'conversation-media',
  true,
  52428800, -- 50MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
);

-- Política: Usuários autenticados podem fazer upload
CREATE POLICY "Authenticated users upload media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'conversation-media');

-- Política: Todos podem visualizar mídia (públicas)
CREATE POLICY "Public media access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'conversation-media');

-- Política: Usuários podem deletar suas próprias mídias
CREATE POLICY "Users delete own media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'conversation-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);