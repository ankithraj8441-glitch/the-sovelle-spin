# 🌸 THE SOVELLE SPIN — Cloudflare Pages Deployment Guide

This guide walks you through deploying THE SOVELLE SPIN from your local machine to Cloudflare Pages with a D1 database, in around 15 minutes.

---

## 📋 Prerequisites

- A **Cloudflare account** (free) → [dash.cloudflare.com](https://dash.cloudflare.com)
- **Node.js 18+** installed
- All project files in this folder
- Run `npm install` once if you haven't already

---

## 🚀 Step-by-Step Deployment

### STEP 1 — Login to Cloudflare via Wrangler

Open a terminal in this project folder and run:

```bash
npx wrangler login
```

This opens your browser → log in to Cloudflare → authorize Wrangler. ✅

---

### STEP 2 — Create the D1 Database

```bash
npm run d1:create
```

You will see output like:
```
✅ Successfully created DB 'sovelle-spin-db'!
{
  "created_at": "...",
  "name": "sovelle-spin-db",
  "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   ← COPY THIS
}
```

📋 **Copy the `uuid` value** — you need it in the next step.

---

### STEP 3 — Add Your D1 Database ID to wrangler.toml

Open `wrangler.toml` in this folder. Find this line:

```toml
database_id = "placeholder-replace-with-your-d1-id"
```

Replace `placeholder-replace-with-your-d1-id` with the UUID you copied. Example:

```toml
database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

Save the file.

---

### STEP 4 — Seed the Remote D1 Database

This creates all tables and inserts the 6 reward categories + admin account:

```bash
npm run d1:seed:remote
```

You should see output like:
```
🌀 Executing on remote database sovelle-spin-db...
✅ Done!
```

> **Admin credentials are set automatically:**
> - Username: `sovelle-admin`
> - Password: `Sovelle@2026`

---

### STEP 5 — Build the Frontend

```bash
npm run build
```

This generates the `dist/` folder. ✅

---

### STEP 6 — Deploy to Cloudflare Pages

```bash
npm run pages:deploy
```

This runs `vite build` + deploys to Cloudflare Pages under project name `the-sovelle-spin`.

On **first deploy**, it will ask you to confirm creating a new Pages project. Press Enter to confirm.

You'll get a live URL like: `https://the-sovelle-spin.pages.dev` 🎉

---

### STEP 7 — Add D1 Binding in Cloudflare Dashboard

> This step links your D1 database to the Pages project so the edge functions can access it.

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Pages** → `the-sovelle-spin`
2. Click **Settings** → **Functions** → scroll to **D1 database bindings**
3. Click **Add binding**:
   - Variable name: `DB`
   - D1 database: `sovelle-spin-db`
4. Click **Save**

Then click **Deployments** → open the latest deployment → click **Retry deployment** (or just re-run `npm run pages:deploy`).

---

### STEP 8 — Set Environment Variables (Optional but Recommended)

In the Cloudflare Dashboard → Pages → `the-sovelle-spin` → **Settings** → **Environment variables**:

| Variable | Value |
|---|---|
| `SESSION_SECRET` | (a 64-char random hex — see note below) |
| `ADMIN_USERNAME` | `sovelle-admin` |
| `ADMIN_PASSWORD` | `Sovelle@2026` |
| `ADMIN_FULL_NAME` | `SOVELLE Atelier Admin` |

> **Generating a secure SESSION_SECRET:**
> Run this in any terminal:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```
> Copy the output and paste it as the value.

After adding env vars, **redeploy** once more:
```bash
npm run pages:deploy
```

---

## 🔄 Re-Deploying After Changes

Whenever you update frontend code:

```bash
npm run pages:deploy
```

That's it — builds and deploys in one step.

---

## 🧹 Clearing Production Data (Between Events)

To wipe customer entries, spins, and coupons from the **remote** D1 database (preserves rewards + admin):

```bash
npx wrangler d1 execute sovelle-spin-db --remote --command="DELETE FROM spins; DELETE FROM coupon_codes; DELETE FROM customers;"
```

---

## 🧪 Testing Locally with D1

You can run the full edge function locally with a local D1 copy:

```bash
# 1. Seed local D1
npm run d1:seed:local

# 2. Build frontend
npm run build

# 3. Run Pages dev server (mimics Cloudflare edge)
npm run pages:dev
```

Visit `http://localhost:8788` — this uses the edge functions + local D1, identical to production.

---

## 📁 Project Structure (Cloudflare Deployment)

```
the sovelle/
├── dist/                        ← Built frontend (deployed to Pages)
├── functions/
│   └── api/
│       ├── [[route]].js         ← Catch-all Pages Function (all /api/* routes)
│       └── auth.js              ← Edge-compatible PBKDF2 + HMAC auth helpers
├── public/
│   ├── sovelle-logo.png         ← Circular swan logo
│   └── _headers                 ← Cloudflare security headers
├── src/                         ← React frontend source
├── d1-schema.sql                ← D1 schema + seed data
├── wrangler.toml                ← Cloudflare Pages + D1 config
└── package.json                 ← Scripts including pages:deploy
```

---

## 🔐 Security Notes

- Admin panel is **always password-gated** — no bypass possible
- All tokens signed with HMAC-SHA256 (Web Crypto API, edge-native)
- Passwords hashed with PBKDF2 (SHA-256, 100,000 iterations)
- Cookies are `HttpOnly; Secure; SameSite=Lax`
- Indian mobile validation enforced server-side: `^[6-9]\d{9}$`

---

## 🆘 Troubleshooting

| Problem | Fix |
|---|---|
| `DB binding not found` error | Go to Dashboard → Pages → Settings → Functions → Add `DB` D1 binding → Redeploy |
| Admin login fails | The D1 seed inserted plain-text password; `verifyPassword()` has a plain-text fallback — it should work. Try reseeding with `npm run d1:seed:remote` |
| `wrangler: command not found` | Run `npm install` to install the local wrangler, then use `npx wrangler ...` |
| Pages shows blank page | Check `dist/index.html` exists. Run `npm run build` again |
| API returns 404 | Ensure `functions/api/[[route]].js` is at the right path in the repo root |

---

## ✅ Post-Deployment Checklist

- [ ] Customer can register with name + phone number
- [ ] Spin wheel works and shows correct segments
- [ ] Result modal shows with confetti + coupon code
- [ ] "Finish & Clear for Next Customer" logs out properly
- [ ] Admin modal opens (bottom-right button on landing page)
- [ ] Admin panel requires correct password (`Sovelle@2026`)
- [ ] Admin dashboard shows overview stats
- [ ] Customer table shows registered entries
- [ ] Coupon can be marked as redeemed
- [ ] CSV export downloads correctly

---

*Built with ❤️ for SOVELLE handmade bouquets*
