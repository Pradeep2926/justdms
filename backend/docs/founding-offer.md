# First-month founding offer (not enabled in production)

Terms: eligible first paid INR monthly subscription pays ₹99 for its first billing cycle and ₹199/month thereafter until cancelled. USD, annual plans, and existing subscribers keep current pricing. No lifetime price promise.

Use Razorpay's subscription offer feature with the existing ₹199 monthly plan. Configure a flat ₹100 discount with **Single Use / exactly one billing cycle**. Do not create a ₹99 recurring plan. Configure the offer to block payment when offer validation fails (never continue undiscounted). Check all intended supported payment methods; Razorpay offers may be payment-method-specific. The banner cannot imply availability across payment methods that the configured offer excludes.

Only after verifying in Razorpay test mode:

- Set `RAZORPAY_FOUNDING_OFFER_ID=offer_...` on the backend.
- Set `FOUNDING_OFFER_ENABLED=true` on the backend.
- Verify first charge ₹99, next invoice ₹199, and cancellation behavior before enabling the public offer.
- Check `/billing/founding-offer` and an eligible user's billing page. Public advertising remains hidden while configuration is disabled.

The user must explicitly claim through the eligible billing UI. The server rejects missing configuration, invalid code, wrong currency/cycle, and returning subscribers. It also confirms Razorpay linked the configured offer before returning a checkout. The normal checkout path and existing subscriptions remain unchanged. The app trusts the merchant-verified Razorpay offer configuration for discount amount, cycle count, payment method and validity window; a matching offer ID alone cannot verify those terms.

Local landing visual preview: `http://127.0.0.1:5181/?previewOffer=1`. This development-only preview does not enable discounted payments. Offer eligibility is based on saved payment/subscription lifecycle history; it is per registered account, not per person or card.
