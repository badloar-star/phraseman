#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profile = String(process.env.EAS_BUILD_PROFILE ?? '').trim();
const platform = String(
  process.env.EAS_BUILD_PLATFORM ?? process.env.EAS_BUILD_PLATFORM_NAME ?? '',
).trim();

if (profile !== 'development' || (platform && platform !== 'ios')) {
  console.log(`[ios-dev-entitlements] unchanged for profile=${profile || 'local'} platform=${platform || 'unknown'}`);
  process.exit(0);
}

const entitlementsPath = path.join(projectRoot, 'ios', 'Phraseman', 'Phraseman.entitlements');
const source = fs.readFileSync(entitlementsPath, 'utf8');
const appAttestEntitlement = /\n\s*<key>com\.apple\.developer\.devicecheck\.appattest-environment<\/key>\s*\n\s*<string>production<\/string>/u;

if (!appAttestEntitlement.test(source)) {
  throw new Error(
    '[ios-dev-entitlements] App Attest entitlement changed; review development signing before building',
  );
}

fs.writeFileSync(entitlementsPath, source.replace(appAttestEntitlement, ''), 'utf8');
console.log('[ios-dev-entitlements] removed App Attest from the temporary development build; production remains unchanged');
