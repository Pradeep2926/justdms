# First-month founding offer

Terms: eligible first paid INR monthly subscription pays ₹99 for its first billing cycle and ₹199/month thereafter until cancelled. USD, annual plans, and existing subscribers keep current pricing. No lifetime price promise.

Use Razorpay's subscription offer feature with the existing ₹199 monthly plan. Create separate UPI and card offers, each with a flat ₹100 discount and **Single Use / exactly one billing cycle**. Set minimum and maximum purchase amount to ₹199. Set expiry to 31 December 2026 at 11:59 PM IST. Do not create a ₹99 recurring plan. Configure the offer to block payment when offer validation fails (never continue undiscounted). Check all intended supported payment methods; Razorpay offers may be payment-method-specific. The billing page lets customers select UPI AutoPay or card, and the server selects the corresponding offer. Checkout shows the chosen payment method. Both offer IDs and a future expiry are required before public advertising is enabled.

Only after verifying in Razorpay test mode:

- Set `RAZORPAY_FOUNDING_UPI_OFFER_ID=offer_...` and `RAZORPAY_FOUNDING_CARD_OFFER_ID=offer_...` on the backend.
- Set `FOUNDING_OFFER_EXPIRES_AT=2026-12-31T18:29:00.000Z` (11:59 PM IST).
- Set `FOUNDING_OFFER_ENABLED=true` on the backend.
- Verify first charge ₹99, next invoice ₹199, and cancellation behavior before enabling the public offer.
- Check `/billing/founding-offer` and an eligible user's billing page. Public advertising remains hidden while configuration is disabled.

The user must explicitly claim through the eligible billing UI. The server rejects missing configuration, invalid code, wrong currency/cycle, and returning subscribers. It also confirms Razorpay linked the configured offer before returning a checkout. The normal checkout path and existing subscriptions remain unchanged. The app trusts the merchant-verified Razorpay offer configuration for discount amount, cycle count, payment method and validity window; a matching offer ID alone cannot verify those terms.

Local landing visual preview: `http://127.0.0.1:5181/?previewOffer=1`. This development-only preview does not enable discounted payments. Offer eligibility is based on saved payment/subscription lifecycle history; it is per registered account, not per person or card.

Live offer configuration (30 October 2026):
- UPI: `offer_TuD6eWn4Fu47eW`
- Cards: `offer_TuD9EVJi0W8S2b` (both debit and credit cards; one use per card)
- Both: single-use ₹100 discount on ₹199, block payment on validation failure, claim expiry 31 December 2026 11:59 PM IST. Offer cost acknowledgement approved by the user for both.
- No live customer payment was completed during setup.
