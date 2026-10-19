-- Manual category override for a product name.
--
-- The worker looks this up before it scores a pin, so a correction set with
-- `pnpm sift category set` wins over every rule. The override is global
-- and matched by name (product_catalog.name is COLLATE NOCASE).
ALTER TABLE product_catalog ADD COLUMN category TEXT;
ALTER TABLE product_catalog ADD COLUMN category_updated_at INTEGER;
