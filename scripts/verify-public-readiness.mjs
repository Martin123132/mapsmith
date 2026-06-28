import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

const failures = []

const requireIncludes = (label, text, snippets) => {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      failures.push(`${label} missing: ${snippet}`)
    }
  }
}

const files = {
  readme: await read('README.md'),
  roadmap: await read('ROADMAP.md'),
  contributing: await read('CONTRIBUTING.md'),
  security: await read('SECURITY.md'),
  license: await read('LICENSE'),
  commercialLicense: await read('COMMERCIAL-LICENSE.md'),
  notice: await read('NOTICE.md'),
  architecture: await read('docs/ARCHITECTURE.md'),
  releaseChecklist: await read('docs/RELEASE_CHECKLIST.md'),
  releaseDryRun: await read('docs/RELEASE_DRY_RUN_EVIDENCE.md'),
  renderedQa: await read('docs/RENDERED_QA.md'),
  releaseDryRunGenerator: await read('scripts/generate-release-dry-run-evidence.mjs'),
  snapGridVerifier: await read('scripts/verify-snap-grid.ts'),
  bugIssue: await read('.github/ISSUE_TEMPLATE/bug_report.yml'),
  exportIssue: await read('.github/ISSUE_TEMPLATE/export_import_issue.yml'),
  releaseIssue: await read('.github/ISSUE_TEMPLATE/release_readiness.yml'),
  issueConfig: await read('.github/ISSUE_TEMPLATE/config.yml'),
  pullRequest: await read('.github/PULL_REQUEST_TEMPLATE.md'),
  ci: await read('.github/workflows/ci.yml'),
  packageJson: await read('package.json'),
  app: await read('src/App.tsx'),
  snapGrid: await read('src/snapGrid.ts'),
}

const packageData = JSON.parse(files.packageJson)

if (packageData.license !== 'SEE LICENSE IN LICENSE') {
  failures.push('package.json must point to the repository LICENSE file')
}

if (packageData.private !== true) {
  failures.push('package.json must remain private until an explicit package publishing decision')
}

if (packageData.scripts?.['release:dry-run:evidence'] !== 'node scripts/generate-release-dry-run-evidence.mjs') {
  failures.push('package.json must keep release:dry-run:evidence alias')
}

if (!packageData.scripts?.check?.includes('npm run verify:snap-grid')) {
  failures.push('package.json check script must include verify:snap-grid')
}

if (!packageData.scripts?.['verify:snap-grid']?.includes('scripts/verify-snap-grid.ts')) {
  failures.push('package.json must keep verify:snap-grid alias')
}

requireIncludes('README.md', files.readme, [
  '[CONTRIBUTING.md](CONTRIBUTING.md)',
  '[SECURITY.md](SECURITY.md)',
  '[docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md)',
  '[examples/](examples/)',
  '[open/export/save walkthrough](examples/WALKTHROUGH.md)',
  '[docs/RENDERED_QA.md](docs/RENDERED_QA.md)',
  '[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)',
  '[COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md)',
  '[NOTICE.md](NOTICE.md)',
  'npm run verify:examples',
  'source-available',
  'PolyForm Noncommercial License 1.0.0',
  'Commercial use requires a separate written license',
  'TWO HANDS NETWORK LTD',
  'local-first',
  'npm run verify:import-smoke',
  'snap-to-grid drag/resize',
  'Deterministic snap-grid proof',
  'npm run verify:snap-grid',
  'SaaS replacement map',
  'release review boards',
])

requireIncludes('ROADMAP.md', files.roadmap, [
  'Mapsmith Roadmap',
  'source-available',
  'SaaS replacement',
  'release review',
  'snap-to-grid movement and resizing',
  'demo-safe example diagrams',
  'No account requirement',
])

requireIncludes('LICENSE', files.license, [
  'PolyForm Noncommercial License 1.0.0',
  'Required Notice: Copyright (c) 2026 TWO HANDS NETWORK LTD.',
  'personal and non-commercial use',
  'commercial AI coding/agent products',
  'Any noncommercial purpose is a permitted purpose.',
  'Contact us',
  'Glyn : glyn@twohandsnetwork.co.uk',
])

requireIncludes('COMMERCIAL-LICENSE.md', files.commercialLicense, [
  'Commercial Licensing',
  'PolyForm Noncommercial License 1.0.0',
  'TWO HANDS NETWORK LTD',
  'Contact the COO',
  'commercial AI system',
  'No commercial license is granted unless agreed in writing',
])

requireIncludes('NOTICE.md', files.notice, [
  'mapsmith Notice',
  'source-available software, not open-source software',
  'TWO HANDS NETWORK LTD',
  'PolyForm Noncommercial License 1.0.0',
  'non-commercial use',
  'Commercial use requires a separate written license',
])

requireIncludes('docs/ARCHITECTURE.md', files.architecture, [
  'Mapsmith Architecture',
  'source-available for personal and non-commercial use',
  'PolyForm Noncommercial License 1.0.0',
  'TWO HANDS NETWORK LTD',
  'src/App.tsx',
  'src/boardFile.ts',
  'src/connectorRouting.ts',
  'src/svgExport.ts',
  'src/snapGrid.ts',
  'Board Model',
  'Editor State',
  'Canvas Interactions',
  'orthogonal routed connector paths',
  'snap-to-grid creation, dragging, and resizing',
  'snap-grid proof',
  'local editor preference only',
  'does not change the board schema',
  'Local Persistence',
  'npm run check',
  'RENDERED_QA.md',
])

requireIncludes('src/App.tsx', files.app, [
  'Licence and contact',
  'DOWNLOAD_QA_ATTRIBUTE',
  'DOWNLOAD_QA_STORAGE_KEY',
  'qa-downloads',
  'PolyForm',
  'TWO HANDS NETWORK LTD',
  'glyn@twohandsnetwork.co.uk',
  'COMMERCIAL-LICENSE.md',
  'NOTICE.md',
  'Personal/non-commercial use. Commercial license: TWO HANDS NETWORK LTD',
  'SNAP_SIZE',
  'snapToGrid',
  'SaaS replacement map',
  'Release review board',
])

requireIncludes('src/snapGrid.ts', files.snapGrid, [
  'SNAP_SIZE',
  'snapValue',
  'snapPoint',
  'snapNodePosition',
  'snapNodeFrame',
  'getMinNodeSize',
])

requireIncludes('scripts/verify-snap-grid.ts', files.snapGridVerifier, [
  'Snap grid proof passed',
  'negative x coordinates snap to the nearest grid line',
  'text frame respects minimum width',
  'snap helpers must not mutate input nodes',
])

requireIncludes('CONTRIBUTING.md', files.contributing, [
  'public-safe',
  'Do not commit private diagrams',
  'npm run check',
  'npm run verify:board',
  'npm run verify:svg',
])

requireIncludes('SECURITY.md', files.security, [
  'Reporting a Vulnerability',
  'avoid posting sensitive exploit details',
  'private diagrams',
  'tokens',
  'passwords',
])

requireIncludes('docs/RELEASE_CHECKLIST.md', files.releaseChecklist, [
  'Do not publish a release',
  'RELEASE_DRY_RUN_EVIDENCE.md',
  'npm run release:dry-run:evidence',
  'npm run check',
  'npm run verify:examples',
  'npm run verify:public',
  'npm run verify:snap-grid',
  'npm audit --omit=dev',
  'GitHub CI URL is recorded in the dry-run evidence.',
  'Rendered smoke from [RENDERED_QA.md](RENDERED_QA.md)',
  'LICENSE, NOTICE.md, and COMMERCIAL-LICENSE.md',
  'TWO HANDS NETWORK LTD',
  'package.json` remains `private: true',
  'No public release, package publish, or asset upload',
  'examples/portable-flow.mapsmith',
  'checked open/export/save walkthrough',
  'Snap-grid proof remains synthetic and deterministic.',
  'CI is green on `main`',
  'release readiness issue template',
  'Release notes do not mention private branches',
])

requireIncludes('docs/RENDERED_QA.md', files.renderedQa, [
  'Rendered QA',
  'app loads -> first meaningful editor screen renders -> primary visible controls respond without runtime errors',
  'D:\\Codex\\revenge-tour\\mapsmith\\node_modules\\.tmp\\rendered-qa',
  '?qa-downloads',
  'data-mapsmith-download-qa-records',
  'mapsmith-download-qa-records',
  'Desktop Smoke',
  'Mobile Smoke',
  'Keys',
  '390 x 760',
  'no relevant errors or warnings',
  'side panels scroll inside the workspace row',
])

requireIncludes('docs/RELEASE_DRY_RUN_EVIDENCE.md', files.releaseDryRun, [
  'Release Dry-Run Evidence',
  'filling it out does not create a release',
  'npm run release:dry-run:evidence',
  'GitHub CI URL:',
  '`npm run verify:examples`',
  '`npm run verify:public`',
  '`npm run verify:snap-grid`',
  '`npm audit --omit=dev`',
  '`npm run check`',
  'examples/portable-flow.mapsmith',
  'Snap-grid proof uses synthetic node data only.',
  'SVG/export proof contains only synthetic labels.',
  'no private paths, secrets, credentials, tokens, private URLs, or real customer diagrams',
  'No public release was created.',
  'No release assets were uploaded.',
  'No git tag was created.',
  'No package was published.',
  '`package.json` remains `private: true`.',
])

requireIncludes('scripts/generate-release-dry-run-evidence.mjs', files.releaseDryRunGenerator, [
  'Release Dry-Run Evidence',
  'npm run release:dry-run:evidence',
  'GitHub CI URL: <paste GitHub Actions run URL>',
  '\\`npm run verify:examples\\`',
  '\\`npm run verify:public\\`',
  '\\`npm run verify:snap-grid\\`',
  '\\`npm audit --omit=dev\\`',
  '\\`npm run check\\`',
  'examples/portable-flow.mapsmith',
  'Snap-grid proof uses synthetic node data only.',
  'SVG/export proof contains only synthetic labels.',
  'no private paths, secrets, credentials, tokens, private URLs, or real customer diagrams',
  'No public release was created.',
  'No release assets were uploaded.',
  'No git tag was created.',
  'No package was published.',
  '\\`package.json\\` remains \\`private: true\\`.',
])

requireIncludes('bug issue template', files.bugIssue, [
  'name: Bug report',
  'public-safe',
  'credentials',
  'Steps to reproduce',
  'Public-safe screenshots or files',
])

requireIncludes('export/import issue template', files.exportIssue, [
  'name: Export or import issue',
  'Save .mapsmith',
  'Export SVG',
  'Export PNG',
  'demo-safe',
  'npm run verify:board',
])

requireIncludes('release readiness issue template', files.releaseIssue, [
  'name: Release readiness review',
  'No public release has been created.',
  'No package has been published.',
  '`package.json` remains `private: true`.',
  '`npm run check` passes.',
  '`npm run verify:examples` passes.',
  '`npm run verify:public` passes.',
  '`npm audit --omit=dev` reports no vulnerabilities.',
  'examples/portable-flow.mapsmith',
  'SVG/export proof material contains no private paths, secrets, or real customer diagrams.',
])

requireIncludes('issue template config', files.issueConfig, [
  'blank_issues_enabled: true',
  'ROADMAP.md',
])

requireIncludes('pull request template', files.pullRequest, [
  'Public-Safe Check',
  'npm run check',
  'npm audit --omit=dev',
  'Rendered QA',
])

requireIncludes('CI workflow', files.ci, ['npm run check'])

const forbiddenGeneratedContent = ['gho_', 'AKIA', 'BEGIN PRIVATE KEY']
for (const [label, text] of Object.entries(files)) {
  for (const forbidden of forbiddenGeneratedContent) {
    if (text.includes(forbidden)) {
      failures.push(`${label} contains forbidden secret-looking text: ${forbidden}`)
    }
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log('Public project readiness docs passed')
