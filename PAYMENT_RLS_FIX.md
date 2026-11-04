# BiteGo payment RLS fix

## Payment flow preserved
The existing checkout and KHQR process is unchanged:
1. Customer places an order.
2. Customer chooses ABA, ACLEDA, or WING.
3. The existing static QR image is displayed.
4. Backend creates a pending payment attempt with a five-minute expiry.
5. Admin manually verifies the bank transfer and accepts the payment.
6. Customer sees the payment/order status update.

No payment gateway, QR generation provider, or automatic bank verification was introduced.

## Why `new row violates row-level security policy for table "payments"` happened
The backend was falling back to the publishable key when no privileged server key was configured. The `payments` table intentionally has RLS enabled and does not allow public inserts. A publishable key cannot bypass that policy.

## Required one-time configuration
1. Open Supabase Dashboard -> Project Settings -> API Keys.
2. Copy the **legacy `service_role` key** OR the newer **secret key**. Never use the publishable/anon key for this server-only setting.
3. Open `backend/.env` (create it by copying `.env.example` if needed).
4. Set either:
   - `SUPABASE_SERVICE_ROLE_KEY=...` (legacy service_role key), or
   - `SUPABASE_SECRET_KEY=...` (new secret key).
5. Keep this key only in `backend/.env`. Do not add it to `frontend1/frontend/.env` or `admin1/.env`, and do not commit it to Git.
6. Restart the backend.

The backend now returns a clear configuration message instead of the raw RLS error if this privileged key is missing.

## SQL
Run `SUPABASE_SETUP.sql` only if you have not already applied the project schema/migrations. Do not create a public `INSERT` policy for `payments`; that would let untrusted browser clients create payment records. The existing manual bank verification remains the source of truth for marking a payment paid.
