-- ============================================================================
-- THE SOVELLE SPIN — Reference PostgreSQL / Supabase Schema + RLS Policies
-- ============================================================================
-- Note: The application runs out-of-the-box with a local transactional SQLite
-- database (server/db.js) configured with identical tables and constraints.
-- Use this file if you wish to provision the schema on Supabase Postgres.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Admin Accounts
CREATE TABLE IF NOT EXISTS public.admin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE, -- Maps to auth.users(id) when using Supabase Auth
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Rewards Configuration (6 wheel segments)
CREATE TABLE IF NOT EXISTS public.rewards (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  segment_index SMALLINT UNIQUE NOT NULL CHECK (segment_index BETWEEN 0 AND 5),
  title TEXT NOT NULL,
  short_label TEXT NOT NULL,
  headline_message TEXT NOT NULL,
  description TEXT NOT NULL,
  redemption_conditions TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 10 CHECK (weight > 0),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  validity_days INTEGER NOT NULL DEFAULT 30 CHECK (validity_days >= 1),
  valid_until_override TIMESTAMPTZ,
  is_win BOOLEAN NOT NULL DEFAULT true,
  grants_extra_spin BOOLEAN NOT NULL DEFAULT false,
  generates_coupon BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 80),
  phone TEXT UNIQUE NOT NULL CHECK (phone ~ '^[6-9][0-9]{9}$'),
  poster_purchase_confirmed BOOLEAN NOT NULL DEFAULT true,
  spins_used SMALLINT NOT NULL DEFAULT 0 CHECK (spins_used BETWEEN 0 AND 2),
  max_spins_allowed SMALLINT NOT NULL DEFAULT 1 CHECK (max_spins_allowed BETWEEN 1 AND 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_spins_within_limit CHECK (spins_used <= max_spins_allowed)
);

-- 4. Spins (Immutable permanent spin audit log)
CREATE TABLE IF NOT EXISTS public.spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  spin_number SMALLINT NOT NULL CHECK (spin_number IN (1, 2)),
  reward_id INTEGER NOT NULL REFERENCES public.rewards(id),
  reward_key TEXT NOT NULL,
  reward_title TEXT NOT NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, spin_number)
);

-- 5. Coupon Codes (Unique, single-redemption)
CREATE TABLE IF NOT EXISTS public.coupon_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  customer_id UUID UNIQUE NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  spin_id UUID UNIQUE NOT NULL REFERENCES public.spins(id) ON DELETE RESTRICT,
  reward_id INTEGER NOT NULL REFERENCES public.rewards(id),
  reward_title TEXT NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_redeemed BOOLEAN NOT NULL DEFAULT false,
  redeemed_at TIMESTAMPTZ,
  redeemed_by_admin_id UUID REFERENCES public.admin_accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;

-- Helper function checking whether current authenticated user is an admin
CREATE OR REPLACE FUNCTION public.is_sovelle_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_accounts
    WHERE auth_user_id = auth.uid()
  );
$$;

-- Public can read active wheel segment metadata (no personal data)
CREATE POLICY "Public can view rewards config"
  ON public.rewards FOR SELECT
  USING (true);

-- Only authenticated admins can update rewards config
CREATE POLICY "Admins can manage rewards"
  ON public.rewards FOR ALL
  USING (public.is_sovelle_admin())
  WITH CHECK (public.is_sovelle_admin());

-- Strictly block public SELECT on customers, spins, coupon_codes, admin_accounts
CREATE POLICY "Admins only read customers"
  ON public.customers FOR SELECT
  USING (public.is_sovelle_admin());

CREATE POLICY "Admins only read spins"
  ON public.spins FOR SELECT
  USING (public.is_sovelle_admin());

CREATE POLICY "Admins only read coupons"
  ON public.coupon_codes FOR ALL
  USING (public.is_sovelle_admin())
  WITH CHECK (public.is_sovelle_admin());

CREATE POLICY "Admins only read admin accounts"
  ON public.admin_accounts FOR SELECT
  USING (public.is_sovelle_admin());
