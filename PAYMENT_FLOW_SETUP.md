# Foodie6 KHQR payment flow

The existing flow is preserved:

1. Customer checks out.
2. Customer chooses ABA, ACLEDA, or WING.
3. The selected supplied image is displayed from `frontend1/frontend/public/payment-qr/`.
4. The backend creates a pending payment attempt with an expiry five minutes in the future.
5. The customer sees the amount and countdown.
6. The customer transfers money using the selected bank app.
7. The customer page polls payment status every three seconds.
8. The admin Payments page refreshes every three seconds and displays pending KHQR attempts.
9. The admin checks the merchant account/bank app and clicks **Accept** only after independently verifying the received amount and transaction.
10. Acceptance marks the payment paid, updates the order payment status, and moves the order to preparing.
11. The customer sees Payment Accepted and can follow live order tracking.
12. If the five-minute window expires, the customer can choose a QR again to start another attempt.

## Database

Run `SUPABASE_SETUP.sql` in Supabase SQL Editor. It includes the `payments.payment_provider` and `payments.expires_at` columns.

## Real payment limitation

The QR images are static images provided in this project. They are not dynamically generated per-order KHQR invoices, and the application does not receive automatic bank confirmation. The admin's manual confirmation remains required. Validate that each QR belongs to the intended merchant account and test with small amounts before taking real orders. For automated payment verification, obtain official merchant API/webhook access from the bank/payment provider and implement their documented verification flow.

Never mark a payment paid just because a customer says they scanned a QR or shows a screenshot; independently verify the incoming transaction in the merchant account.
