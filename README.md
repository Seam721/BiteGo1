# BiteGo Full Stack

BiteGo is a React + TypeScript customer storefront, an Express API, and a separate Supabase-backed admin dashboard. The existing customer checkout and KHQR steps are preserved.

## Project layout

- `frontend1/frontend/` — customer storefront (Vite, React)
- `backend/` — Express API and Supabase integration
- `admin1/` — admin dashboard (Vite, React)
- `SUPABASE_SETUP.sql` — database schema, catalog seed data, RLS and indexes
- `PAYMENT_FLOW_SETUP.md` — payment flow and important real-payment limitations
- `image/` — supplied ABA, ACLEDA and WING QR images

## Supabase connection values

This project uses **Vite**, not Next.js. Therefore `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are not automatically read by the apps.
The frontend/admin env templates use `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY`. The `.env.example` files contain safe placeholders;
replace them with your own project URL and publishable key before running.

For privileged backend operations under Row Level Security, set your Supabase
**secret/service-role key** as `SUPABASE_SERVICE_ROLE_KEY` on the backend only.
Do not share or commit that secret key. A publishable key alone does not bypass
RLS or grant administrative database access.

## 1. Supabase setup

1. Open your Supabase project → SQL Editor.
2. Back up your database first.
3. Run the complete `SUPABASE_SETUP.sql`.
4. Create the admin user in Authentication → Users, then create/update its `profiles` row using the instructions at the end of the SQL file.
5. Check that the tables and columns exist before launching the apps.

The SQL allows public reads of active restaurants, categories and available menu items. Order/payment data is not made publicly readable through the browser key.

## 2. Backend setup (required)

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm start
```

Edit `backend/.env` and set:
- `SUPABASE_URL` — your project URL
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Project Settings → API Keys. Keep it **only on the backend server**.
- `CORS_ORIGIN` — exact customer/admin website origins, comma-separated.

Check `http://localhost:3000/api/health`.

**Never commit or share `.env` files or put the service-role key in Vite variables.** If a service-role key was ever exposed publicly, rotate it in Supabase immediately.

## 3. Customer storefront

Open a second terminal:

```powershell
cd frontend1/frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Open `http://localhost:8443`. The Vite development proxy forwards `/api` to the backend at `http://localhost:3000`.

## 4. Admin dashboard

Open a third terminal:

```powershell
cd admin1
Copy-Item .env.example .env
npm install
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `admin1/.env`. The admin dashboard uses Supabase Auth and requires an active `admin`, `manager`, or `staff` profile.

## Payment flow — unchanged

1. Customer places an order and chooses ABA, ACLEDA or WING.
2. The selected supplied QR image is shown with a five-minute payment window.
3. The backend records a pending payment attempt.
4. Admin checks the actual incoming transfer in the merchant's bank app/account and clicks **Accept** only after confirming the amount and transaction.
5. The customer sees payment accepted and can track the order. If the window expires, they can choose a QR again.

**Important real-money limitation:** these are supplied static QR images, not dynamically generated merchant KHQR invoices. The app does not receive an automatic bank confirmation. Manual admin confirmation is still the payment authority. Before using this for real sales, confirm with ABA/ACLEDA/WING that the supplied QR codes belong to the intended merchant accounts and support the intended transfer workflow. For automatic confirmation, obtain official merchant/API access and implement the provider's documented verification or webhook. Do not treat a QR scan as proof of payment.

## Before deployment

- Use HTTPS for the customer site, admin site and API.
- Configure production `CORS_ORIGIN`.
- Keep `SUPABASE_SERVICE_ROLE_KEY` on the backend only.
- Test checkout, failed/expired payments, admin acceptance, order tracking and admin login with a staging database first.
- Deploy frontend, backend and admin as separate services if the host requires separate build/runtime processes.


## Free deployment

See [`DEPLOY_FREE.md`](./DEPLOY_FREE.md) for the step-by-step GitHub + Netlify Free setup. Render is not required. Free hosting is suitable for a demo, not a dependable live payment business.\n

## Customer improvements in this package

- Guest checkout is available from the customer sign-in page; an account is optional for placing an order.
- Checkout includes permission-based current-location lookup and a manual address fallback.
- Existing responsive layouts are retained for mobile, tablet, and desktop.
- Payment and QR processing files are intentionally unchanged.
