// Сборка теории уроков Learning V2: docs/work/theory_drafts/lesson_NN_<lang>.md → modules/learning-v2/theory/generated/*.json
//
// зачем (решение владельца №42, вид A макета docs/design/v2-app/lesson-theory.html): тексты теории пишет сессия «12 · ТЕОРИЯ»
// в markdown на 9 языках; приложению нужны данные, которые лежат в сборке (без сети) и грузятся лениво — по уроку и языку.
// Формат блоков — как в классике (body / formula / examples / fix / tip / drill). Подписи полей заданий переведены на каждый
// язык, поэтому поля задания разбираются ПО ПОРЯДКУ строк, а не по подписи.
// Запуск: node scripts/build_learning_v2_theory.mjs   (--check — только сверить, что сгенерированное совпадает с черновиками)
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'docs', 'work', 'theory_drafts');
const OUT = join(ROOT, 'modules', 'learning-v2', 'theory', 'generated');
const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const CHECK = process.argv.includes('--check');

const ticks = (s) => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
const after = (line) => {
  const i = line.indexOf(':');
  return (i >= 0 ? line.slice(i + 1) : line).trim();
};
// Подсказка в заданиях одна на язык файла: храним строкой, загрузчик разворачивает её в IntroI18nText (меньше вес сборки).
const i18n = (s) => s;

function parseDrill(type, lines, where) {
  const items = lines.filter((l) => l.startsWith('- ')).map((l) => l.slice(2));
  const fail = (why) => { throw new Error(`${where}: drill ${type} — ${why}`); };
  if (type === 'choice') {
    const [sentence, options, answer, why] = items;
    const phrase = ticks(sentence ?? '')[0] ?? fail('нет фразы');
    const parts = phrase.split(/_{2,}/);
    if (parts.length !== 2) fail(`в фразе нет одного пропуска: ${phrase}`);
    const opts = ticks(options ?? '');
    const ans = ticks(answer ?? '')[0];
    if (!ans || !opts.includes(ans)) fail('ответ не входит в варианты');
    return { type, kind: 'choice', before: parts[0].trim(), after: parts[1].trim(), options: opts, answer: ans, why: i18n(after(why ?? '')) };
  }
  if (type === 'spot_slip') {
    const [tiles, wrong, hint, explain] = items;
    const chips = ticks(tiles ?? '');
    const index = Number((/\((?:[^\d)]*)(\d+)\)/u.exec(wrong ?? '') ?? [])[1]);
    if (!Number.isInteger(index) || index < 0 || index >= chips.length) fail(`индекс лишнего вне фишек: ${wrong}`);
    return { type, kind: 'spot_slip', chips, answerIndex: index, hint: i18n(after(hint ?? '')), fix: i18n(after(explain ?? '')) };
  }
  if (type === 'binary') {
    const [question, a, b, correct, explain] = items;
    const letter = after(correct ?? '').trim().charAt(0).toUpperCase();
    if (letter !== 'A' && letter !== 'B') fail(`верный вариант не A/B: ${correct}`);
    return { type, kind: 'binary', question: i18n(after(question ?? '')), optionA: ticks(a ?? '')[0] ?? fail('нет A'), optionB: ticks(b ?? '')[0] ?? fail('нет B'), correct: letter, explain: i18n(after(explain ?? '')) };
  }
  if (type === 'word_bank') {
    const [prompt, answer, labels, extra] = items;
    const ans = ticks(answer ?? '');
    if (ans.length === 0) fail('нет ответа');
    const slotLabels = labels ? after(labels).split('·').map((s) => s.trim()).filter(Boolean).map(i18n) : undefined;
    return { type, kind: 'word_bank', prompt: i18n(after(prompt ?? '')), answer: ans, ...(slotLabels && slotLabels.length === ans.length ? { slotLabels } : {}), distractors: ticks(extra ?? '') };
  }
  return fail('неизвестный тип');
}

function parseFormula(lines) {
  const line = lines.find((l) => l.includes('`')) ?? '';
  // Английские части (am / is / are, not) красятся цветом темы, русские подписи — нет.
  return ticks(line).map((text) => ({ text, accent: /^[A-Za-z'’ /.,!?-]+$/u.test(text) }));
}

function parseExamples(lines) {
  const rows = lines.filter((l) => l.trim().startsWith('|')).map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  return rows.slice(2).filter((r) => r[0]).map(([en, translation, hi]) => ({ en, translation: translation ?? '', ...(hi ? { hi } : {}) }));
}

function parseFixes(lines) {
  return lines.filter((l) => l.startsWith('- ')).map((l) => {
    const m = /~~(.+?)~~\s*→\s*(.+)$/u.exec(l);
    return m ? { wrong: m[1].trim(), right: m[2].trim() } : null;
  }).filter(Boolean);
}

function parseFile(path, lesson, lang) {
  const text = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const titleLine = lines.find((l) => /^\*\*[^*]+:\*\*\s/u.test(l)) ?? '';
  const screenTitle = titleLine.replace(/^\*\*[^*]+:\*\*\s*/u, '').trim();
  const sepIndex = screenTitle.indexOf(' · ');
  const title = sepIndex >= 0 ? screenTitle.slice(sepIndex + 3).trim() : screenTitle;
  const sections = [];
  let section = null;
  let block = null;
  const flush = () => {
    if (!section || !block) return;
    const where = `урок ${lesson} ${lang} раздел ${section.num}`;
    const body = block.lines.filter((l) => l.trim() && l.trim() !== '---');
    if (block.kind === 'body' || block.kind === 'tip') {
      const value = body.join(' ').trim();
      if (value) section.blocks.push({ kind: block.kind, text: value });
    } else if (block.kind === 'formula') {
      section.blocks.push({ kind: 'formula', formula: parseFormula(body) });
    } else if (block.kind === 'examples') {
      const examples = parseExamples(body);
      if (examples.length) section.blocks.push({ kind: 'examples', examples });
    } else if (block.kind === 'fix') {
      const fixes = parseFixes(body);
      if (fixes.length) section.blocks.push({ kind: 'fix', fixes });
    } else if (block.kind === 'drill') {
      section.blocks.push({ kind: 'drill', drill: parseDrill(block.type, body, where) });
    }
    block = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const head = /^## (\d{2}) · (.+)$/u.exec(line);
    if (head) {
      flush();
      const open = /\*\([^)]*\)\*\s*$/u.test(head[2]);
      section = { num: head[1], title: head[2].replace(/\s*\*\([^)]*\)\*\s*$/u, '').trim(), defaultOpen: open, blocks: [] };
      sections.push(section);
      continue;
    }
    if (/^## /u.test(line)) { flush(); section = null; continue; }
    if (!section) continue;
    const kindHead = /^\*\*(body|formula|examples|fix|tip|drill)(?: · ([a-z_]+))?\*\*/u.exec(line);
    if (kindHead) {
      flush();
      block = { kind: kindHead[1], type: kindHead[2] ?? null, lines: [] };
      continue;
    }
    if (block) block.lines.push(line);
  }
  flush();
  // Карта «занятие → раздел» (пока есть только у урока 1, в разделе «Откуда открывается» RU-файла).
  const sessionSection = {};
  // Список может переноситься на следующие строки — собираем пункт до пустой строки.
  const mapStart = lines.findIndex((l) => /→\s*\d{2}\b/u.test(l) && /\d+\s*[–-]\s*\d+\s*→/u.test(l));
  let mapLine = '';
  for (let i = mapStart; mapStart >= 0 && i < lines.length && lines[i].trim(); i += 1) mapLine += ` ${lines[i]}`;
  for (const m of mapLine.matchAll(/(\d+)(?:\s*[–-]\s*(\d+))?\s*→\s*(\d{2})\b/gu)) {
    const from = Number(m[1]); const to = Number(m[2] ?? m[1]);
    for (let s = from; s <= to && s <= 56; s += 1) sessionSection[s] = m[3];
  }
  return { schema: 'learning-v2-theory.v1', lesson, lang, title, sections, sessionSection };
}

const files = readdirSync(SRC).filter((f) => /^lesson_\d{2}_[a-zA-Z-]+\.md$/u.test(f));
const out = new Map();
const problems = [];
for (const file of files) {
  const [, nn, lang] = /^lesson_(\d{2})_([a-zA-Z-]+)\.md$/u.exec(file);
  if (!LANGS.includes(lang)) continue;
  try {
    const data = parseFile(join(SRC, file), Number(nn), lang);
    if (data.sections.length === 0) { problems.push(`${file}: ни одного раздела`); continue; }
    out.set(`lesson_${nn}.${lang}.json`, `${JSON.stringify(data)}\n`);
  } catch (error) {
    problems.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
// Карта разделов для уроков без карты в черновике — scripts/learning_v2_theory_session_sections.json (координатор 22.10).
const sessionMapFile = JSON.parse(readFileSync(join(ROOT, 'scripts', 'learning_v2_theory_session_sections.json'), 'utf8'));
for (const [name, json] of out) {
  const data = JSON.parse(json);
  if (data.lang !== 'ru' || Object.keys(data.sessionSection).length > 0) continue;
  const ranges = sessionMapFile[String(data.lesson)];
  if (!Array.isArray(ranges)) continue;
  for (const [from, to, num] of ranges) {
    if (!data.sections.some((s) => s.num === num)) problems.push(`карта урока ${data.lesson}: раздела ${num} нет`);
    for (let s = from; s <= to; s += 1) data.sessionSection[s] = num;
  }
  out.set(name, `${JSON.stringify(data)}\n`);
}
// Карта разделов по занятиям — из RU-файла урока на все языки урока (разделы нумеруются одинаково).
for (const [name, json] of out) {
  const data = JSON.parse(json);
  if (data.lang === 'ru' || Object.keys(data.sessionSection).length > 0) continue;
  const ru = out.get(`lesson_${String(data.lesson).padStart(2, '0')}.ru.json`);
  if (!ru) continue;
  data.sessionSection = JSON.parse(ru).sessionSection;
  out.set(name, `${JSON.stringify(data)}\n`);
}
const names = [...out.keys()].sort();
const index = [
  '// СГЕНЕРИРОВАНО scripts/build_learning_v2_theory.mjs из docs/work/theory_drafts — руками не править.',
  '// Ленивая загрузка: require выполняется только при открытии теории этого урока на этом языке.',
  '/* eslint-disable @typescript-eslint/no-require-imports */',
  'export const LEARNING_V2_THEORY_AVAILABLE: Readonly<Record<string, true>> = {',
  ...names.map((n) => `  "${n.replace(/\.json$/u, '')}": true,`),
  '};',
  '',
  'export function requireLearningV2TheoryJson(key: string): unknown {',
  '  switch (key) {',
  ...names.map((n) => `    case "${n.replace(/\.json$/u, '')}": return require("./${n}");`),
  '    default: return null;',
  '  }',
  '}',
  '',
].join('\n');
if (CHECK) {
  // зачем: «12 · ТЕОРИЯ» дописывает черновики постоянно — новый, ещё не собранный файл не должен валить чужие прогоны.
  // Ошибка — только когда уже собранный файл разошёлся со своим черновиком или черновик не разбирается.
  const missing = names.filter((n) => !existsSync(join(OUT, n)));
  const stale = names.filter((n) => existsSync(join(OUT, n)) && readFileSync(join(OUT, n), 'utf8') !== out.get(n));
  console.log(JSON.stringify({ files: names.length, stale, missing, problems }));
  process.exit(stale.length || problems.length ? 1 : 0);
}
mkdirSync(OUT, { recursive: true });
for (const n of names) writeFileSync(join(OUT, n), out.get(n));
writeFileSync(join(OUT, 'index.ts'), index);
console.log(JSON.stringify({ written: names.length, problems }));
if (problems.length) process.exit(1);
