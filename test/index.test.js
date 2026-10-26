import test from "node:test";
import assert from "node:assert/strict";

import {
  formatJson,
  minifyJson,
  validateJson,
  sortKeys,
  parseIndent,
} from "../src/index.js";

test("formatJson pretty-prints with 2-space indent by default", () => {
  const out = formatJson('{"b":2,"a":1}');
  assert.equal(out, '{\n  "b": 2,\n  "a": 1\n}');
});

test("formatJson honors indent option", () => {
  const out = formatJson('{"a":1}', { indent: 4 });
  assert.equal(out, '{\n    "a": 1\n}');
});

test("formatJson compact produces single line", () => {
  const out = formatJson('{"a": 1, "b": 2}', { compact: true });
  assert.equal(out, '{"a":1,"b":2}');
});

test("formatJson sortKeys sorts object keys", () => {
  const out = formatJson('{"b":2,"a":1}', { sortKeys: true });
  assert.equal(out, '{\n  "a": 1,\n  "b": 2\n}');
});

test("formatJson throws on invalid JSON", () => {
  assert.throws(() => formatJson("{bad}"), /invalid json/i);
});

test("formatJson handles arrays and nested objects", () => {
  const out = formatJson('[{"x":1},{"y":2}]');
  assert.match(out, /\[\n  \{\n    "x": 1\n  \}/);
});

test("minifyJson removes whitespace", () => {
  assert.equal(minifyJson('{\n  "a": 1,\n  "b": 2\n}'), '{"a":1,"b":2}');
});

test("minifyJson throws on invalid JSON", () => {
  assert.throws(() => minifyJson("nope"), /invalid json/i);
});

test("validateJson returns ok true for valid", () => {
  assert.deepEqual(validateJson('{"a":1}'), { ok: true, error: null });
});

test("validateJson returns ok false with message for invalid", () => {
  const r = validateJson("{bad}");
  assert.equal(r.ok, false);
  assert.match(r.error, /invalid json/i);
});

test("sortKeys recursively sorts nested keys", () => {
  const out = sortKeys({ b: { d: 1, c: 2 }, a: 3 });
  assert.deepEqual(Object.keys(out), ["a", "b"]);
  assert.deepEqual(Object.keys(out.b), ["c", "d"]);
});

test("parseIndent accepts numbers and defaults", () => {
  assert.equal(parseIndent(undefined), 2);
  assert.equal(parseIndent("4"), 4);
  assert.equal(parseIndent("0"), 2);
  assert.equal(parseIndent("abc"), 2);
});
