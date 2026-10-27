# jsonfmt-cli

Lightweight CLI to pretty-print, validate and minify JSON. No dependencies. Node.js >= 18.

## Usage

```bash
echo '{"b":2,"a":1}' | jsonfmt
jsonfmt data.json
jsonfmt data.json --indent=4
jsonfmt data.json --compact
jsonfmt data.json --sort-keys
jsonfmt data.json --minify
jsonfmt data.json --validate
jsonfmt data.json --in-place
jsonfmt -i data.json --sort-keys
```

`--in-place` (`-i`) writes the formatted result back to the input file without
printing it, preserving its permissions. It requires a file, refuses symbolic
links, and cannot be combined with `--output`, `--check` or `--validate`.
Invalid JSON leaves the input unchanged.

Indentation defaults to 2 spaces. Values above 10 for `--indent` are capped at
10 spaces, matching JavaScript's JSON serializer limit.

## Development

```bash
npm test
npm run lint
```

## License

MIT
