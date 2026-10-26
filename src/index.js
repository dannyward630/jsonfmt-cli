// jsonfmt-cli: pretty-print, validate and minify JSON (no dependencies).

export function parseIndent(raw, def = 2) {
  if (raw === undefined || raw === null || raw === "") return def;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.floor(n);
}

export function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortKeys(value[key]);
    }
    return out;
  }
  return value;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`invalid json: ${err.message}`);
  }
}

export function validateJson(text) {
  try {
    JSON.parse(text);
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: `invalid json: ${err.message}` };
  }
}

export function formatJson(text, options = {}) {
  const data = parseJson(text);
  const indent = options.compact ? 0 : parseIndent(options.indent, 2);
  const value = options.sortKeys ? sortKeys(data) : data;
  if (options.compact) return JSON.stringify(value);
  return JSON.stringify(value, null, indent);
}

export function minifyJson(text) {
  const data = parseJson(text);
  return JSON.stringify(data);
}

export function isFormatted(text, options = {}) {
  let formatted;
  try {
    formatted = formatJson(text, options);
  } catch {
    return false;
  }
  return text === formatted || text === formatted + "\n";
}
