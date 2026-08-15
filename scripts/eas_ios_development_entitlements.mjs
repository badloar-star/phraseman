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

const APP_ATTEST_KEY = 'com.apple.developer.devicecheck.appattest-environment';
const entitlementsPath = path.join(projectRoot, 'ios', 'Phraseman', 'Phraseman.entitlements');

// зачем: `ios/` лежит в .gitignore и на CI появляется только после prebuild, а этот
// pre-install хук выполняется РАНЬШЕ него. Раньше он безусловно читал .entitlements,
// падал на ENOENT и обрывал всю iOS-сборку (build e1efac7a, 2026-08-15). Поэтому:
// есть нативная папка — правим её, нет — снимаем App Attest в app.json, из которого
// prebuild и сгенерирует entitlements. Итог одинаковый, но работает в обоих режимах.
if (fs.existsSync(entitlementsPath)) {
  const source = fs.readFileSync(entitlementsPath, 'utf8');
  const appAttestEntitlement = new RegExp(
    `\\n\\s*<key>${APP_ATTEST_KEY.replace(/\./gu, '\\.')}</key>\\s*\\n\\s*<string>production</string>`,
    'u',
  );

  if (!appAttestEntitlement.test(source)) {
    throw new Error(
      '[ios-dev-entitlements] App Attest entitlement changed; review development signing before building',
    );
  }

  fs.writeFileSync(entitlementsPath, source.replace(appAttestEntitlement, ''), 'utf8');
  console.log('[ios-dev-entitlements] removed App Attest from the temporary development build; production remains unchanged');
} else {
  const appConfigPath = path.join(projectRoot, 'app.json');
  const appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
  const entitlements = appConfig?.expo?.ios?.entitlements;

  // Та же защита, что и в нативной ветке: молча пропустить нельзя — если ключ исчез
  // или сменил значение, подпись development-сборки надо пересматривать осознанно.
  if (entitlements?.[APP_ATTEST_KEY] !== 'production') {
    throw new Error(
      '[ios-dev-entitlements] App Attest entitlement changed; review development signing before building',
    );
  }

  delete entitlements[APP_ATTEST_KEY];
  fs.writeFileSync(appConfigPath, `${JSON.stringify(appConfig, null, 2)}\n`, 'utf8');
  console.log('[ios-dev-entitlements] removed App Attest from app.json before prebuild; production config in git is unchanged');
}
