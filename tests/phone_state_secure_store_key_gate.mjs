import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../modules/phone-state/account_secret.ts', import.meta.url), 'utf8');

assert.doesNotMatch(
  source,
  /phone_state_lineage_v1:/,
  'Expo SecureStore keys must not contain a colon',
);
assert.match(
  source,
  /const PHONE_STATE_LINEAGE_KEY_PREFIX = 'phone_state_lineage_v1_';/,
);
assert.equal(
  source.match(/phoneStateLineageKey\(accountHash\)/g)?.length,
  2,
  'materialize and retire must derive the exact same valid lineage key',
);

console.log('PASS PhoneState SecureStore key gate');

