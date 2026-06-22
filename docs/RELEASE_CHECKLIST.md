# Release Prep Checklist

Use this before creating a public Mapsmith release. Do not publish a release until every required item is checked.

## Scope

- [ ] Release goal is clear and demo-safe.
- [ ] No private diagrams, credentials, customer data, internal URLs, or machine-specific paths are included.
- [ ] Screenshots and fixtures use sanitized demo content only.
- [ ] README and ROADMAP still describe the released behavior accurately.

## Verification

- [ ] `npm ci`
- [ ] `npm run check`
- [ ] `npm audit --omit=dev`
- [ ] Rendered smoke: app loads without console/page errors.
- [ ] Save/Open smoke: `.mapsmith` board downloads and imports successfully.
- [ ] Export smoke: SVG and PNG exports contain only demo-safe content.

## Compatibility

- [ ] `.mapsmith` files still use the expected board type/version.
- [ ] Legacy `.canvasforge` import behavior is still intentional.
- [ ] Any schema change has a migration note or compatibility explanation.

## GitHub

- [ ] CI is green on `main`.
- [ ] Issue templates, security policy, and contributing docs are current.
- [ ] Release notes do not mention private branches, local paths, credentials, or unreleased internal plans.

## After Release

- [ ] Verify release assets render/download correctly.
- [ ] Open follow-up issues for known limitations rather than hiding them in release notes.
