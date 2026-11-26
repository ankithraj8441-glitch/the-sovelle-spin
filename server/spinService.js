import crypto from 'node:crypto';
import { db, withTransaction } from './db.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCouponString() {
  const part = (len) => {
    let out = '';
    for (let i = 0; i < len; i += 1) {
      out += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
    }
    return out;
  };
  return `SOV-${part(4)}-${part(3)}`;
}

/**
 * Cryptographically random weighted selection from active reward pool.
 */
function pickWeightedReward(candidates) {
  const totalWeight = candidates.reduce((acc, r) => acc + Math.max(1, Number(r.weight)), 0);
  let roll = crypto.randomInt(0, totalWeight);
  for (const reward of candidates) {
    roll -= Math.max(1, Number(reward.weight));
    if (roll < 0) return reward;
  }
  return candidates[candidates.length - 1];
}

/**
 * Compute coupon expiry ISO timestamp from reward validity settings.
 */
function computeValidUntil(reward) {
  if (reward.valid_until_override) {
    return new Date(reward.valid_until_override).toISOString();
  }
  const days = Math.max(1, Number(reward.validity_days) || 30);
  const dt = new Date();
  dt.setDate(dt.getDate() + days);
  dt.setHours(23, 59, 59, 999);
  return dt.toISOString();
}

/**
 * Build complete customer session state (never returns other customers' records).
 */
export function getCustomerState(customerId) {
  const customer = db
    .prepare(
      `SELECT id, name, phone, poster_purchase_confirmed, spins_used, max_spins_allowed, created_at
       FROM customers WHERE id = ?`
    )
    .get(customerId);

  if (!customer) return null;

  const spins = db
    .prepare(
      `SELECT s.id, s.spin_number, s.reward_id, s.reward_key, s.reward_title, s.confirmed_at, s.created_at,
              r.segment_index, r.headline_message, r.description, r.redemption_conditions,
              r.is_win, r.grants_extra_spin, r.generates_coupon
       FROM spins s
       JOIN rewards r ON r.id = s.reward_id
       WHERE s.customer_id = ?
       ORDER BY s.spin_number ASC`
    )
    .all(customerId);

  const coupon = db
    .prepare(
      `SELECT id, code, reward_title, valid_until, is_redeemed, redeemed_at, created_at
       FROM coupon_codes
       WHERE customer_id = ?`
    )
    .get(customerId);

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
    spins: spins.map((s) => ({
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

/**
 * Execute one server-determined spin inside an atomic transaction.
 */
export function executeCustomerSpin(customerId) {
  return withTransaction(() => {
    const customer = db
      .prepare('SELECT id, name, phone, spins_used, max_spins_allowed FROM customers WHERE id = ?')
      .get(customerId);

    if (!customer) {
      const err = new Error('Customer session not found. Please register again.');
      err.status = 404;
      throw err;
    }

    if (customer.spins_used >= customer.max_spins_allowed || customer.spins_used >= 2) {
      const err = new Error('You have already used all eligible spins for this registration.');
      err.status = 409;
      throw err;
    }

    const nextSpinNumber = customer.spins_used + 1;
    const allRewards = db.prepare('SELECT * FROM rewards ORDER BY segment_index ASC').all();

    // On spin #2 (triggered by a Golden Spin), GOLDEN_SPIN is strictly excluded so max spins never exceeds 2.
    let eligible = allRewards.filter((r) => {
      if (!r.is_enabled) return false;
      if (nextSpinNumber >= 2 && r.grants_extra_spin) return false;
      return true;
    });

    // Safety fallback if admin disabled every non-golden option
    if (eligible.length === 0) {
      eligible = allRewards.filter((r) => !r.grants_extra_spin);
    }

    const chosen = pickWeightedReward(eligible);
    const now = new Date().toISOString();
    const spinId = crypto.randomUUID();

    // Golden Spin on spin 1 grants exactly 1 extra spin (max_spins_allowed becomes 2)
    const newMaxSpins =
      nextSpinNumber === 1 && chosen.grants_extra_spin ? 2 : customer.max_spins_allowed;
    const newSpinsUsed = nextSpinNumber;

    db.prepare(
      `INSERT INTO spins (id, customer_id, spin_number, reward_id, reward_key, reward_title, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(spinId, customer.id, nextSpinNumber, chosen.id, chosen.key, chosen.title, now);

    db.prepare(
      `UPDATE customers
       SET spins_used = ?, max_spins_allowed = ?
       WHERE id = ?`
    ).run(newSpinsUsed, newMaxSpins, customer.id);

    let generatedCoupon = null;
    if (chosen.generates_coupon) {
      const validUntil = computeValidUntil(chosen);
      let code = null;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const candidate = generateCouponString();
        const existing = db.prepare('SELECT id FROM coupon_codes WHERE code = ?').get(candidate);
        if (!existing) {
          code = candidate;
          break;
        }
      }
      if (!code) {
        throw new Error('Failed to generate a unique coupon code. Please retry.');
      }

      const couponId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO coupon_codes (id, code, customer_id, spin_id, reward_id, reward_title, valid_until, is_redeemed, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
      ).run(couponId, code, customer.id, spinId, chosen.id, chosen.title, validUntil, now);

      generatedCoupon = {
        id: couponId,
        code,
        rewardTitle: chosen.title,
        validUntil,
        isRedeemed: false,
        createdAt: now,
      };
    }

    return {
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
    };
  });
}
