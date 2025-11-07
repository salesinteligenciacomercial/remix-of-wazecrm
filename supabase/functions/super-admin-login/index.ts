import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const JWT_SECRET = Deno.env.get('SUPABASE_JWT_SECRET') || SUPABASE_SERVICE_ROLE_KEY;
    
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { email, password } = await req.json();
    
    console.log(`🔐 [SUPER ADMIN BYPASS] Login direto para:`, email);

    // BYPASS COMPLETO - Validar apenas email
    if (email !== 'jeovauzumak@gmail.com') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRIAR SESSÃO DIRETA - BYPASS TOTAL
    console.log('✅ Criando sessão JWT direta para super admin');
    
    const userId = '677a7847-1f34-44d0-b03b-c148b4b166b7'; // ID do super admin
    const companyId = '3d34ff74-b8ad-4c7e-b538-3bdb0d30dc78'; // Company ID
    
    const payload = {
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 dias
      iat: Math.floor(Date.now() / 1000),
      iss: 'supabase',
      sub: userId,
      email: email,
      phone: '',
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        role: 'super_admin'
      },
      user_metadata: {
        email: email,
        email_verified: true,
        phone_verified: false,
        sub: userId
      },
      role: 'authenticated',
      aal: 'aal1',
      amr: [{ method: 'password', timestamp: Math.floor(Date.now() / 1000) }],
      session_id: crypto.randomUUID()
    };

    const secret = new TextEncoder().encode(JWT_SECRET);
    const accessToken = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    const session = {
      access_token: accessToken,
      refresh_token: crypto.randomUUID(),
      expires_in: 604800,
      expires_at: Math.floor(Date.now() / 1000) + 604800,
      token_type: 'bearer',
      user: {
        id: userId,
        aud: 'authenticated',
        role: 'authenticated',
        email: email,
        email_confirmed_at: new Date().toISOString(),
        phone: '',
        confirmed_at: new Date().toISOString(),
        created_at: '2025-10-22T22:32:23.969716Z',
        app_metadata: payload.app_metadata,
        user_metadata: payload.user_metadata,
        identities: [],
        updated_at: new Date().toISOString()
      }
    };

    console.log('✅ Sessão JWT criada com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true,
        session,
        user: session.user,
        role: 'super_admin',
        company_id: companyId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
