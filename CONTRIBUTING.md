# Contributing to Mapsmith

Thanks for helping make Mapsmith a better local-first diagram editor.

## Ground Rules

- Keep contributions public-safe. Do not commit private diagrams, credentials, tokens, customer data, internal URLs, or machine-specific paths.
- Use demo boards and sanitized screenshots when documenting bugs.
- Keep changes focused. Small export/import, editor, documentation, and test improvements are easier to review.
- Preserve `.mapsmith` compatibility unless the change explicitly includes a migration plan.

## Development

Install dependencies:

```bash
npm ci
```

Run the app locally:

```bash
npm run dev
```

Run the full project check before opening a pull request:

```bash
npm run check
```

Helpful focused checks:

```bash
npm run verify:board
npm run verify:svg
npm audit --omit=dev
```

## Export and Import Changes

Export/import behavior is part of Mapsmith's portability promise. Changes in this area should include one of:

- a deterministic fixture update,
- a rendered save/open/export smoke test,
- or a short explanation of why existing coverage is enough.

## Pull Requests

Please include:

- what changed,
- why it changed,
- how it was verified,
- and whether screenshots, fixtures, or generated files are public-safe.
