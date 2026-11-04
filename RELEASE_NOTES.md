# BiteGo release notes

## Branding and experience
- Added a shared BiteGo vector brand mark to the customer header, footer, and admin sidebar.
- Added BiteGo SVG favicons, page titles, descriptions, and theme colors for both Vite apps.
- Added a subtle admin page transition and reduced-motion accessibility handling.
- Updated customer-facing brand wording to BiteGo.

## Admin settings integrity
- Removed fabricated example admin users from the live Admin Users list; the list now reflects Supabase profiles only and displays an empty state when none exist.
- Removed settings inputs that were not persisted (fake bank code/account-number fields and the unsaved order-cancelled notification toggle).
- Clarified that existing QR images, payment choices, expiry and manual bank verification remain part of the existing checkout/payment flow.

## Deployment and security preparation
- Removed local `.env` files from the release package and replaced them with safe placeholder `.env.example` files.
- Added `.gitignore` coverage for secrets, dependencies, and build output.
- Added Netlify SPA fallback files for the customer/admin apps and a Netlify Functions adapter for the Express API.
- Added a Netlify Free + Supabase deployment guide; no Render or Vercel deployment is required.
- Removed the old Render blueprint and Vercel-specific configuration.
- Added TypeScript `typecheck` scripts and a backend syntax-check test script.

## Payment preservation
The existing checkout, KHQR page, API client, backend payment routes, and ABA/ACLEDA/WING QR image files were preserved. Only the backend app export/local-listener bootstrap was adjusted to allow Netlify Functions; payment business logic was not redesigned. Preserved files include:
- `frontend1/frontend/src/pages/CheckoutPage.tsx`
- `frontend1/frontend/src/pages/KHQRPage.tsx`
- `frontend1/frontend/src/lib/api.ts`
- `frontend1/frontend/public/payment-qr/ABA.JPG`
- `frontend1/frontend/public/payment-qr/ACLEDA.JPG`
- `frontend1/frontend/public/payment-qr/WING.JPG`

## Validation
- Backend JavaScript syntax check: passed (`node --check index.js` and the Netlify function wrapper).
- Package JSON and lockfile structure checks: passed.
- Full Vite production builds could not be run in this preparation environment because the npm package registry was unreachable. Netlify will install dependencies and run the configured builds; inspect deploy logs before publishing.

## Important limitations
- A TypeScript check is not an end-to-end integration test. The live Supabase project, Auth roles, RLS policies, bank QR ownership, and real bank transfer process must be verified using the owner's credentials and staging environment.
- The supplied bank QR images are static and payment acceptance is manual. This project does not independently verify incoming transfers with ABA, ACLEDA, or WING.
- Free hosting tiers are appropriate for a portfolio/demo, not dependable production payment processing. Read `DEPLOY_FREE.md` before launch.
