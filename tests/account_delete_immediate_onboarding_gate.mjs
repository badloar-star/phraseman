import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const layout = read('app/_layout.tsx');
const modal = read('components/DeleteAccountConfirmModal.tsx');
const quarantine = read('app/account_delete_quarantine.ts');
const eventStart = layout.indexOf("const subDelete = onAppEvent('account_deleted'");
const eventEnd = layout.indexOf('    });', eventStart);
const eventHandler = layout.slice(eventStart, eventEnd);

assert.ok(eventStart >= 0, 'account_deleted root handler must exist');
assert.match(eventHandler, /setOnboardingStartAtName\(false\);/);
assert.match(eventHandler, /setOnboardingPaywallActive\(false\);/);
assert.match(eventHandler, /setAccountDeletionNavigationEpoch\(\(value\) => value \+ 1\);/);
assert.match(eventHandler, /router\.dismissAll\(\);/);
assert.match(eventHandler, /router\.replace\('\/\(tabs\)\/home' as never\);/);
assert.ok(
  eventHandler.indexOf('setAccountDeletionNavigationEpoch((value) => value + 1);')
    < eventHandler.indexOf('setShow(true);'),
  'native navigation must be destroyed before onboarding is shown',
);
assert.ok(
  eventHandler.indexOf('router.dismissAll();')
    < eventHandler.indexOf("router.replace('/(tabs)/home' as never);"),
  'native sheets must be dismissed before the deleted route is replaced',
);
assert.ok(
  eventHandler.indexOf("router.replace('/(tabs)/home' as never);")
    < eventHandler.indexOf('setShow(true);'),
  'home must replace the deleted account route before onboarding is shown',
);
assert.match(layout, /<Stack\s+key=\{`account-generation-\$\{accountDeletionNavigationEpoch\}`\}/);
assert.doesNotMatch(modal, /import \{ router \} from 'expo-router';/);
assert.doesNotMatch(modal, /router\.dismissAll/);
assert.doesNotMatch(modal, /router\.replace\('\/\(tabs\)\/home'/);
assert.match(
  quarantine,
  /if \(lock\.phase !== 'prepared'\) deps\.emitLocalWipeReady\?\.\(\);/,
  'a resumed transition with confirmed local wipe must reopen onboarding immediately',
);

console.log('PASS account deletion immediate onboarding gate');
