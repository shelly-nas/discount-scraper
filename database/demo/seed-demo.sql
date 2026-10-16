-- Demo data for the acceptance environment and local testing. NEVER loaded
-- in production.
--
-- Loaded into the freshly reset acc database by .github/workflows/acc.yml,
-- after database/src/schema.sql and migrate.sql ran from the database image.
-- The image (database/Dockerfile) copies only those two files, so this one
-- has no path into production, where scraped data is real and persistent.
--
-- Expiry dates are relative to the deploy, so the offers are current on acc.
-- Catalog tables (migration 001) do not exist yet when this runs - the API
-- applies migrations on start - so catalog data comes from a real "Run
-- Catalog" on acc instead.
--
-- Guarded: a no-op when any product exists.
DO $demo$
BEGIN

IF EXISTS (SELECT 1 FROM products LIMIT 1) THEN
  RAISE NOTICE 'seed-demo.sql: products already present, skipping demo data.';
  RETURN;
END IF;

CREATE TEMP TABLE demo_offers (
  name TEXT, category TEXT, supermarket TEXT, url TEXT,
  original NUMERIC, price NUMERIC, unit_price TEXT, special TEXT, days INT
) ON COMMIT DROP;

INSERT INTO demo_offers VALUES
  ('AH Halfvolle melk 1L',            'Zuivel, eieren',        'Albert Heijn', 'https://www.ah.nl/bonus', 1.19, 0.95, '€0.95/l', '',                 5),
  ('AH Jonge kaas plakken 400g',      'Kaas',                  'Albert Heijn', 'https://www.ah.nl/bonus', 4.29, 3.21, NULL,      '25% korting',      5),
  ('Douwe Egberts Aroma Rood 500g',   'Koffie, thee',          'Albert Heijn', 'https://www.ah.nl/bonus', 7.99, 5.49, '€10.98/kg', '',               5),
  ('Coca-Cola Zero 1,5L',             'Frisdrank, sappen',     'Albert Heijn', 'https://www.ah.nl/bonus', 2.39, 1.79, NULL,      '2e halve prijs',   5),
  ('Halfvolle melk 1L',               'Zuivel kaas',           'Dirk',         'https://www.dirk.nl/aanbiedingen', 1.09, 0.79, '€0.79/l', '',          2),
  ('Kipfilet 1kg',                    'Vlees vis vega',        'Dirk',         'https://www.dirk.nl/aanbiedingen', 9.99, 6.99, '€6.99/kg', '',         2),
  ('Bananen 1kg',                     'Aardappelen groente fruit', 'Dirk',     'https://www.dirk.nl/aanbiedingen', 1.69, 1.19, '€1.19/kg', '',         2),
  ('Lavazza Qualita Oro bonen 1kg',   'Koffie en thee',        'Jumbo',        'https://www.jumbo.com/aanbiedingen', 21.99, 14.99, NULL,     '1+1 gratis',     6),
  ('Jumbo Volle yoghurt 1L',          'Zuivel',                'Jumbo',        'https://www.jumbo.com/aanbiedingen', 1.75, 1.29, NULL,       '',               6),
  ('Pringles Original 165g',          'Chips en snacks',       'Jumbo',        'https://www.jumbo.com/aanbiedingen', 2.99, 1.99, NULL,       '2 voor 3,98',    6),
  ('Kipfilet 500g',                   'Vlees',                 'Lidl',         'https://www.lidl.nl/aanbiedingen', 5.99, 3.99, '€7.98/kg', '',           4),
  ('Milbona halfvolle melk 1L',       'Zuivel',                'Lidl',         'https://www.lidl.nl/aanbiedingen', 1.05, 0.85, '€0.85/l', '',            4),
  ('Campina halfvolle yoghurt 1L',    'Zuivel',                'PLUS',         'https://www.plus.nl/aanbiedingen', 1.79, 1.29, NULL,       '',               3),
  ('PLUS Volkoren brood',             'Brood en gebak',        'PLUS',         'https://www.plus.nl/aanbiedingen', 2.29, 1.69, NULL,       '',               3),
  ('Chips naturel 200g',              'Snacks',                'Aldi',         'https://www.aldi.nl/aanbiedingen', 1.49, 0.99, NULL,       '',               5),
  ('Koffiepads regular 36 stuks',     'Koffie en thee',        'Aldi',         'https://www.aldi.nl/aanbiedingen', 3.49, 2.49, NULL,       '',               5),
  ('Bananen 1kg',                     'Groente en fruit',      'Hoogvliet',    'https://www.hoogvliet.com/aanbiedingen', 1.69, 1.19, '€1.19/kg', '',     1),
  ('Hoogvliet Kaas jong belegen 500g','Kaas',                  'Hoogvliet',    'https://www.hoogvliet.com/aanbiedingen', 6.49, 4.49, '€8.98/kg', '',     1);

INSERT INTO products (name, category, supermarket, product_url, created_at, updated_at)
SELECT name, category, supermarket, url, now() - interval '20 days', now() - interval '1 day'
FROM demo_offers;

-- Current offers.
INSERT INTO discounts (product_id, original_price, discount_price, unit_price, special_discount, expire_date, active, created_at)
SELECT p.id, o.original, o.price, o.unit_price, o.special, now() + make_interval(days => o.days), true, now() - interval '1 day'
FROM demo_offers o JOIN products p ON p.name = o.name AND p.supermarket = o.supermarket;

-- Last week's offers on some products: expired history.
INSERT INTO discounts (product_id, original_price, discount_price, unit_price, special_discount, expire_date, active, created_at)
SELECT p.id, o.original, round(o.price * 1.1, 2), o.unit_price, '', now() - interval '6 days', false, now() - interval '13 days'
FROM demo_offers o JOIN products p ON p.name = o.name AND p.supermarket = o.supermarket
WHERE o.days >= 4;

INSERT INTO scraper_runs (supermarket, status, products_scraped, products_updated, products_created,
                          discounts_deactivated, discounts_created, error_message, started_at, completed_at,
                          duration_seconds, promotion_expire_date)
SELECT s.supermarket, 'success', s.n, 0, s.n, 0, s.n, NULL,
       now() - interval '1 day', now() - interval '1 day' + interval '42 seconds', 42,
       now() + make_interval(days => s.days)
FROM (SELECT supermarket, COUNT(*)::int AS n, MAX(days) AS days FROM demo_offers GROUP BY supermarket) s;

INSERT INTO scraper_runs (supermarket, status, started_at, completed_at, duration_seconds, error_message)
VALUES ('Jumbo', 'failed', now() - interval '2 days', now() - interval '2 days' + interval '95 seconds', 95,
        'Demo: timeout waiting for promotion cards');

END
$demo$;
