-- ============================================================
-- WanderCrafts PH Pricing Calculator — Supabase Setup Script
-- Run this entire script in your Supabase SQL Editor
-- ============================================================

-- 1. MATERIALS
create table if not exists materials (
  id            bigint generated always as identity primary key,
  date          text,
  shop          text,
  name          text,
  variation     text,
  qty           numeric,
  price         numeric,
  "pricePerQty" numeric,
  stock         text default 'In Stock'
);

-- 2. PRODUCTS
create table if not exists products (
  id              bigint generated always as identity primary key,
  name            text,
  cost            numeric,
  markup          numeric,
  discount        numeric,
  tax             numeric,
  "priceBeforeTax" numeric,
  "taxAmt"        numeric,
  selling         numeric,
  profit          numeric,
  margin          numeric
);

-- 3. EQUIPMENT
create table if not exists equipment (
  id        bigint generated always as identity primary key,
  date      text,
  shop      text,
  name      text,
  variation text,
  qty       numeric,
  price     numeric
);

-- 4. OVERHEAD (Electricity Cost)
create table if not exists overhead (
  id           bigint generated always as identity primary key,
  desc         text,
  rate         numeric,
  qty          numeric,
  amount       numeric,
  "amountPerQty" numeric
);

-- 5. LABORCOSTS
create table if not exists laborcosts (
  id    bigint generated always as identity primary key,
  desc  text,
  rate  numeric,
  hours numeric,
  total numeric
);

-- 6. ORDERS
create table if not exists orders (
  id        bigint generated always as identity primary key,
  date      text,
  customer  text,
  contact   text,
  email     text,
  product   text,
  variation text,
  qty       numeric,
  price     numeric,
  total     numeric,
  payment   text,
  status    text,
  notes     text
);

-- 7. SETTINGS (brand name + logo — single row)
create table if not exists settings (
  id         integer primary key check (id = 1),
  brand_name text,
  logo_url   text
);

-- Insert default settings row
insert into settings (id, brand_name, logo_url)
values (1, 'Your Store Name', '')
on conflict (id) do nothing;

-- 8. INK CALCULATOR
create table if not exists inkcalculator (
  id           bigint generated always as identity primary key,
  printer      text,
  type         text,
  "costPerPage" numeric
);

alter table inkcalculator disable row level security;
alter table products   disable row level security;
alter table equipment  disable row level security;
alter table overhead   disable row level security;
alter table laborcosts disable row level security;
alter table orders     disable row level security;
alter table settings   disable row level security;
