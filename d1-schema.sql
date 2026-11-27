-- ============================================================================
-- THE SOVELLE SPIN — Cloudflare D1 Database Schema & Initial Seed
-- ============================================================================
-- To apply to your Cloudflare D1 database:
-- Local:  npx wrangler d1 execute sovelle-db --local --file=./d1-schema.sql
-- Remote: npx wrangler d1 execute sovelle-db --remote --file=./d1-schema.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_accounts (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  segment_index INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  short_label TEXT NOT NULL,
  headline_message TEXT NOT NULL,
  description TEXT NOT NULL,
  redemption_conditions TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 10,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  validity_days INTEGER NOT NULL DEFAULT 30,
  valid_until_override TEXT,
  is_win INTEGER NOT NULL DEFAULT 1,
  grants_extra_spin INTEGER NOT NULL DEFAULT 0,
  generates_coupon INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  poster_purchase_confirmed INTEGER NOT NULL DEFAULT 1,
  spins_used INTEGER NOT NULL DEFAULT 0,
  max_spins_allowed INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS spins (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  spin_number INTEGER NOT NULL,
  reward_id INTEGER NOT NULL,
  reward_key TEXT NOT NULL,
  reward_title TEXT NOT NULL,
  confirmed_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (customer_id, spin_number)
);

CREATE TABLE IF NOT EXISTS coupon_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  customer_id TEXT UNIQUE NOT NULL,
  spin_id TEXT UNIQUE NOT NULL,
  reward_id INTEGER NOT NULL,
  reward_title TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  is_redeemed INTEGER NOT NULL DEFAULT 0,
  redeemed_at TEXT,
  redeemed_by_admin_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_spins_customer ON spins(customer_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupon_codes(code);
CREATE INDEX IF NOT EXISTS idx_coupons_redeemed ON coupon_codes(is_redeemed);

-- Insert Default 6 Reward Categories
INSERT OR IGNORE INTO rewards (
  id, key, segment_index, title, short_label, headline_message, description,
  redemption_conditions, weight, is_enabled, validity_days, valid_until_override,
  is_win, grants_extra_spin, generates_coupon, updated_at
) VALUES
  (1, 'GOLDEN_SPIN', 0, 'GOLDEN SPIN ✨', 'GOLDEN SPIN ✨', 'Golden Spin! You get another chance.', 'A golden spark of fortune — enjoy one complimentary bonus spin right now.', 'Unlocks exactly 1 additional spin immediately in this session. Maximum 2 spins per customer.', 12, 1, 30, NULL, 1, 1, 0, datetime('now')),
  (2, 'PCT_10', 1, '10% OFF', '10% OFF', 'A lovely treat! 10% OFF your next SOVELLE order.', 'Enjoy 10% off on your next handmade bouquet or SOVELLE creation.', 'Valid on your next eligible SOVELLE order (not applicable to the current poster purchase). Single-use only.', 28, 1, 30, NULL, 1, 0, 1, datetime('now')),
  (3, 'PCT_20', 2, '20% OFF', '20% OFF', 'You got lucky! 20% OFF your next order.', 'Our signature boutique reward — 20% off your next SOVELLE order.', 'Valid on your next eligible SOVELLE order (not applicable to the current poster purchase). Single-use only.', 14, 1, 30, NULL, 1, 0, 1, datetime('now')),
  (4, 'FREE_ADDON', 3, 'FREE CHOCOLATE 🍫', 'FREE CHOCOLATE 🍫', 'A sweet surprise for you! You''ve won FREE CHOCOLATE.', 'Enjoy complimentary delicious chocolate with your SOVELLE stall visit or next order.', 'Present this coupon code at the SOVELLE stall to claim your complimentary chocolate! Single-use only.', 16, 1, 30, NULL, 1, 0, 1, datetime('now')),
  (5, 'BETTER_LUCK', 4, 'BETTER LUCK NEXT TIME', 'BETTER LUCK NEXT TIME', 'Not this time, but there''s always a next time!', 'Thank you for visiting the SOVELLE stall and supporting handmade florals.', 'No coupon code is generated for this result. We look forward to crafting for you soon!', 15, 1, 30, NULL, 0, 0, 0, datetime('now')),
  (6, 'FLAT_50', 5, 'FLAT ₹50 OFF', 'FLAT ₹50 OFF', 'Something special! Flat ₹50 OFF your next customised bouquet.', 'Enjoy ₹50 off on your next customised handmade bouquet order from SOVELLE.', 'Valid on your next customised bouquet order from SOVELLE (not applicable to the current poster purchase). Single-use only.', 15, 1, 30, NULL, 1, 0, 1, datetime('now'));

-- Insert Initial Admin Account (Password: Sovelle@2026)
INSERT OR IGNORE INTO admin_accounts (id, username, password_hash, full_name, created_at)
VALUES (
  'sovelle-admin-id',
  'sovelle-admin',
  'Sovelle@2026',
  'SOVELLE Atelier Admin',
  datetime('now')
);
