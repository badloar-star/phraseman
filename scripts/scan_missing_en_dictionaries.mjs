#!/usr/bin/env node
/**
 * Ищет словари локалей без ключа `en`: объект с ключами ru и uk (и обычно es), но без en.
 *
 * зачем (координатор 12.10, подготовка к включению английского интерфейса): ENGLISH_UI_LOCALE_ENABLED=false с 27.08 —
 * включение роняло прод (Студия аватаров читала `STUDIO_COPY[lang]` без ключа en). Прямое чтение словаря по индексу при lang==='en'
 * даёт undefined, а triLang без en молча возвращал русский. Сторож считает такие словари и не даёт их числу расти (храповик),
 * пока английский не включён и не добавлены все ключи.
 *
 * Использование:
 *   node scripts/scan_missing_en_dictionaries.mjs            # проверить против базы config/missing-en-baseline.json
 *   node scripts/scan_missing_en_dictionaries.mjs --report   # показать файлы и число словарей
 *   node scripts/scan_missing_en_dictionaries.mjs --update   # зафиксировать новую базу (только вниз)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'config', 'missing-en-baseline.json');
const SCAN_DIRS = ['app', 'components', 'constants', 'hooks', 'modules'];
// Файлы, где словарь без en намеренно (контентные данные уроков и т. п.) — добавлять только с причиной.
const SKIP_FILE = /(^|\/)(__tests__|node_modules|\.worktrees|\.claude|\.codex-tmp)\/|\.test\.|\/lesson\d+|\/theory_content|\/content\/|generated/;
// Контент обучения на языках-источниках (объяснения грамматики, глоссы, диагностика): английский интерфейс переводит только оболочку,
// учебный материал остаётся на языке источника (app/config.ts, ENGLISH_UI_LOCALE_ENABLED). Плюс неподключённый модуль онбординга-«ага».
// app/manage_subscription.tsx: причины отмены защищены побайтовым контрактом (tests/manage_subscription_liquid_glass_source_contract), англ. добавляет владелец контракта.
// app/app_messages.ts: сообщения слота приходят из админки на 8 языках (AppMessage без полей en по замыслу; en → ru, см. комментарий в файле).
const SKIP_CONTENT = /app\/(pos_micro_diagnosis|preposition_explanations|preposition_overrides|irregular_verbs_data|lesson_words_spanish_gloss|quiz_data_|lesson_teaching_notes|french_|flashcards\/(deck_sources|FlashcardListItem|audioSession|marketplace|FlashcardDetailsBody|PhraseCard))|hooks\/use-flashcards|app\/manage_subscription|app\/app_messages\.ts|components\/onboarding_aha\/|app\/lesson_words\.tsx|app\/source_locales\.ts|app\/learning_v2_direct_session_intro_adapter_v1\.ts|app\/learning_v2_course_session_save_card_v1\.ts|modules\/learning-v2\/curriculum\/|components\/dev\/|components\/spire\/moments\/moments_strings\.ts/;
// components/spire/moments/moments_strings.ts: LEAGUE_LOCATIVE — таблица ПАДЕЖА (ru/uk/pl «Остаёшься в Граните»); в английском падежа нет, momentLeagueIn отдаёт имя лиги как есть. Тексты окон — кортежи Nine на 9 языков (en есть).
// зачем (координатор 12.10, подготовка к английскому): app/lesson_words.tsx — словарь-глоссарий слов урока (переводы английского слова на языки ученика; ключ `en` — само слово, как в Word.en; заголовки частей речи для en добавлены отдельно, POS_LABELS_EN);
// app/source_locales.ts, learning_v2_direct_session_intro_adapter_v1.ts, learning_v2_course_session_save_card_v1.ts, modules/learning-v2/curriculum/ — обвязка ЯЗЫКОВ-ИСТОЧНИКОВ контента (английский не язык-источник, см. комментарий app/source_locales.ts);
// components/dev/ — витрина разработчика, игроку не показывается (так же исключена в scan_untranslated_ui).

function listFiles() {
  const out = execFileSync('git', ['ls-files', '--', ...SCAN_DIRS], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.split('\n').filter((f) => /\.(ts|tsx)$/.test(f) && !SKIP_FILE.test(f) && !SKIP_CONTENT.test(f));
}

function keyName(prop) {
  const n = prop.name;
  if (!n) return null;
  if (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
  return null;
}

function scanFile(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (!/\bru\b/.test(src) || !/\buk\b/.test(src)) return 0;
  const sf = ts.createSourceFile(rel, src, ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let count = 0;
  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const names = new Set(node.properties.filter((p) => ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)).map(keyName).filter(Boolean));
      const hasSpread = node.properties.some((p) => ts.isSpreadAssignment(p));
      if (names.has('ru') && names.has('uk') && !names.has('en') && !hasSpread) count += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return count;
}

const rows = [];
for (const rel of listFiles()) {
  const c = scanFile(rel);
  if (c > 0) rows.push({ file: rel, count: c });
}
rows.sort((a, b) => b.count - a.count);
const total = rows.reduce((s, r) => s + r.count, 0);
const args = new Set(process.argv.slice(2));

if (args.has('--report')) {
  console.log(`Словарей без en: ${total} в ${rows.length} файлах`);
  for (const r of rows.slice(0, Number(process.env.MISSING_EN_REPORT_LIMIT) || 40)) console.log(`${String(r.count).padStart(5)}  ${r.file}`);
  process.exit(0);
}

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : null;
if (args.has('--update')) {
  if (baseline && total > baseline.total) {
    console.error(`База может только уменьшаться: ${total} > ${baseline.total}`);
    process.exit(1);
  }
  fs.writeFileSync(BASELINE, JSON.stringify({
    total,
    files: rows.length,
    updatedAt: new Date().toISOString().slice(0, 10),
    note: 'Храповик: число словарей ru+uk без en может только уменьшаться. Обновлять через --update.',
    perFile: Object.fromEntries(rows.map((r) => [r.file, r.count])),
  }, null, 2) + '\n');
  console.log(`База зафиксирована: ${total} словарей в ${rows.length} файлах.`);
  process.exit(0);
}

if (!baseline) {
  console.error('Нет базы config/missing-en-baseline.json — запусти с --update.');
  process.exit(1);
}
if (total > baseline.total) {
  const grew = rows.filter((r) => r.count > (baseline.perFile?.[r.file] ?? 0)).slice(0, 8);
  console.error(`Словарей ru+uk без en стало больше: ${total} против ${baseline.total} в базе.`);
  for (const r of grew) console.error(`  ${r.file} — ${r.count} (было ${baseline.perFile?.[r.file] ?? 0})`);
  console.error('Новый словарь обязан содержать en. Где именно: node scripts/scan_missing_en_dictionaries.mjs --report');
  process.exit(1);
}
console.log(total < baseline.total
  ? `Стало лучше: ${total} против ${baseline.total} в базе. Зафиксируй: node scripts/scan_missing_en_dictionaries.mjs --update`
  : `OK: ${total} словарей без en, как в базе.`);
