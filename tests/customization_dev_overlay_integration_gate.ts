import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const cloud = read('app/cloud_sync.ts');
const purchase = read('app/customization_purchase_intent.ts');
const screen = read('app/avatar_select.tsx');
const sandbox = read('app/customization_dev_sandbox.ts');
const legacy = read('app/customization_dev_legacy_cleanup.ts');

assert.doesNotMatch(cloud, /customization_dev_(?:grant|sandbox|legacy_cleanup)|sanitizeCustomizationDev/u);
assert.doesNotMatch(purchase, /customization_dev_(?:grant|sandbox|legacy_cleanup)|SuppressionRelease|suppressionRelease/u);
assert.doesNotMatch(screen, /customization_dev_grant|sanitizeCustomizationDev|toggleAllCustomizationForDev/u);
assert.doesNotMatch(sandbox, /AsyncStorage|multiSet|setItem|multiRemove|syncToCloud|syncPublicProfile/u);
assert.doesNotMatch(legacy, /multiSet|setItem|multiRemove|removeItem/u);
assert.match(screen, /devSandboxActive/u);
assert.match(screen, /previewInCustomizationDevSandbox/u);
assert.match(screen, /subscribeAccountGeneration\(clearDevSandbox\)/u);

const runResolvedStart = screen.indexOf('const runResolvedAction');
const runResolvedEnd = screen.indexOf('const handleAction', runResolvedStart);
const runResolvedBody = screen.slice(runResolvedStart, runResolvedEnd);
assert.ok(runResolvedBody.indexOf('devSandboxActive') > -1, 'bottom apply must branch for sandbox');
assert.ok(
  runResolvedBody.indexOf('devSandboxActive') < runResolvedBody.indexOf('applyCustomizationDraft'),
  'sandbox preview branch must run before canonical apply',
);

const editorStart = screen.indexOf('const handleEditorConfirm');
const editorEnd = screen.indexOf('const handleConfirmPurchase', editorStart);
const editorBody = screen.slice(editorStart, editorEnd);
assert.ok(editorBody.indexOf('devSandboxActive') > -1, 'editor confirm must branch for sandbox');
assert.ok(
  editorBody.indexOf('devSandboxActive') < editorBody.indexOf('runFreshPurchasePreflight'),
  'sandbox preview branch must run before purchase preflight',
);

process.stdout.write('CUSTOMIZATION DEV SESSION SANDBOX GATE: PASS\n');
