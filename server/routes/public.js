import express from 'express';
import crypto from 'node:crypto';
import { db, withTransaction } from '../db.js';
import { signToken, verifyToken, getCookieOptions } from '../auth.js';
import { executeCustomerSpin, getCustomerState } from '../spinService.js';

const router = express.Router();
const CUSTOMER_COOKIE = 'sovelle_cust_sid';
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/**
 * Normalize phone input: strips whitespace, hyphens, leading +91 or 0 if 11-13 chars.
 */
function normalizeIndianPhone(raw) {
  if (typeof raw !== 'string') return '';
  let digits = raw.replace(/[\s\-()]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  return digits;
}

function getAuthenticatedCustomerId(req) {
  const token = req.cookies?.[CUSTOMER_COOKIE];
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'customer' || !payload.customerId) return null;
  return payload.customerId;
}

/**
 * GET /api/config
 * Returns wheel segment definitions (public, no customer PII).
 */
router.get('/config', (_req, res) => {
  const segments = db
    .prepare(
      `SELECT id, key, segment_index, title, short_label, is_enabled, is_win, grants_extra_spin
       FROM rewards
       ORDER BY segment_index ASC`
    )
    .all()
    .map((r) => ({
      id: r.id,
      key: r.key,
      segmentIndex: r.segment_index,
      title: r.title,
      shortLabel: r.short_label,
      isEnabled: Boolean(r.is_enabled),
      isWin: Boolean(r.is_win),
      grantsExtraSpin: Boolean(r.grants_extra_spin),
    }));

  res.json({
    brand: 'SOVELLE',
    title: 'THE SOVELLE SPIN',
    segments,
  });
});

/**
 * GET /api/session
 * Restores the active customer's own session only (if signed cookie exists).
 */
router.get('/session', (req, res) => {
  const customerId = getAuthenticatedCustomerId(req);
  if (!customerId) {
    return res.json({ authenticated: false, state: null });
  }
  const state = getCustomerState(customerId);
  if (!state) {
    res.clearCookie(CUSTOMER_COOKIE, { path: '/' });
    return res.json({ authenticated: false, state: null });
  }
  return res.json({ authenticated: true, state });
});

/**
 * POST /api/customers/register
 * Validates name + 10-digit Indian phone number, enforces uniqueness, sets signed session cookie.
 */
router.post('/customers/register', (req, res) => {
  const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const phone = normalizeIndianPhone(req.body?.phone);
  const posterConfirmed = req.body?.posterPurchaseConfirmed !== false;

  if (rawName.length < 2 || rawName.length > 80) {
    return res.status(400).json({
      error: 'Please enter your full name (2 to 80 characters).',
    });
  }

  if (!INDIAN_MOBILE_REGEX.test(phone)) {
    return res.status(400).json({
      error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
    });
  }

  if (!posterConfirmed) {
    return res.status(400).json({
      error: 'Please confirm that you have purchased at least 2 posters at the SOVELLE stall.',
    });
  }

  try {
    const customerId = withTransaction(() => {
      const existing = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);
      if (existing) {
        const err = new Error(
          'This mobile number has already been registered for THE SOVELLE SPIN. Only one entry is permitted per phone number.'
        );
        err.status = 409;
        throw err;
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO customers (id, name, phone, poster_purchase_confirmed, spins_used, max_spins_allowed, created_at)
         VALUES (?, ?, ?, 1, 0, 1, ?)`
      ).run(id, rawName, phone, now);

      return id;
    });

    const token = signToken({ role: 'customer', customerId }, 60 * 60 * 24 * 14);
    res.cookie(CUSTOMER_COOKIE, token, getCookieOptions(1000 * 60 * 60 * 24 * 14));

    const state = getCustomerState(customerId);
    return res.status(201).json({
      message: `Entry confirmed for ${state.customer.name}. You have unlocked 1 spin!`,
      state,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({
        error:
          'This mobile number has already been registered for THE SOVELLE SPIN. Only one entry is permitted per phone number.',
      });
    }
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Unable to complete registration. Please try again.' });
  }
});

/**
 * POST /api/customers/login
 * Allows returning customer to sign back in with their registered 10-digit phone number.
 */
router.post('/customers/login', (req, res) => {
  const phone = normalizeIndianPhone(req.body?.phone);

  if (!INDIAN_MOBILE_REGEX.test(phone)) {
    return res.status(400).json({
      error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
    });
  }

  const customer = db.prepare('SELECT id, name FROM customers WHERE phone = ?').get(phone);
  if (!customer) {
    return res.status(404).json({
      error: 'No stall entry found for this mobile number. Please register with your 2-poster purchase.',
    });
  }

  const token = signToken({ role: 'customer', customerId: customer.id }, 60 * 60 * 24 * 14);
  res.cookie(CUSTOMER_COOKIE, token, getCookieOptions(1000 * 60 * 60 * 24 * 14));

  const state = getCustomerState(customer.id);
  return res.json({
    message: `Welcome back, ${customer.name}!`,
    state,
  });
});

/**
 * POST /api/customers/logout
 * Clears customer session cookie so the next stall visitor can register or spin.
 */
router.post('/customers/logout', (_req, res) => {
  res.clearCookie(CUSTOMER_COOKIE, { path: '/' });
  return res.json({ ok: true });
});

/**
 * POST /api/spin
 * Backend-authoritative spin execution.
 */
router.post('/spin', (req, res) => {
  const customerId = getAuthenticatedCustomerId(req);
  if (!customerId) {
    return res.status(401).json({
      error: 'Please register with your name and mobile number before spinning.',
    });
  }

  try {
    const result = executeCustomerSpin(customerId);
    const state = getCustomerState(customerId);
    return res.json({ result, state });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Spin execution error:', err);
    return res.status(500).json({ error: 'Spin could not be completed. Please try again.' });
  }
});

/**
 * POST /api/spin/confirm
 * Records customer confirmation of their spin result/reward.
 */
router.post('/spin/confirm', (req, res) => {
  const customerId = getAuthenticatedCustomerId(req);
  if (!customerId) {
    return res.status(401).json({ error: 'Session expired. Please refresh.' });
  }

  const spinId = req.body?.spinId;
  if (!spinId || typeof spinId !== 'string') {
    return res.status(400).json({ error: 'Missing spin reference.' });
  }

  const now = new Date().toISOString();
  const info = db
    .prepare(
      `UPDATE spins SET confirmed_at = COALESCE(confirmed_at, ?)
       WHERE id = ? AND customer_id = ?`
    )
    .run(now, spinId, customerId);

  if (info.changes === 0) {
    return res.status(404).json({ error: 'Spin record not found for your session.' });
  }

  const state = getCustomerState(customerId);
  return res.json({ confirmed: true, state });
});

export default router;
