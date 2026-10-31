import test from "node:test";
import assert from "node:assert/strict";
import { isExistingAccount } from "./signupResult.mjs";

test("recognizes duplicate users returned without a signup error", () => {
  assert.equal(isExistingAccount({ user: { identities: [] } }, null), true);
});

test("recognizes explicit duplicate responses including local auth", () => {
  for (const error of [
    { code: "user_already_exists" },
    { message: "User already registered" },
    { message: "User already exists" },
  ]) assert.equal(isExistingAccount(null, error), true);
});

test("preserves new and unconfirmed signup flows and other errors", () => {
  assert.equal(isExistingAccount({ user: { identities: [{ provider: "email" }] } }, null), false);
  assert.equal(isExistingAccount({ user: { id: "local-user" } }, null), false);
  assert.equal(isExistingAccount(null, { message: "Email rate limit exceeded" }), false);
  assert.equal(isExistingAccount(null, null), false);
});
