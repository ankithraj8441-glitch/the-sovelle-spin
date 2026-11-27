import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  parseCookies,
  serializeCookie,
} from './auth.js';

const CUSTOMER_COOKIE = 'sovelle_cust_sid';
const ADMIN_COOKIE = 'sovelle_admin_sid';
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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
      'Present this coupon code at the SOVELLE stall to claim your complimentary chocolate! Single-use only.',
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

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

function normalizeIndianPhone(raw) {
  if (typeof raw !== 'string') return '';
  let digits = raw.replace(/[\s\-()]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  return digits;
}

function getRandomInt(min, max) {
  const range = max - min;
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return min + (arr[0] % range);
}

function generateCouponString() {
  let p1 = '';
  let p2 = '';
  for (let i = 0; i < 4; i++) p1 += CODE_ALPHABET[getRandomInt(0, CODE_ALPHABET.length)];
  for (let i = 0; i < 3; i++) p2 += CODE_ALPHABET[getRandomInt(0, CODE_ALPHABET.length)];
  return `SOV-${p1}-${p2}`;
}

async function ensureSchema(db, env) {
  await db.exec(`
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
  `);

  const now = new Date().toISOString();

  // Seed default 6 rewards if table is empty
  const countRes = await db.prepare('SELECT COUNT(*) AS cnt FROM rewards').first();
  if (!countRes || countRes.cnt === 0) {
    for (const r of DEFAULT_REWARDS) {
      await db
        .prepare(
          `INSERT INTO rewards (
            key, segment_index, title, short_label, headline_message, description,
            redemption_conditions, weight, is_enabled, validity_days, valid_until_override,
            is_win, grants_extra_spin, generates_coupon, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`
        )
        .bind(
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
        )
        .run();
    }
  } else {
    // Migration: make sure FREE_ADDON has chocolate label
    await db
      .prepare(
        `UPDATE rewards
         SET title = 'FREE CHOCOLATE 🍫',
             short_label = 'FREE CHOCOLATE 🍫',
             headline_message = 'A sweet surprise for you! You''ve won FREE CHOCOLATE.',
             description = 'Enjoy complimentary delicious chocolate with your SOVELLE stall visit or next order.',
             redemption_conditions = 'Present this coupon code at the SOVELLE stall to claim your complimentary chocolate! Single-use only.'
         WHERE key = 'FREE_ADDON'`
      )
      .run();
  }

  // Seed admin account if none exists
  const adminRes = await db.prepare('SELECT COUNT(*) AS cnt FROM admin_accounts').first();
  if (!adminRes || adminRes.cnt === 0) {
    const adminUser = env?.ADMIN_USERNAME || 'sovelle-admin';
    const adminPass = env?.ADMIN_PASSWORD || 'Sovelle@2026';
    const adminFullName = env?.ADMIN_FULL_NAME || 'SOVELLE Atelier Admin';
    const passHash = await hashPassword(adminPass);

    await db
      .prepare(
        `INSERT INTO admin_accounts (id, username, password_hash, full_name, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(crypto.randomUUID(), adminUser, passHash, adminFullName, now)
      .run();
  }
}

async function getCustomerState(db, customerId) {
  const customer = await db
    .prepare(
      `SELECT id, name, phone, poster_purchase_confirmed, spins_used, max_spins_allowed, created_at
       FROM customers WHERE id = ?`
    )
    .bind(customerId)
    .first();

  if (!customer) return null;

  const spinsRes = await db
    .prepare(
      `SELECT s.id, s.spin_number, s.reward_id, s.reward_key, s.reward_title, s.confirmed_at, s.created_at,
              r.segment_index, r.headline_message, r.description, r.redemption_conditions,
              r.is_win, r.grants_extra_spin, r.generates_coupon
       FROM spins s
       JOIN rewards r ON r.id = s.reward_id
       WHERE s.customer_id = ?
       ORDER BY s.spin_number ASC`
    )
    .bind(customerId)
    .all();

  const coupon = await db
    .prepare(
      `SELECT id, code, reward_title, valid_until, is_redeemed, redeemed_at, created_at
       FROM coupon_codes
       WHERE customer_id = ?`
    )
    .bind(customerId)
    .first();

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      spinsUsed: customer.spins_used,
      maxSpinsAllowed: customer.max_spins_allowed,
      remainingSpins: Math.max(0, customer.max_spins_allowed - customer.spins_used),
      createdAt: customer.created_at,
    },
    spins: (spinsRes.results || []).map((s) => ({
      id: s.id,
      spinNumber: s.spin_number,
      segmentIndex: s.segment_index,
      rewardKey: s.reward_key,
      rewardTitle: s.reward_title,
      headlineMessage: s.headline_message,
      description: s.description,
      redemptionConditions: s.redemption_conditions,
      isWin: Boolean(s.is_win),
      grantsExtraSpin: Boolean(s.grants_extra_spin),
      generatesCoupon: Boolean(s.generates_coupon),
      confirmedAt: s.confirmed_at,
      createdAt: s.created_at,
    })),
    coupon: coupon
      ? {
          id: coupon.id,
          code: coupon.code,
          rewardTitle: coupon.reward_title,
          validUntil: coupon.valid_until,
          isRedeemed: Boolean(coupon.is_redeemed),
          redeemedAt: coupon.redeemed_at,
          createdAt: coupon.created_at,
        }
      : null,
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();
  const cookies = parseCookies(request.headers.get('Cookie'));
  const secret = env.SESSION_SECRET || 'sovelle-spin-edge-secret-production-key-2026';

  // Ensure database exists
  const db = env.DB;
  if (!db) {
    return json(
      {
        error:
          'Cloudflare D1 database binding "DB" is not configured. Please bind a D1 database named "DB" in Cloudflare Pages settings.',
      },
      500
    );
  }

  // Auto-init schema if not present
  try {
    await ensureSchema(db, env);
  } catch (err) {
    console.error('Schema initialization error:', err);
  }

  // --- 1. Health ---
  if (path === '/api/health') {
    return json({ status: 'ok', brand: 'SOVELLE', app: 'THE SOVELLE SPIN (Cloudflare Pages)' });
  }

  // --- 2. Public Config ---
  if (path === '/api/config' && method === 'GET') {
    const res = await db
      .prepare(
        `SELECT id, key, segment_index, title, short_label, is_enabled, is_win, grants_extra_spin
         FROM rewards
         ORDER BY segment_index ASC`
      )
      .all();

    const segments = (res.results || []).map((r) => ({
      id: r.id,
      key: r.key,
      segmentIndex: r.segment_index,
      title: r.title,
      shortLabel: r.short_label,
      isEnabled: Boolean(r.is_enabled),
      isWin: Boolean(r.is_win),
      grantsExtraSpin: Boolean(r.grants_extra_spin),
    }));

    return json({
      brand: 'SOVELLE',
      title: 'THE SOVELLE SPIN',
      segments,
    });
  }

  // --- 3. Customer Session ---
  if (path === '/api/session' && method === 'GET') {
    const token = cookies[CUSTOMER_COOKIE];
    const payload = await verifyToken(token, secret);
    if (!payload || payload.role !== 'customer' || !payload.customerId) {
      return json({ authenticated: false, state: null });
    }

    const state = await getCustomerState(db, payload.customerId);
    if (!state) {
      return json(
        { authenticated: false, state: null },
        200,
        { 'Set-Cookie': serializeCookie(CUSTOMER_COOKIE, '', 0) }
      );
    }

    return json({ authenticated: true, state });
  }

  // --- 4. Customer Register ---
  if (path === '/api/customers/register' && method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body.' }, 400);
    }

    const rawName = typeof body?.name === 'string' ? body.name.trim() : '';
    const phone = normalizeIndianPhone(body?.phone);
    const posterConfirmed = body?.posterPurchaseConfirmed !== false;

    if (rawName.length < 2 || rawName.length > 80) {
      return json({ error: 'Please enter your full name (2 to 80 characters).' }, 400);
    }

    if (!INDIAN_MOBILE_REGEX.test(phone)) {
      return json(
        { error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.' },
        400
      );
    }

    if (!posterConfirmed) {
      return json(
        { error: 'Please confirm that you have purchased at least 2 posters at the SOVELLE stall.' },
        400
      );
    }

    const existing = await db.prepare('SELECT id FROM customers WHERE phone = ?').bind(phone).first();
    if (existing) {
      return json(
        {
          error:
            'This mobile number has already been registered for THE SOVELLE SPIN. Only one entry is permitted per phone number.',
        },
        409
      );
    }

    const customerId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO customers (id, name, phone, poster_purchase_confirmed, spins_used, max_spins_allowed, created_at)
         VALUES (?, ?, ?, 1, 0, 1, ?)`
      )
      .bind(customerId, rawName, phone, now)
      .run();

    const token = await signToken({ role: 'customer', customerId }, secret, 60 * 60 * 24 * 14);
    const state = await getCustomerState(db, customerId);

    return json(
      {
        message: `Entry confirmed for ${state.customer.name}. You have unlocked 1 spin!`,
        state,
      },
      201,
      { 'Set-Cookie': serializeCookie(CUSTOMER_COOKIE, token, 60 * 60 * 24 * 14) }
    );
  }

  // --- 5. Customer Login ---
  if (path === '/api/customers/login' && method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const phone = normalizeIndianPhone(body?.phone);

    if (!INDIAN_MOBILE_REGEX.test(phone)) {
      return json(
        { error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.' },
        400
      );
    }

    const customer = await db.prepare('SELECT id, name FROM customers WHERE phone = ?').bind(phone).first();
    if (!customer) {
      return json(
        {
          error:
            'No stall entry found for this mobile number. Please register with your 2-poster purchase.',
        },
        404
      );
    }

    const token = await signToken({ role: 'customer', customerId: customer.id }, secret, 60 * 60 * 24 * 14);
    const state = await getCustomerState(db, customer.id);

    return json(
      { message: `Welcome back, ${customer.name}!`, state },
      200,
      { 'Set-Cookie': serializeCookie(CUSTOMER_COOKIE, token, 60 * 60 * 24 * 14) }
    );
  }

  // --- 6. Customer Logout ---
  if (path === '/api/customers/logout' && method === 'POST') {
    return json({ ok: true }, 200, {
      'Set-Cookie': serializeCookie(CUSTOMER_COOKIE, '', 0),
    });
  }

  // --- 7. Execute Spin ---
  if (path === '/api/spin' && method === 'POST') {
    const token = cookies[CUSTOMER_COOKIE];
    const payload = await verifyToken(token, secret);
    if (!payload || payload.role !== 'customer' || !payload.customerId) {
      return json({ error: 'Please register with your name and mobile number before spinning.' }, 401);
    }

    const customerId = payload.customerId;
    const customer = await db
      .prepare('SELECT id, name, phone, spins_used, max_spins_allowed FROM customers WHERE id = ?')
      .bind(customerId)
      .first();

    if (!customer) {
      return json({ error: 'Customer session not found. Please register again.' }, 404);
    }

    if (customer.spins_used >= customer.max_spins_allowed || customer.spins_used >= 2) {
      return json({ error: 'You have already used all eligible spins for this registration.' }, 409);
    }

    const nextSpinNumber = customer.spins_used + 1;
    const allRewardsRes = await db.prepare('SELECT * FROM rewards ORDER BY segment_index ASC').all();
    const allRewards = allRewardsRes.results || [];

    // Spin 2 strictly excludes Golden Spin
    let eligible = allRewards.filter((r) => {
      if (!r.is_enabled) return false;
      if (nextSpinNumber >= 2 && r.grants_extra_spin) return false;
      return true;
    });

    if (eligible.length === 0) {
      eligible = allRewards.filter((r) => !r.grants_extra_spin);
    }

    // Weighted random selection
    const totalWeight = eligible.reduce((acc, r) => acc + Math.max(1, Number(r.weight) || 10), 0);
    let roll = getRandomInt(0, totalWeight);
    let chosen = eligible[eligible.length - 1];
    for (const r of eligible) {
      roll -= Math.max(1, Number(r.weight) || 10);
      if (roll < 0) {
        chosen = r;
        break;
      }
    }

    const now = new Date().toISOString();
    const spinId = crypto.randomUUID();
    const newMaxSpins =
      nextSpinNumber === 1 && chosen.grants_extra_spin ? 2 : customer.max_spins_allowed;
    const newSpinsUsed = nextSpinNumber;

    // Record spin
    await db
      .prepare(
        `INSERT INTO spins (id, customer_id, spin_number, reward_id, reward_key, reward_title, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(spinId, customer.id, nextSpinNumber, chosen.id, chosen.key, chosen.title, now)
      .run();

    // Update customer spins
    await db
      .prepare(
        `UPDATE customers
         SET spins_used = ?, max_spins_allowed = ?
         WHERE id = ?`
      )
      .bind(newSpinsUsed, newMaxSpins, customer.id)
      .run();

    let generatedCoupon = null;
    if (chosen.generates_coupon) {
      let validUntil;
      if (chosen.valid_until_override) {
        validUntil = new Date(chosen.valid_until_override).toISOString();
      } else {
        const days = Math.max(1, Number(chosen.validity_days) || 30);
        const dt = new Date();
        dt.setDate(dt.getDate() + days);
        dt.setHours(23, 59, 59, 999);
        validUntil = dt.toISOString();
      }

      let code = null;
      for (let attempt = 0; attempt < 12; attempt++) {
        const candidate = generateCouponString();
        const existing = await db
          .prepare('SELECT id FROM coupon_codes WHERE code = ?')
          .bind(candidate)
          .first();
        if (!existing) {
          code = candidate;
          break;
        }
      }

      if (code) {
        const couponId = crypto.randomUUID();
        await db
          .prepare(
            `INSERT INTO coupon_codes (id, code, customer_id, spin_id, reward_id, reward_title, valid_until, is_redeemed, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
          )
          .bind(couponId, code, customer.id, spinId, chosen.id, chosen.title, validUntil, now)
          .run();

        generatedCoupon = {
          id: couponId,
          code,
          rewardTitle: chosen.title,
          validUntil,
          isRedeemed: false,
          createdAt: now,
        };
      }
    }

    const state = await getCustomerState(db, customer.id);
    return json({
      result: {
        spin: {
          id: spinId,
          spinNumber: nextSpinNumber,
          segmentIndex: chosen.segment_index,
          rewardKey: chosen.key,
          rewardTitle: chosen.title,
          headlineMessage: chosen.headline_message,
          description: chosen.description,
          redemptionConditions: chosen.redemption_conditions,
          isWin: Boolean(chosen.is_win),
          grantsExtraSpin: Boolean(chosen.grants_extra_spin),
          generatesCoupon: Boolean(chosen.generates_coupon),
          createdAt: now,
        },
        coupon: generatedCoupon,
        remainingSpins: Math.max(0, newMaxSpins - newSpinsUsed),
      },
      state,
    });
  }

  // --- 8. Confirm Spin ---
  if (path === '/api/spin/confirm' && method === 'POST') {
    const token = cookies[CUSTOMER_COOKIE];
    const payload = await verifyToken(token, secret);
    if (!payload || !payload.customerId) {
      return json({ error: 'Session expired. Please refresh.' }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const spinId = body?.spinId;
    if (!spinId) return json({ error: 'Missing spin reference.' }, 400);

    const now = new Date().toISOString();
    await db
      .prepare(
        `UPDATE spins SET confirmed_at = COALESCE(confirmed_at, ?)
         WHERE id = ? AND customer_id = ?`
      )
      .bind(now, spinId, payload.customerId)
      .run();

    const state = await getCustomerState(db, payload.customerId);
    return json({ confirmed: true, state });
  }

  // --- 9. Admin Login ---
  if (path === '/api/admin/login' && method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!password) {
      return json({ error: 'Administrator password is required.' }, 400);
    }

    let admin = null;
    if (username) {
      admin = await db
        .prepare('SELECT id, username, password_hash, full_name FROM admin_accounts WHERE username = ?')
        .bind(username)
        .first();
    } else {
      admin = await db
        .prepare('SELECT id, username, password_hash, full_name FROM admin_accounts ORDER BY created_at ASC LIMIT 1')
        .first();
    }

    if (!admin || !(await verifyPassword(password, admin.password_hash))) {
      return json({ error: 'Incorrect password. Access denied.' }, 401);
    }

    const token = await signToken(
      { role: 'admin', adminId: admin.id, username: admin.username },
      secret,
      60 * 60 * 12
    );

    return json(
      {
        admin: {
          id: admin.id,
          username: admin.username,
          fullName: admin.full_name,
        },
      },
      200,
      { 'Set-Cookie': serializeCookie(ADMIN_COOKIE, token, 60 * 60 * 12) }
    );
  }

  // --- 10. Admin Logout ---
  if (path === '/api/admin/logout' && method === 'POST') {
    return json({ ok: true }, 200, {
      'Set-Cookie': serializeCookie(ADMIN_COOKIE, '', 0),
    });
  }

  // === ADMIN AUTH GUARD FOR REMAINING /api/admin/* ROUTES ===
  if (path.startsWith('/api/admin/')) {
    const token = cookies[ADMIN_COOKIE];
    const payload = await verifyToken(token, secret);
    if (!payload || payload.role !== 'admin' || !payload.adminId) {
      return json({ error: 'Administrator authentication required.' }, 401);
    }

    const admin = await db
      .prepare('SELECT id, username, full_name FROM admin_accounts WHERE id = ?')
      .bind(payload.adminId)
      .first();

    if (!admin) {
      return json({ error: 'Administrator account no longer exists.' }, 401);
    }

    // GET /api/admin/me
    if (path === '/api/admin/me' && method === 'GET') {
      return json({
        admin: {
          id: admin.id,
          username: admin.username,
          fullName: admin.full_name,
        },
      });
    }

    // GET /api/admin/overview
    if (path === '/api/admin/overview' && method === 'GET') {
      const custRes = await db.prepare('SELECT COUNT(*) AS cnt FROM customers').first();
      const uniqueRes = await db.prepare('SELECT COUNT(DISTINCT phone) AS cnt FROM customers').first();
      const spinsRes = await db.prepare('SELECT COUNT(*) AS cnt FROM spins').first();
      const coupRes = await db.prepare('SELECT COUNT(*) AS cnt FROM coupon_codes').first();
      const redRes = await db.prepare('SELECT COUNT(*) AS cnt FROM coupon_codes WHERE is_redeemed = 1').first();

      const spinByKeyRows = await db
        .prepare('SELECT reward_key, COUNT(*) AS cnt FROM spins GROUP BY reward_key')
        .all();

      const countsByKey = {
        GOLDEN_SPIN: 0,
        PCT_10: 0,
        PCT_20: 0,
        FREE_ADDON: 0,
        BETTER_LUCK: 0,
        FLAT_50: 0,
      };

      for (const row of spinByKeyRows.results || []) {
        if (row.reward_key in countsByKey) {
          countsByKey[row.reward_key] = row.cnt;
        }
      }

      const totalRewardsWon =
        countsByKey.PCT_10 +
        countsByKey.PCT_20 +
        countsByKey.FREE_ADDON +
        countsByKey.FLAT_50;

      const totalCoupons = coupRes?.cnt || 0;
      const redeemedCoupons = redRes?.cnt || 0;

      return json({
        totalRegisteredCustomers: custRes?.cnt || 0,
        totalUniqueCustomers: uniqueRes?.cnt || 0,
        totalSpins: spinsRes?.cnt || 0,
        totalRewardsWon,
        totalCouponsIssued: totalCoupons,
        redeemedCoupons,
        unredeemedCoupons: Math.max(0, totalCoupons - redeemedCoupons),
        breakdown: {
          goldenSpins: countsByKey.GOLDEN_SPIN,
          pct10: countsByKey.PCT_10,
          pct20: countsByKey.PCT_20,
          freeAddons: countsByKey.FREE_ADDON,
          flat50: countsByKey.FLAT_50,
          betterLuck: countsByKey.BETTER_LUCK,
        },
      });
    }

    // GET /api/admin/customers
    if (path === '/api/admin/customers' && method === 'GET') {
      const search = (url.searchParams.get('search') || '').trim().toLowerCase();
      const rewardKey = url.searchParams.get('rewardKey') || 'ALL';
      const redemptionStatus = url.searchParams.get('redemptionStatus') || 'ALL';

      const rowsRes = await db
        .prepare(
          `SELECT
             c.id, c.name, c.phone, c.spins_used, c.max_spins_allowed, c.created_at AS registered_at,
             s1.id AS spin1_id, s1.reward_key AS spin1_key, s1.reward_title AS spin1_title, s1.created_at AS spin1_at,
             s2.id AS spin2_id, s2.reward_key AS spin2_key, s2.reward_title AS spin2_title, s2.created_at AS spin2_at,
             cc.id AS coupon_id, cc.code AS coupon_code, cc.valid_until AS coupon_valid_until,
             cc.is_redeemed AS coupon_is_redeemed, cc.redeemed_at AS coupon_redeemed_at
           FROM customers c
           LEFT JOIN spins s1 ON s1.customer_id = c.id AND s1.spin_number = 1
           LEFT JOIN spins s2 ON s2.customer_id = c.id AND s2.spin_number = 2
           LEFT JOIN coupon_codes cc ON cc.customer_id = c.id
           ORDER BY c.created_at DESC`
        )
        .all();

      const customers = (rowsRes.results || [])
        .map((r) => {
          const finalSpinTitle = r.spin2_title || r.spin1_title || 'Not Spun Yet';
          const finalSpinKey = r.spin2_key || r.spin1_key || null;
          const redemptionState = !r.coupon_id
            ? 'NA'
            : r.coupon_is_redeemed
              ? 'REDEEMED'
              : 'UNREDEEMED';

          return {
            id: r.id,
            name: r.name,
            phone: r.phone,
            registeredAt: r.registered_at,
            spinsUsed: r.spins_used,
            maxSpinsAllowed: r.max_spins_allowed,
            firstSpinResult: r.spin1_title || null,
            firstSpinKey: r.spin1_key || null,
            firstSpinAt: r.spin1_at || null,
            secondSpinResult: r.spin2_title || null,
            secondSpinKey: r.spin2_key || null,
            secondSpinAt: r.spin2_at || null,
            finalReward: finalSpinTitle,
            finalRewardKey: finalSpinKey,
            couponId: r.coupon_id || null,
            couponCode: r.coupon_code || null,
            couponValidUntil: r.coupon_valid_until || null,
            isRedeemed: Boolean(r.coupon_is_redeemed),
            redeemedAt: r.coupon_redeemed_at || null,
            redemptionState,
          };
        })
        .filter((item) => {
          if (search) {
            const hit =
              item.name.toLowerCase().includes(search) ||
              item.phone.toLowerCase().includes(search) ||
              item.couponCode?.toLowerCase().includes(search);
            if (!hit) return false;
          }
          if (rewardKey && rewardKey !== 'ALL') {
            if (rewardKey === 'GOLDEN_SPIN') {
              if (item.firstSpinKey !== 'GOLDEN_SPIN' && item.secondSpinKey !== 'GOLDEN_SPIN') {
                return false;
              }
            } else if (item.finalRewardKey !== rewardKey) {
              return false;
            }
          }
          if (redemptionStatus && redemptionStatus !== 'ALL') {
            if (item.redemptionState !== redemptionStatus) return false;
          }
          return true;
        });

      return json({ customers });
    }

    // GET /api/admin/export.csv
    if (path === '/api/admin/export.csv' && method === 'GET') {
      const rowsRes = await db
        .prepare(
          `SELECT
             c.name, c.phone, c.created_at AS registered_at, c.spins_used,
             s1.reward_title AS spin1_title, s2.reward_title AS spin2_title,
             cc.code AS coupon_code, cc.valid_until, cc.is_redeemed, cc.redeemed_at
           FROM customers c
           LEFT JOIN spins s1 ON s1.customer_id = c.id AND s1.spin_number = 1
           LEFT JOIN spins s2 ON s2.customer_id = c.id AND s2.spin_number = 2
           LEFT JOIN coupon_codes cc ON cc.customer_id = c.id
           ORDER BY c.created_at DESC`
        )
        .all();

      const escapeCsv = (val) => {
        const str = val == null ? '' : String(val);
        return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      };

      const headers = [
        'Customer Name',
        'Mobile Phone',
        'Registration Date & Time',
        'Number of Spins',
        'First Spin Result',
        'Second Spin Result',
        'Final Reward',
        'Coupon Code',
        'Coupon Valid Until',
        'Redemption Status',
        'Redeemed At',
      ];

      const lines = [headers.map(escapeCsv).join(',')];
      for (const r of rowsRes.results || []) {
        lines.push(
          [
            r.name,
            r.phone,
            r.registered_at,
            r.spins_used,
            r.spin1_title || '—',
            r.spin2_title || '—',
            r.spin2_title || r.spin1_title || 'Not Spun Yet',
            r.coupon_code || '—',
            r.valid_until || '—',
            r.is_redeemed ? 'Redeemed' : r.coupon_code ? 'Unredeemed' : 'No Coupon',
            r.redeemed_at || '—',
          ]
            .map(escapeCsv)
            .join(',')
        );
      }

      return new Response(lines.join('\r\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="sovelle-spin-activity-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // GET /api/admin/coupons
    if (path === '/api/admin/coupons' && method === 'GET') {
      const search = (url.searchParams.get('search') || '').trim().toLowerCase();
      const status = url.searchParams.get('status') || 'ALL';

      const couponsRes = await db
        .prepare(
          `SELECT cc.id, cc.code, cc.reward_title, cc.valid_until, cc.is_redeemed,
                  cc.redeemed_at, cc.created_at,
                  c.id AS customer_id, c.name AS customer_name, c.phone AS customer_phone,
                  r.key AS reward_key
           FROM coupon_codes cc
           JOIN customers c ON c.id = cc.customer_id
           JOIN rewards r ON r.id = cc.reward_id
           ORDER BY cc.created_at DESC`
        )
        .all();

      const coupons = (couponsRes.results || [])
        .map((c) => ({
          id: c.id,
          code: c.code,
          rewardKey: c.reward_key,
          rewardTitle: c.reward_title,
          validUntil: c.valid_until,
          isRedeemed: Boolean(c.is_redeemed),
          redeemedAt: c.redeemed_at,
          createdAt: c.created_at,
          customerId: c.customer_id,
          customerName: c.customer_name,
          customerPhone: c.customer_phone,
        }))
        .filter((c) => {
          if (search) {
            const hit =
              c.code.toLowerCase().includes(search) ||
              c.customerName.toLowerCase().includes(search) ||
              c.customerPhone.toLowerCase().includes(search);
            if (!hit) return false;
          }
          if (status === 'REDEEMED' && !c.isRedeemed) return false;
          if (status === 'UNREDEEMED' && c.isRedeemed) return false;
          return true;
        });

      return json({ coupons });
    }

    // POST /api/admin/coupons/:identifier/redeem
    const redeemMatch = path.match(/^\/api\/admin\/coupons\/([^/]+)\/redeem$/);
    if (redeemMatch && method === 'POST') {
      const identifier = decodeURIComponent(redeemMatch[1]).trim();
      const coupon = await db
        .prepare(
          `SELECT id, code, reward_title, valid_until, is_redeemed, redeemed_at
           FROM coupon_codes
           WHERE id = ? OR UPPER(code) = UPPER(?)`
        )
        .bind(identifier, identifier)
        .first();

      if (!coupon) return json({ error: 'Coupon code not found.' }, 404);
      if (coupon.is_redeemed) {
        return json(
          {
            error: `Coupon ${coupon.code} was already redeemed on ${new Date(coupon.redeemed_at).toLocaleString()}.`,
          },
          409
        );
      }

      if (new Date(coupon.valid_until).getTime() < Date.now()) {
        return json({ error: `Coupon ${coupon.code} has expired.` }, 400);
      }

      const now = new Date().toISOString();
      const updateRes = await db
        .prepare(
          `UPDATE coupon_codes
           SET is_redeemed = 1, redeemed_at = ?, redeemed_by_admin_id = ?
           WHERE id = ? AND is_redeemed = 0`
        )
        .bind(now, admin.id, coupon.id)
        .run();

      if (updateRes.meta?.changes === 0) {
        return json({ error: 'Coupon has already been redeemed.' }, 409);
      }

      const updated = await db
        .prepare(
          `SELECT cc.id, cc.code, cc.reward_title, cc.valid_until, cc.is_redeemed, cc.redeemed_at,
                  c.name AS customer_name, c.phone AS customer_phone
           FROM coupon_codes cc
           JOIN customers c ON c.id = cc.customer_id
           WHERE cc.id = ?`
        )
        .bind(coupon.id)
        .first();

      return json({
        message: `Coupon ${updated.code} marked as redeemed.`,
        coupon: {
          id: updated.id,
          code: updated.code,
          rewardTitle: updated.reward_title,
          validUntil: updated.valid_until,
          isRedeemed: Boolean(updated.is_redeemed),
          redeemedAt: updated.redeemed_at,
          customerName: updated.customer_name,
          customerPhone: updated.customer_phone,
        },
      });
    }

    // PATCH /api/admin/coupons/:id/validity
    const validityMatch = path.match(/^\/api\/admin\/coupons\/([^/]+)\/validity$/);
    if (validityMatch && method === 'PATCH') {
      const couponId = decodeURIComponent(validityMatch[1]);
      let body;
      try {
        body = await request.json();
      } catch {
        body = {};
      }

      const parsed = new Date(body?.validUntil);
      if (!body?.validUntil || Number.isNaN(parsed.getTime())) {
        return json({ error: 'Please provide a valid expiry date.' }, 400);
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(body.validUntil))) {
        parsed.setHours(23, 59, 59, 999);
      }

      await db
        .prepare('UPDATE coupon_codes SET valid_until = ? WHERE id = ?')
        .bind(parsed.toISOString(), couponId)
        .run();

      return json({ validUntil: parsed.toISOString() });
    }

    // GET /api/admin/rewards
    if (path === '/api/admin/rewards' && method === 'GET') {
      const rewardsRes = await db
        .prepare(
          `SELECT r.*,
                  (SELECT COUNT(*) FROM spins s WHERE s.reward_id = r.id) AS total_awarded,
                  (SELECT COUNT(*) FROM coupon_codes cc WHERE cc.reward_id = r.id AND cc.is_redeemed = 1) AS total_redeemed
           FROM rewards r
           ORDER BY r.segment_index ASC`
        )
        .all();

      const rewards = (rewardsRes.results || []).map((r) => ({
        id: r.id,
        key: r.key,
        segmentIndex: r.segment_index,
        title: r.title,
        shortLabel: r.short_label,
        description: r.description,
        redemptionConditions: r.redemption_conditions,
        weight: r.weight,
        isEnabled: Boolean(r.is_enabled),
        validityDays: r.validity_days,
        validUntilOverride: r.valid_until_override,
        isWin: Boolean(r.is_win),
        grantsExtraSpin: Boolean(r.grants_extra_spin),
        generatesCoupon: Boolean(r.generates_coupon),
        totalAwarded: r.total_awarded,
        totalRedeemed: r.total_redeemed,
        updatedAt: r.updated_at,
      }));

      return json({ rewards });
    }

    // PATCH /api/admin/rewards/:id
    const rewardMatch = path.match(/^\/api\/admin\/rewards\/(\d+)$/);
    if (rewardMatch && method === 'PATCH') {
      const rewardId = Number(rewardMatch[1]);
      const existing = await db.prepare('SELECT * FROM rewards WHERE id = ?').bind(rewardId).first();
      if (!existing) return json({ error: 'Reward category not found.' }, 404);

      let body;
      try {
        body = await request.json();
      } catch {
        body = {};
      }

      const nextEnabled =
        typeof body?.isEnabled === 'boolean' ? (body.isEnabled ? 1 : 0) : existing.is_enabled;
      const nextWeight =
        body?.weight !== undefined ? Math.max(1, Math.min(100, Number(body.weight) || 10)) : existing.weight;
      const nextValidityDays =
        body?.validityDays !== undefined
          ? Math.max(1, Math.min(3650, Number(body.validityDays) || 30))
          : existing.validity_days;

      let nextOverride = existing.valid_until_override;
      if (body && 'validUntilOverride' in body) {
        if (!body.validUntilOverride) {
          nextOverride = null;
        } else {
          const dt = new Date(body.validUntilOverride);
          if (Number.isNaN(dt.getTime())) return json({ error: 'Invalid override date.' }, 400);
          if (/^\d{4}-\d{2}-\d{2}$/.test(String(body.validUntilOverride))) {
            dt.setHours(23, 59, 59, 999);
          }
          nextOverride = dt.toISOString();
        }
      }

      const now = new Date().toISOString();
      await db
        .prepare(
          `UPDATE rewards
           SET is_enabled = ?, weight = ?, validity_days = ?, valid_until_override = ?, updated_at = ?
           WHERE id = ?`
        )
        .bind(nextEnabled, nextWeight, nextValidityDays, nextOverride, now, rewardId)
        .run();

      const updated = await db.prepare('SELECT * FROM rewards WHERE id = ?').bind(rewardId).first();
      return json({
        reward: {
          id: updated.id,
          key: updated.key,
          segmentIndex: updated.segment_index,
          title: updated.title,
          isEnabled: Boolean(updated.is_enabled),
          weight: updated.weight,
          validityDays: updated.validity_days,
          validUntilOverride: updated.valid_until_override,
          updatedAt: updated.updated_at,
        },
      });
    }
  }

  return json({ error: 'Not found.' }, 404);
}
