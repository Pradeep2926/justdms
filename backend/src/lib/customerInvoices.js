function customerInvoices(items, subscriptionId) {
  return (Array.isArray(items) ? items : []).filter(item => item.subscription_id === subscriptionId).map(item => {
    let url = null;
    try {
      const parsed = new URL(item.short_url);
      if (parsed.protocol === "https:" && ["rzp.io", "razorpay.com"].some(domain => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`))) url = parsed.href;
    } catch { /* Missing hosted invoice. */ }
    return { id: item.id, number: item.invoice_number || item.id, status: item.status,
      amount: item.amount, currency: item.currency, timestamp: item.paid_at || item.issued_at || item.created_at, url };
  });
}
module.exports = { customerInvoices };
