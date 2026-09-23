// Run with `npm test` (Node's built-in test runner; needs Node 22.18+ for
// TypeScript type stripping).
import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNextPath } from "./safe-next.ts";

test("keeps same-origin paths, including query and hash", () => {
  assert.equal(safeNextPath("/"), "/");
  assert.equal(safeNextPath("/routines"), "/routines");
  assert.equal(safeNextPath("/build/123?tab=items#top"), "/build/123?tab=items#top");
  assert.equal(safeNextPath("/workout/abc-def"), "/workout/abc-def");
});

test("takes the first value when the param is repeated", () => {
  assert.equal(safeNextPath(["/metrics", "//evil.example"]), "/metrics");
  assert.equal(safeNextPath(["//evil.example", "/metrics"]), "/");
});

test("falls back for missing or non-string values", () => {
  for (const value of [undefined, null, "", 42, {}, []]) {
    assert.equal(safeNextPath(value), "/");
  }
});

test("rejects anything that does not start with a single slash", () => {
  for (const value of [
    "evil.example",
    "https://evil.example",
    "http:/evil.example",
    "javascript:alert(1)",
    "//evil.example",
    "///evil.example",
    " /routines",
  ]) {
    assert.equal(safeNextPath(value), "/", value);
  }
});

test("rejects backslash tricks", () => {
  for (const value of ["/\\evil.example", "/\\/evil.example", "/a\\b", "/a/../\\evil"]) {
    assert.equal(safeNextPath(value), "/", value);
  }
});

test("rejects tabs, newlines and other control characters", () => {
  for (const value of [
    "/\t/evil.example",
    "/\n/evil.example",
    "/\r/evil.example",
    "/routines\u0000",
    "/\u007f/evil.example",
    "/\u0085/evil.example",
  ]) {
    assert.equal(safeNextPath(value), "/", JSON.stringify(value));
  }
});

test("rejects dot segments that collapse into a protocol-relative URL", () => {
  assert.equal(safeNextPath("/.//evil.example"), "/");
  assert.equal(safeNextPath("/..//evil.example"), "/");
  assert.equal(safeNextPath("/a/..//evil.example"), "/");
});

test("never returns something that resolves to another origin", () => {
  const origin = "https://app.example";
  for (const value of [
    "/\\evil.example",
    "/\t/evil.example",
    "/.//evil.example",
    "/%2F%2Fevil.example",
    "/%5Cevil.example",
    "/routines?next=//evil.example",
  ]) {
    const result = safeNextPath(value);
    assert.equal(new URL(result, origin).origin, origin, value);
    assert.ok(result.startsWith("/") && !result.startsWith("//"), value);
  }
});

test("returns the normalised form of an allowed path", () => {
  assert.equal(safeNextPath("/a/./b/../c"), "/a/c");
  assert.equal(safeNextPath("/%2F%2Fevil.example"), "/%2F%2Fevil.example");
});

test("rejects absurdly long values", () => {
  assert.equal(safeNextPath(`/${"a".repeat(5000)}`), "/");
});
