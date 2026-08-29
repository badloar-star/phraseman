import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../app/max_voice_consent_gate.tsx', import.meta.url), 'utf8');
const homeSource = fs.readFileSync(new URL('../app/(tabs)/home.tsx', import.meta.url), 'utf8');

assert.doesNotMatch(
  source,
  /hasAiVoiceConsentDecision/,
  'A saved "not now" decision must not auto-close MAX on every later entry',
);
assert.match(source, /setVisible\(true\)/, 'MAX must offer voice consent on re-entry');

const reentryComment = source.indexOf('// «Не сейчас»');
const readyReset = source.lastIndexOf('setReady(false);', reentryComment);
const promptAgain = source.indexOf('setVisible(true);', reentryComment);
assert.ok(reentryComment >= 0, 'MAX re-entry explanation must remain explicit');
assert.ok(
  readyReset >= 0 && readyReset < reentryComment && promptAgain > reentryComment,
  'MAX must unmount preparation before prompting again without consent',
);

const declineStart = source.indexOf('const decline');
const leavingGuard = source.indexOf('leavingRef.current = true;', declineStart);
const savedDenial = source.indexOf("setAiVoiceConsent('denied')", declineStart);
assert.ok(
  declineStart >= 0 && leavingGuard > declineStart && savedDenial > leavingGuard,
  'MAX must guard the intentional exit before saving a temporary denial',
);

const maxEntryStart = homeSource.indexOf("key: 'max'");
const maxEntryEnd = homeSource.indexOf("key: 'flashcards'", maxEntryStart);
assert.ok(maxEntryStart >= 0 && maxEntryEnd > maxEntryStart, 'MAX home entry must exist');
const maxEntry = homeSource.slice(maxEntryStart, maxEntryEnd);
assert.match(
  maxEntry,
  /if \(isAiVoiceConsentGranted\(\)\) \{\s*void import\('\.\.\/max_call_premint'\)/s,
  'MAX premint must not start before voice consent is granted',
);
const consentChecks = [...maxEntry.matchAll(/isAiVoiceConsentGranted\(\)/g)].map((match) => match.index);
const premintCall = maxEntry.indexOf('beginPremint(');
assert.ok(
  consentChecks.length >= 2 && consentChecks[1] < premintCall,
  'MAX must recheck voice consent immediately before creating a premint reservation',
);

console.log('PASS max_voice_consent_reentry_gate');
