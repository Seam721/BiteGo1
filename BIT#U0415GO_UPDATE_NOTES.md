# BiteGo update notes

## Changes
- Rebranded the admin sidebar and admin-facing report/loading labels to BiteGo.
- Fixed order item creation in `backend/index.js` to persist the calculated `subtotal` for every order item.
- Updated both Supabase setup SQL files to include `order_items.subtotal` and safely add/backfill it on existing databases.
- Existing payment/KHQR implementation was left unchanged.

## Important Supabase step
For an already-running Supabase project, run the updated `SUPABASE_SETUP.sql` in the Supabase SQL Editor (or run the `order_items.subtotal` migration statements from that file) before testing new orders. The backend code change alone cannot add a missing database column.

## Run locally
1. Backend: `cd backend`, install dependencies with `npm install`, configure your existing `.env`, then `npm start`.
2. Admin: `cd admin1`, install dependencies with `npm install`, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`, then `npm run dev`.
3. Customer frontend: `cd frontend1/frontend`, install dependencies with `npm install`, configure its existing environment variables, then `npm run dev`.

Do not commit real Supabase secret/service-role keys into the ZIP or source control.


## Payment RLS follow-up
- Preserved the existing static QR/manual-verification flow.
- Backend now accepts a server-only Supabase service_role or secret key and gives a clear setup error if missing.
- No unsafe public payments INSERT policy was added. See `PAYMENT_RLS_FIX.md`.
