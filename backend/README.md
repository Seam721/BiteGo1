# BiteGo Backend

Express API connected to the existing Supabase project. It runs locally as a normal Node.js server and can also run as a Netlify Function for free hosting.

## Local development

```powershell
Copy-Item .env.example .env
npm install
npm start
```

Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`. Keep the service-role key on the backend only. The API runs at `http://localhost:3000`; health check: `/api/health`.

## Netlify deployment

The `netlify/functions/api.js` wrapper exposes the existing Express app as a Netlify Function. `netlify.toml` rewrites `/api/*` requests to that function. Set the base directory to `backend`, build command to `npm install`, and publish directory to `public`. Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NODE_ENV=production`, and `CORS_ORIGIN` in the Netlify environment variables. Full instructions are in `../DEPLOY_FREE.md`.

## API and payment behavior

The API reads catalog data and writes orders/payment attempts to Supabase. The existing customer flow offers ABA, ACLEDA, and WING static merchant QR images, a five-minute payment attempt, expiry/retry, and manual admin acceptance. The backend does not automatically verify a bank transfer or auto-mark a payment as paid. Admin must confirm the transfer in the merchant bank account before accepting it.

The service-role key is required for payment record creation under the current RLS design. Never expose it in browser code, Vite variables, GitHub, or public ZIP files.
