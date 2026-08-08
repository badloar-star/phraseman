#!/usr/bin/env node
/**
 * PreToolUse hook: ЗАМОК на App Check для админки.
 *
 * зачем (требование владельца, 2026-08-03): «НИКОГДА не включать App Check, пока
 * я сам не скажу». Это не пожелание, а следствие инцидента: 2026-08-01 коммитом
 * 58023df0f в ADMIN_SENSITIVE_WRITE_OPTIONS захардкодили `enforceAppCheck: true`,
 * а reCAPTCHA Enterprise-ключ в Google Cloud так и не создали (шаг 1 из
 * docs/reports/APP_CHECK_ENABLEMENT_PLAN_2026-06-13.md — ручной, не выполнен).
 * Google отвечает «Invalid site key», админка не может получить App Check-токен,
 * сервер его требует → Firebase рубит ВСЕ ~30 админских функций кодом
 * `unauthenticated`. Владелец двое суток не мог выдать Plus.
 *
 * Комментарий в коде и правило в AGENTS.md — это просьба, её легко не заметить.
 * Хук — замок: он отклоняет правку ДО записи файла, поэтому включить App Check
 * «заодно» или «для безопасности» физически не выйдет.
 *
 * Снять замок может только владелец: удалить этот хук из .claude/settings.json.
 * Ни ИИ-агент, ни автоматика этого делать не должны без прямого распоряжения.
 *
 * Парный сторож на уровне тестов: functions/src/admin_sensitive_writes.test.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

let payload = {};
try {
  payload = JSON.parse(readStdin() || '{}');
} catch {
  payload = {};
}

const toolInput = payload?.tool_input ?? {};
const filePath = toolInput.file_path || toolInput.path || '';
if (!filePath) process.exit(0);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const relative = path.relative(ROOT, path.resolve(String(filePath))).replace(/\\/g, '/');

/** Файлы, через которые App Check реально можно включить. */
const GUARDED = new Set([
  'functions/src/callable_options.ts',
  'functions/.env',
  'functions/.env.phraseman-ea0b3',
  'functions/.env.local',
]);
if (!GUARDED.has(relative)) process.exit(0);

// Текст, который правка ПЫТАЕТСЯ записать. Для Edit смотрим на новое содержимое,
// для Write — на весь файл целиком.
const candidate = [
  toolInput.new_string,
  toolInput.content,
  ...(Array.isArray(toolInput.edits) ? toolInput.edits.map((e) => e?.new_string) : []),
]
  .filter((chunk) => typeof chunk === 'string')
  .join('\n');
if (!candidate.trim()) process.exit(0);

// Комментарии не считаем: в шапке callable_options.ts фраза `enforceAppCheck: true`
// намеренно упоминается как описание починенного инцидента.
const code = candidate
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '')
  .replace(/^\s*#[^\n]*$/gm, '');

const violations = [];
if (/enforceAppCheck\s*:\s*true/.test(code)) {
  violations.push('`enforceAppCheck: true` — жёсткий энфорс в опциях');
}
if (/ENFORCE_APP_CHECK_ADMIN\s*=\s*true/.test(code)) {
  violations.push('`ENFORCE_APP_CHECK_ADMIN=true` — включение админского флага');
}
if (/ENFORCE_APP_CHECK_ADMIN\s*=\s*appCheckGroup\s*\(/.test(code)) {
  violations.push(
    '`ENFORCE_APP_CHECK_ADMIN = appCheckGroup(...)` — наследование глобального '
    + 'ENFORCE_APP_CHECK: общий раскат снова положит админку',
  );
}

if (!violations.length) process.exit(0);

const message = [
  '',
  '⛔ ЗАБЛОКИРОВАНО: попытка включить App Check для админки.',
  '',
  `Файл: ${relative}`,
  'Найдено:',
  ...violations.map((v) => `  • ${v}`),
  '',
  'ТРЕБОВАНИЕ ВЛАДЕЛЬЦА (2026-08-03): App Check для админки НЕ включать,',
  'пока владелец САМ ЯВНО этого не потребует.',
  '',
  'Почему замок жёсткий: reCAPTCHA Enterprise-ключ в Google Cloud не создан',
  '(Google отвечает «Invalid site key»). При включённом энфорсе админка не может',
  'получить App Check-токен, и Firebase рубит ВСЕ ~30 админских функций кодом',
  'unauthenticated — выдача Plus, бан, награды, лиги, рефералы, конфиги.',
  'Ровно этот инцидент уже случился 2026-08-01 (коммит 58023df0f).',
  '',
  'Если владелец действительно разрешил включение — порядок обязателен:',
  '  1) создать reCAPTCHA Enterprise-ключ и зарегистрировать веб-приложение',
  '     в Firebase App Check;',
  '  2) прописать ключ в admin/v2/legacy.html;',
  '  3) проверить в браузере, что grecaptcha.enterprise.execute() отдаёт токен;',
  '  4) только затем ENFORCE_APP_CHECK_ADMIN=true.',
  '',
  'Подробности: AGENTS.md → «App Check для админки — НЕ ВКЛЮЧАТЬ БЕЗ СЛОВА ВЛАДЕЛЬЦА».',
  '',
].join('\n');

// exit code 2 = блокировать вызов инструмента и вернуть stderr агенту.
process.stderr.write(message);
process.exit(2);
