#!/usr/bin/env node
/**
 * Рубильник дев-начисления жемчужин: remote_config/app.numbers.dev_shards_grant_enabled
 *
 * Железное правило владельца (2026-07-27): в дев-режиме начисление ВСЕГДА идёт
 * на сервер и работает на ЛЮБОЙ аккаунт (без админ-claim). Раз проверки роли
 * нет, единственная защита прода — ЭТОТ серверный рубильник. Он fail-closed:
 * пока ключ не равен 1, функция devShardsGrant отклоняет любой вызов.
 *
 * Включить (дев-проект):   node scripts/set_dev_shards_grant.mjs on
 * Выключить (перед сторм): node scripts/set_dev_shards_grant.mjs off
 * Посмотреть состояние:    node scripts/set_dev_shards_grant.mjs status
 *
 * Требует service-account.json в корне проекта или переменную
 * GOOGLE_APPLICATION_CREDENTIALS с путём к нему (как у set_admin_claim.mjs).
 *
 * ⚠️ ПЕРЕД РЕЛИЗОМ В СТОР рубильник обязан быть OFF: иначе любой пользователь,
 * зная имя функции, начислит себе жемчужины.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import admin from 'firebase-admin';

const mode = (process.argv[2] ?? '').trim().toLowerCase();
if (!['on', 'off', 'status'].includes(mode)) {
  console.error('Usage: node scripts/set_dev_shards_grant.mjs <on|off|status>');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const fallback = join(root, 'service-account.json');
  try {
    readFileSync(fallback);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = fallback;
    console.log('Using service-account.json in project root (set GOOGLE_APPLICATION_CREDENTIALS to override).');
  } catch {
    console.error('Set env GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path, or add service-account.json in project root.');
    process.exit(1);
  }
}

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();
const ref = db.collection('remote_config').doc('app');

if (mode === 'status') {
  const snap = await ref.get();
  const value = snap.data()?.numbers?.dev_shards_grant_enabled;
  console.log(`dev_shards_grant_enabled = ${JSON.stringify(value ?? null)} → ${Number(value) === 1 ? 'ON (дев-начисление работает)' : 'OFF (сервер отклоняет начисление)'}`);
  process.exit(0);
}

// merge:true — в numbers лежат и другие ключи (веса рулетки и пр.), затирать их нельзя.
await ref.set({ numbers: { dev_shards_grant_enabled: mode === 'on' ? 1 : 0 } }, { merge: true });
console.log(`OK: dev_shards_grant_enabled = ${mode === 'on' ? 1 : 0} (${mode.toUpperCase()}); project=${admin.app().options.projectId || 'default'}`);
if (mode === 'on') {
  console.log('⚠️  Перед публикацией в стор выключи: node scripts/set_dev_shards_grant.mjs off');
}
process.exit(0);
