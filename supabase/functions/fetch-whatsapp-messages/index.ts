import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Fallback Evolution API config from environment
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://evo.continuum.tec.br";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phoneNumber, companyId, limit = 50 } = await req.json();

    if (!phoneNumber || !companyId) {
      return new Response(
        JSON.stringify({ error: "phoneNumber e companyId são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📱 Buscando mensagens do WhatsApp:", { phoneNumber, companyId, limit });

    // Criar cliente Supabase com service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar configuração da conexão WhatsApp
    const { data: connection, error: connectionError } = await supabase
      .from("whatsapp_connections")
      .select("instance_name, evolution_api_url, evolution_api_key, status")
      .eq("company_id", companyId)
      .single();

    if (connectionError || !connection) {
      console.error("❌ Conexão WhatsApp não encontrada:", connectionError);
      return new Response(
        JSON.stringify({ error: "Conexão WhatsApp não configurada", code: "NO_CONNECTION" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const instanceName = connection.instance_name;
    // Sanitizar URL removendo paths extras
    const rawBaseUrl = connection.evolution_api_url || EVOLUTION_API_URL;
    const baseUrl = rawBaseUrl.replace(/\/(manager|api|v1|v2)?\/?$/i, '').replace(/\/$/, '');
    const apiKey = connection.evolution_api_key || EVOLUTION_API_KEY;

    if (!instanceName || !apiKey) {
      console.error("❌ Instância ou API Key não configurada");
      return new Response(
        JSON.stringify({ error: "Instância WhatsApp não configurada corretamente", code: "INVALID_CONFIG" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🔗 Configuração Evolution:", { instanceName, baseUrl, hasApiKey: !!apiKey });

    // Formatar número para o padrão do WhatsApp
    const formattedNumber = phoneNumber.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    // Chamar Evolution API para buscar mensagens
    const evolutionUrl = `${baseUrl}/chat/findMessages/${instanceName}`;
    console.log("📤 Chamando Evolution API:", evolutionUrl);

    const response = await fetch(evolutionUrl, {
      method: "POST",
      headers: {
        "apikey": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        where: {
          key: {
            remoteJid: formattedNumber,
          },
        },
        limit,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erro Evolution API:", response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Erro ao buscar mensagens: ${response.statusText}`, 
          code: "EVOLUTION_ERROR",
          details: errorText 
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const responseData = await response.json();
    
    console.log("📥 Estrutura da resposta Evolution:", JSON.stringify(Object.keys(responseData || {})));
    
    // Evolution API retorna estrutura aninhada - testar várias possibilidades
    let messagesArray: any[] = [];
    
    if (Array.isArray(responseData)) {
      // Resposta direta como array
      messagesArray = responseData;
      console.log("✅ Formato: array direto");
    } else if (responseData?.messages?.messages?.records) {
      // Estrutura nova: { messages: { messages: { records: [...] } } }
      messagesArray = responseData.messages.messages.records;
      console.log("✅ Formato: messages.messages.records");
    } else if (responseData?.messages?.records) {
      // Estrutura alternativa: { messages: { records: [...] } }
      messagesArray = responseData.messages.records;
      console.log("✅ Formato: messages.records");
    } else if (responseData?.messages && Array.isArray(responseData.messages)) {
      // Estrutura: { messages: [...] }
      messagesArray = responseData.messages;
      console.log("✅ Formato: messages array");
    } else if (responseData?.records && Array.isArray(responseData.records)) {
      // Estrutura: { records: [...] }
      messagesArray = responseData.records;
      console.log("✅ Formato: records");
    }
    
    // Normalizar mensagens para garantir campos consistentes
    const normalizedMessages = messagesArray.map((msg: any) => {
      // Extrair o remoteJid corretamente - pode estar em diferentes lugares
      const remoteJid = msg.key?.remoteJid || msg.remoteJid || formattedNumber;
      
      // Verificar se é mensagem enviada ou recebida
      // fromMe pode estar em msg.key.fromMe ou msg.fromMe
      const fromMe = msg.key?.fromMe ?? msg.fromMe ?? false;
      
      // Extrair conteúdo da mensagem de diferentes estruturas possíveis
      let messageContent = "[Mídia]";
      if (msg.message?.conversation) {
        messageContent = msg.message.conversation;
      } else if (msg.message?.extendedTextMessage?.text) {
        messageContent = msg.message.extendedTextMessage.text;
      } else if (msg.message?.imageMessage?.caption) {
        messageContent = msg.message.imageMessage.caption || "[Imagem]";
      } else if (msg.message?.videoMessage?.caption) {
        messageContent = msg.message.videoMessage.caption || "[Vídeo]";
      } else if (msg.message?.audioMessage) {
        messageContent = "[Áudio]";
      } else if (msg.message?.documentMessage?.fileName) {
        messageContent = `[Documento: ${msg.message.documentMessage.fileName}]`;
      } else if (msg.message?.stickerMessage) {
        messageContent = "[Sticker]";
      } else if (msg.message?.contactMessage) {
        messageContent = "[Contato]";
      } else if (msg.message?.locationMessage) {
        messageContent = "[Localização]";
      } else if (msg.body) {
        // Algumas versões usam msg.body diretamente
        messageContent = msg.body;
      } else if (typeof msg.message === 'string') {
        messageContent = msg.message;
      }
      
      // Extrair timestamp
      const timestamp = msg.messageTimestamp || msg.timestamp || Math.floor(Date.now() / 1000);
      
      return {
        key: {
          id: msg.key?.id || msg.id || crypto.randomUUID(),
          remoteJid: remoteJid,
          fromMe: fromMe,
        },
        message: msg.message || { conversation: messageContent },
        messageTimestamp: timestamp,
        pushName: msg.pushName || msg.senderName || null,
        _originalFromMe: fromMe, // Campo auxiliar para debug
        _messageContent: messageContent, // Campo auxiliar para debug
      };
    });
    
    // Log amostra para debug
    if (normalizedMessages.length > 0) {
      console.log(`📊 Amostra primeira mensagem:`, JSON.stringify({
        fromMe: normalizedMessages[0].key.fromMe,
        content: normalizedMessages[0]._messageContent?.substring(0, 50),
      }));
      
      const sentCount = normalizedMessages.filter((m: any) => m.key.fromMe === true).length;
      const receivedCount = normalizedMessages.filter((m: any) => m.key.fromMe === false).length;
      console.log(`📊 Enviadas: ${sentCount}, Recebidas: ${receivedCount}`);
    }
    
    console.log(`✅ ${normalizedMessages.length} mensagens encontradas e normalizadas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messages: normalizedMessages,
        count: normalizedMessages.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Erro ao buscar mensagens:", error);
    return new Response(
      JSON.stringify({ error: String(error), code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
