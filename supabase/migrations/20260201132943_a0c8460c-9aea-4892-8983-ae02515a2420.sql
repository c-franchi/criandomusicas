-- Desativar planos instrumentais (agora tudo é crédito universal)
UPDATE pricing_config SET is_active = false WHERE id IN (
  'single_instrumental',
  'package_instrumental', 
  'subscription_instrumental',
  'creator_start_instrumental',
  'creator_pro_instrumental',
  'creator_studio_instrumental'
);