import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../bin/jsonfmt.js", import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", input: '{"stdin":true}' });

test("in-place formats the input without stdout and preserves permissions", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "jsonfmt-cli-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "input.json");
  writeFileSync(file, '{"b":2,"a":1}');
  chmodSync(file, 0o640);
  const before = statSync(file).mode;
  const result = run("--in-place", file, "--sort-keys", "--indent=4");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
  assert.equal(readFileSync(file, "utf8"), '{\n    "a": 1,\n    "b": 2\n}\n');
  assert.equal(statSync(file).mode, before);
});

test("-i supports compact formatting", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "jsonfmt-cli-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "input.json");
  writeFileSync(file, '{ "a": 1 }');
  const result = run(file, "-i", "--compact");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(file, "utf8"), '{"a":1}\n');
});

test("in-place refuses symbolic links without changing the target", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "jsonfmt-cli-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "input.json");
  const link = join(dir, "link.json");
  writeFileSync(file, '{"a":1}');
  try { symlinkSync(file, link); } catch (err) {
    if (err.code === "EPERM") { t.skip("symlinks unavailable"); return; }
    throw err;
  }
  const result = run("--in-place", link);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /symlink|symbolic link/i);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
  assert.equal(readFileSync(file, "utf8"), '{"a":1}');
});

test("in-place leaves invalid JSON untouched", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "jsonfmt-cli-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "input.json");
  writeFileSync(file, "{bad}");
  const result = run("-i", file);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /invalid json/i);
  assert.equal(readFileSync(file, "utf8"), "{bad}");
});

test("in-place requires a file and rejects conflicting modes", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "jsonfmt-cli-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "input.json");
  const output = join(dir, "output.json");
  writeFileSync(file, '{"a":1}');
  for (const args of [["-i"], ["-i", file, "--check"], ["-i", file, "--validate"], ["-i", file, `--output=${output}`]]) {
    const result = run(...args);
    assert.equal(result.status, 1, args.join(" "));
    assert.match(result.stderr, /error:/);
    assert.doesNotMatch(result.stderr, /\n\s+at /);
  }
  assert.equal(readFileSync(file, "utf8"), '{"a":1}');
});
