import test from "node:test";
import assert from "node:assert/strict";
import { validateProfile } from "./validation.js";
const valid = { username: "ridel_l", displayName: "RidelL", bio: "Hello", avatarUrl: null, accent: "#8b6ac8", links: [{ id: 1, label: "Site", url: "https://example.com" }] };

test("accepts valid profile and normalizes username", () => {
  assert.equal(validateProfile({ ...valid, username: " Ridel_L " }).value?.username, "ridel_l");
});
test("rejects reserved and malformed usernames", () => {
  assert.match(validateProfile({ ...valid, username: "admin" }).error ?? "", /reserved/);
  assert.ok(validateProfile({ ...valid, username: "ab" }).error);
});
test("requires a display name", () => assert.match(validateProfile({ ...valid, displayName: " " }).error ?? "", /Display name/));
test("rejects unsafe URL protocols", () => {
  assert.match(validateProfile({ ...valid, avatarUrl: "javascript:alert(1)" }).error ?? "", /HTTP/);
  assert.match(validateProfile({ ...valid, links: [{ label: "Bad", url: "javascript:alert(1)" }] }).error ?? "", /HTTP/);
});
test("rejects too many links and malformed links", () => {
  assert.ok(validateProfile({ ...valid, links: Array.from({ length: 13 }, (_, id) => ({ id, label: "x", url: "https://example.com" })) }).error);
  assert.ok(validateProfile({ ...valid, links: [null] }).error);
});
test("accepts empty links and empty avatar", () => {
  const result = validateProfile({ ...valid, links: [], avatarUrl: "" });
  assert.equal(result.value?.avatarUrl, null);
  assert.deepEqual(result.value?.links, []);
});
