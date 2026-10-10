// Перенос старых экранов сессии Learning V2 на токены темы: цвета-литералы -> g.*, StyleSheet -> createStyles(g), хук темы.
//
// зачем (координатор 10.10, владелец: цвета по выбранной теме везде): экраны app/learning-v2/session/[id].tsx и
// app/learning_v2_session_intro_check.tsx рисуют свою тёмно-синюю палитру. Скрипт делает ВСЮ механику одним запуском,
// разметку и логику не трогает.
//
//   node scripts/codemod_lv2_session_theme_tokens.mjs            — ТОЛЬКО считает и печатает (файлы НЕ меняются)
//   node scripts/codemod_lv2_session_theme_tokens.mjs --write    — записывает оба файла (если синтаксис цел)
//
// Роли: фон -> bg/bgTop/bgBottom; карточка -> opaqueCard; плашка/поле -> opaqueControl; кант -> glassEdge;
// текст -> text/secondary/mutedText; главная кнопка/активное -> accent/accentInk; верно -> good/goodSoft;
// ошибка -> bad/badSoft; звёзды и золото -> warn; тень -> dropShadow. Цвета семейств режимов (MODE_META.accent,
// градиент режима, свечение) — идентичность режима, помечаются theme-exempt.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import ts from 'typescript';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const WRITE = process.argv.includes('--write');

const TEXT = ['EAF0F6', 'DDE5EE', 'F5F7FA', 'F8FAFC', 'F7F9FB', 'EDF2F7', 'E9EEF4', 'F3F6F9', 'E9F7E2'];
const SECOND = ['ABB7C5', '9BA8B8', '9EABB9', 'AEB9C5', 'BFC9D4', 'B8C4D1', 'D9E1E9', '95A2B1'];
const MUTED = ['7F8B99', '728091', '6F7B89', '83909E', '596273', '7B8492', '9D8F5A', '758395'];
const CONTROL = ['202936', '27313F', '222C39', '202A36', '2A3543', '303746', '2C3949'];
const CARD = ['1B2430', '1A222D', '141B24', '121821', '151B26', '0E1219'];
const EDGE = ['344151', '3A4859', '354252', '273341', '303B49', '3C4655', '3D4A5B', '39485A'];
const GOLD = ['FFD75A', 'F8C84E', 'F8C65C', 'FFF0A8', 'FFF1A8', 'FFF1B8', 'FFF2B5', 'FFF4BD', 'FFF6D1', 'C7B777', 'B9A96A'];

const sliceAlpha = (base, a) => (a ? `\`\${${base}.slice(0, 7)}${a}\`` : base);

function role(hex6, alpha, prop, unknown) {
  const H = hex6.toUpperCase();
  if (TEXT.includes(H)) return 'g.text';
  if (SECOND.includes(H)) return 'g.secondary';
  if (MUTED.includes(H)) return 'g.mutedText';
  if (H === '10151D') return 'g.bg';
  if (CONTROL.includes(H)) return alpha ? sliceAlpha('g.opaqueControl', alpha) : 'g.opaqueControl';
  if (CARD.includes(H)) return alpha ? sliceAlpha('g.opaqueSheet', alpha) : 'g.opaqueCard';
  if (EDGE.includes(H)) return 'g.glassEdge';
  if (H === '111821') return sliceAlpha('g.opaqueSheet', alpha);
  if (H === '090D13') return sliceAlpha('g.bg', alpha);
  if (H === '8EE65A') return prop === 'backgroundColor' ? 'g.accent' : 'g.good';
  if (H === '07110A') return 'g.accentInk';
  if (H === 'F472B6') return 'g.accent';
  if (H === '203A25' || H === '31402D') return 'g.goodSoft';
  if (H === '6FAE50') return 'g.good';
  if (H === 'FF9B9B' || H === 'FB7185') return 'g.bad';
  if (H === '3A2327') return 'g.badSoft';
  if (H === '2D2819' || H === '2B2619') return 'g.warnSoft';
  if (H === '66562A' || H === '6B5726') return sliceAlpha('g.warn', '66');
  if (GOLD.includes(H)) return alpha ? sliceAlpha('g.warn', alpha) : 'g.warn';
  if (H === '5A4100' || H === '000000') return 'g.dropShadow';
  unknown.add(`#${H}${alpha}`);
  return null;
}

const LIT = /(["'])#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})\1/g;

function tokenize(src) {
  let text = src.replace(/\r\n/g, '\n');
  const unknown = new Set();
  let replaced = 0;
  text = text.replace(/colors=\{\[(["'])#10151D\1, (["'])#151B26\2, (["'])#0E1219\3\]\}/g, 'colors={[g.bgTop, g.bgBottom, g.bg]}');
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const l = lines[i];
    if (/theme-exempt:/.test(l)) continue;
    lines[i] = l.replace(LIT, (m, _q, digits, offset) => {
      const h6 = digits.length === 3 ? digits.split('').map((c) => c + c).join('') : digits.slice(0, 6);
      const a = digits.length === 8 ? digits.slice(6) : '';
      const before = l.slice(0, offset);
      const prop = (before.match(/(\w+)\s*(?::|=\s*\{?)\s*$/) || [])[1] || '';
      if (prop === 'accent' || /\[meta\.accent,\s*$/.test(before)) return m; // идентичность режима — ниже помечается exempt
      const e = role(h6, a, prop, unknown);
      if (!e) return m;
      replaced += 1;
      return /=\s*$/.test(before) ? `{${e}}` : e;
    });
  }
  return { text: lines.join('\n'), replaced, unknown };
}

function must(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`не найдено место: ${label}`);
  return text.replace(from, to);
}

const EXEMPT_MODE = ' // theme-exempt: цвет семейства режима — идентичность режима, не поверхность темы';

function sessionScreen(text) {
  let t = text;
  t = must(t, 'import { useLv2Glass } from "../../../components/learning-v2/LearningV2Glass";', 'import { useLv2Glass, type Lv2Glass } from "../../../components/learning-v2/LearningV2Glass";', 'импорт useLv2Glass');
  t = must(t, 'const styles = StyleSheet.create({', 'const createStyles = (g: Lv2Glass) => StyleSheet.create({', 'StyleSheet.create');
  t = must(t, 'function LearningV2LegacySessionScreen() {\n', 'function LearningV2LegacySessionScreen() {\n  // зачем (владелец 10.10): цвета экрана — из токенов выбранной темы, а не своя тёмно-синяя палитра.\n  const g = useLv2Glass();\n  const styles = useMemo(() => createStyles(g), [g]);\n', 'вход в компонент');
  t = must(t, '  const gateGlass = useLv2Glass();\n', '  const gateGlass = useLv2Glass();\n  const styles = useMemo(() => createStyles(gateGlass), [gateGlass]);\n', 'EnergyGate');
  // идентичность режима
  t = t.replace(/^(\s*accent: "#[0-9A-Fa-f]{6}",)$/gm, `$1${EXEMPT_MODE}`);
  t = t.replace(/^(.*\[meta\.accent, "#5872FF"\].*)$/m, `$1${EXEMPT_MODE}`);
  t = t.replace(/^(\s*shadowColor: "#6FD6FF",)$/m, `$1${EXEMPT_MODE}`);
  return t;
}

function introCheck(text) {
  let t = text;
  t = must(t, "import { useLang } from '../components/LangContext';", "import { useLang } from '../components/LangContext';\nimport { useLv2Glass, type Lv2Glass } from '../components/learning-v2/LearningV2Glass';", 'импорт useLang');
  t = must(t, 'const styles = StyleSheet.create({', 'const createStyles = (g: Lv2Glass) => StyleSheet.create({', 'StyleSheet.create');
  t = must(t, '}: LearningV2SessionIntroCheckProps) {\n  const { lang } = useLang();\n', '}: LearningV2SessionIntroCheckProps) {\n  // зачем (владелец 10.10): цвета экрана — из токенов выбранной темы.\n  const g = useLv2Glass();\n  const styles = useMemo(() => createStyles(g), [g]);\n  const { lang } = useLang();\n', 'вход в компонент');
  return t;
}

const FILES = [
  ['app/learning-v2/session/[id].tsx', sessionScreen],
  ['app/learning_v2_session_intro_check.tsx', introCheck],
];

let failed = false;
for (const [rel, structure] of FILES) {
  const path = join(ROOT, rel);
  const raw = readFileSync(path, 'utf8');
  const crlf = raw.includes('\r\n');
  try {
    const step1 = tokenize(raw);
    const text = structure(step1.text);
    const out = ts.transpileModule(text, { fileName: rel, reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext } });
    const errors = out.diagnostics?.length ?? 0;
    console.log(`${rel}: заменено цветов ${step1.replaced}; синтаксических ошибок ${errors}; не сопоставлено: ${[...step1.unknown].join(' ') || '—'}`);
    if (errors) { failed = true; continue; }
    if (WRITE) {
      writeFileSync(path, crlf ? text.replace(/\n/g, '\r\n') : text);
      console.log(`  записано: ${rel}`);
    }
  } catch (e) {
    failed = true;
    console.log(`${rel}: ОШИБКА ${e instanceof Error ? e.message : String(e)}`);
  }
}
console.log(WRITE ? 'режим: ЗАПИСЬ' : 'режим: ТОЛЬКО ПРОСМОТР — файлы не менялись (для записи добавьте --write)');
process.exit(failed ? 1 : 0);
