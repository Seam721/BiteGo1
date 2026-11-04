# Foodie6 Admin — Supabase connection

This build uses Supabase for authentication and database CRUD.

## 1. Configure `.env`

Create/update `admin/.env`:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Use the **publishable/anon client key**, never a `service_role` key in this React application.

## 2. Create/fix the database

Open Supabase Dashboard → **SQL Editor** → **New query**.

Open `SUPABASE_SETUP.sql`, paste the complete file, and click **Run**.

The script creates/fixes the tables used by the admin dashboard, including:

- restaurants
- categories
- menu_items
- customers
- drivers
- orders
- order_items
- payments
- reviews
- promotions
- platform_settings
- payment_settings
- notification_settings
- profiles

It also enables Row Level Security (RLS) and adds admin CRUD policies.

## 3. Create the admin login

Go to Supabase → **Authentication → Users → Add user**.

Create your admin email/password. Then copy the new user's UUID.

Run:

```sql
insert into public.profiles (id, full_name, email, role, status)
values ('YOUR-AUTH-USER-UUID', 'Super Admin', 'YOUR-EMAIL', 'admin', 'active')
on conflict (id) do update set role='admin', status='active';
```

Then sign in to Foodie6 Admin with that email/password.

## 4. Run the project

From `admin`:

```bash
npm install
npm run dev
```

The dashboard now reads/writes Supabase instead of relying on mock data.

## CRUD behavior

- Restaurants: Create / Read / Update / Delete
- Menu items: Create / Read / Update / Delete
- Categories: Create / Read / Update / Delete
- Promotions: Create / Read / Update / Delete
- Riders/Drivers: Create / Read / Update / Delete
- Orders: Read / status update / cancel
- Customers: Read / block-unblock
- Payments: Read / status update / refund status
- Reviews: Read / hide-show / delete
- Settings: Read / save

Orders and payments are intentionally not freely deleted from the admin UI because they are transaction records.
