#!/usr/bin/env node
/**
 * ⛔ ЗАМОК ВЛАДЕЛЬЦА: вход в админку.
 *
 * Инцидент 2026-08-16: владелец не мог попасть в свою админку. Сначала с его
 * аккаунта пропал custom claim admin, а потом выяснилось, что код входа сам
 * выжигал автовход — при отсутствии claim стоял signOut(auth), и каждый заход
 * уничтожал сохранённую в IndexedDB сессию. Владелец остался запертым снаружи.
 *
 * Этот сторож не даёт закоммитить правку, которая ломает вход. Он смотрит на
 * ФАКТИЧЕСКОЕ содержимое admin/v2/legacy.html в индексе, а не на намерения.
 *
 * Запуск: node scripts/guard_admin_login.mjs
 * Подробности и порядок восстановления: admin/v2/OWNER_ACCESS.md
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const LEGACY = 'admin/v2/legacy.html';

function stagedFiles() {
  try {
    return execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
      encoding: 'utf8',
    })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

// Читаем ровно ту версию, которая уедет в коммит.
function stagedContent(path) {
  try {
    return execFileSync('git', ['show', `:${path}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return existsSync(path) ? readFileSync(path, 'utf8') : '';
  }
}

const staged = stagedFiles();
if (!staged.includes(LEGACY)) process.exit(0);

const src = stagedContent(LEGACY);
if (!src) process.exit(0);

const failures = [];

// 1. Проверка прав обязана остаться. Без неё админка открыта всем подряд.
if (!src.includes('tr.claims.admin !== true')) {
  failures.push('пропала проверка custom claim admin — админка станет открытой для любого Google-аккаунта');
}

// 2. Принудительный перевыпуск токена. Без него свежевыданный claim не виден
//    до истечения часа, и владелец видит отказ на исправном аккаунте.
if (!src.includes('getIdTokenResult(true)')) {
  failures.push('пропал принудительный перевыпуск токена getIdTokenResult(true) — свежий claim не подхватится');
}

// 3. Сохранение сессии — это и есть автовход.
if (!src.includes('browserLocalPersistence')) {
  failures.push('пропало сохранение сессии browserLocalPersistence — автовход перестанет работать');
}

// 4. Дочитывание redirect-входа. Без него вход с телефона теряется по кругу.
if (!src.includes('getRedirectResult(auth)')) {
  failures.push('пропал getRedirectResult — вход с телефона будет теряться после возврата с Google');
}

// 5. ГЛАВНОЕ. Отказ по claim не имеет права разлогинивать: именно этот signOut
//    сжёг автовход владельца в инциденте 2026-08-16.
const denyStart = src.lastIndexOf('if (!tr.claims || tr.claims.admin !== true) {');
if (denyStart > 0) {
  const denyEnd = src.indexOf('showAdminRetryClaimButton(true)', denyStart);
  const denyBlock = src.slice(denyStart, denyEnd > 0 ? denyEnd + 40 : denyStart + 1200);
  if (denyBlock.includes('signOut(auth)')) {
    failures.push(
      'в блоке отказа по claim вернулся signOut(auth) — это ВЫЖИГАЕТ автовход владельца:\n' +
      '     сессия сносится при каждой загрузке, пока claim не на месте, и не восстанавливается потом',
    );
  }
}

if (failures.length) {
  console.error('');
  console.error('⛔ ЗАМОК ВЛАДЕЛЬЦА: правка ломает вход в админку. Коммит остановлен.');
  console.error('');
  for (const item of failures) console.error(`  ✗ ${item}`);
  console.error('');
  console.error('  badloar@gmail.com — владелец админки, он входит ВСЕГДА.');
  console.error('  Вход уже ломали: 2026-08-16 владелец был заперт снаружи.');
  console.error('');
  console.error('  Что делать: верните логику входа, а не обходите этот замок.');
  console.error('  Не пускает в админку? Сначала проверьте claim, а не правьте код:');
  console.error('  → admin/v2/OWNER_ACCESS.md');
  console.error('');
  process.exit(1);
}

process.exit(0);
