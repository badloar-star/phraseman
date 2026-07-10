# Text Integrity Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the enforceable Text Integrity foundation: a stable unsafe-site inventory, a CI ratchet, semantic text primitives, privacy-safe development diagnostics, and one production pilot migration on Daily Challenges.

**Architecture:** TypeScript AST scanning freezes the current unsafe baseline and rejects every new raw truncation site. Four React Native semantic primitives own the approved flow, adaptive, scroll, and explicit-expansion behaviors. A development-only probe records geometry without persisting raw content. The Daily Challenges pilot proves the system on the user-reported card before broader domain plans begin.

**Tech Stack:** React Native, Expo Router, TypeScript, TypeScript compiler API, ESLint flat config, Jest, React Native Testing Library, AsyncStorage-free development diagnostics.

---

## Scope boundary

This plan implements Phase 0, Phase 1, and a Daily Challenges pilot from the approved design. It does not mass-migrate the remaining 142 files. After this foundation passes, create separate implementation plans for:

1. shared shell and navigation;
2. learning routes;
3. social and game routes;
4. onboarding, commerce, settings, and rare production routes;
5. residual closeout and zero-allowlist enforcement.

## File map

**Create**

- `scripts/text-integrity/inventory-core.cjs` — shared TypeScript/TSX AST scanner, canonical site identity, and stable fingerprints used by both CLI and ESLint.
- `scripts/text-integrity/inventory.mjs` — read-only audit and explicit baseline writer.
- `config/text-integrity-baseline.json` — generated legacy-site manifest.
- `tools/eslint-rules/no-unsafe-text-truncation.js` — local ESLint rule backed by the same baseline.
- `components/text-integrity/types.ts` — provenance and semantic mode types.
- `components/text-integrity/text_integrity_probe.ts` — privacy-safe development violation store.
- `components/text-integrity/use_text_integrity_probe.ts` — layout measurement hook.
- `components/text-integrity/FlowText.tsx` — unrestricted authored text.
- `components/text-integrity/AdaptiveLabel.tsx` — scaled label with wrap/reflow signaling.
- `components/text-integrity/ScrollableTextRegion.tsx` — bounded readable body with fixed external actions.
- `components/text-integrity/ExpandableText.tsx` — explicit full reveal for unbounded user/external values.
- `components/text-integrity/index.ts` — public exports.
- `components/daily-tasks/DailyTaskCard.tsx` — testable extraction of the existing mapped task-card renderer; behavior and visuals remain intact.
- `tests/text_integrity_inventory.test.ts` — scanner and baseline ratchet.
- `tests/text_integrity_eslint_rule.test.ts` — rule behavior.
- `tests/text_integrity_primitives.test.tsx` — primitive rendering and accessibility.
- `tests/text_integrity_probe.test.ts` — geometry, privacy, and session-salted fingerprints.
- `tests/daily_tasks_text_integrity_contract.test.ts` — Daily Challenges pilot regression.
- `tests/daily_tasks_text_integrity_render.test.tsx` — rendered task/bonus states and geometry.

**Modify**

- `package.json` — audit scripts.
- `eslint.config.js` — local plugin and rule configuration.
- `app/daily_tasks_screen.tsx` — replace capped Daily Challenges title/description/bonus text in the pilot surface.
- `docs/superpowers/specs/2026-07-10-text-integrity-design.md` — add implementation links only after the foundation lands.

## Task 1: Build the read-only AST inventory and shared structural identity

**Files:**

- Create: `scripts/text-integrity/inventory-core.cjs`
- Create: `scripts/text-integrity/inventory.mjs`
- Test: `tests/text_integrity_inventory.test.ts`

- [ ] **Step 1: Write the failing scanner and identity-parity tests**

Create fixtures in the test's temporary directory only; do not write fixtures into source folders.

```ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('text integrity inventory', () => {
  it('finds raw caps, ellipsis modes, and disabled font scaling', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'text-integrity-'));
    fs.writeFileSync(path.join(root, 'sample.tsx'), `
      import { Text } from 'react-native';
      export const Sample = () => <>
        <Text numberOfLines={1}>Title</Text>
        <Text ellipsizeMode="tail">Body</Text>
        <Text allowFontScaling={false}>Label</Text>
      </>;
    `);
    const { scanTextIntegrity } = require('../scripts/text-integrity/inventory-core.cjs');
    const sites = scanTextIntegrity(root, ['sample.tsx']);
    expect(sites.map((site: { kind: string }) => site.kind).sort()).toEqual([
      'allow-font-scaling-false',
      'ellipsize-mode',
      'number-of-lines',
    ]);
    expect(new Set(sites.map((group: { fingerprint: string }) => group.fingerprint)).size).toBe(3);
  });

  it('does not treat approved primitives as unsafe raw sites', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'text-integrity-'));
    fs.writeFileSync(path.join(root, 'sample.tsx'), `
      import { ExpandableText } from './components/text-integrity';
      export const Sample = () => <ExpandableText text="Full text" provenance="user" />;
    `);
    const { scanTextIntegrity } = require('../scripts/text-integrity/inventory-core.cjs');
    expect(scanTextIntegrity(root, ['sample.tsx'])).toEqual([]);
  });

  it('extracts identical identities through TypeScript and ESLint AST adapters', () => {
    // Parse the same fixture through scanTextIntegrity() and ESLint Linter.
    // Capture structuralIdentityFromEslint() from the rule adapter and compare every
    // group key/count to the scanner result. Include duplicate matching Text sites
    // in one owner, a nested named component, reordering/removal, and unrelated styles.
  });

  it('finds caps on project wrappers and a wrapper forwarding a cap to Text', () => {
    // Fixture covers <ProjectText numberOfLines={1}> and a wrapper that forwards
    // numberOfLines/ellipsizeMode to a native Text node. Both must be unsafe.
  });

  it('keeps a duplicate group stable when siblings reorder or one is removed', () => {
    // Reordering keeps the same group fingerprint/count. Removing one keeps the same
    // fingerprint and decrements count; it never renumbers or transfers metadata.
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```powershell
npx jest tests/text_integrity_inventory.test.ts --runInBand
```

Expected: FAIL because `inventory-core.cjs` does not exist.

- [ ] **Step 3: Implement one canonical structural identity and the scanner core**

Use the TypeScript compiler API already present in the workspace. Export deterministic pure functions; do not write from the core module. Model indistinguishable duplicates as a collision group, never as occurrence-numbered records. A group key includes normalized file, nearest named function/component, JSX ancestor tag-name path without sibling indexes, normalized tag, unsafe prop/value, and an already-existing stable `testID` expression when present. It excludes line numbers, child text, style values, unrelated props, and sibling order. The scanner aggregates `count` and non-identity `lineHints` per group. Reordering is a no-op; removal decrements count; addition increments count. Indistinguishable duplicates share classification and must migrate together. Normalize paths/tag aliases in the same core used by CLI and ESLint.

```js
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const UNSAFE = new Map([
  ['numberOfLines', 'number-of-lines'],
  ['ellipsizeMode', 'ellipsize-mode'],
  ['allowFontScaling', 'allow-font-scaling-false'],
]);

function isFalseJsxValue(initializer) {
  return Boolean(
    initializer
    && ts.isJsxExpression(initializer)
    && initializer.expression
    && initializer.expression.kind === ts.SyntaxKind.FalseKeyword,
  );
}

function canonicalGroup({ file, ownerPath, ancestorTags, tag, prop, unsafeValue, stableTestID }) {
  return {
    file: file.replace(/\\/g, '/'),
    ownerPath,
    ancestorTags,
    tag,
    kind: UNSAFE.get(prop),
    prop,
    unsafeValue,
    stableTestID: stableTestID ?? null,
  };
}

function fingerprintGroup(group) {
  return crypto
    .createHash('sha256')
    .update(`${group.file}\n${group.ownerPath}\n${group.ancestorTags.join('/')}\n${group.tag}\n${group.kind}\n${group.prop}\n${group.unsafeValue}\n${group.stableTestID ?? ''}`)
    .digest('hex');
}

function addToCollisionGroup(groups, group, lineHint) {
  const fingerprint = fingerprintGroup(group);
  const existing = groups.find((item) => item.fingerprint === fingerprint);
  if (existing) {
    existing.count += 1;
    existing.lineHints.push(lineHint);
    return;
  }
  groups.push({ ...group, fingerprint, count: 1, lineHints: [lineHint] });
}

function scanTextIntegrity(root, relativeFiles) {
  const sites = [];
  for (const relativeFile of relativeFiles) {
    const absolute = path.join(root, relativeFile);
    const source = fs.readFileSync(absolute, 'utf8');
    const sourceFile = ts.createSourceFile(
      absolute,
      source,
      ts.ScriptTarget.Latest,
      true,
      relativeFile.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const visit = (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(sourceFile);
        for (const property of node.attributes.properties) {
          if (!ts.isJsxAttribute(property)) continue;
          const prop = property.name.getText(sourceFile);
          const kind = UNSAFE.get(prop);
          if (!kind) continue;
          if (prop === 'allowFontScaling' && !isFalseJsxValue(property.initializer)) continue;
          const start = sourceFile.getLineAndCharacterOfPosition(property.getStart(sourceFile));
          const group = canonicalGroup(buildStructuralGroup(relativeFile, sourceFile, node, property));
          addToCollisionGroup(sites, group, start.line + 1);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return sites.sort((a, b) => a.file.localeCompare(b.file) || a.ownerPath.localeCompare(b.ownerPath) || a.prop.localeCompare(b.prop));
}

module.exports = {
  canonicalGroup,
  collectProductionFiles,
  fingerprintGroup,
  scanTextIntegrity,
  structuralIdentityFromEslint,
};
```

The scanner must inspect every JSX tag, including project wrappers, not only native `Text`. Add an AST check for newly created wrappers that accept or forward truncation props to native/project text. Keep a narrow reviewed exemption mechanism for proven non-user-visible glyph/canvas cases; exemptions live in the classified baseline, not inline disable comments.

- [ ] **Step 4: Implement the read-only CLI**

The CLI prints a short summary by default. It loads the CommonJS core through `createRequire` so the scanner and ESLint use the exact same code.

```js
import process from 'node:process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { collectProductionFiles, scanTextIntegrity } = require('./inventory-core.cjs');

const ROOT = process.cwd();
const files = collectProductionFiles(ROOT);
const sites = scanTextIntegrity(ROOT, files);
process.stdout.write(`${JSON.stringify({
  baselineStatus: 'missing',
  files: files.length,
  unsafeSites: sites.length,
})}\n`);
```

At this stage the baseline is intentionally absent, so the read-only command reports `baselineStatus: "missing"` without writing or claiming enforcement. Task 2 adds and tests `auditAgainstBaseline`, updates this CLI to call it, and introduces explicit bootstrap/shrink-only modes. Once a baseline exists, the default audit requires exact group/count equality.

- [ ] **Step 5: Run the focused tests and audit**

Run:

```powershell
npx jest tests/text_integrity_inventory.test.ts --runInBand
node scripts/text-integrity/inventory.mjs
```

Expected: tests PASS; audit prints JSON with a non-zero `unsafeSites` count and does not modify the worktree.

- [ ] **Step 6: Commit the scanner**

```powershell
git add scripts/text-integrity/inventory-core.cjs scripts/text-integrity/inventory.mjs tests/text_integrity_inventory.test.ts
git commit -m "test: inventory unsafe text truncation sites"
```

## Task 2: Freeze a classified baseline and add a fail-closed CI ratchet

**Files:**

- Create: `config/text-integrity-baseline.json`
- Modify: `package.json`
- Modify: `tests/text_integrity_inventory.test.ts`

- [ ] **Step 1: Add failing audit, bootstrap, and shrink-only tests**

Extend the test to scan production roots and compare fingerprints against the committed manifest.

```ts
it('requires exact current-to-baseline group equality', () => {
  const root = path.join(__dirname, '..');
  const baseline = JSON.parse(
    fs.readFileSync(path.join(root, 'config/text-integrity-baseline.json'), 'utf8'),
  ) as { sites: Array<{ fingerprint: string }> };
  const { auditAgainstBaseline, collectProductionFiles, scanTextIntegrity } = require(
    '../scripts/text-integrity/inventory-core.cjs'
  );
  const current = scanTextIntegrity(root, collectProductionFiles(root));
  expect(auditAgainstBaseline(root, current)).toMatchObject({
    added: [], removed: [], countIncreased: [], countDecreased: [], ok: true,
  });
});

it('refuses to update a baseline when the scan contains a new group or count increase', () => {
  // Build a temp classified baseline and a scan containing one additional site.
  // Expect updateBaselineShrinkOnly(...) to throw and leave the file byte-identical.
});

it('preserves classification metadata while removing resolved sites', () => {
  // Surviving records retain intendedMode, owner, reason, expiryMilestone, and exception metadata.
});

it('fails audit on a stale removed group or decreased duplicate count', () => {
  // Prevents a deleted truncation permission from remaining available for resurrection.
});
```

Every baseline record is required to contain:

```ts
type BaselineRecord = TextIntegritySite & {
  intendedMode: 'flow' | 'adaptive' | 'scroll' | 'expand' | 'non-text' | 'temporary-exception';
  owner: string;
  reason: string;
  expiryMilestone: string;
  exception?: {
    approvedBy: string;
    scope: string;
  };
};
```

Schema validation fails closed on missing or empty classification metadata. `temporary-exception` is not a semantic text mode: it marks a reviewed deferral and requires the `exception` object; other records must not use that object. `non-text` is limited to proven decorative/canvas/glyph cases. Authored/localized/remote instructional copy maps to `flow`, bounded controls to `adaptive`, bounded long reading areas to `scroll`, and only unbounded user/external values to `expand`.

Implement and export `loadAndValidateBaseline`, `auditAgainstBaseline`, `bootstrapBaseline`, and `updateBaselineShrinkOnly` from `inventory-core.cjs`. The CLI is only an argument/exit-code adapter around these tested functions; it must not contain a second comparison or fingerprint implementation.

- [ ] **Step 2: Verify RED**

Run:

```powershell
npx jest tests/text_integrity_inventory.test.ts --runInBand
```

Expected: FAIL because the classified baseline and update functions do not exist.

- [ ] **Step 3: Implement one-time bootstrap and classify it before commit**

Run:

```powershell
node scripts/text-integrity/inventory.mjs --bootstrap-baseline
```

`--bootstrap-baseline` refuses to run if the manifest already exists. It emits records with empty classification fields only during this one local bootstrap step; tests and default audit reject empty fields. Classify every record with intended mode, owner, reason, expiry milestone, and exception metadata when applicable before committing. The manifest includes structural identity and line hints but never JSX child text, prop values containing copy, names, messages, or server content.

Implement `--update-baseline` as shrink-only: it may remove absent groups, decrease duplicate counts, and refresh line hints for surviving groups. It must abort before writing on a new group or increased count. Preserve classification metadata byte-for-byte for surviving groups.

Replace Task 1's temporary `baselineStatus: "missing"` CLI branch: default mode now calls `loadAndValidateBaseline` and `auditAgainstBaseline`, prints new/removed groups and increased/decreased counts, and exits non-zero for any difference or invalid metadata. This exact-equality rule forces developers to run and review the shrink-only updater after a legitimate removal, so stale permissions cannot survive. `--bootstrap-baseline` and `--update-baseline` dispatch only to their tested core functions.

- [ ] **Step 4: Add package scripts**

Add:

```json
{
  "scripts": {
    "text-integrity:audit": "node scripts/text-integrity/inventory.mjs",
    "text-integrity:update-baseline": "node scripts/text-integrity/inventory.mjs --update-baseline"
  }
}
```

Do not expose bootstrap as an ordinary package script and never run baseline writers from tests or CI. The default audit validates schema/classification and requires exact group/count equality; additions, removals, count changes, or malformed metadata all fail. The explicit update command accepts only removals/count decreases and refuses additions/count increases.

- [ ] **Step 5: Verify GREEN and no accidental writes**

Run:

```powershell
npx jest tests/text_integrity_inventory.test.ts --runInBand
npm run text-integrity:audit
git diff --check -- config/text-integrity-baseline.json package.json
```

Expected: PASS; the audit does not change the manifest. Add a CLI subprocess test proving a new fixture exits non-zero, and a checksum assertion proving failed update leaves the manifest unchanged.

- [ ] **Step 6: Commit the ratchet**

```powershell
git add config/text-integrity-baseline.json package.json tests/text_integrity_inventory.test.ts scripts/text-integrity/inventory-core.cjs scripts/text-integrity/inventory.mjs
git commit -m "ci: freeze text integrity baseline"
```

## Task 3: Add the local ESLint rule

**Files:**

- Create: `tools/eslint-rules/no-unsafe-text-truncation.js`
- Modify: `eslint.config.js`
- Test: `tests/text_integrity_eslint_rule.test.ts`

- [ ] **Step 1: Write failing rule tests**

Use ESLint's `Linter` API with flat configuration.

```ts
import { Linter } from 'eslint';
import rule from '../tools/eslint-rules/no-unsafe-text-truncation';

const linter = new Linter({ configType: 'flat' });
const config = [{
  languageOptions: { parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } } },
  plugins: { 'text-integrity': { rules: { 'no-unsafe-text-truncation': rule } } },
  rules: { 'text-integrity/no-unsafe-text-truncation': 'error' },
}];

test('rejects a new raw line cap', () => {
  const messages = linter.verify('<Text numberOfLines={1}>Title</Text>', config, { filename: 'new.tsx' });
  expect(messages.map((message) => message.ruleId)).toContain('text-integrity/no-unsafe-text-truncation');
});

test('accepts the semantic primitive', () => {
  const messages = linter.verify('<FlowText>Full title</FlowText>', config, { filename: 'new.tsx' });
  expect(messages).toEqual([]);
});
```

- [ ] **Step 2: Verify RED**

```powershell
npx jest tests/text_integrity_eslint_rule.test.ts --runInBand
```

Expected: FAIL because the rule does not exist.

- [ ] **Step 3: Implement the rule with the shared structural identity**

The rule reads only the manifest and source node. It tracks how many sites it has seen in each stable collision group and reports when a group is absent or its observed count exceeds the allowed baseline count. It never reads or logs JSX child text. Decreases/removals are enforced by the full inventory audit because ESLint file-level runs may not see the entire project.

```js
const fs = require('node:fs');
const path = require('node:path');
const { fingerprintGroup, structuralIdentityFromEslint } = require('../../scripts/text-integrity/inventory-core.cjs');

const baselinePath = path.join(process.cwd(), 'config/text-integrity-baseline.json');
const allowedCounts = new Map(
  JSON.parse(fs.readFileSync(baselinePath, 'utf8')).sites.map((group) => [group.fingerprint, group.count]),
);

module.exports = {
  meta: { type: 'problem', schema: [], messages: { unsafe: 'Use a Text Integrity semantic primitive instead of {{prop}}.' } },
  create(context) {
    const seenCounts = new Map();
    return {
      JSXOpeningElement(node) {
        const tag = context.sourceCode.getText(node.name);
        const relative = path.relative(process.cwd(), context.getFilename()).split(path.sep).join('/');
        for (const attribute of node.attributes) {
          if (attribute.type !== 'JSXAttribute') continue;
          const prop = attribute.name.name;
          const kind = prop === 'numberOfLines'
            ? 'number-of-lines'
            : prop === 'ellipsizeMode'
              ? 'ellipsize-mode'
              : prop === 'allowFontScaling'
                ? 'allow-font-scaling-false'
                : null;
          if (!kind) continue;
          const site = structuralIdentityFromEslint(context, node, attribute, relative);
          if (!site) continue; // adapter returns null unless allowFontScaling is the boolean false AST value
          const fingerprint = fingerprintGroup(site);
          const seen = (seenCounts.get(fingerprint) ?? 0) + 1;
          seenCounts.set(fingerprint, seen);
          if (seen > (allowedCounts.get(fingerprint) ?? 0)) {
            context.report({ node: attribute, messageId: 'unsafe', data: { prop } });
          }
        }
      },
    };
  },
};
```

The rule applies to native text, `Animated.Text`, and every project wrapper because it inspects truncation props on all JSX elements. Add rule tests for `ProjectText numberOfLines`, `allowFontScaling={ false }`, a new wrapper forwarding a forbidden prop, and a duplicate group exceeding its allowed count. The extractor-parity test parses the same fixture through TypeScript and ESLint adapters and compares group identity/fingerprint/count, including reordered duplicates and nested owners. Inline ESLint disables are not an accepted bypass; reviewed non-text exceptions must be classified in the baseline.

- [ ] **Step 4: Register the local plugin**

Update `eslint.config.js`:

```js
const textIntegrityRule = require('./tools/eslint-rules/no-unsafe-text-truncation');

module.exports = defineConfig([
  expoConfig,
  {
    plugins: {
      'text-integrity': {
        rules: { 'no-unsafe-text-truncation': textIntegrityRule },
      },
    },
    rules: {
      'text-integrity/no-unsafe-text-truncation': 'error',
    },
    ignores: ['dist/*'],
  },
]);
```

- [ ] **Step 5: Verify the rule**

```powershell
npx jest tests/text_integrity_eslint_rule.test.ts tests/text_integrity_inventory.test.ts --runInBand
npx eslint components/ClozeGapText.tsx
```

Expected: PASS and no new baseline violations.

- [ ] **Step 6: Commit the lint enforcement**

```powershell
git add tools/eslint-rules/no-unsafe-text-truncation.js eslint.config.js tests/text_integrity_eslint_rule.test.ts
git commit -m "ci: reject new unsafe text truncation"
```

## Task 4: Implement the privacy-safe development probe

**Files:**

- Create: `components/text-integrity/types.ts`
- Create: `components/text-integrity/text_integrity_probe.ts`
- Create: `components/text-integrity/use_text_integrity_probe.ts`
- Test: `tests/text_integrity_probe.test.ts`

- [ ] **Step 1: Write failing pure probe tests**

```ts
import {
  beginTextIntegritySession,
  inspectTextIntegrityMeasurement,
} from '../components/text-integrity/text_integrity_probe';

test('reports local clipping without retaining raw content', async () => {
  const session = beginTextIntegritySession('test-salt');
  const result = await inspectTextIntegrityMeasurement(session, {
    route: '/daily_tasks_screen',
    testID: 'daily-task-description',
    locale: 'ru',
    fontScale: 2,
    semanticMode: 'flow',
    provenance: 'authored',
    rawText: 'Private long user-visible copy',
    window: { width: 320, height: 640 },
    intrinsicText: { height: 72, maxLineWidth: 220, lineCount: 3, visibleLineCount: 2, hasNativeTruncation: true },
    hostBounds: { x: 0, y: 0, width: 220, height: 48 },
    viewport: { x: 0, y: 0, width: 320, height: 640 },
    safeAreaViewport: { x: 0, y: 24, width: 320, height: 592 },
    actionBounds: { x: 16, y: 580, width: 288, height: 44 },
  });
  expect(result?.kind).toBe('local-clipping');
  expect(JSON.stringify(result)).not.toContain('Private long user-visible copy');
  expect(result?.contentLength).toBe(30);
});

test('uses a session-salted fingerprint', async () => {
  const input = {
    route: '/profile', testID: 'display-name', provenance: 'user' as const,
    locale: 'ru' as const, fontScale: 2, semanticMode: 'flow' as const,
    rawText: 'Natalia',
    window: { width: 320, height: 640 },
    intrinsicText: { height: 20, maxLineWidth: 40, lineCount: 1, visibleLineCount: 1, hasNativeTruncation: false },
    hostBounds: { x: 0, y: 0, width: 80, height: 10 },
    viewport: { x: 0, y: 0, width: 320, height: 640 },
    safeAreaViewport: { x: 0, y: 24, width: 320, height: 592 },
    actionBounds: undefined,
  };
  expect((await inspectTextIntegrityMeasurement(beginTextIntegritySession('a'), input))?.contentHash)
    .not.toBe((await inspectTextIntegrityMeasurement(beginTextIntegritySession('b'), input))?.contentHash);
});

test('reports host or related action outside the safe-area viewport', async () => {
  // Assert `off-screen-host` and `off-screen-action` without storing raw text.
});

test('deduplicates repeats, bounds storage, and is a production no-op', async () => {
  // Same route/testID/hash/geometry records once; storage remains <= 200.
  // With devEnabled:false, measurement and recording allocate no diagnostic record.
});
```

- [ ] **Step 2: Verify RED**

```powershell
npx jest tests/text_integrity_probe.test.ts --runInBand
```

Expected: FAIL because the probe does not exist.

- [ ] **Step 3: Implement pure inspection and bounded storage**

Use an in-memory maximum of 200 deduplicated violations. Do not use AsyncStorage, Firestore, analytics, console output, timers, subscriptions, or persistent files. `TextIntegrityMeasurement` contains route, stable testID, locale, window width/height, font scale, semantic mode, provenance, text length/hash input, intrinsic text metrics, rendered host bounds, safe-area-adjusted viewport bounds, and optional related-action bounds. `TextIntegrityViolation` excludes `rawText` by construction.

```ts
import { createHash } from './text_integrity_hash';
import type { TextIntegrityMeasurement, TextIntegrityViolation } from './types';

const MAX_VIOLATIONS = 200;
const violations: TextIntegrityViolation[] = [];

export function beginTextIntegritySession(salt: string) {
  return { salt };
}

export async function inspectTextIntegrityMeasurement(
  session: { salt: string },
  measurement: TextIntegrityMeasurement,
): Promise<TextIntegrityViolation | null> {
  const clipped = measurement.intrinsicText.height > measurement.hostBounds.height + 1
    || measurement.intrinsicText.maxLineWidth > measurement.hostBounds.width + 1
    || measurement.intrinsicText.hasNativeTruncation
    || measurement.intrinsicText.visibleLineCount < measurement.intrinsicText.lineCount;
  const hostOffscreen = !contains(measurement.safeAreaViewport, measurement.hostBounds);
  const actionOffscreen = measurement.actionBounds
    ? !contains(measurement.safeAreaViewport, measurement.actionBounds)
    : false;
  if (!clipped && !hostOffscreen && !actionOffscreen) return null;
  return {
    kind: clipped ? 'local-clipping' : hostOffscreen ? 'off-screen-host' : 'off-screen-action',
    route: measurement.route,
    testID: measurement.testID,
    locale: measurement.locale,
    window: measurement.window,
    fontScale: measurement.fontScale,
    semanticMode: measurement.semanticMode,
    provenance: measurement.provenance,
    contentLength: measurement.rawText.length,
    contentHash: await createHash(`${session.salt}:${measurement.rawText}`).catch(() => undefined),
    intrinsicText: measurement.intrinsicText,
    hostBounds: measurement.hostBounds,
    viewport: measurement.viewport,
    safeAreaViewport: measurement.safeAreaViewport,
    actionBounds: measurement.actionBounds,
  };
}

export function recordTextIntegrityViolation(violation: TextIntegrityViolation): void {
  violations.push(violation);
  if (violations.length > MAX_VIOLATIONS) violations.splice(0, violations.length - MAX_VIOLATIONS);
}

export function readTextIntegrityViolations(): readonly TextIntegrityViolation[] {
  return [...violations];
}
```

Implement `text_integrity_hash.ts` with the already installed `expo-crypto` SHA-256 digest over a fresh in-memory session salt plus content. Its result is optional, diagnostics-only, and must never leave the device. The input string exists only for the awaited digest call and is never retained in the session object, violation record, logs, snapshots, or errors. If hashing fails, record no hash rather than falling back to raw content or a reversible value.

- [ ] **Step 4: Implement the measurement hook**

The hook preserves native `Text` layout. It consumes `onTextLayout` line metrics from the actual text node and an optional host/action registration supplied by the parent primitive or screen. It uses `measureInWindow` only when absolute host/action bounds are registered, folds safe-area insets into the usable viewport, and records after all requested measurements exist. It runs only under `__DEV__`; the exported production implementation is a stable no-op with no content hashing, measuring, storage, timers, or subscriptions.

```ts
export function useTextIntegrityProbe(input: {
  route: string;
  testID: string;
  locale: Lang;
  fontScale: number;
  semanticMode: TextSemanticMode;
  provenance: TextProvenance;
  text: string;
  hostRef?: RefObject<View>;
  actionRef?: RefObject<View>;
}) {
  const textRef = useRef<Text>(null);
  const onTextLayout = useCallback((event: NativeSyntheticEvent<TextLayoutEventData>) => {
    if (!__DEV__) return;
    registerIntrinsicLinesAndMeasureOptionalBounds(event.nativeEvent.lines, input);
  }, [input]);
  return { textRef, onTextLayout };
}
```

Add tests showing that a parent with `overflow: 'hidden'` and a smaller registered host is detected even though the native text node reports all lines, while an unregistered inline `FlowText` does not invent host clipping. Also test safe-area off-screen host/action detection, visible native truncation signals when line metrics show clipped content, deduplication, the 200-record cap, production no-op behavior, and absence of raw content in JSON. Cross-component/navigation off-screen failures remain E2E-harness responsibility when no host/action bounds were registered.

- [ ] **Step 5: Verify privacy and bounds behavior**

```powershell
npx jest tests/text_integrity_probe.test.ts --runInBand
npx eslint components/text-integrity/text_integrity_probe.ts components/text-integrity/use_text_integrity_probe.ts
```

Expected: PASS; the serialized violation never contains raw content.

- [ ] **Step 6: Commit the probe**

```powershell
git add components/text-integrity/types.ts components/text-integrity/text_integrity_hash.ts components/text-integrity/text_integrity_probe.ts components/text-integrity/use_text_integrity_probe.ts tests/text_integrity_probe.test.ts
git commit -m "feat: add privacy-safe text integrity probe"
```

## Task 5: Implement `FlowText` and `AdaptiveLabel`

**Files:**

- Create: `components/text-integrity/FlowText.tsx`
- Create: `components/text-integrity/AdaptiveLabel.tsx`
- Create: `components/text-integrity/index.ts`
- Test: `tests/text_integrity_primitives.test.tsx`

- [ ] **Step 1: Read the React Native Testing skill**

Read `C:/Users/badlo/.codex/skills/callstack-react-native-testing/SKILL.md` completely before writing component tests.

- [ ] **Step 2: Write failing component tests**

```tsx
import { render, screen } from '@testing-library/react-native';
import { AdaptiveLabel, FlowText } from '../components/text-integrity';

test('FlowText exposes complete authored copy without a line cap', () => {
  render(<FlowText testID="copy" provenance="authored">A complete long translation</FlowText>);
  const text = screen.getByTestId('copy');
  expect(text.props.children).toBe('A complete long translation');
  expect(text.props.numberOfLines).toBeUndefined();
  expect(text.props.ellipsizeMode).toBeUndefined();
  expect(text.props.allowFontScaling).not.toBe(false);
});

test('AdaptiveLabel requests reflow instead of shrinking below scaled minimum', () => {
  const onReflowNeeded = jest.fn();
  render(
    <AdaptiveLabel
      testID="cta"
      provenance="authored"
      minimumScaleRatio={0.8}
      availableWidth={180}
      onReflowNeeded={onReflowNeeded}
    >
      Continue the complete lesson
    </AdaptiveLabel>,
  );
  screen.getByTestId('cta').props.onTextLayout({ nativeEvent: { lines: [{ width: 500 }, { width: 500 }] } });
  expect(onReflowNeeded).toHaveBeenCalled();
});

test('AdaptiveLabel keeps its effective minimum above the 100% baseline at 200% font scale', () => {
  // Mock useWindowDimensions() with fontScale: 2.0. For base fontSize 16 and ratio
  // 0.8, assert the component's effective floor is 25.6px, never 16px or lower.
});
```

- [ ] **Step 3: Verify RED**

```powershell
npx jest tests/text_integrity_primitives.test.tsx --runInBand
```

Expected: FAIL because the primitives do not exist.

- [ ] **Step 4: Implement `FlowText`**

Forward standard Text props except the forbidden truncation props. `FlowText` must render a native `Text` directly—never an unconditional `View`—so inline nesting, flex behavior, inherited typography, press handling, accessibility grouping, and text selection remain native. The primitive reads the current locale from `useLang` in `components/LangContext.tsx`, route from Expo Router, and font scale/window dimensions from `useWindowDimensions`. Optional host/action refs may be supplied for block-level geometry registration; inline use records intrinsic line metrics only.

```tsx
type FlowTextProps = Omit<TextProps, 'numberOfLines' | 'ellipsizeMode' | 'allowFontScaling'> & {
  provenance: TextProvenance;
  testID: string;
};

export const FlowText = forwardRef<Text, FlowTextProps>(function FlowText(
  { children, onTextLayout, provenance, testID, integrityHostRef, integrityActionRef, ...props },
  forwardedRef,
) {
  const text = typeof children === 'string' ? children : '';
  const { lang } = useLang();
  const { fontScale, width, height } = useWindowDimensions();
  const probe = useTextIntegrityProbe({
    route: usePathname(), testID, locale: lang, fontScale,
    window: { width, height }, semanticMode: 'flow', provenance, text,
    hostRef: integrityHostRef, actionRef: integrityActionRef,
  });
  return (
    <Text
      {...props}
      ref={mergeRefs(forwardedRef, probe.textRef)}
      testID={testID}
      onTextLayout={(event) => { probe.onTextLayout(event); onTextLayout?.(event); }}
    >
      {children}
    </Text>
  );
});
```

Add a rendered test nesting `FlowText` inside another `Text`, a press-handler test, and a style/flex test to ensure no extra host node appears.

- [ ] **Step 5: Implement `AdaptiveLabel`**

Do not rely on `adjustsFontSizeToFit`: React Native behavior without a dependable line constraint is platform-dependent and can counteract Dynamic Type. `AdaptiveLabel` derives `fontScale` internally from `useWindowDimensions`, receives the measured available width from its owning control, and compares intrinsic line widths/line count against that width. It first permits normal wrapping; if the owning compact control cannot grow, it calls `onReflowNeeded` so the parent switches to a stacked/wider layout. Any future font shrinking must be a separately reviewed enhancement whose computed floor is `baseFontSize * systemFontScale * minimumScaleRatio` and therefore cannot reduce 200% text back to a 100% baseline.

```tsx
export function AdaptiveLabel({
  children,
  minimumScaleRatio = 0.8,
  availableWidth,
  onReflowNeeded,
  ...props
}: AdaptiveLabelProps) {
  const { fontScale } = useWindowDimensions();
  const safeRatio = Math.max(0.8, Math.min(1, minimumScaleRatio));
  const baseFontSize = StyleSheet.flatten(props.style)?.fontSize ?? DEFAULT_FONT_SIZE;
  const effectiveScaledFloor = baseFontSize * fontScale * safeRatio;
  const handleTextLayout = (event: NativeSyntheticEvent<TextLayoutEventData>) => {
    const widestLine = Math.max(0, ...event.nativeEvent.lines.map((line) => line.width));
    if (widestLine > availableWidth + 1 || event.nativeEvent.lines.length > 1) {
      onReflowNeeded?.();
    }
    props.onTextLayout?.(event);
  };
  return (
    <FlowText
      {...props}
      onTextLayout={handleTextLayout}
      integrityMetadata={{ effectiveScaledFloor }}
    >
      {children}
    </FlowText>
  );
}
```

Treat `integrityMetadata` above as development-only internal data, not a native `Text` prop. Tests cover font scales 1.0, 1.3, 2.0, and mocked platform maximum; they assert no `allowFontScaling={false}`, no line cap, no shrink-to-unscaled baseline, and a single stable reflow callback rather than a render loop.

- [ ] **Step 6: Verify GREEN**

```powershell
npx jest tests/text_integrity_primitives.test.tsx tests/text_integrity_probe.test.ts --runInBand
npx eslint components/text-integrity/FlowText.tsx components/text-integrity/AdaptiveLabel.tsx
```

Expected: PASS with zero new lint violations.

- [ ] **Step 7: Commit the first primitives**

```powershell
git add components/text-integrity/FlowText.tsx components/text-integrity/AdaptiveLabel.tsx components/text-integrity/index.ts tests/text_integrity_primitives.test.tsx
git commit -m "feat: add adaptive text primitives"
```

## Task 6: Implement scrollable and expandable modes

**Files:**

- Create: `components/text-integrity/ScrollableTextRegion.tsx`
- Create: `components/text-integrity/ExpandableText.tsx`
- Modify: `components/text-integrity/index.ts`
- Modify: `tests/text_integrity_primitives.test.tsx`

- [ ] **Step 1: Add failing tests**

```tsx
test('ScrollableTextRegion keeps actions outside its scroll body', () => {
  render(
    <ScrollableTextRegion
      testID="explanation"
      provenance="authored"
      text="Complete long explanation"
      footer={<Text testID="continue">Continue</Text>}
    />,
  );
  expect(screen.getByTestId('explanation-scroll')).toBeTruthy();
  expect(screen.getByTestId('continue').parent?.props.testID).toBe('explanation-footer');
});

test('ScrollableTextRegion derives body space from measured header and footer geometry', () => {
  // Mock a short landscape viewport plus safe areas; fire onLayout for shell/footer.
  // Assert the body remains scrollable and the footer remains inside the usable viewport.
});

test('ScrollableTextRegion coordinates nested scroll with a parent swipe gesture', () => {
  // Verify nestedScrollEnabled and parent gesture handoff at scroll boundaries.
});

test('ExpandableText uses an explicit reveal and full accessibility value', () => {
  renderWithLang('ru',
    <ExpandableText
      testID="chat-message"
      provenance="user"
      text="The complete unbounded message"
      previewCharacterBudget={12}
    />,
  );
  const value = screen.getByTestId('chat-message');
  expect(value.props.accessibilityLabel).toBe('The complete unbounded message');
  expect(screen.getByRole('button', { name: 'Показать весь текст' })).toBeTruthy();
  expect(JSON.stringify(value.props.children)).not.toContain('…');
});
```

- [ ] **Step 2: Verify RED**

```powershell
npx jest tests/text_integrity_primitives.test.tsx --runInBand
```

- [ ] **Step 3: Implement `ScrollableTextRegion`**

Use a caller-provided `availableViewport` (absolute safe-area-adjusted bounds after the enclosing screen header/navigation chrome) plus a visible indicator and sibling footer. A full-screen owner may derive it from `useWindowDimensions` and `useStableSafeAreaInsets` in `app/stable_safe_area_metrics.ts`; an embedded owner must measure its actual available slot. Measure this component's optional header and footer with `onLayout`; derive the body maximum from `availableViewport.height - measuredHeaderHeight - measuredFooterHeight`. Do not subtract unexplained device-specific constants. Expose `onBodyScrollBoundaryChange({ atStart, atEnd })`; compute it from `onScroll` content offset/layout/content size so a parent swipe/pan owner can take over only at a reached boundary. Preserve ordinary nested scrolling on Android.

```tsx
export function ScrollableTextRegion({
  text, header, footer, testID, provenance, style,
  availableViewport, onBodyScrollBoundaryChange, onInsufficientViewport,
}: Props) {
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const availableBodyHeight = Math.max(0, availableViewport.height - headerHeight - footerHeight);
  const maxBodyHeight = availableBodyHeight;
  useEffect(() => {
    if (availableBodyHeight < MIN_READABLE_BODY) onInsufficientViewport?.(availableBodyHeight);
  }, [availableBodyHeight, onInsufficientViewport]);
  return (
    <View testID={testID} style={style}>
      <View testID={`${testID}-header`} onLayout={measureHeader}>{header}</View>
      <ScrollView
        testID={`${testID}-scroll`}
        style={{ maxHeight: maxBodyHeight }}
        contentContainerStyle={{ flexGrow: 0 }}
        showsVerticalScrollIndicator
        nestedScrollEnabled
        onScroll={(event) => {
          onBodyScrollBoundaryChange?.(scrollBoundaries(event.nativeEvent));
        }}
        scrollEventThrottle={16}
      >
        <FlowText testID={`${testID}-text`} provenance={provenance}>{text}</FlowText>
      </ScrollView>
      <View testID={`${testID}-footer`} onLayout={measureFooter}>{footer}</View>
    </View>
  );
}
```

If the measured body slot is below `MIN_READABLE_BODY`, notify the owner through `onInsufficientViewport`; the owner must make its surrounding shell scrollable or reduce non-text chrome, never force the region past the safe viewport. Tests cover portrait and short landscape, a viewport already reduced by screen header and non-zero safe areas, a footer taller at 200% font scale, this insufficient-viewport fallback, nested Android scrolling, and exact start/middle/end boundary callbacks for parent-swipe handoff without trapping the gesture.

- [ ] **Step 4: Implement `ExpandableText` without generated ellipsis**

The preview uses a word-boundary excerpt and a separate reveal control. It is restricted by the type system to `user` or `external` provenance.

```tsx
type ExpandableProvenance = Extract<TextProvenance, 'user' | 'external'>;

function previewAtWordBoundary(text: string, budget: number): string {
  if (text.length <= budget) return text;
  const head = text.slice(0, budget + 1);
  const lastSpace = head.lastIndexOf(' ');
  return text.slice(0, lastSpace > 0 ? lastSpace : budget).trimEnd();
}

export function ExpandableText({ text, previewCharacterBudget = 160, testID, ...props }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { lang } = useLang();
  const labels = triLang(lang, {
    ru: { show: 'Показать весь текст', hide: 'Свернуть' },
    uk: { show: 'Показати весь текст', hide: 'Згорнути' },
    es: { show: 'Mostrar texto completo', hide: 'Contraer' },
    'pt-BR': { show: 'Mostrar texto completo', hide: 'Recolher' },
    vi: { show: 'Hiện toàn bộ văn bản', hide: 'Thu gọn' },
    id: { show: 'Tampilkan teks lengkap', hide: 'Ciutkan' },
    tr: { show: 'Metnin tamamını göster', hide: 'Daralt' },
    pl: { show: 'Pokaż cały tekst', hide: 'Zwiń' },
  });
  const needsReveal = text.length > previewCharacterBudget;
  const shown = expanded || !needsReveal ? text : previewAtWordBoundary(text, previewCharacterBudget);
  return (
    <View>
      <FlowText {...props} testID={testID} accessibilityLabel={text}>{shown}</FlowText>
      {needsReveal ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? labels.hide : labels.show}
          onPress={() => setExpanded((value) => !value)}
          style={styles.revealButton}
        >
          <FlowText testID={`${testID}-toggle-label`} provenance="authored">
            {expanded ? labels.hide : labels.show}
          </FlowText>
        </Pressable>
      ) : null}
    </View>
  );
}
```

Import `triLang` from `constants/i18n.ts`, and obtain `lang` through `useLang` from `components/LangContext.tsx`. The example above is the required implementation: all eight active locales are present, the control label is `FlowText`, and `styles.revealButton` preserves a minimum 44×44 touch target. Tests iterate `INTERFACE_LANGS` and confirm every locale has non-empty reveal/collapse copy.

- [ ] **Step 5: Verify all primitives**

```powershell
npx jest tests/text_integrity_primitives.test.tsx tests/text_integrity_probe.test.ts --runInBand
npx eslint components/text-integrity
```

- [ ] **Step 6: Commit the remaining primitives**

```powershell
git add components/text-integrity/ScrollableTextRegion.tsx components/text-integrity/ExpandableText.tsx components/text-integrity/index.ts tests/text_integrity_primitives.test.tsx
git commit -m "feat: add complete text reveal modes"
```

## Task 7: Pilot the system on Daily Challenges

**Files:**

- Modify: `app/daily_tasks_screen.tsx`
- Create: `components/daily-tasks/DailyTaskCard.tsx`
- Test: `tests/daily_tasks_text_integrity_contract.test.ts`
- Test: `tests/daily_tasks_text_integrity_render.test.tsx`
- Modify: `config/text-integrity-baseline.json`

- [ ] **Step 1: Write a failing contract for the reported card**

```ts
import fs from 'node:fs';
import path from 'node:path';

test('Daily Challenges card no longer estimates or caps text geometry', () => {
  const card = fs.readFileSync(path.join(__dirname, '..', 'components/daily-tasks/DailyTaskCard.tsx'), 'utf8');
  expect(card).toContain('daily-task-title-');
  expect(card).toContain('daily-task-description-');
  for (const token of [
    'numberOfLines', 'ellipsizeMode', 'expandedDescriptionLines',
    'expandedDescriptionBlockHeight', 'expandedCardTargetHeight',
    'expandedCardHeight', 'expandedPanelHeight',
  ]) expect(card).not.toContain(token);
});
```

The contract also requires semantic primitives for the bonus title/description and task/bonus claim labels, and asserts that `taskDesc` is rendered unconditionally rather than behind `isExpanded`. It keeps claim, reroll, premium badge, progress fill, card-press feedback, and animation callbacks as explicit inputs; this guard supplements rendered behavior tests and is not the only verification.

- [ ] **Step 2: Verify RED**

```powershell
npx jest tests/daily_tasks_text_integrity_contract.test.ts --runInBand
```

- [ ] **Step 3: Extract the mapped card with behavior parity first**

Extract only the card body currently inside `sortedTasks.map` into `components/daily-tasks/DailyTaskCard.tsx`. Keep task sorting, progress lookup, storage, claim/reroll mutations, navigation, and animation ownership in `app/daily_tasks_screen.tsx`; pass callbacks, state, theme values, and animated values into the card. Before layout changes, add rendered parity tests for these existing behaviors:

- incomplete cards show the complete description before any press; card press retains its haptic/visual-emphasis feedback but never gates text;
- completed/unclaimed cards expose claim and do not expand;
- claimed cards are inert and show their check state;
- reroll stops propagation and opens the existing shard confirmation flow;
- premium `PlusBadge`, pulse/sparkle, achievement art, gradient fill, bottom progress track, and all theme variants remain present;
- task and daily-bonus actions preserve disabled, ready, loading, and claimed states.

Do not delete the dormant `{false && ...}` blocks in this task; removal is outside scope.

- [ ] **Step 4: Make the complete description part of the resting card**

The current renderer hides `taskDesc` until card press, estimates its height from `taskDesc.length / 32`, clamps it to three lines, animates a hard 92px card, and clips through `overflow: 'hidden'`. Remove that concealment and all five calculated-height variables named in the contract. Render the complete authored description in the resting card at all times. Keep `minHeight: 92`, but let the outer card grow naturally. Card press may retain the existing haptic and a non-content visual emphasis/opacity animation; it must not reveal, hide, shorten, or clip text. No state may require a press to read authored/localized copy.

At large font scales, allow `taskCapsuleRow` to reflow from horizontal to stacked when measured copy/action widths require it. Fixed icon and progress-track geometry may remain fixed; text and action containers use natural height. Register the card as probe host and claim/reroll controls as related actions so safe-area/off-screen checks are meaningful.

- [ ] **Step 5: Migrate title, description, bonus copy, and labels**

Use `FlowText` for `taskTitle`, always-visible `taskDesc`, “Бонус за день”, and the bonus description. Use `AdaptiveLabel` for compact task claim and daily-bonus claim labels. Remove their raw `numberOfLines`, `adjustsFontSizeToFit`, `minimumFontScale`, and `maxWidth: 82`. When a label requests reflow, move the action below the copy while keeping icon, premium badge, progress, and touch target visible.

```tsx
const [stackTaskAction, setStackTaskAction] = useState(false);

<View style={[styles.taskMainRow, stackTaskAction && styles.taskMainRowStacked]}>
  <View style={styles.taskCapsuleTextBlock}>
    <FlowText
      testID={`daily-task-title-${task.id}`}
      provenance="authored"
      style={[styles.taskCapsuleTitle, { color: titleColor, fontSize: f.body }]}
    >
      {localized.title}
    </FlowText>
    <FlowText
      testID={`daily-task-description-${task.id}`}
      provenance="authored"
      style={[styles.taskExpandedDescription, { color: descriptionColor, fontSize: f.body }]}
    >
      {localized.description}
    </FlowText>
  </View>
  <AdaptiveLabel
    testID={`daily-task-action-${task.id}`}
    provenance="authored"
    availableWidth={measuredActionWidth}
    onReflowNeeded={() => setStackTaskAction(true)}
    style={{ color: t.correctText, fontSize: f.body, fontWeight: '900' }}
  >
    {claimLabel}
  </AdaptiveLabel>
</View>
```

Keep the lime-surface contrast invariant: CTA text remains `t.correctText`, `rewardActionText`, or `trioActionText`—dark text on bright green.

- [ ] **Step 6: Add rendered state and geometry tests**

In `tests/daily_tasks_text_integrity_render.test.tsx`, render the extracted task card and bonus-card presentation with mocked dimensions/font scale. Cover incomplete resting and pressed/emphasized states, reroll available, completed claim-ready, claim-loading, claimed, premium, and zero/partial/full progress. Fire `onTextLayout`/`onLayout` with long Russian, Polish, Portuguese, and Vietnamese strings. Assert the complete description exists before any press and remains identical afterward; reflow moves actions below copy; icons/progress remain visible; claim/reroll callbacks fire exactly once; and the probe reports zero violations for valid fixtures but detects one deliberately constrained fixture.

- [ ] **Step 7: Shrink the baseline explicitly**

Run the audit before writing:

```powershell
npm run text-integrity:audit
```

Expected before the update: non-zero only because migrated groups are reported as removed/count-decreased; there must be no new group or count increase.

Then run the explicit maintenance command:

```powershell
npm run text-integrity:update-baseline
```

Review the manifest diff. It may remove migrated Daily Challenges groups or decrease their counts; the command must reject new groups/count increases and preserve classification metadata for survivors.

- [ ] **Step 8: Verify the pilot**

```powershell
npx jest tests/daily_tasks_text_integrity_contract.test.ts tests/daily_tasks_text_integrity_render.test.tsx tests/daily_tasks_trainer_availability.test.ts tests/text_integrity_inventory.test.ts tests/text_integrity_primitives.test.tsx --runInBand
npx eslint app/daily_tasks_screen.tsx components/text-integrity
npm run text-integrity:audit
```

Run the complete Task 8 visual matrix. Confirm the full description is visible in the resting card, press feedback never changes text visibility, task/bonus actions reflow, premium and progress remain visible, and no control overlaps another.

- [ ] **Step 9: Commit the pilot**

```powershell
git add app/daily_tasks_screen.tsx components/daily-tasks/DailyTaskCard.tsx tests/daily_tasks_text_integrity_contract.test.ts tests/daily_tasks_text_integrity_render.test.tsx config/text-integrity-baseline.json
git commit -m "fix: keep daily challenge text fully visible"
```

## Task 8: Foundation verification and handoff

**Files:**

- Modify: `docs/superpowers/specs/2026-07-10-text-integrity-design.md`
- Create: `docs/superpowers/plans/2026-07-10-text-integrity-shared-shell.md` only after this foundation is verified and accepted.

- [ ] **Step 1: Run the complete foundation gate**

```powershell
npx jest tests/text_integrity_inventory.test.ts tests/text_integrity_eslint_rule.test.ts tests/text_integrity_probe.test.ts tests/text_integrity_primitives.test.tsx tests/daily_tasks_text_integrity_contract.test.ts tests/daily_tasks_text_integrity_render.test.tsx tests/daily_tasks_trainer_availability.test.ts --runInBand
npm run text-integrity:audit
npx eslint scripts/text-integrity tools/eslint-rules components/text-integrity app/daily_tasks_screen.tsx
git diff --check
```

Expected: all tests pass, audit reports no new sites, ESLint reports no errors, and diff check is clean.

- [ ] **Step 2: Run proportionate performance checks**

```powershell
npx jest tests/perf_freeze_contract.test.ts tests/navigation_back_underlay_contract.test.ts tests/owner_direction_runtime_contract.test.ts --runInBand
```

Expected: PASS. Confirm the probe adds no timer, subscription, AsyncStorage write, or production diagnostic work.

- [ ] **Step 3: Perform the visual matrix for the pilot**

Capture and inspect Daily Challenges at:

- phones 320×640, 360×800, and 390×844 in portrait;
- 640×320 and 844×390 in short landscape;
- at least one tablet portrait/landscape pair;
- a narrow split-screen window equivalent to 320 logical pixels;
- font scale 1.0, 1.3, 2.0, and the platform maximum available to automation;
- every value in `INTERFACE_LANGS`: `ru`, `uk`, `es`, `pt-BR`, `vi`, `id`, `tr`, and `pl`;
- resting/pressed-emphasis (with identical complete copy), incomplete/reroll, completed/claim-ready, claim-loading, claimed, premium, and bonus disabled/ready/claimed states.

Automate the matrix where the existing harness permits it and save screenshots in an ignored artifact directory. Each route case must assert `readTextIntegrityViolations()` is empty after layout settles. Manual inspection remains required for animation and gesture handoff. Acceptance: no generated ellipsis, clipping, overlap, off-screen action, inaccessible progress/premium indicator, trapped nested scroll, or 200%-to-100% font shrink.

- [ ] **Step 4: Request code review**

Use the `requesting-code-review` and `verification-before-completion` skills. Provide the approved design, manifest diff, primitive API, Daily Challenges screenshots, focused test output, performance output, and unresolved baseline count.

- [ ] **Step 5: Link the verified foundation from the design**

Add a short `Implementation` section to the design document with links to this plan, the primitive folder, and the baseline manifest. Do not claim the all-app program complete; record only the verified foundation and pilot.

- [ ] **Step 6: Commit the verified documentation**

```powershell
git add docs/superpowers/specs/2026-07-10-text-integrity-design.md
git commit -m "docs: record text integrity foundation"
```

- [ ] **Step 7: Prepare the next independent plan**

Create `docs/superpowers/plans/2026-07-10-text-integrity-shared-shell.md` using the writing-plans skill. Its scope is shared headers, buttons, tabs, banners, toasts, modal shells, and navigation chrome only. It must inventory exact consumers after the foundation branch lands and must not begin feature-screen migration.
