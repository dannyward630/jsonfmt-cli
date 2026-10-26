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
```

## Development

```bash
npm test
npm run lint
```

## License

MIT
