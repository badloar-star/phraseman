# Kimi K3 Delivery Contract

## 1. Canonical delivery root

Package all output under:

```text
kimi-delivery/learning-v2-frontend/<YYYYMMDD-HHMM>-<short-run-id>/
```

Return a ZIP archive preserving this root. Do not return only chat code blocks.

## 2. Required structure

```text
delivery-manifest.json
README.md
source/
  package.json
  src/
  public/
design/
  design-tokens.json
  component-inventory.json
  decisions.md
fixtures/
  fixture-index.json
  states/
qa/
  accessibility-report.json
  responsive-report.json
  prohibited-action-audit.json
  browser-test-report.json
screenshots/
  contact-sheets/
  mobile/
  admin/
videos/
handoff/
  codex-import-map.json
  file-sha256.json
  known-limitations.md
```

## 3. Manifest contract

`delivery-manifest.json` must contain:

```json
{
  "schemaVersion": "phraseman-kimi-frontend-delivery.v1",
  "runId": "YYYYMMDD-HHMM-short-id",
  "createdAt": "ISO-8601",
  "model": "Kimi K3",
  "inputs": [
    {
      "path": "repository-relative input path",
      "sha256": "64 lowercase hex or unavailable"
    }
  ],
  "localRun": {
    "workingDirectory": "source",
    "installCommand": "npm install",
    "runCommand": "npm run dev",
    "expectedUrl": "http://localhost:PORT"
  },
  "shareUrl": null,
  "surfaces": [],
  "states": [
    "prompt",
    "active",
    "processing",
    "success",
    "needs_work",
    "recovery"
  ],
  "conditions": [],
  "filesManifest": "handoff/file-sha256.json",
  "codexImportMap": "handoff/codex-import-map.json",
  "screenshotsRoot": "screenshots",
  "videosRoot": "videos",
  "prohibitedActionsPassed": true,
  "knownLimitations": "handoff/known-limitations.md"
}
```

## 4. Codex import map

For every component provide:

- Kimi source path;
- intended Phraseman presentation destination;
- required view-model fields;
- emitted intents;
- local presentation state;
- dependencies;
- asset paths/licences;
- responsive/accessibility notes;
- whether it is mobile, Admin or shared visual reference;
- explicit statement that no business logic is included.

Codex may reject or rewrite any component that violates the frozen port.

## 5. Screenshot and browser evidence

Every screenshot entry records:

- surface ID;
- state;
- conditions;
- viewport;
- theme;
- text scale;
- locale/script;
- source revision;
- file SHA-256;
- what the screenshot proves.

Contact sheets must not hide recovery, large-text, dark-mode or RTL failures.

Videos cover:

- primary interaction;
- processing/result transition;
- recovery;
- reduced-motion alternative;
- representative Chinese/Japanese script interaction;
- representative Admin generation/review flow.

## 6. Prohibited-action audit

The audit must report zero:

- Firebase/Firestore/Functions imports;
- production credentials or URLs;
- auth/payment/access logic;
- progress/evidence/star/mastery writes;
- direct analytics/provider calls;
- generated API keys or secrets;
- legacy Admin modifications;
- copied competitor assets/trade dress;
- unlicensed fonts/assets;
- white-on-lime violations;
- hardcoded episode or policy truth in presentation.

## 7. Acceptance

The package is acceptable for Codex review only when:

- local preview starts from documented commands;
- all required surfaces are navigable;
- all six states exist where applicable;
- responsive, dark, large-text, reduced-motion and RTL evidence is present;
- manifest and SHA files cover every delivery file;
- design decisions and limitations are explicit;
- no source outside the delivery root was changed;
- no deployment is required to inspect the result.

