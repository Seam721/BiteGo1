# BiteGo — Free hosting and GitHub deployment guide

This repository is prepared for **Netlify Free + Supabase**. Render is not used.

## What will be deployed

Create three separate Netlify sites from the same GitHub repository:

1. **Customer website** — `frontend1/frontend` (Vite static site)
2. **Admin dashboard** — `admin1` (Vite static site)
3. **Backend API** — `backend` (Express deployed as a Netlify Function)
4. **Database and authentication** — your existing Supabase project

Netlify's current Free plan is $0 with a monthly usage-credit limit. If the monthly limit is reached, sites can pause until the next cycle. This setup is for learning, demos and low-volume testing; it is not a dependable production platform for a live food-ordering business. See https://www.netlify.com/pricing/ and https://docs.netlify.com/build/frameworks/framework-setup-guides/express/.

## 1. Prepare GitHub

1. Extract this ZIP on your Windows computer.
2. Create a **private** repository on https://github.com/new (for example, `bitego-website`).
3. Open PowerShell in the extracted project root — the folder containing `README.md`, `backend`, `admin1`, and `frontend1`.
4. Run these commands:

```powershell
git init
git add .
git status
git commit -m "Prepare BiteGo for free hosting"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/bitego-website.git
git push -u origin main
```

Replace `YOUR_GITHUB_USERNAME` with your GitHub username. If Git says the remote already exists, use `git remote set-url origin https://github.com/YOUR_GITHUB_USERNAME/bitego-website.git`.

**Before `git add .`:** confirm that no `.env` file is present. `.env` files and Git history have been excluded from this ZIP. Keep all secret keys out of GitHub.

## 2. Deploy the backend API first

1. Sign in at https://app.netlify.com/ and choose **Add new project → Import an existing project**.
2. Connect GitHub and select `bitego-website`.
3. Set **Base directory** to `backend`.
4. Build command: `npm install`. Publish directory: `public`. Functions directory: `netlify/functions` (already in `netlify.toml`).
5. Add these environment variables in **Site configuration → Environment variables**:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase secret/service-role key (backend only) |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | The exact customer and admin Netlify URLs, comma-separated; add these after both sites are created |

6. Deploy. Copy the backend site's URL, e.g. `https://bitego-api-example.netlify.app`.
7. Test `https://YOUR-BACKEND-SITE.netlify.app/api/health`. It should return JSON with `ok: true`.

**Security:** never put `SUPABASE_SERVICE_ROLE_KEY` in frontend/admin environment variables, source code, GitHub, or screenshots. If a real secret was previously included in an uploaded ZIP or committed to Git, rotate it in Supabase before deployment.

## 3. Deploy the customer website

1. In Netlify, add another project from the same GitHub repository.
2. Base directory: `frontend1/frontend`. Build command: `npm run build`. Publish directory: `dist`.
3. Add environment variables:

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your backend Netlify URL from step 2, with no trailing slash |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase publishable/anon key |

4. Deploy and open the customer site. The included `public/_redirects` keeps React routes working after refresh.

## 4. Deploy the admin dashboard

1. Add a third Netlify project from the same GitHub repository.
2. Base directory: `admin1`. Build command: `npm run build`. Publish directory: `dist`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` using the same Supabase project values.
4. Deploy. Confirm the admin Auth user has an active `admin`, `manager`, or `staff` role in `profiles`.

## 5. Finish CORS configuration

After the customer and admin sites exist, return to the backend site's environment variables and set `CORS_ORIGIN` to both exact origins separated by a comma, for example:

```text
https://YOUR-CUSTOMER-SITE.netlify.app,https://YOUR-ADMIN-SITE.netlify.app
```

Do not include trailing slashes. Trigger a new backend deploy after changing the variable.

## 6. Supabase checklist

- Use your existing Supabase project and database. Back up the database before running any SQL.
- Check `SUPABASE_SETUP.sql` and confirm its schema matches the current project before applying it; do not blindly rerun setup SQL on a database that already contains production data.
- Confirm Auth settings allow your deployed customer/admin URLs where required (Site URL and Redirect URLs).
- Confirm public catalog read policies and private order/payment policies are correct.
- The backend needs `SUPABASE_SERVICE_ROLE_KEY` to create payment records under the current RLS design.

## Customer access and delivery location

- Customers can choose **Continue as guest** from the customer sign-in page and place an order without creating an account. Guest orders still use the same backend order-creation endpoint and can proceed to the existing KHQR or cash-on-delivery flow. Guest customers do not get account-based order history until they sign in.
- Customers can use **Use my current location** on checkout. The browser asks for permission; after approval, BiteGo attempts to turn the GPS coordinates into a readable address. If address lookup is unavailable, coordinates are inserted and the customer should add a nearby building, street, or landmark.
- Location access requires HTTPS (Netlify provides HTTPS) and explicit browser permission. The customer should verify the delivery address before submitting.

## Payment flow — intentionally unchanged

The checkout/payment implementation was not redesigned. ABA, ACLEDA and WING QR selection, the five-minute payment attempt, expiry/retry, manual admin acceptance and order tracking remain the existing flow. The supplied QR images are static merchant QR images; the app does not automatically verify a bank transfer. Admin must independently confirm the actual incoming transfer in the merchant account before accepting it. A QR scan, screenshot or customer claim is not proof of payment.

## Build validation note

The backend JavaScript syntax and Netlify function wrapper were checked locally. A full Vite production build could not be run in this preparation environment because the npm package registry was unreachable; Netlify will install dependencies and run the configured builds after you connect GitHub. If a build fails, share the Netlify deploy log and I can help fix the exact error.

## Before using it with customers

Test sign-in, catalog loading, checkout, order creation, order history, cart clearing, all three QR images, the five-minute expiry, retry, manual admin acceptance and tracking. Use test orders first. Netlify Free has monthly usage limits and serverless-function constraints; Supabase Free may pause inactive projects. Free hosting is not a reliability or payment-security guarantee for a commercial ordering business.
