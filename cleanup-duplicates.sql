-- ============================================================
-- WanderCrafts PH — Duplicate Cleanup Script
-- Run this in Supabase SQL Editor (once is enough)
-- Keeps the row with the lowest id, deletes the rest
-- ============================================================

-- 1. MATERIALS — deduplicate by all key fields
DELETE FROM materials
WHERE id NOT IN (
  SELECT MIN(id)
  FROM materials
  GROUP BY date, shop, name, variation, qty, price
);

-- 2. EQUIPMENT — deduplicate by all key fields
DELETE FROM equipment
WHERE id NOT IN (
  SELECT MIN(id)
  FROM equipment
  GROUP BY date, shop, name, variation, qty, price
);

-- 3. PRODUCTS — deduplicate by name + cost
DELETE FROM products
WHERE id NOT IN (
  SELECT MIN(id)
  FROM products
  GROUP BY name, cost
);

-- 4. ORDERS — deduplicate by all key fields
DELETE FROM orders
WHERE id NOT IN (
  SELECT MIN(id)
  FROM orders
  GROUP BY date, customer, product, variation, qty, price
);

-- 5. OVERHEAD (Electricity Cost) — deduplicate by all key fields
DELETE FROM overhead
WHERE id NOT IN (
  SELECT MIN(id)
  FROM overhead
  GROUP BY desc, rate, qty
);

-- 6. LABORCOSTS — deduplicate by all key fields
DELETE FROM laborcosts
WHERE id NOT IN (
  SELECT MIN(id)
  FROM laborcosts
  GROUP BY desc, rate, hours
);
