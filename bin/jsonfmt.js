#!/usr/bin/env node
import {
  closeSync,
  constants,
  fstatSync,
  ftruncateSync,
  lstatSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { formatJson, minifyJson, validateJson, parseIndent, isFormatted } from "../src/index.js";

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
  --check        Exit 1 if input is not already formatted
  --output=FILE  Write result to FILE instead of stdout
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
const check = args.includes("--check");
const outputArg = args.find((a) => a.startsWith("--output="));
const outputFile = outputArg ? outputArg.split("=")[1] : null;

function writeOutputFile(file, content) {
  let pathStat;
  try {
    pathStat = lstatSync(file);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  if (pathStat?.isSymbolicLink()) {
    throw new Error("refusing to write through symlink");
  }
  if (pathStat && !pathStat.isFile()) {
    throw new Error("refusing to write to non-regular output");
  }

  const noFollow = constants.O_NOFOLLOW ?? 0;
  const flags = pathStat
    ? constants.O_WRONLY | noFollow
    : constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow;
  const fd = openSync(file, flags, 0o666);

  try {
    const fileStat = fstatSync(fd);
    if (!fileStat.isFile()) {
      throw new Error("refusing to write to non-regular output");
    }
    if (
      pathStat &&
      (fileStat.dev !== pathStat.dev || fileStat.ino !== pathStat.ino)
    ) {
      throw new Error("output file changed while opening");
    }

    const currentPathStat = lstatSync(file);
    if (currentPathStat.isSymbolicLink()) {
      throw new Error("refusing to write through symlink");
    }
    if (
      !currentPathStat.isFile() ||
      currentPathStat.dev !== fileStat.dev ||
      currentPathStat.ino !== fileStat.ino
    ) {
      throw new Error("output file changed while opening");
    }

    ftruncateSync(fd, 0);
    writeFileSync(fd, content);
  } finally {
    closeSync(fd);
  }
}

try {
  if (validate) {
    const r = validateJson(text);
    if (r.ok) { console.log("valid"); process.exit(0); }
    else { console.error(`error: ${r.error}`); process.exit(1); }
  }
  if (check) {
    if (isFormatted(text, { indent, sortKeys, compact })) { process.exit(0); }
    else { console.error("error: not formatted"); process.exit(1); }
  }
  let result;
  if (minify || compact) {
    result = minify ? minifyJson(text) : formatJson(text, { compact: true, sortKeys });
  } else {
    result = formatJson(text, { indent, sortKeys });
  }
  if (outputFile) {
    writeOutputFile(outputFile, result + "\n");
  } else {
    console.log(result);
  }
} catch (err) {
  console.error(`error: ${err.message}`);
  process.exit(1);
}
