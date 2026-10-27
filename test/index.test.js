import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  formatJson,
  minifyJson,
  validateJson,
  sortKeys,
  parseIndent,
  isFormatted,
} from "../src/index.js";

const cliPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "bin",
  "jsonfmt.js",
);

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

test("sortKeys preserves __proto__ as an own property (no data loss)", () => {
  const input = JSON.parse('{"b":1,"__proto__":{"polluted":true}}');
  const out = sortKeys(input);
  assert.equal(Object.hasOwn(out, "__proto__"), true);
  assert.deepEqual(out.__proto__, { polluted: true });
});

test("sortKeys does not pollute Object.prototype", () => {
  const input = JSON.parse('{"__proto__":{"polluted":true}}');
  sortKeys(input);
  assert.equal(Object.hasOwn(Object.prototype, "polluted"), false);
  assert.equal({}.polluted, undefined);
});

test("formatJson with sortKeys round-trips __proto__ keys", () => {
  const out = formatJson('{"b":1,"__proto__":{"x":1}}', { sortKeys: true });
  const back = JSON.parse(out);
  assert.equal(Object.hasOwn(back, "__proto__"), true);
  assert.deepEqual(back.__proto__, { x: 1 });
});

test("parseIndent accepts numbers and defaults", () => {
  assert.equal(parseIndent(undefined), 2);
  assert.equal(parseIndent("4"), 4);
  assert.equal(parseIndent("0"), 2);
  assert.equal(parseIndent("abc"), 2);
});

test("parseIndent caps large values at 10 spaces", () => {
  assert.equal(parseIndent("1000000"), 10);
  assert.equal(parseIndent(undefined, 1000000), 10);
});

test("formatJson caps large indentation widths", () => {
  const out = formatJson('{"a":1}', { indent: 1000000 });
  assert.equal(out, `{\n${" ".repeat(10)}"a": 1\n}`);
});

test("CLI help documents the indentation limit", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /--indent=N\s+Indentation spaces \(default 2, max 10\)/);
});

test("isFormatted returns true when input already formatted", () => {
  const src = '{\n  "a": 1\n}';
  assert.equal(isFormatted(src), true);
});

test("isFormatted returns false when input is minified", () => {
  assert.equal(isFormatted('{"a":1}'), false);
});

test("isFormatted respects sortKeys option", () => {
  const src = '{\n  "a": 1,\n  "b": 2\n}';
  assert.equal(isFormatted(src, { sortKeys: true }), true);
  assert.equal(isFormatted('{"b":2,"a":1}', { sortKeys: true }), false);
});

test("CLI writes output to new and existing regular files", () => {
  const dir = mkdtempSync(join(tmpdir(), "jsonfmt-cli-"));
  try {
    const input = join(dir, "input.json");
    const existingOutput = join(dir, "existing.json");
    const newOutput = join(dir, "new.json");
    writeFileSync(input, '{"b":2,"a":1}');
    writeFileSync(existingOutput, "old contents that should be replaced");

    for (const output of [existingOutput, newOutput]) {
      const result = spawnSync(
        process.execPath,
        [cliPath, input, `--output=${output}`],
        { encoding: "utf8" },
      );

      assert.equal(result.status, 0, result.stderr);
      assert.equal(
        readFileSync(output, "utf8"),
        '{\n  "b": 2,\n  "a": 1\n}\n',
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI refuses to write through a symlink output", () => {
  const dir = mkdtempSync(join(tmpdir(), "jsonfmt-cli-"));
  try {
    const input = join(dir, "input.json");
    const target = join(dir, "target.json");
    const output = join(dir, "output.json");
    writeFileSync(input, '{"overwritten":true}');
    writeFileSync(target, "preserve this target");
    symlinkSync(target, output, "file");

    const result = spawnSync(
      process.execPath,
      [cliPath, input, `--output=${output}`],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /refusing to write through symlink/i);
    assert.equal(readFileSync(target, "utf8"), "preserve this target");
    assert.equal(lstatSync(output).isSymbolicLink(), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
