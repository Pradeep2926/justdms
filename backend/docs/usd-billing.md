# USD billing setup

Existing INR environment variables and plans are unchanged.

New LIVE Razorpay subscription plan templates, created 29 October 2026:

```
RAZORPAY_USD_MONTHLY_PLAN_ID=plan_TtofKcsovwmWzq
RAZORPAY_USD_YEARLY_PLAN_ID=plan_Ttog9D66UPCPC4
```

Monthly: USD 499 cents, interval 1 month. Yearly: USD 4900 cents, interval 1 year.
These identifiers are not credentials. Use with the existing live Razorpay credentials only.
For test-mode credentials, create matching test-mode plans and configure their IDs instead.

Deployment: add the two variables to the backend environment. Deploy the backend and frontend together. Check /billing/subscription returns checkoutCurrencies.USD=true for an authenticated user. Checkout independently retrieves and validates the plan amount, currency and frequency before creating a subscription; missing or mismatched configurations fail closed. Omitted currency defaults to INR for existing clients.

No existing subscriptions are migrated. Cancellation, signed webhook verification, and access checks use the existing subscription records. The amount_paise column retains its legacy name and stores currency subunits (cents for USD).

Verification completed: both live plan templates saved successfully; unit checks cover INR defaults, USD cents, unsupported input, and mismatched remote plans. No customer subscription or charge was created during setup. A USD authorization/payment and subsequent webhook renewal have not been tested.
