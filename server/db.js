import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { hashPassword } from './auth.js';

const defaultDbPath = process.env.VERCEL ? '/tmp/sovelle.db' : './data/sovelle.db';
const dbPath = path.resolve(process.cwd(), process.env.DB_PATH || defaultDbPath);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);

// Enable strict foreign key enforcement and WAL mode for concurrency
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

/**
 * Run a synchronous function inside an atomic IMMEDIATE SQLite transaction.
 */
export function withTransaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignore rollback errors if transaction already closed
    }
    throw err;
  }
}

const DEFAULT_REWARDS = [
  {
    key: 'GOLDEN_SPIN',
    segment_index: 0,
    title: 'GOLDEN SPIN ✨',
    short_label: 'GOLDEN SPIN ✨',
    headline_message: 'Golden Spin! You get another chance.',
    description: 'A golden spark of fortune — enjoy one complimentary bonus spin right now.',
    redemption_conditions:
      'Unlocks exactly 1 additional spin immediately in this session. Maximum 2 spins per customer.',
    weight: 12,
    is_enabled: 1,
    validity_days: 30,
    is_win: 1,
    grants_extra_spin: 1,
    generates_coupon: 0,
  },
  {
    key: 'PCT_10',
    segment_index: 1,
    title: '10% OFF',
    short_label: '10% OFF',
    headline_message: 'A lovely treat! 10% OFF your next SOVELLE order.',
    description: 'Enjoy 10% off on your next handmade bouquet or SOVELLE creation.',
    redemption_conditions:
      'Valid on your next eligible SOVELLE order (not applicable to the current poster purchase). Single-use only.',
    weight: 28,
    is_enabled: 1,
    validity_days: 30,
    is_win: 1,
    grants_extra_spin: 0,
    generates_coupon: 1,
  },
  {
    key: 'PCT_20',
    segment_index: 2,
    title: '20% OFF',
    short_label: '20% OFF',
    headline_message: 'You got lucky! 20% OFF your next order.',
    description: 'Our signature boutique reward — 20% off your next SOVELLE order.',
    redemption_conditions:
      'Valid on your next eligible SOVELLE order (not applicable to the current poster purchase). Single-use only.',
    weight: 14,
    is_enabled: 1,
    validity_days: 30,
    is_win: 1,
    grants_extra_spin: 0,
    generates_coupon: 1,
  },
  {
    key: 'FREE_ADDON',
    segment_index: 3,
    title: 'FREE CHOCOLATE 🍫',
    short_label: 'FREE CHOCOLATE 🍫',
    headline_message: "A sweet surprise for you! You've won FREE CHOCOLATE.",
    description: 'Enjoy complimentary delicious chocolate with your SOVELLE stall visit or next order.',
    redemption_conditions:
      "Present this coupon code at the SOVELLE stall to claim your complimentary chocolate! Single-use only.",
    weight: 16,
    is_enabled: 1,
    validity_days: 30,
    is_win: 1,
    grants_extra_spin: 0,
    generates_coupon: 1,
  },
  {
    key: 'BETTER_LUCK',
    segment_index: 4,
    title: 'BETTER LUCK NEXT TIME',
    short_label: 'BETTER LUCK NEXT TIME',
    headline_message: "Not this time, but there's always a next time!",
    description: 'Thank you for visiting the SOVELLE stall and supporting handmade florals.',
    redemption_conditions:
      'No coupon code is generated for this result. We look forward to crafting for you soon!',
    weight: 15,
    is_enabled: 1,
    validity_days: 30,
    is_win: 0,
    grants_extra_spin: 0,
    generates_coupon: 0,
  },
  {
    key: 'FLAT_50',
    segment_index: 5,
    title: 'FLAT ₹50 OFF',
    short_label: 'FLAT ₹50 OFF',
    headline_message: 'Something special! Flat ₹50 OFF your next customised bouquet.',
    description: 'Enjoy ₹50 off on your next customised handmade bouquet order from SOVELLE.',
    redemption_conditions:
      'Valid on your next customised bouquet order from SOVELLE (not applicable to the current poster purchase). Single-use only.',
    weight: 15,
    is_enabled: 1,
    validity_days: 30,
    is_win: 1,
    grants_extra_spin: 0,
    generates_coupon: 1,
  },
];

export function initDatabase() {
  db.exec(`
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
      segment_index INTEGER UNIQUE NOT NULL CHECK (segment_index BETWEEN 0 AND 5),
      title TEXT NOT NULL,
      short_label TEXT NOT NULL,
      headline_message TEXT NOT NULL,
      description TEXT NOT NULL,
      redemption_conditions TEXT NOT NULL,
      weight INTEGER NOT NULL DEFAULT 10 CHECK (weight > 0),
      is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
      validity_days INTEGER NOT NULL DEFAULT 30 CHECK (validity_days >= 1),
      valid_until_override TEXT,
      is_win INTEGER NOT NULL DEFAULT 1 CHECK (is_win IN (0, 1)),
      grants_extra_spin INTEGER NOT NULL DEFAULT 0 CHECK (grants_extra_spin IN (0, 1)),
      generates_coupon INTEGER NOT NULL DEFAULT 1 CHECK (generates_coupon IN (0, 1)),
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      poster_purchase_confirmed INTEGER NOT NULL DEFAULT 1 CHECK (poster_purchase_confirmed IN (0, 1)),
      spins_used INTEGER NOT NULL DEFAULT 0 CHECK (spins_used BETWEEN 0 AND 2),
      max_spins_allowed INTEGER NOT NULL DEFAULT 1 CHECK (max_spins_allowed BETWEEN 1 AND 2),
      created_at TEXT NOT NULL,
      CHECK (spins_used <= max_spins_allowed)
    );

    CREATE TABLE IF NOT EXISTS spins (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      spin_number INTEGER NOT NULL CHECK (spin_number IN (1, 2)),
      reward_id INTEGER NOT NULL REFERENCES rewards(id),
      reward_key TEXT NOT NULL,
      reward_title TEXT NOT NULL,
      confirmed_at TEXT,
      created_at TEXT NOT NULL,
      UNIQUE (customer_id, spin_number)
    );

    CREATE TABLE IF NOT EXISTS coupon_codes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      customer_id TEXT UNIQUE NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      spin_id TEXT UNIQUE NOT NULL REFERENCES spins(id) ON DELETE RESTRICT,
      reward_id INTEGER NOT NULL REFERENCES rewards(id),
      reward_title TEXT NOT NULL,
      valid_until TEXT NOT NULL,
      is_redeemed INTEGER NOT NULL DEFAULT 0 CHECK (is_redeemed IN (0, 1)),
      redeemed_at TEXT,
      redeemed_by_admin_id TEXT REFERENCES admin_accounts(id),
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_spins_customer ON spins(customer_id);
    CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupon_codes(code);
    CREATE INDEX IF NOT EXISTS idx_coupons_redeemed ON coupon_codes(is_redeemed);
  `);

  const now = new Date().toISOString();

  // Seed default 6 rewards if table is empty
  const rewardCount = db.prepare('SELECT COUNT(*) AS cnt FROM rewards').get().cnt;
  if (rewardCount === 0) {
    const insertReward = db.prepare(`
      INSERT INTO rewards (
        key, segment_index, title, short_label, headline_message, description,
        redemption_conditions, weight, is_enabled, validity_days, valid_until_override,
        is_win, grants_extra_spin, generates_coupon, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
    `);

    for (const r of DEFAULT_REWARDS) {
      insertReward.run(
        r.key,
        r.segment_index,
        r.title,
        r.short_label,
        r.headline_message,
        r.description,
        r.redemption_conditions,
        r.weight,
        r.is_enabled,
        r.validity_days,
        r.is_win,
        r.grants_extra_spin,
        r.generates_coupon,
        now
      );
    }
  }

  // Ensure FREE_ADDON category is updated to FREE CHOCOLATE 🍫
  db.prepare(`
    UPDATE rewards
    SET title = 'FREE CHOCOLATE 🍫',
        short_label = 'FREE CHOCOLATE 🍫',
        headline_message = 'A sweet surprise for you! You''ve won FREE CHOCOLATE.',
        description = 'Enjoy complimentary delicious chocolate with your SOVELLE stall visit or next order.',
        redemption_conditions = 'Present this coupon code at the SOVELLE stall to claim your complimentary chocolate! Single-use only.'
    WHERE key = 'FREE_ADDON'
  `).run();

  // Seed initial admin account from environment variables if none exists
  const adminCount = db.prepare('SELECT COUNT(*) AS cnt FROM admin_accounts').get().cnt;
  if (adminCount === 0) {
    const username = (process.env.ADMIN_USERNAME || 'sovelle-admin').trim();
    const password = process.env.ADMIN_PASSWORD || 'Sovelle@2026';
    const fullName = (process.env.ADMIN_FULL_NAME || 'SOVELLE Atelier Admin').trim();

    db.prepare(`
      INSERT INTO admin_accounts (id, username, password_hash, full_name, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), username, hashPassword(password), fullName, now);
  }
}
