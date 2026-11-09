# BiteGo — Professional storefront redesign

Only the customer storefront (`frontend1/frontend/src`) was redesigned.
**No new dependencies were added** — your existing `node_modules` keep working.

## Payment flow — NOT changed
These files are byte-for-byte identical to the previous version:
`CheckoutPage.tsx`, `KHQRPage.tsx`, `lib/api.ts`, `TrackingPage.tsx`, `data.ts`,
the QR images in `public/payment-qr/`, the whole `backend/`, `admin1/`, and `SUPABASE_SETUP.sql`.
`placeOrder()` and the checkout / khqr / tracking routes in `App.tsx` are unchanged.

## What's new
- **Hero slide show** — 4 full-screen slides that slide left/right, with Ken-Burns zoom,
  staggered text, progress-bar autoplay (pauses on hover/touch), arrows, dots and swipe.
- **Preloader** — branded BiteGo splash while the menu loads (max 4 s, never blocks the site).
- **Page transitions** — every page slides/fades in, plus a thin route-progress bar on top.
- **Scroll reveal** — sections animate in as you scroll; count-up numbers in the stats row.
- **Sliding carousels** — featured restaurants and trending dishes, with arrow buttons + swipe.
- **Skeleton loaders** — shimmering placeholders while restaurants/dishes load.
- **Live search** on the home page (restaurant + dish suggestions), categories pre-filter the list.
- **Promo banner, how-it-works section, kitchen marquee, professional footer.**
- Polished header (scroll shadow + progress line), mobile nav, cart drawer (Esc to close, scroll lock),
  restaurant page (sticky category tabs), dish page (two-column layout), back-to-top button.
- Respects `prefers-reduced-motion` (animations are switched off and autoplay stops).

## Content changes worth knowing
- Home stats are now computed from your real data (restaurant count, dish count, average rating,
  fastest delivery) instead of the old hard-coded "500+ restaurants / 50K+ customers".
- Removed the fake hard-coded nutrition box (320 cal / 24 g / 12 g) from the dish page;
  replaced with real rating, reviews and delivery time.
- Footer links now point to real pages only; no invented phone/email/social links.

## Easy tweaks
- Slide images/text: `src/components/HeroSlider.tsx` (`slides` array).
- Autoplay speed: `heroProgress 6s` in `src/index.css` (`.hero-progress.is-running`).
- Brand colors / shadows / easing: CSS variables at the top of `src/index.css`.

## Run
```powershell
cd frontend1/frontend
npm install      # only needed on a fresh copy
npm run dev
```
