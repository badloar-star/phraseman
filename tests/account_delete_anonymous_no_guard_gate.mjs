import fs from 'node:fs';

const source = fs.readFileSync(
  new URL('../app/auth_provider.ts', import.meta.url),
  'utf8',
);

if (!/let pendingDeleteLock = isProvablyAnonymousAccount\s*\?\s*null\s*:\s*await withLocalStepDeadline/s.test(source)) {
  throw new Error('provably anonymous deletion must not create a provider quarantine guard');
}
if (!/if \(\s*getAuth\(\)\?\.currentUser\?\.isAnonymous === true\s*&& getAuth\(\)\?\.currentUser\?\.uid === lock!\.providerUid\s*\) return true;/s.test(source)) {
  throw new Error('legacy anonymous guards must converge without waiting for provider retirement');
}

console.log('PASS anonymous account deletion no-guard gate');
