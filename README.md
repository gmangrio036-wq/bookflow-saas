# BookFlow — Lean Calendesk Alternative

A B2B SaaS for **therapists, psychologists, and service businesses** to manage bookings, payments, and client relationships. Inspired by Calendesk (reported ~$22k/mo — same core demand), built lean so you can run it, brand it, and charge for it yourself.

**Base:** Calendar UI is built on [jquense/react-big-calendar](https://github.com/jquense/react-big-calendar) (MIT licensed). Its branding/examples were stripped; BookFlow adds the SaaS layer on top: auth, public booking, buffers, team, billing, white-label, and calendar sync.

![Stack](https://img.shields.io/badge/stack-React%20%2B%20Express%20%2B%20Stripe-teal)

## ✨ Features

| Area | What's included |
|---|---|
| **Public booking page** | `/book/:slug` — service picker, date + live slots, timezone selector (client tz saved with booking), practitioner picker, confirmation screen, confirmation email (mock/SMTP), .ics download + Google Calendar link |
| **Availability + buffers** | Weekly availability per business. Each service has duration + buffer before/after. Slot engine blocks buffered time so you never get back-to-back clashes. 30-min grid. |
| **Dashboard** | Stats (upcoming, revenue, services, team), upcoming bookings list, full calendar (month/week/day via react-big-calendar, colour per service) |
| **Calendar sync** | Per-booking `.ics` at `/api/bookings/:id/ics` + subscribable feed `/api/calendar/feed/:slug.ics` for Google/Apple/Outlook |
| **Team support** | Add/remove members with roles & colours. Free plan caps at 2 — upgrade unlocks unlimited (paywall is enforced in API) |
| **White-label** | Business name, tagline, brand colour, logo letter, timezone — reflected instantly on the public booking page / client portal |
| **Auth** | Email/password with bcrypt + JWT (7-day). Demo account seeded automatically |
| **Paid tier (Stripe test mode)** | Free / Pro $19/mo / Team $49/mo. If `STRIPE_SECRET_KEY` is set, `/api/billing/checkout` creates a real Stripe Checkout Session (subscription). Without keys it runs in **demo mode** (instant local upgrade) so the MVP is testable end-to-end |
| **Subscription packages (model)** | Team plan is positioned for selling client session packages — add your own packages as Services with bundle pricing to start |
| **Emails** | Mock mode by default: emails log to server console + Dashboard → Emails tab. Set SMTP vars for real sending (wire `sendEmail` in `server/src/index.js` to nodemailer in 10 lines) |
| **API-first** | REST API for auth, business, services, availability, team, bookings, public booking, billing, calendar |

## 🚀 Run locally (2 minutes)

```bash
cd bookflow-saas
npm install
npm --prefix server install
npm --prefix client install
# optional: cp server/.env.example server/.env  (add Stripe test keys there)
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:4000/api/health
- **Demo login:** `demo@bookflow.app` / `demo1234`
- **Demo booking page:** http://localhost:5173/#/book/mindful-therapy

Or run separately:
```bash
node server/src/index.js        # API on :4000
npm --prefix client run dev     # Vite on :5173 (proxies /api → :4000)
```

Production build (single server serves API + frontend):
```bash
npm run build                   # builds client/dist
NODE_ENV=production node server/src/index.js   # http://localhost:4000 serves everything
```

## 🔐 Environment variables

`server/.env` (copy from `server/.env.example`):

| Variable | Required | Notes |
|---|---|---|
| `PORT` | No (4000) | API port |
| `JWT_SECRET` | **Yes in prod** | Long random string |
| `CLIENT_URL` | Yes in prod | Your frontend origin, e.g. `https://app.yourdomain.com` |
| `STRIPE_SECRET_KEY` | For real checkout | `sk_test_...` from Stripe Dashboard → Test mode → API keys |
| `STRIPE_PRICE_PRO` | For Pro checkout | Create a $19/mo recurring Price in Stripe, paste `price_...` |
| `STRIPE_PRICE_TEAM` | For Team checkout | $49/mo recurring Price |
| `STRIPE_WEBHOOK_SECRET` | For webhooks | Add endpoint `/api/billing/webhook` later — MVP upgrades via success flow/demo mode |
| `SMTP_HOST/PORT/USER/PASS` + `EMAIL_FROM` | For real email | Leave empty for mock mode |

`client/.env`:
| `VITE_API_URL` | Only if API is on a different origin in prod (otherwise empty — same-origin / proxied) |

Test card (Stripe test mode): `4242 4242 4242 4242`, any future date, any CVC.

## 📁 Project structure

```
bookflow-saas/
  client/                 # Vite + React
    src/App.jsx           # Landing, Auth, Dashboard (Big Calendar), Public Booking, Billing, Branding, Team, Services
    src/lib/api.js        # API client + timezone list
    src/styles.css        # Clean modern responsive UI
  server/
    src/index.js          # All API routes (auth, services, slots+buffers, bookings, team, billing, ics)
    src/db.js             # JSON file DB (swap for Postgres/SQLite in v2 — interface is load()/save())
    data/db.json          # Auto-created + seeded with demo practice on first run
  package.json            # Root scripts: dev (concurrently), build, start
```

**Data note:** The JSON DB is intentional for an MVP you can run anywhere with zero setup. For production scale, replace `server/src/db.js` with Prisma + Postgres — all routes already go through `load()/save()` so it's a contained swap.

## 🌐 Deploy

### Option A — Render / Railway (easiest, one service)
1. Push this folder to GitHub.
2. Create a Web Service: Build command `npm install && npm --prefix server install && npm --prefix client install && npm run build`, Start command `NODE_ENV=production node server/src/index.js`.
3. Set env vars above (`JWT_SECRET`, `CLIENT_URL` = your Render URL, Stripe test keys).
4. Health check: `/api/health`.

### Option B — Netlify (frontend) + Render (API)
1. Deploy `server/` to Render as above (without build of client).
2. Deploy `client/` to Netlify: build `npm run build`, publish `dist`, set `VITE_API_URL=https://your-api.onrender.com`.
3. Set server `CLIENT_URL` to your Netlify URL.

### Option C — VPS / Docker-ready
```bash
npm run build && NODE_ENV=production PORT=4000 node server/src/index.js
# Put behind Nginx/Caddy with HTTPS, set CLIENT_URL to your domain
```

## 🧪 What to test first
1. Log in as demo → Dashboard → Calendar (see seeded bookings in Big Calendar).
2. Open public page → pick Couples Counselling (75 min + 30 min buffers) → confirm slots shrink vs. the free 30-min consultation.
3. Book as a client → check Dashboard → Emails for the confirmation, download the .ics.
4. Settings → Branding: change colour/name → reload public page (white-label works).
5. Billing → Upgrade to Pro (demo mode without keys; with test keys you get real Stripe Checkout).

## 🗺️ Next steps to charge real customers
- [ ] Swap JSON DB → Postgres (Prisma) + add Stripe webhook to sync plan on `checkout.session.completed`
- [ ] Real SMTP (Resend/Postmark) by wiring nodemailer in `sendEmail`
- [ ] Google Calendar OAuth 2-way sync (feed .ics is v1)
- [ ] Client accounts / portal login, packages & session credits, reminders (cron + email/SMS)

## License
BookFlow code: MIT. react-big-calendar: MIT (jquense). Not affiliated with Calendesk.
