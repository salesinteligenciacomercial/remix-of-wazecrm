-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Conceder permissões necessárias
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Criar cron job que executa a cada 30 minutos para enviar lembretes
SELECT cron.schedule(
  'enviar-lembretes-automatico',
  '*/30 * * * *', -- Executa a cada 30 minutos
  $$
  SELECT
    net.http_post(
      url := 'https://dteppsfseusqixuppglh.supabase.co/functions/v1/enviar-lembretes',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0ZXBwc2ZzZXVzcWl4dXBwZ2xoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MzY0OTgsImV4cCI6MjA3NjQxMjQ5OH0.eEz5cyfwi5chae1U9S0Yt1FBwglyuVnm_Fzg9HVrV_Q"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);
