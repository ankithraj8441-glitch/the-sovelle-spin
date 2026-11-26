# THE SOVELLE SPIN

Interactive luxury lucky spin web application for **SOVELLE** handmade bouquets, built for college stall promotions where customers who purchase any 2 posters unlock a spin.

---

## Brand & Design Identity

- **Oxblood Burgundy**: `#641D2B` (primary backdrop and editorial accents)
- **Warm Ivory**: `#F2E6D9` (cards, voucher surfaces, high-contrast typography)
- **Soft Gold**: `#D4AF7C` (borders, wheel bezel, dividers, decorative crests)
- **Typography**: *Cormorant Garamond* (serif display & headings) + *Plus Jakarta Sans* (clean body & UI controls)

---

## Architecture & Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router, Lucide Icons
- **Backend**: Node.js + Express (`server/index.js`) with `HttpOnly` HMAC-signed session cookies & `scrypt` password hashing
- **Database**: Transactional SQLite via Node.js native `node:sqlite` (`server/db.js`, zero external database setup required) + reference PostgreSQL / Supabase schema (`supabase/schema.sql`) with Row Level Security policies

### Database Tables
1. `customers` — Customer name, unique 10-digit Indian mobile (`phone`), poster purchase confirmation, spin limits (`spins_used <= max_spins_allowed`)
2. `spins` — Immutable spin history (`spin_number` 1 or 2, `UNIQUE(customer_id, spin_number)`)
3. `rewards` — The 6 wheel segments (`GOLDEN SPIN ✨`, `10% OFF`, `20% OFF`, `FREE CHOCOLATE 🍫`, `BETTER LUCK NEXT TIME`, `FLAT ₹50 OFF`), toggleable status, weights, and validity rules
4. `coupon_codes` — Unique generated coupon codes (`SOV-XXXX-XXX`), expiry dates, and atomic single-use redemption locks
5. `admin_accounts` — Salted `scrypt` password-hashed administrator accounts

---

## Setup & Running Locally

### 1. Prerequisites
- **Node.js v22.5+** (tested on Node v24.12.0)

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Copy `.env.example` to `.env` (already pre-configured for local use) and update credentials before going live:
```env
PORT=3001
NODE_ENV=development
SESSION_SECRET=your-64-char-random-secret
ADMIN_USERNAME=sovelle-admin
ADMIN_PASSWORD=your-strong-admin-password
ADMIN_FULL_NAME=SOVELLE Atelier Admin
DB_PATH=./data/sovelle.db
```

### 4. Start Development Server (Frontend + Backend)
```bash
npm run dev
```
- **Customer Landing Page**: `http://localhost:5173`
- **Admin Dashboard**: `http://localhost:5173/admin`

### 5. Build & Run in Production
```bash
npm run build
npm start
```
The Express server serves the compiled React frontend and API together on `http://localhost:3001` (or your configured `PORT`).

### Resetting Test Data Before the Stall Event
To wipe test customers, spins, and coupons while preserving reward configuration and admin accounts:
```bash
npm run db:reset
```

---

## Optional: Provisioning on Supabase Postgres

If deploying with Supabase PostgreSQL, run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor to create all 5 tables (`admin_accounts`, `rewards`, `customers`, `spins`, `coupon_codes`), database check constraints, and strict Row Level Security (RLS) policies preventing public reads on customer PII.

---

## Key Security & Business Rules Enforced Server-Side

- **10-digit Indian Mobile Validation**: Strictly validated against `^[6-9]\d{9}$` on both client and server; duplicate registrations with the same phone number are rejected (`409 Conflict`).
- **Backend-Determined Wheel Outcomes**: `POST /api/spin` selects the outcome server-side using `crypto.randomInt` inside an atomic SQLite `BEGIN IMMEDIATE` transaction.
- **Golden Spin Cap**: Landing on `GOLDEN SPIN ✨` on Spin 1 unlocks 1 bonus spin (`max_spins_allowed = 2`); Spin 2 strictly excludes `GOLDEN SPIN ✨` from the pool so customers can never exceed 2 total spins.
- **Refresh Protection**: Customer sessions persist via signed `HttpOnly` cookies; refreshing or reopening the browser cannot grant extra spins.
- **Single-Use Coupon Redemption**: Coupon redemption uses an atomic `UPDATE ... WHERE id = ? AND is_redeemed = 0` transaction, making duplicate redemption impossible.
- **Admin Protection**: All `/api/admin/*` routes require a verified admin session cookie; no admin passwords or secrets exist in client-side code.
