const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function grantProMonth(db, { userId, requestId, admin }) {
  if (!UUID.test(userId || '') || !UUID.test(requestId || '')) {
    const error = new Error('A valid user and grant request are required.');
    error.status = 400;
    throw error;
  }
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) {
    const missing = new Error('Registered account not found.');
    missing.status = 404;
    throw missing;
  }
  const email = data.user.email.toLowerCase();
  const result = await db.rpc('grant_admin_pro_month', {
    p_request_id: requestId, p_user_id: userId, p_user_email: email,
    p_admin_id: admin.id, p_admin_email: admin.email.toLowerCase(),
  });
  if (result.error) {
    // Do not expose database details to the browser.
    console.error('Admin Pro grant failed:', result.error.message);
    throw new Error('Unable to grant access. Retry this request or contact support.');
  }
  return { email, accessEnd: result.data };
}
module.exports = { grantProMonth };
