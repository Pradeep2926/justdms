// The server creates the subscription and verifies payment; the client never grants access itself.
export function createSubscriptionCheckout({ api, loadGateway }) {
  return async function openCheckout({ user, currency = "INR", billingCycle = "monthly", introductory = false, foundingOffer, offerPaymentMethod = "upi", headers, onVisibility, onVerified, onError, onDismiss }) {
    const Gateway = await loadGateway();
    if (!Gateway) throw new Error("Payment checkout could not be loaded. Please try again.");
    const { data: order } = await api.post("/billing/subscription", {
      billingCycle, currency,
      ...(introductory ? { offerCode: foundingOffer.code, offerPaymentMethod } : {}),
    }, { headers });
    const checkout = new Gateway({
      key: order.keyId, amount: order.amount, currency: order.currency,
      name: "JustDMs", description: order.planLabel, subscription_id: order.subscriptionId,
      ...(order.offerPaymentMethod ? { config: { display: {
        blocks: { introductory: { name: order.offerPaymentMethod === "upi" ? "Pay with UPI AutoPay" : "Pay with card", instruments: [{ method: order.offerPaymentMethod }] } },
        sequence: ["block.introductory"], preferences: { show_default_blocks: false },
      } } } : {}),
      prefill: { email: user.email }, theme: { color: "#0567dd" },
      handler: async payment => {
        try {
          const { data } = await api.post("/billing/verify", payment, { headers });
          onVerified?.(data.subscription);
        } catch (error) {
          onVisibility?.(false);
          onError?.(error);
          onDismiss?.();
        }
      },
      modal: { ondismiss: () => { onVisibility?.(false); onDismiss?.(); } },
    });
    checkout.on("payment.failed", response => onError?.(new Error(response.error?.description || "Payment failed. Please try again.")));
    // Native dialogs must release the top layer before Razorpay's iframe is opened.
    onVisibility?.(true);
    try { checkout.open(); }
    catch (error) { onVisibility?.(false); throw error; }
    return checkout;
  };
}
