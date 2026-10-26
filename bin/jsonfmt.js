#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { formatJson, minifyJson, validateJson, parseIndent } from "../src/index.js";

const args = process.argv.slice(2);

if (args.includes("-h") || args.includes("--help")) {
  console.log(`jsonfmt — pretty-print, validate and minify JSON

Usage:
  jsonfmt [file] [options]
  cat file.json | jsonfmt [options]

Options:
  --indent=N     Indentation spaces (default 2)
  --compact      Minify output (single line)
  --sort-keys    Sort object keys
  --validate     Validate only, print "valid" or error
  --minify       Minify output
  -h, --help     Show this help
`);
  process.exit(0);
}

const fileArg = args.find((a) => !a.startsWith("--"));
const text = fileArg ? readFileSync(fileArg, "utf8") : readFileSync(0, "utf8");

const indentArg = args.find((a) => a.startsWith("--indent="));
const indent = indentArg ? parseIndent(indentArg.split("=")[1], 2) : 2;
const sortKeys = args.includes("--sort-keys");
const compact = args.includes("--compact");
const minify = args.includes("--minify");
const validate = args.includes("--validate");

try {
  if (validate) {
    const r = validateJson(text);
    if (r.ok) { console.log("valid"); process.exit(0); }
    else { console.error(`error: ${r.error}`); process.exit(1); }
  }
  if (minify || compact) {
    console.log(minify ? minifyJson(text) : formatJson(text, { compact: true, sortKeys }));
  } else {
    console.log(formatJson(text, { indent, sortKeys }));
  }
} catch (err) {
  console.error(`error: ${err.message}`);
  process.exit(1);
}
