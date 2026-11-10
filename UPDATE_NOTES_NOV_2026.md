# BiteGo update notes — November 2026

## Included

- Checkout now requests browser location permission only after the customer taps **Use my current location**.
- GPS coordinates are reverse-geocoded to a readable address when the OpenStreetMap Nominatim service responds. If lookup fails, the coordinates are added as a fallback and the customer is prompted to add a nearby landmark.
- Customers can continue as guests from the customer sign-in screen. They can place orders without registering; account-based profile and order-history features still require sign-in.
- Existing responsive layouts and Netlify deployment structure are retained.

## Payment safety

No payment implementation was edited. The existing KHQR, ABA/ACLEDA/WING bank selection, five-minute expiry/retry, manual admin acceptance, cash-on-delivery, and tracking implementation are retained as supplied.

## Important deployment notes

- Use the Netlify deployment steps in `DEPLOY_FREE.md`.
- Location access works on HTTPS and requires the customer to approve the browser permission prompt.
- If reverse geocoding is unavailable, the customer must verify the coordinates and add a useful delivery landmark.
- Guest orders do not appear in signed-in customer order history unless the order is linked to an authenticated account by the existing backend logic.
- Configure Supabase and Netlify environment variables before testing real orders. Never expose the backend service-role key in frontend or admin variables.
