# Release Prep Checklist

Use this before creating a public Mapsmith release. Do not publish a release until every required item is checked.

Record dry-run outcomes with [RELEASE_DRY_RUN_EVIDENCE.md](RELEASE_DRY_RUN_EVIDENCE.md).

## Scope

- [ ] Release goal is clear and demo-safe.
- [ ] No private diagrams, credentials, customer data, internal URLs, or machine-specific paths are included.
- [ ] Screenshots and fixtures use sanitized demo content only.
- [ ] README and ROADMAP still describe the released behavior accurately.
- [ ] `package.json` remains `private: true` until an explicit package publishing decision is made.
- [ ] No public release, package publish, or asset upload has happened before this review is complete.

## Verification

- [ ] `npm ci`
- [ ] `npm run check`
- [ ] `npm run verify:examples`
- [ ] `npm run verify:public`
- [ ] `npm audit --omit=dev`
- [ ] GitHub CI URL is recorded in the dry-run evidence.
- [ ] Rendered smoke: app loads without console/page errors.
- [ ] Save/Open smoke: `.mapsmith` board downloads and imports successfully.
- [ ] Export smoke: SVG and PNG exports contain only demo-safe content.

## Compatibility

- [ ] `.mapsmith` files still use the expected board type/version.
- [ ] Legacy `.canvasforge` import behavior is still intentional.
- [ ] `examples/portable-flow.mapsmith` remains synthetic, parser-verified, and path-free.
- [ ] The checked open/export/save walkthrough remains current.
- [ ] Any schema change has a migration note or compatibility explanation.

## GitHub

- [ ] CI is green on `main`.
- [ ] Issue templates, security policy, and contributing docs are current.
- [ ] The release readiness issue template is current.
- [ ] Release notes do not mention private branches, local paths, credentials, or unreleased internal plans.

## After Release

- [ ] Verify release assets render/download correctly.
- [ ] Open follow-up issues for known limitations rather than hiding them in release notes.
