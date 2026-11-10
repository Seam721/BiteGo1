# BiteGo delivery accounts, live tracking, and order-history update

## What changed
- Admin Riders page now creates real Supabase Auth delivery accounts (email + temporary password) through a protected backend endpoint. The account is assigned the `driver` profile role and linked to a `drivers` row.
- Admin Orders now lets staff assign an order to a delivery account.
- Delivery staff portal is available at `/delivery` on the customer frontend. A delivery user signs in with the credentials created by admin, sees assigned active orders, views the customer's shared location, and shares GPS while the portal is open.
- Customer tracking polls the real delivery-location endpoint and shows the delivery person's latest shared position on OpenStreetMap. Customers can share their own drop-off GPS position with the assigned rider.
- Customers can request browser notifications for order status changes.
- Customer order records are linked to their authenticated account through `customers.auth_user_id`, so history no longer depends only on a matching phone number.
- Existing KHQR selection, payment initiation, five-minute expiry, payment-status checks, and admin payment confirmation code were not changed.

## Required Supabase step
Run the complete updated `SUPABASE_SETUP.sql` in Supabase Dashboard → SQL Editor. The new migration adds:
- `customers.auth_user_id`
- `orders.customer_latitude` and `orders.customer_longitude`
- `drivers.account_email`
- `delivery_locations`

Location data is private to the trusted backend. Do not grant direct browser access to `delivery_locations`.

## Required backend environment
The backend must have `SUPABASE_SERVICE_ROLE_KEY` (or Supabase secret key) configured server-side. It is required to create Auth users and safely write delivery-location records. Never put this key in either frontend `.env` file or GitHub.

Set `CORS_ORIGIN` to the exact customer frontend and admin dashboard origins. Redeploy the backend after updating environment variables.

## How to use
1. Apply `SUPABASE_SETUP.sql`.
2. Set `VITE_API_URL` in both `admin1/.env` and `frontend1/frontend/.env` to your backend URL (for the current Netlify backend, use `https://bitego-api.netlify.app`). Keep Supabase URL and publishable keys in the browser `.env` files.
3. Deploy the updated backend and admin/customer frontend.
4. Sign in to Admin → Riders → Create Delivery Account. Set name, email, phone, vehicle, and a temporary password (8+ characters).
5. Open Admin → Orders, open an order, and assign the delivery staff member.
6. Give the staff member their login details securely. They sign in at `https://YOUR-CUSTOMER-FRONTEND-DOMAIN/delivery`.
7. On the delivery device, allow location access when the browser asks. Keep the delivery portal open while sharing GPS.
8. Customer signs in, opens order tracking, enables notifications if desired, and selects “Share my live location” to share their position with the assigned rider.

## Browser permission limitations
A website cannot silently force “Always allow” location access or notifications. The browser/device displays its own permission prompt. Select the most permissive option offered by your browser, and change it later in the browser's site settings if needed. Continuous delivery GPS sharing requires the delivery portal to remain open; background tracking after the browser/app is closed requires a native app or a separately configured background-location/push service.

## Order-history note
Order history now links by authenticated Supabase user ID as well as checkout phone. Existing historical orders are not reassigned automatically unless the user checks out again with the same phone/account or an administrator reconciles their customer records. This update does not change how an order is charged or how KHQR payment is confirmed.
