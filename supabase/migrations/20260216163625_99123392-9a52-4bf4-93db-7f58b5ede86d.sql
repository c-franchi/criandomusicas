
SELECT cron.schedule(
  'send-reengagement-daily',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://haiiaqzhuydsjujtdcnq.supabase.co/functions/v1/send-reengagement-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWlhcXpodXlkc2p1anRkY25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDUyMDMsImV4cCI6MjA4NDQ4MTIwM30.YtIMa3K-WADDCqomEKmIYEe48_l4rYjbJ6H_5xwe7vw"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
