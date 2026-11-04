#!/usr/bin/env node
// Governance-ID: TG-26E4F043EEFD
// зачем (ночной выпуск 04→05.11): срез версии 2.1.0 / 149 одним коммитом и без ручных правок — один забытый номер
// роняет сабмит или выпускает OTA не на тот runtime. По умолчанию ничего не меняет (показывает план).
//   node scripts/release_cut_2_1_0.mjs                 — сухой прогон: что изменится
//   node scripts/release_cut_2_1_0.mjs --apply         — применить (метка среза = сейчас)
//   node scripts/release_cut_2_1_0.mjs --apply --since 1793836800000   — своя метка среза (мс)
//   --root <папка>  — работать в копии дерева (проверка до 02:15), по умолчанию корень репозитория
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const root = val('--root') ? path.resolve(val('--root')) : path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const apply = flag('--apply');
const sinceMs = Number(val('--since') ?? Date.now());
const TARGET = { version: '2.1.0', code: 149 };
if (!Number.isFinite(sinceMs) || sinceMs < Date.UTC(2026, 0, 1)) {
  console.error(`[RELEASE-CUT] ✖ метка среза ${sinceMs} не похожа на момент релиза`);
  process.exit(2);
}

// точечные замены по строке, окончания строк (CRLF) не трогаем
function replaceOnce(text, re, to, label) {
  const m = re.exec(text);
  if (!m) throw new Error(`не найдено: ${label}`);
  console.log(`[RELEASE-CUT]   ${label}: ${m[0].trim()}  →  ${to.trim()}`);
  return text.replace(re, to);
}

const appJsonPath = path.join(root, 'app.json');
let app = fs.readFileSync(appJsonPath, 'utf8');
app = replaceOnce(app, /"version": "[\d.]+"/, `"version": "${TARGET.version}"`, 'app.json version');
app = replaceOnce(app, /"runtimeVersion": "[\d.]+"/, `"runtimeVersion": "${TARGET.version}"`, 'app.json runtimeVersion');
app = replaceOnce(app, /"versionCode": \d+/, `"versionCode": ${TARGET.code}`, 'app.json android.versionCode');
app = replaceOnce(app, /"buildNumber": "\d+"/, `"buildNumber": "${TARGET.code}"`, 'app.json ios.buildNumber');
JSON.parse(app); // не сломали JSON

const rankPath = path.join(root, 'app/rank_gates_new_user.ts');
let rank = fs.readFileSync(rankPath, 'utf8');
rank = replaceOnce(
  rank,
  /export const RANK_GATES_NEW_USERS_SINCE_MS = [^;]+;/,
  `export const RANK_GATES_NEW_USERS_SINCE_MS = ${sinceMs};`,
  'rank_gates_new_user.ts RANK_GATES_NEW_USERS_SINCE_MS',
);

if (!apply) {
  console.log('[RELEASE-CUT] сухой прогон: файлы НЕ изменены. Применить: node scripts/release_cut_2_1_0.mjs --apply');
  process.exit(0);
}
fs.writeFileSync(appJsonPath, app);
fs.writeFileSync(rankPath, rank);
console.log(`[RELEASE-CUT] ✔ применено (версия ${TARGET.version}/${TARGET.code}, метка среза ${sinceMs} = ${new Date(sinceMs).toISOString()})`);
console.log('[RELEASE-CUT] дальше: RELEASE_CUT=1 node --test tests/rank_gates_since_release_cut_guard.test.mjs; npm run test:one -- tests/release_version_consistency_2026_11_05.test.ts; коммит app.json + app/rank_gates_new_user.ts через safe_commit');
