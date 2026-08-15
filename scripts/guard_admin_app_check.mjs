#!/usr/bin/env node
/**
 * pre-commit guard: ЗАМОК на App Check для админки (уровень git).
 *
 * зачем (требование владельца, 2026-08-03): «НИКОГДА не включать App Check, пока
 * я сам не скажу». Хук .claude/hooks ловит правки внутри сессий Claude, но коммит
 * может прийти откуда угодно — другой ИИ-инструмент, ручная правка, merge, откат.
 * Этот сторож закрывает дыру: он смотрит на STAGED-содержимое и не пускает коммит.
 *
 * Инцидент, ради которого замок существует: 2026-08-01 коммитом 58023df0f
 * захардкодили `enforceAppCheck: true`, но reCAPTCHA Enterprise-ключ в Google Cloud
 * не создали (шаг 1 из docs/reports/APP_CHECK_ENABLEMENT_PLAN_2026-06-13.md — ручной).
 * Google отвечает «Invalid site key» → админка не может получить App Check-токен →
 * Firebase рубит ВСЕ ~30 админских функций кодом `unauthenticated`. Владелец двое
 * суток не мог выдать Plus.
 *
 * Снять замок может только владелец. Обход на один коммит: `git commit --no-verify`
 * (использовать ТОЛЬКО по прямому распоряжению владельца).
 */
import { execFileSync } from "node:child_process";

/** Файлы, через которые App Check реально можно включить. */
const GUARDED = new Set([
  "functions/src/callable_options.ts",
  "functions/.env",
  "functions/.env.phraseman-ea0b3",
  "functions/.env.local",
]);

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

let staged = [];
try {
  staged = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])
    .split("\n")
    .map((line) => line.trim().replace(/\\/g, "/"))
    .filter(Boolean);
} catch {
  process.exit(0); // не в git-репозитории / нет индекса — не мешаем
}

const targets = staged.filter((file) => GUARDED.has(file));
if (!targets.length) process.exit(0);

const findings = [];
for (const file of targets) {
  let content = "";
  try {
    content = git(["show", `:${file}`]);
  } catch {
    continue; // файл удалён из индекса
  }

  // Комментарии не считаем: в шапке callable_options.ts фраза `enforceAppCheck: true`
  // намеренно упоминается как описание починенного инцидента.
  const code = content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/^\s*#[^\n]*$/gm, "");

  if (/enforceAppCheck\s*:\s*true/.test(code)) {
    findings.push(
      `${file}: \`enforceAppCheck: true\` — жёсткий энфорс в опциях`,
    );
  }
  if (/ENFORCE_APP_CHECK_ADMIN\s*=\s*true/.test(code)) {
    findings.push(
      `${file}: \`ENFORCE_APP_CHECK_ADMIN=true\` — включение админского флага`,
    );
  }
  if (/ENFORCE_APP_CHECK_ADMIN\s*=\s*appCheckGroup\s*\(/.test(code)) {
    findings.push(
      `${file}: \`ENFORCE_APP_CHECK_ADMIN = appCheckGroup(...)\` — наследование ` +
        "глобального ENFORCE_APP_CHECK (общий раскат снова положит админку)",
    );
  }
}

if (!findings.length) process.exit(0);

process.stderr.write(
  [
    "",
    "⛔ КОММИТ ОТКЛОНЁН: попытка включить App Check для админки.",
    "",
    ...findings.map((f) => `  • ${f}`),
    "",
    "ТРЕБОВАНИЕ ВЛАДЕЛЬЦА (2026-08-03): App Check для админки НЕ включать,",
    "пока владелец САМ ЯВНО этого не потребует.",
    "",
    "При включённом энфорсе админка не может получить App Check-токен (ключ",
    "reCAPTCHA Enterprise в Google Cloud не создан — «Invalid site key»), и Firebase",
    "рубит ВСЕ ~30 админских функций: выдача Plus, бан, награды, лиги, рефералы,",
    "конфиги. Инцидент уже был 2026-08-01 (коммит 58023df0f).",
    "",
    "Порядок включения, если владелец разрешил:",
    "  1) создать reCAPTCHA Enterprise-ключ, зарегистрировать веб-приложение в App Check;",
    "  2) прописать ключ в admin/v2/legacy.html;",
    "  3) проверить в браузере, что grecaptcha.enterprise.execute() отдаёт токен;",
    "  4) только затем ENFORCE_APP_CHECK_ADMIN=true.",
    "",
    "Подробности: AGENTS.md → «App Check для админки — НЕ ВКЛЮЧАТЬ БЕЗ СЛОВА ВЛАДЕЛЬЦА».",
    "",
  ].join("\n"),
);
process.exit(1);
