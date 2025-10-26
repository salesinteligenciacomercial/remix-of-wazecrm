-- Criar cron job para processar mensagens agendadas a cada minuto
SELECT cron.schedule(
  'processar-mensagens-agendadas-whatsapp',
  '* * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://dteppsfseusqixuppglh.supabase.co/functions/v1/processar-mensagens-agendadas',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0ZXBwc2ZzZXVzcWl4dXBwZ2xoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MzY0OTgsImV4cCI6MjA3NjQxMjQ5OH0.eEz5cyfwi5chae1U9S0Yt1FBwglyuVnm_Fzg9HVrV_Q"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);