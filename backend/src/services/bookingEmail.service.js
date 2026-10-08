async function sendBookingEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_EMAIL_FROM || "JustDMs Bookings <noreply@justdms.in>";
  if (!apiKey || !to) return { skipped: true };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!response.ok) throw new Error(`Email delivery failed (${response.status}).`);
  return response.json();
}

function bookingEmailHtml(title, booking, note = "") {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0f172a"><h2>${title}</h2><p>${note}</p><p><strong>Service:</strong> ${booking.service_name || "Appointment"}<br><strong>When:</strong> ${new Date(booking.starts_at).toUTCString()}<br><strong>Status:</strong> ${String(booking.status || "").replaceAll("_", " ")}</p><p style="color:#64748b;font-size:12px">Payment references are reviewed manually by the creator. JustDMs does not hold appointment payments.</p></div>`;
}

module.exports = { bookingEmailHtml, sendBookingEmail };
