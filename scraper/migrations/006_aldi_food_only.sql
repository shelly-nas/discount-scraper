-- Only food and drink is kept from Aldi (see clients/aldi/AldiFood.ts). The
-- non-food rows already stored cannot be told apart in SQL (offer-only rows
-- have no category), so all Aldi products go, with their discounts and price
-- history (ON DELETE CASCADE). The next runs bring the food back: the offer
-- run is due right away; the catalog on its weekly run or on demand.

DELETE FROM products WHERE supermarket = 'Aldi';

UPDATE scheduled_runs SET next_run_at = CURRENT_TIMESTAMP WHERE supermarket = 'Aldi' AND enabled;
