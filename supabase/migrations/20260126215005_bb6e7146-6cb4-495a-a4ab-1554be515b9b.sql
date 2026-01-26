-- Update pricing_config with new production Stripe Price IDs

-- Creator subscriptions
UPDATE pricing_config SET stripe_price_id = 'price_1StxcNEE1g2DASjfQjDpFjKH' WHERE id = 'creator_start';
UPDATE pricing_config SET stripe_price_id = 'price_1StxcoEE1g2DASjflhQMQWph' WHERE id = 'creator_pro';
UPDATE pricing_config SET stripe_price_id = 'price_1Stxd1EE1g2DASjfk6zQSMXp' WHERE id = 'creator_studio';
UPDATE pricing_config SET stripe_price_id = 'price_1StxdIEE1g2DASjfxz5jlr5e' WHERE id = 'creator_start_instrumental';
UPDATE pricing_config SET stripe_price_id = 'price_1StxdXEE1g2DASjfp97OFEMM' WHERE id = 'creator_pro_instrumental';
UPDATE pricing_config SET stripe_price_id = 'price_1StxdnEE1g2DASjfPKhtgXMA' WHERE id = 'creator_studio_instrumental';

-- Single purchases
UPDATE pricing_config SET stripe_price_id = 'price_1Stxe6EE1g2DASjfokzGzFIx' WHERE id = 'single';
UPDATE pricing_config SET stripe_price_id = 'price_1StxeqEE1g2DASjflvlzkiwQ' WHERE id = 'single_instrumental';

-- Package 3
UPDATE pricing_config SET stripe_price_id = 'price_1StxeJEE1g2DASjf4nBDrjnY' WHERE id = 'package';
UPDATE pricing_config SET stripe_price_id = 'price_1Stxf4EE1g2DASjf9Y9tJ5ie' WHERE id = 'package_instrumental';

-- Package 5
UPDATE pricing_config SET stripe_price_id = 'price_1StxebEE1g2DASjfN01ASfHI' WHERE id = 'subscription';
UPDATE pricing_config SET stripe_price_id = 'price_1StxfGEE1g2DASjfkOuWeWwD' WHERE id = 'subscription_instrumental';