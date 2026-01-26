-- Atualizar planos Creator com novos preços e features conforme especificação
UPDATE pricing_config SET 
  price_cents = 2990,
  price_display = 'R$ 29,90/mês',
  features = '["Até 50 músicas/mês", "Letras curadas automaticamente", "Música pronta para vídeos", "Uso comercial liberado", "Acesso ao histórico de criações", "Ideal para criadores iniciantes"]'::jsonb,
  is_popular = false
WHERE id = 'creator_start';

UPDATE pricing_config SET 
  price_cents = 4990,
  price_display = 'R$ 49,90/mês',
  features = '["Até 150 músicas/mês", "Tudo do Creator Start", "Prioridade na fila de geração", "Opção de capa premium (+1 crédito)", "Sugestões criativas automáticas", "Ideal para canais em crescimento"]'::jsonb,
  is_popular = true
WHERE id = 'creator_pro';

UPDATE pricing_config SET 
  price_cents = 7990,
  price_display = 'R$ 79,90/mês',
  features = '["Até 300 músicas/mês", "Tudo do Creator Pro", "Atendimento prioritário", "Organização por projetos/canais", "Ideal para estúdios e agências"]'::jsonb,
  is_popular = false
WHERE id = 'creator_studio';

-- Adicionar versões instrumentais dos planos Creator (20% desconto)
INSERT INTO pricing_config (id, name, price_cents, price_display, features, is_active, is_popular, sort_order)
VALUES 
  ('creator_start_instrumental', 'Creator Start Instrumental', 2392, 'R$ 23,90/mês', 
   '["Até 50 trilhas/mês", "Músicas instrumentais prontas", "Uso comercial liberado", "Ideal para podcasts e vídeos", "20% de desconto"]'::jsonb, 
   true, false, 13),
  ('creator_pro_instrumental', 'Creator Pro Instrumental', 3992, 'R$ 39,90/mês',
   '["Até 150 trilhas/mês", "Prioridade na fila", "Capas premium inclusas", "Ideal para criadores ativos", "20% de desconto"]'::jsonb,
   true, true, 14),
  ('creator_studio_instrumental', 'Creator Studio Instrumental', 6392, 'R$ 63,90/mês',
   '["Até 300 trilhas/mês", "Atendimento VIP", "Organização por projetos", "Ideal para estúdios", "20% de desconto"]'::jsonb,
   true, false, 15)
ON CONFLICT (id) DO UPDATE SET 
  price_cents = EXCLUDED.price_cents,
  price_display = EXCLUDED.price_display,
  features = EXCLUDED.features;