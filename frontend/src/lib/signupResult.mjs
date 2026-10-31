export function isExistingAccount(data, error) {
  if (error) {
    return error.code === "user_already_exists" ||
      /user already (registered|exists)/i.test(error.message || "");
  }

  // Supabase can return an obfuscated user instead of a duplicate-email error.
  return Array.isArray(data?.user?.identities) && data.user.identities.length === 0;
}
