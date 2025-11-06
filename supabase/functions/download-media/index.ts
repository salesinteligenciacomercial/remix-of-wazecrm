import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function createMediaResponse(arrayBuffer: ArrayBuffer, mimetype: string) {
  const blob = new Blob([arrayBuffer], { type: mimetype });
  
  return new Response(blob, {
    headers: {
      ...corsHeaders,
      'Content-Type': mimetype,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

// Função para derivar chaves de descriptografia usando HKDF
async function deriveKeys(mediaKey: string, type: string): Promise<{ iv: Uint8Array, cipherKey: Uint8Array, macKey: Uint8Array }> {
  const mediaKeyBuffer = Uint8Array.from(atob(mediaKey), c => c.charCodeAt(0));
  
  const info = type === 'image' ? 'WhatsApp Image Keys' :
               type === 'video' ? 'WhatsApp Video Keys' :
               type === 'audio' ? 'WhatsApp Audio Keys' :
               'WhatsApp Document Keys';
  
  const infoBytes = new TextEncoder().encode(info);
  
  // Importar a mediaKey como chave HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    mediaKeyBuffer.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Gerar 112 bytes de material de chave usando HKDF
  const keyMaterial = new Uint8Array(112);
  let offset = 0;
  let counter = 1;
  
  while (offset < 112) {
    const hmacInput = new Uint8Array([...infoBytes, counter]);
    const hmacResult = await crypto.subtle.sign('HMAC', key, hmacInput);
    const hmacBytes = new Uint8Array(hmacResult);
    const bytesToCopy = Math.min(hmacBytes.length, 112 - offset);
    keyMaterial.set(hmacBytes.slice(0, bytesToCopy), offset);
    offset += bytesToCopy;
    counter++;
  }
  
  return {
    iv: keyMaterial.slice(0, 16),
    cipherKey: keyMaterial.slice(16, 48),
    macKey: keyMaterial.slice(48, 80)
  };
}

// Função para descriptografar mídia
async function decryptMedia(encryptedData: ArrayBuffer, keys: { iv: Uint8Array, cipherKey: Uint8Array, macKey: Uint8Array }): Promise<ArrayBuffer> {
  const encryptedBytes = new Uint8Array(encryptedData);
  
  // Verificar MAC (últimos 10 bytes)
  const mac = encryptedBytes.slice(-10);
  const ciphertext = encryptedBytes.slice(0, -10);
  
  // Importar cipherKey para AES-CBC
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keys.cipherKey.buffer as ArrayBuffer,
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );
  
  // Descriptografar
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: keys.iv.buffer as ArrayBuffer },
    cryptoKey,
    ciphertext
  );
  
  return decrypted;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 [DOWNLOAD-MEDIA] Iniciando download de mídia...');

    const body = await req.json();
    
    // Se receber dados de mídia criptografada (url, mediaKey, etc)
    if (body.url && body.mediaKey) {
      console.log('🔓 [DOWNLOAD-MEDIA] Descriptografando mídia criptografada');
      console.log('📡 [DOWNLOAD-MEDIA] URL:', body.url);
      console.log('🔑 [DOWNLOAD-MEDIA] Tipo:', body.type);
      
      // Baixar mídia criptografada
      const response = await fetch(body.url);
      if (!response.ok) {
        throw new Error(`Erro ao baixar mídia: ${response.status}`);
      }
      
      const encryptedData = await response.arrayBuffer();
      console.log('📦 [DOWNLOAD-MEDIA] Dados criptografados baixados:', encryptedData.byteLength, 'bytes');
      
      // Derivar chaves de descriptografia
      const keys = await deriveKeys(body.mediaKey, body.type);
      console.log('🔑 [DOWNLOAD-MEDIA] Chaves derivadas');
      
      // Descriptografar
      const decryptedData = await decryptMedia(encryptedData, keys);
      console.log('✅ [DOWNLOAD-MEDIA] Mídia descriptografada:', decryptedData.byteLength, 'bytes');
      
      return createMediaResponse(decryptedData, body.mimetype);
    }
    
    // Se receber messageId (modo legado)
    if (body.messageId) {
      console.log('🔍 [DOWNLOAD-MEDIA] Buscando mensagem:', body.messageId);

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: message, error: msgError } = await supabase
        .from('conversas')
        .select('midia_url, tipo_mensagem')
        .eq('id', body.messageId)
        .single();

      if (msgError || !message) {
        console.error('❌ [DOWNLOAD-MEDIA] Mensagem não encontrada:', msgError);
        throw new Error('Mensagem não encontrada');
      }

      if (!message.midia_url) {
        throw new Error('Mensagem não possui mídia');
      }

      // Se for data URI, retornar direto
      if (message.midia_url.startsWith('data:')) {
        const [header, base64Data] = message.midia_url.split(',');
        const mimetype = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return createMediaResponse(bytes.buffer, mimetype);
      }

      // Tentar download direto
      const response = await fetch(message.midia_url);
      if (response.ok) {
        const binaryData = await response.arrayBuffer();
        return createMediaResponse(binaryData, response.headers.get('content-type') || 'application/octet-stream');
      }
      
      throw new Error('Não foi possível baixar a mídia');
    }
    
    throw new Error('Dados insuficientes para download');

  } catch (error) {
    console.error('❌ [DOWNLOAD-MEDIA] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
