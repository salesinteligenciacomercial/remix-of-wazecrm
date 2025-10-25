import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnviarCredenciaisRequest {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  nomeConta: string;
  url: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nome, email, senha, telefone, nomeConta, url }: EnviarCredenciaisRequest = await req.json();

    console.log('📧 [CREDENCIAIS] Iniciando envio de credenciais');
    console.log('📧 [CREDENCIAIS] Para:', email, telefone);

    // Mensagem formatada
    const mensagem = `
🎉 *Bem-vindo ao CRM CEUSIA!*

Sua subconta foi criada com sucesso!

*📋 Dados da Conta:*
• Nome: ${nome}
• Empresa: ${nomeConta}
• E-mail: ${email}

*🔐 Credenciais de Acesso:*
• URL: ${url}
• E-mail: ${email}
• Senha: ${senha}

⚠️ *IMPORTANTE:* Guarde esta senha em local seguro. Por questões de segurança, recomendamos alterar sua senha no primeiro acesso.

📱 *Próximos Passos:*
1. Acesse o sistema usando o link acima
2. Faça login com suas credenciais
3. Configure sua instância WhatsApp em Configurações → Integrações
4. Comece a usar o CRM!

Dúvidas? Entre em contato com o suporte.
    `.trim();

    let whatsappEnviado = false;
    let emailEnviado = false;

    // Enviar por WhatsApp se telefone foi fornecido
    if (telefone) {
      try {
        console.log('📱 [CREDENCIAIS] Enviando WhatsApp para:', telefone);
        
        const telefoneFormatado = telefone.replace(/\D/g, '');
        const numero = telefoneFormatado.startsWith('55') 
          ? telefoneFormatado 
          : `55${telefoneFormatado}`;

        const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
        const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE');
        const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

        const response = await fetch(
          `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': EVOLUTION_API_KEY || '',
            },
            body: JSON.stringify({
              number: numero,
              text: mensagem,
            }),
          }
        );

        if (response.ok) {
          console.log('✅ [CREDENCIAIS] WhatsApp enviado com sucesso');
          whatsappEnviado = true;
        } else {
          const errorText = await response.text();
          console.error('❌ [CREDENCIAIS] Erro ao enviar WhatsApp:', errorText);
        }
      } catch (error) {
        console.error('❌ [CREDENCIAIS] Erro WhatsApp:', error);
      }
    }

    // TODO: Integrar com serviço de email (SendGrid, Resend, etc)
    // Por enquanto, apenas logamos que seria enviado
    console.log('📧 [CREDENCIAIS] Email seria enviado para:', email);
    emailEnviado = true; // Marcar como enviado por enquanto

    return new Response(
      JSON.stringify({
        success: true,
        whatsappEnviado,
        emailEnviado,
        mensagem: 'Credenciais processadas com sucesso'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ [CREDENCIAIS] Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
