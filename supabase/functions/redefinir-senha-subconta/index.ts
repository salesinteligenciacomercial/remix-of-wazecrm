import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RedefinirSenhaRequest {
  userId: string;
  novaSenha: string;
  notificar?: boolean;
  email?: string;
  telefone?: string;
  nome?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, novaSenha, notificar, email, telefone, nome }: RedefinirSenhaRequest = await req.json();

    console.log('🔐 [REDEFINIR SENHA] Iniciando para usuário:', userId);

    // Criar cliente Supabase com service role para alterar senha de outros usuários
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Atualizar senha do usuário
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: novaSenha }
    );

    if (updateError) {
      console.error('❌ [REDEFINIR SENHA] Erro ao atualizar:', updateError);
      throw updateError;
    }

    console.log('✅ [REDEFINIR SENHA] Senha atualizada com sucesso');

    // Enviar notificação se solicitado
    if (notificar && (email || telefone)) {
      const mensagem = `
🔐 *Senha Redefinida - CRM CEUSIA*

Olá ${nome || 'usuário'}!

Sua senha foi redefinida com sucesso pelo administrador.

*Nova Senha:* ${novaSenha}

⚠️ *IMPORTANTE:* 
• Guarde esta senha em local seguro
• Recomendamos alterar sua senha após o login
• Nunca compartilhe suas credenciais

Para acessar o sistema, use seu e-mail e a nova senha.

Dúvidas? Entre em contato com o suporte.
      `.trim();

      // Enviar por WhatsApp se telefone fornecido
      if (telefone) {
        try {
          const telefoneFormatado = telefone.replace(/\D/g, '');
          const numero = telefoneFormatado.startsWith('55') 
            ? telefoneFormatado 
            : `55${telefoneFormatado}`;

          const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
          const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE');
          const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

          await fetch(
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
          console.log('✅ [REDEFINIR SENHA] Notificação WhatsApp enviada');
        } catch (error) {
          console.error('❌ [REDEFINIR SENHA] Erro ao enviar WhatsApp:', error);
        }
      }

      // TODO: Enviar email
      console.log('📧 [REDEFINIR SENHA] Email seria enviado para:', email);
    }

    return new Response(
      JSON.stringify({
        success: true,
        mensagem: 'Senha redefinida com sucesso'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ [REDEFINIR SENHA] Erro:', error);
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
