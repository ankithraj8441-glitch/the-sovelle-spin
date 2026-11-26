import express from 'express';
import { db, withTransaction } from '../db.js';
import { verifyPassword, signToken, verifyToken, getCookieOptions } from '../auth.js';

const router = express.Router();
const ADMIN_COOKIE = 'sovelle_admin_sid';

/**
 * Middleware: require valid authenticated admin session.
 */
function requireAdmin(req, res, next) {
  const token = req.cookies?.[ADMIN_COOKIE];
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin' || !payload.adminId) {
    return res.status(401).json({ error: 'Administrator authentication required.' });
  }
  const admin = db
    .prepare('SELECT id, username, full_name FROM admin_accounts WHERE id = ?')
    .get(payload.adminId);
  if (!admin) {
    return res.status(401).json({ error: 'Administrator account no longer exists.' });
  }
  req.admin = admin;
  return next();
}

/**
 * POST /api/admin/login
 * Strictly verifies administrator password before granting access.
 * Accepts { password } or { username, password }.
 */
router.post('/login', (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!password) {
    return res.status(400).json({ error: 'Administrator password is required.' });
  }

  let admin = null;
  if (username) {
    admin = db
      .prepare('SELECT id, username, password_hash, full_name FROM admin_accounts WHERE username = ?')
      .get(username);
  } else {
    // If username is omitted, check against the primary admin account
    admin = db
      .prepare('SELECT id, username, password_hash, full_name FROM admin_accounts ORDER BY created_at ASC LIMIT 1')
      .get();
  }

  if (!admin || !verifyPassword(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Incorrect password. Access denied.' });
  }

  const token = signToken(
    { role: 'admin', adminId: admin.id, username: admin.username },
    60 * 60 * 12
  );
  res.cookie(ADMIN_COOKIE, token, getCookieOptions(1000 * 60 * 60 * 12));

  return res.json({
    admin: {
      id: admin.id,
      username: admin.username,
      fullName: admin.full_name,
    },
  });
});

/**
 * POST /api/admin/logout
 */
router.post('/logout', (_req, res) => {
  res.clearCookie(ADMIN_COOKIE, { path: '/' });
  res.json({ ok: true });
});

/**
 * GET /api/admin/me
 */
router.get('/me', requireAdmin, (req, res) => {
  res.json({
    admin: {
      id: req.admin.id,
      username: req.admin.username,
      fullName: req.admin.full_name,
    },
  });
});

/**
 * GET /api/admin/overview
 * Returns all required summary counts and distribution statistics.
 */
router.get('/overview', requireAdmin, (_req, res) => {
  const totalCustomers = db.prepare('SELECT COUNT(*) AS cnt FROM customers').get().cnt;
  const totalUniqueCustomers = db
    .prepare('SELECT COUNT(DISTINCT phone) AS cnt FROM customers')
    .get().cnt;
  const totalSpins = db.prepare('SELECT COUNT(*) AS cnt FROM spins').get().cnt;
  const totalCoupons = db.prepare('SELECT COUNT(*) AS cnt FROM coupon_codes').get().cnt;
  const redeemedCoupons = db
    .prepare('SELECT COUNT(*) AS cnt FROM coupon_codes WHERE is_redeemed = 1')
    .get().cnt;

  const spinByKeyRows = db
    .prepare(
      `SELECT reward_key, COUNT(*) AS cnt
       FROM spins
       GROUP BY reward_key`
    )
    .all();

  const countsByKey = {
    GOLDEN_SPIN: 0,
    PCT_10: 0,
    PCT_20: 0,
    FREE_ADDON: 0,
    BETTER_LUCK: 0,
    FLAT_50: 0,
  };

  for (const row of spinByKeyRows) {
    if (row.reward_key in countsByKey) {
      countsByKey[row.reward_key] = row.cnt;
    }
  }

  const totalRewardsWon =
    countsByKey.PCT_10 +
    countsByKey.PCT_20 +
    countsByKey.FREE_ADDON +
    countsByKey.FLAT_50;

  res.json({
    totalRegisteredCustomers: totalCustomers,
    totalUniqueCustomers,
    totalSpins,
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
});

/**
 * Helper to fetch full customer activity rows with optional filters.
 */
function queryCustomerActivity({ search = '', rewardKey = 'ALL', redemptionStatus = 'ALL' }) {
  const rows = db
    .prepare(
      `SELECT
         c.id,
         c.name,
         c.phone,
         c.spins_used,
         c.max_spins_allowed,
         c.created_at AS registered_at,
         s1.id AS spin1_id,
         s1.reward_key AS spin1_key,
         s1.reward_title AS spin1_title,
         s1.created_at AS spin1_at,
         s1.confirmed_at AS spin1_confirmed_at,
         s2.id AS spin2_id,
         s2.reward_key AS spin2_key,
         s2.reward_title AS spin2_title,
         s2.created_at AS spin2_at,
         s2.confirmed_at AS spin2_confirmed_at,
         cc.id AS coupon_id,
         cc.code AS coupon_code,
         cc.reward_title AS coupon_reward_title,
         cc.valid_until AS coupon_valid_until,
         cc.is_redeemed AS coupon_is_redeemed,
         cc.redeemed_at AS coupon_redeemed_at
       FROM customers c
       LEFT JOIN spins s1 ON s1.customer_id = c.id AND s1.spin_number = 1
       LEFT JOIN spins s2 ON s2.customer_id = c.id AND s2.spin_number = 2
       LEFT JOIN coupon_codes cc ON cc.customer_id = c.id
       ORDER BY c.created_at DESC`
    )
    .all();

  const normalizedSearch = search.trim().toLowerCase();

  return rows
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
      if (normalizedSearch) {
        const matchName = item.name.toLowerCase().includes(normalizedSearch);
        const matchPhone = item.phone.toLowerCase().includes(normalizedSearch);
        const matchCoupon = item.couponCode?.toLowerCase().includes(normalizedSearch);
        if (!matchName && !matchPhone && !matchCoupon) return false;
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
}

/**
 * GET /api/admin/customers
 */
router.get('/customers', requireAdmin, (req, res) => {
  const { search = '', rewardKey = 'ALL', redemptionStatus = 'ALL' } = req.query;
  const customers = queryCustomerActivity({
    search: String(search),
    rewardKey: String(rewardKey),
    redemptionStatus: String(redemptionStatus),
  });
  res.json({ customers });
});

/**
 * GET /api/admin/export.csv
 * Exports filtered or full customer activity as RFC-4180 CSV.
 */
router.get('/export.csv', requireAdmin, (req, res) => {
  const { search = '', rewardKey = 'ALL', redemptionStatus = 'ALL' } = req.query;
  const rows = queryCustomerActivity({
    search: String(search),
    rewardKey: String(rewardKey),
    redemptionStatus: String(redemptionStatus),
  });

  const escapeCsv = (val) => {
    const str = val == null ? '' : String(val);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
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
  for (const r of rows) {
    lines.push(
      [
        r.name,
        r.phone,
        r.registeredAt,
        r.spinsUsed,
        r.firstSpinResult || '—',
        r.secondSpinResult || '—',
        r.finalReward,
        r.couponCode || '—',
        r.couponValidUntil || '—',
        r.redemptionState === 'NA'
          ? 'No Coupon'
          : r.redemptionState === 'REDEEMED'
            ? 'Redeemed'
            : 'Unredeemed',
        r.redeemedAt || '—',
      ]
        .map(escapeCsv)
        .join(',')
    );
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="sovelle-spin-activity-${new Date().toISOString().slice(0, 10)}.csv"`
  );
  res.send(lines.join('\r\n'));
});

/**
 * GET /api/admin/coupons
 */
router.get('/coupons', requireAdmin, (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  const status = String(req.query.status || 'ALL');

  const coupons = db
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
    .all()
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

  res.json({ coupons });
});

/**
 * POST /api/admin/coupons/:identifier/redeem
 * Marks a coupon (by UUID id OR exact coupon code) as redeemed atomically.
 * Strictly prevents double-redemption.
 */
router.post('/coupons/:identifier/redeem', requireAdmin, (req, res) => {
  const identifier = String(req.params.identifier || '').trim();
  if (!identifier) {
    return res.status(400).json({ error: 'Coupon identifier is required.' });
  }

  try {
    const updated = withTransaction(() => {
      const coupon = db
        .prepare(
          `SELECT id, code, reward_title, valid_until, is_redeemed, redeemed_at
           FROM coupon_codes
           WHERE id = ? OR UPPER(code) = UPPER(?)`
        )
        .get(identifier, identifier);

      if (!coupon) {
        const err = new Error('Coupon code not found.');
        err.status = 404;
        throw err;
      }

      if (coupon.is_redeemed) {
        const err = new Error(
          `Coupon ${coupon.code} was already redeemed on ${new Date(coupon.redeemed_at).toLocaleString()}.`
        );
        err.status = 409;
        throw err;
      }

      if (new Date(coupon.valid_until).getTime() < Date.now()) {
        const err = new Error(`Coupon ${coupon.code} has expired.`);
        err.status = 400;
        throw err;
      }

      const now = new Date().toISOString();
      const result = db
        .prepare(
          `UPDATE coupon_codes
           SET is_redeemed = 1, redeemed_at = ?, redeemed_by_admin_id = ?
           WHERE id = ? AND is_redeemed = 0`
        )
        .run(now, req.admin.id, coupon.id);

      if (result.changes === 0) {
        const err = new Error('Coupon has already been redeemed.');
        err.status = 409;
        throw err;
      }

      return db
        .prepare(
          `SELECT cc.id, cc.code, cc.reward_title, cc.valid_until, cc.is_redeemed, cc.redeemed_at,
                  c.name AS customer_name, c.phone AS customer_phone
           FROM coupon_codes cc
           JOIN customers c ON c.id = cc.customer_id
           WHERE cc.id = ?`
        )
        .get(coupon.id);
    });

    return res.json({
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
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Redeem coupon error:', err);
    return res.status(500).json({ error: 'Unable to redeem coupon right now.' });
  }
});

/**
 * PATCH /api/admin/coupons/:id/validity
 * Allows admin to edit an individual generated coupon's validity date.
 */
router.patch('/coupons/:id/validity', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { validUntil } = req.body || {};
  const parsed = new Date(validUntil);
  if (!validUntil || Number.isNaN(parsed.getTime())) {
    return res.status(400).json({ error: 'Please provide a valid expiry date.' });
  }
  // Set end of day if date-only string provided
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(validUntil))) {
    parsed.setHours(23, 59, 59, 999);
  }

  const result = db
    .prepare('UPDATE coupon_codes SET valid_until = ? WHERE id = ?')
    .run(parsed.toISOString(), id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Coupon not found.' });
  }
  return res.json({ validUntil: parsed.toISOString() });
});

/**
 * GET /api/admin/rewards
 * Returns all 6 rewards with configuration & distribution stats.
 */
router.get('/rewards', requireAdmin, (_req, res) => {
  const rewards = db
    .prepare(
      `SELECT r.*,
              (SELECT COUNT(*) FROM spins s WHERE s.reward_id = r.id) AS total_awarded,
              (SELECT COUNT(*) FROM coupon_codes cc WHERE cc.reward_id = r.id AND cc.is_redeemed = 1) AS total_redeemed
       FROM rewards r
       ORDER BY r.segment_index ASC`
    )
    .all()
    .map((r) => ({
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

  res.json({ rewards });
});

/**
 * PATCH /api/admin/rewards/:id
 * Enable/disable a reward, adjust probability weight, or edit coupon validity settings.
 */
router.patch('/rewards/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM rewards WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Reward category not found.' });
  }

  const nextEnabled =
    typeof req.body?.isEnabled === 'boolean' ? (req.body.isEnabled ? 1 : 0) : existing.is_enabled;
  const nextWeight =
    req.body?.weight !== undefined ? Math.max(1, Math.min(100, Number(req.body.weight) || 10)) : existing.weight;
  const nextValidityDays =
    req.body?.validityDays !== undefined
      ? Math.max(1, Math.min(3650, Number(req.body.validityDays) || 30))
      : existing.validity_days;

  let nextOverride = existing.valid_until_override;
  if (req.body && 'validUntilOverride' in req.body) {
    if (!req.body.validUntilOverride) {
      nextOverride = null;
    } else {
      const dt = new Date(req.body.validUntilOverride);
      if (Number.isNaN(dt.getTime())) {
        return res.status(400).json({ error: 'Invalid override validity date.' });
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(req.body.validUntilOverride))) {
        dt.setHours(23, 59, 59, 999);
      }
      nextOverride = dt.toISOString();
    }
  }

  // Prevent disabling all non-golden rewards simultaneously
  if (nextEnabled === 0) {
    const activeNonGolden = db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM rewards
         WHERE is_enabled = 1 AND grants_extra_spin = 0 AND id != ?`
      )
      .get(id).cnt;
    if (activeNonGolden === 0 && !existing.grants_extra_spin) {
      return res.status(400).json({
        error: 'At least one non-Golden wheel outcome must remain enabled.',
      });
    }
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE rewards
     SET is_enabled = ?, weight = ?, validity_days = ?, valid_until_override = ?, updated_at = ?
     WHERE id = ?`
  ).run(nextEnabled, nextWeight, nextValidityDays, nextOverride, now, id);

  const updated = db.prepare('SELECT * FROM rewards WHERE id = ?').get(id);
  return res.json({
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
});

export default router;
