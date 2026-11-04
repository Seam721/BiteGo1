# Foodie6 – Order History & Checkout Reliability Update

This update focuses on the customer order lifecycle while preserving the existing KHQR/payment implementation.

## Changes included

- Customer order history now loads through an authenticated backend endpoint instead of incorrectly comparing `orders.customer_id` (which references the `customers` table) with the Supabase Auth user UUID.
- The backend links the signed-in profile to the checkout customer using the checkout phone number. Checkout pre-fills the saved profile name and phone when available, and the backend syncs checkout details back to the authenticated profile.
- Order history includes restaurant names and item names/quantities, sorted newest first.
- The **Track order** button opens tracking for the selected historical order, not a previously viewed order.
- The cart is cleared only after the backend confirms that the order was created successfully. If order creation fails, the cart remains available.
- Orders are blocked when the live backend/catalog is unavailable, so static demo menu data cannot accidentally be submitted as a real order.
- The backend persists database-verified item names and prices rather than trusting browser-supplied values, and writes only the `order_items` columns defined by the supplied Supabase schema (`order_id`, `menu_item_id`, `name`, `quantity`, `price`).

## Payment-flow protection

The existing KHQR/payment page and payment API routes were not modified. ABA / ACLEDA / WING QR selection, payment initiation, payment status polling, and admin payment confirmation remain as they were in the supplied project.

## Important: recreate local environment files

For security, this ZIP does **not** include any `.env` files or `node_modules`. The supplied archive contained local environment files, which may contain private credentials. Use the example files and enter your own values:

### Customer frontend (PowerShell)

```powershell
cd .\frontend1\frontend
Copy-Item .env.example .env
npm install
npm run build
npm run dev
```

Set `VITE_API_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY` in `frontend1\frontend\.env`.

### Backend (PowerShell)

```powershell
cd ..\..\backend
Copy-Item .env.example .env
npm install
npm start
```

In `backend\.env`, set `SUPABASE_URL` and preferably `SUPABASE_SERVICE_ROLE_KEY` using the server-side secret from Supabase Project Settings → API Keys. Keep the service-role key **only** in `backend\.env**`; never put it in either Vite frontend `.env` file or commit it to GitHub. Also set `CORS_ORIGIN` to the exact customer/admin development or production origins.

The backend uses port `3000` by default. Start it before placing a real order.

### Admin dashboard (separate terminal)

```powershell
cd .\admin1
Copy-Item .env.example .env
npm install
npm run dev
```

Set the Supabase URL and publishable key in `admin1\.env`.

## Order-history matching

Checkout now pre-fills the phone number saved in the customer's profile. If a customer enters a different phone number, the backend syncs that number to the authenticated profile when it can. Existing historical orders are matched by the phone number on the customer record and the profile. To see older orders, the profile phone must match the phone number used for those orders.

## Validation performed

- Customer frontend TypeScript check: `tsc --noEmit` passed.
- Backend JavaScript syntax check: `node --check backend/index.js` passed.
- A full Vite production build could not be run in this Linux validation environment because the uploaded `node_modules` archive lacks the platform-specific Rolldown native optional dependency. Run `npm install` on your Windows PC before `npm run build` to install the correct Windows dependencies.
