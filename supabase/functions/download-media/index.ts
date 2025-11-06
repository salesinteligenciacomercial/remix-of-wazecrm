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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 [DOWNLOAD-MEDIA] Iniciando download de mídia...');

    const body = await req.json();
    
    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Se receber dados de mídia criptografada (url, mediaKey da Evolution API)
    if (body.url && body.mediaKey && body.company_id) {
      console.log('🔓 [DOWNLOAD-MEDIA] Baixando mídia via Evolution API');
      console.log('📡 [DOWNLOAD-MEDIA] URL:', body.url);
      
      // Buscar configuração da instância WhatsApp
      const { data: whatsappConfig } = await supabase
        .from('whatsapp_connections')
        .select('instance_name, evolution_api_url, evolution_api_key')
        .eq('company_id', body.company_id)
        .eq('status', 'connected')
        .single();

      if (!whatsappConfig) {
        console.warn('⚠️ [DOWNLOAD-MEDIA] Instância não encontrada, tentando acesso direto...');
        // Tentar acesso direto como fallback
        const response = await fetch(body.url);
        if (response.ok) {
          const binaryData = await response.arrayBuffer();
          return createMediaResponse(binaryData, body.mimetype || 'application/octet-stream');
        }
        throw new Error('Instância WhatsApp não configurada e acesso direto falhou');
      }

      console.log('🔄 [DOWNLOAD-MEDIA] Usando Evolution API:', whatsappConfig.instance_name);
      
      // Usar endpoint correto da Evolution API para baixar mídia
      const evolutionUrl = `${whatsappConfig.evolution_api_url}/chat/downloadMediaMessage/${whatsappConfig.instance_name}`;
      
      const response = await fetch(evolutionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': whatsappConfig.evolution_api_key,
        },
        body: JSON.stringify({
          messageId: body.messageId,
          convertToMp4: body.type === 'video'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DOWNLOAD-MEDIA] Erro Evolution API:', response.status, errorText);
        throw new Error(`Erro ao baixar mídia: ${response.status}`);
      }

      const mediaData = await response.json();
      console.log('✅ [DOWNLOAD-MEDIA] Resposta Evolution API recebida');

      if (mediaData.base64) {
        // Converter base64 para ArrayBuffer
        const base64Data = mediaData.base64.includes(',') 
          ? mediaData.base64.split(',')[1] 
          : mediaData.base64;
        
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        console.log('✅ [DOWNLOAD-MEDIA] Mídia processada com sucesso');
        return createMediaResponse(bytes.buffer, body.mimetype);
      }
      
      throw new Error('Mídia não retornada pela API');
    }
    
    // Se receber messageId (modo legado - buscar do banco)
    if (body.messageId) {
      console.log('🔍 [DOWNLOAD-MEDIA] Buscando mensagem:', body.messageId);

      const { data: message, error: msgError } = await supabase
        .from('conversas')
        .select('midia_url, tipo_mensagem, company_id')
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

      // Se for JSON com metadados, processar via Evolution API
      try {
        const mediaData = JSON.parse(message.midia_url);
        if (mediaData.url && mediaData.mediaKey && mediaData.messageId) {
          console.log('🔓 [DOWNLOAD-MEDIA] Processando mídia criptografada do banco');
          
          // Buscar configuração da instância WhatsApp
          const { data: whatsappConfig } = await supabase
            .from('whatsapp_connections')
            .select('instance_name, evolution_api_url, evolution_api_key')
            .eq('company_id', message.company_id)
            .eq('status', 'connected')
            .single();

          if (whatsappConfig) {
            const evolutionUrl = `${whatsappConfig.evolution_api_url}/chat/downloadMediaMessage/${whatsappConfig.instance_name}`;
            
            const evolutionResponse = await fetch(evolutionUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': whatsappConfig.evolution_api_key,
              },
              body: JSON.stringify({
                messageId: mediaData.messageId,
                convertToMp4: mediaData.type === 'video'
              })
            });

            if (evolutionResponse.ok) {
              const evolutionData = await evolutionResponse.json();
              if (evolutionData.base64) {
                const base64Data = evolutionData.base64.includes(',') 
                  ? evolutionData.base64.split(',')[1] 
                  : evolutionData.base64;
                
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                
                return createMediaResponse(bytes.buffer, mediaData.mimetype);
              }
            }
          }
        }
      } catch {
        // Não é JSON, tentar download direto
      }

      // Tentar download direto como último recurso
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
