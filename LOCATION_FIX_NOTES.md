# BiteGo current-location checkout fix

- Wired the existing **Use current location** button on the customer checkout page to the browser Geolocation API.
- The browser asks the customer for permission only after the button is pressed.
- When permitted, checkout attempts an OpenStreetMap reverse-geocoding lookup and fills the delivery address with the readable address plus GPS coordinates.
- If reverse geocoding is unavailable, the GPS coordinates are still included in the delivery address.
- Includes permission-denied, unavailable-location, timeout, and unsupported-browser messages.
- Requires HTTPS in production (or localhost during development) and the customer's permission.
- No payment, KHQR, order pricing, or payment verification code was changed.

Note: this update captures the customer's delivery location at checkout. It does not provide continuous rider-to-customer live tracking; that requires a rider-side GPS publisher and a realtime location channel.
