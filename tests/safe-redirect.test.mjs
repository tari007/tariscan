import test from "node:test";
import assert from "node:assert/strict";
import { getSafeInternalPath } from "../src/lib/security/redirect.mjs";

test("allows a normal internal path with query and hash", () => {
  assert.equal(getSafeInternalPath("/sales?status=paid#recent", "/"), "/sales?status=paid#recent");
});

test("rejects absolute external URLs", () => {
  assert.equal(getSafeInternalPath("https://example.com", "/dashboard"), "/dashboard");
});

test("rejects protocol-relative external URLs", () => {
  assert.equal(getSafeInternalPath("//example.com/path", "/dashboard"), "/dashboard");
});

test("rejects backslash-based redirect attempts", () => {
  assert.equal(getSafeInternalPath("/\\\\example.com", "/dashboard"), "/dashboard");
});

test("uses fallback for empty and non-string values", () => {
  assert.equal(getSafeInternalPath("", "/setup"), "/setup");
  assert.equal(getSafeInternalPath(null, "/setup"), "/setup");
});
