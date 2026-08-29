import fs from 'node:fs';

const quarantine = fs.readFileSync(
  new URL('../app/account_delete_quarantine.ts', import.meta.url),
  'utf8',
);
const provider = fs.readFileSync(
  new URL('../app/auth_provider.ts', import.meta.url),
  'utf8',
);

function requirePattern(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

requirePattern(
  quarantine,
  /adoptAuthoritativeStable\(stableId:\s*string\):\s*Promise<boolean>/,
  'transition dependency must durably adopt the authoritative stable id',
);
requirePattern(
  quarantine,
  /persist\('stable_link_verified',\s*\{\s*freshStableId:\s*canonicalStableId\s*\}\)/s,
  'canonical stable id must be persisted in the crash-safe transition before adoption',
);
requirePattern(
  quarantine,
  /canonicalStableId\s*===\s*lock\.stableId[\s\S]*canonicalStableId\s*===\s*lock\.serverRetiredStableId/,
  'retired stable ids must be rejected before canonical adoption',
);
requirePattern(
  quarantine,
  /await deps\.adoptAuthoritativeStable\(lock\.freshStableId!\)/,
  'stable_link_verified must install the canonical stable id before account generation',
);
requirePattern(
  provider,
  /adoptAuthoritativeStable:\s*async\s*\(stableId\)[\s\S]*await setStableId\(stableId\)[\s\S]*peekStableId\(\)\s*===\s*stableId/,
  'auth provider must persist and verify the authoritative stable id',
);

console.log('PASS account deletion canonical stable gate');
