import { supabase } from "@/integrations/supabase/client";

/**
 * Utilitário para carregar mídias do WhatsApp através da edge function
 */

export async function getMediaUrl(messageId: string): Promise<string> {
  try {
    console.log('🔄 [MEDIA-LOADER] Carregando mídia:', messageId);
    
    // Primeiro, buscar a mídia do banco
    const { data: message } = await supabase
      .from('conversas')
      .select('midia_url, tipo_mensagem, company_id')
      .eq('id', messageId)
      .single();

    if (!message?.midia_url) {
      throw new Error('Mídia não encontrada');
    }

    console.log('📦 [MEDIA-LOADER] Tipo de mídia_url:', typeof message.midia_url);

    // Se já for data URI (base64), retornar direto
    if (message.midia_url.startsWith('data:')) {
      console.log('✅ [MEDIA-LOADER] Usando data URI existente');
      return message.midia_url;
    }

    // Se for JSON com metadados de mídia criptografada
    try {
      const mediaData = JSON.parse(message.midia_url);
      if (mediaData.messageId && mediaData.url) {
        console.log('🔓 [MEDIA-LOADER] Baixando mídia via Evolution API');
        
        // Chamar edge function que usa Evolution API
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-media`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              company_id: message.company_id,
              messageId: mediaData.messageId,
              type: mediaData.type
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ [MEDIA-LOADER] Erro:', response.status, errorText);
          throw new Error(`Erro ao baixar mídia: ${response.status}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        console.log('✅ [MEDIA-LOADER] Mídia carregada com sucesso');
        return url;
      }
    } catch (jsonError) {
      // Não é JSON, pode ser URL simples
      console.log('🌐 [MEDIA-LOADER] URL simples, tentando download direto');
    }

    // Fallback: tentar carregar URL diretamente
    const response = await fetch(message.midia_url);
    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      console.log('✅ [MEDIA-LOADER] Download direto bem-sucedido');
      return url;
    }

    throw new Error('Não foi possível carregar a mídia');
  } catch (error) {
    console.error('❌ [MEDIA-LOADER] Erro geral:', error);
    throw error;
  }
}
