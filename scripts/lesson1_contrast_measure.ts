// Запуск: npx tsx scripts/lesson1_contrast_measure.ts > out.md
// зачем (координатор 25.10, после находки в SpeakingPanel efbcf6f17 — 230 давних нарушений): классический урок целиком (app/lesson1.tsx
// и его компоненты: плитки слов, ввод, подсказки, итог урока, «Мои ошибки») во всех 29 темах × светлая/тёмная × Спокойно/Акцент/Максимум.
// Только изучение. Как работает: статический разбор кода — в каждом стиле ищем цвет текста/значка (`color:` / `color={…}`) и подложку
// В ТОМ ЖЕ объекте/строке (`backgroundColor:`). Цвет из токенов (glass./g./tokens. → liquidGlassTokens; t./theme. → makeLiquidGlassTheme;
// константа-литерал → как есть) считается во всех 174 сочетаниях. Если подложки рядом нет — меряем на фоне экрана и на карточке и
// помечаем «подложка не рядом»: такие строки владелец зоны проверяет глазами (текст мог лежать на своей плашке).
// Пороги: текст 4,5, значок (Ionicons / ActivityIndicator) 3,0. Владелец — область последнего коммита в файле.
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens, makeLiquidGlassTheme } from '../constants/liquidGlassThemePalette';
import { flattenOver } from '../constants/liquidGlassSurfaceRoles';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
import { semanticInk } from '../constants/liquidGlassSemanticInk';
import { mpColors } from '../components/mistakes-panel/panelPaint';

const ROOT = path.join(__dirname, '..');
const DIRS = ['components/practice', 'components/speech', 'components/feedback', 'components/session_attempts', 'components/results',
  'components/lesson_exit', 'components/lesson_moments', 'components/mistakes-panel', 'components/mistake-practice'];
const FILES = ['app/lesson1.tsx', ...['LessonReviewSheet', 'AiMistakeCard', 'BilingualMistakeText', 'MistakeEli5Modal', 'MistakeEli5ModalHybrid', 'ExplainSheet',
  'NoEnergyModal', 'SpeechUnavailableNote', 'MicAllowanceBadge', 'PracticeRuneCounter', 'EnergyBar', 'SpeakingInlineSlot', 'SpeakingInlineResultStars',
  'LessonEnergyLightning', 'LessonLoadingSkeleton'].map((n) => `components/${n}.tsx`)];
for (const d of DIRS) {
  const abs = path.join(ROOT, d);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs)) if (/\.tsx$/.test(f) && !/\.test\./.test(f)) FILES.push(`${d}/${f}`);
}

type Src = 'glass' | 'theme' | 'lit' | 'ink' | 'mp';
type Ref = { src: Src; key: string };
const GLASS = /^(glass|g|tokens|lg|pg|gl|mTheme_never)$/;
const THEME = /^(t|theme|mTheme|th|appTheme)$/;
function refOf(expr: string): Ref | null {
  const e = expr.trim().replace(/[,}\]\s]+$/, '');
  const lit = /^['"`](#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?|rgba?\([^)]*\))['"`]$/.exec(e);
  if (lit) return { src: 'lit', key: lit[1]! };
  const si = /^semanticInk\((?:glass|g)\)\.(goodText|badText)$/.exec(e);
  if (si) return { src: 'ink', key: si[1]! };
  const mp = /^mpColors\((?:glass|g)\)\.([a-zA-Z]+)$/.exec(e);
  if (mp) return { src: 'mp', key: mp[1]! };
  const m = /^([a-zA-Z_]+)\.([a-zA-Z]+)$/.exec(e);
  if (!m) return null;
  if (GLASS.test(m[1]!)) return { src: 'glass', key: m[2]! };
  if (THEME.test(m[1]!)) return { src: 'theme', key: m[2]! };
  return null;
}
type Pair = { file: string; line: number; fg: Ref; bg: Ref | null; icon: boolean; code: string };
const pairs: Pair[] = [];
const unresolved: { file: string; line: number; code: string }[] = [];
const inkNoBg: { file: string; line: number; code: string }[] = [];
for (const file of FILES) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) continue;
  const lines = fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n').split('\n');
  lines.forEach((raw, i) => {
    const l = raw.replace(/\/\/.*$/, '');
    if (/^\s*(\*|\/\*)/.test(raw)) return;
    const fgs = [...l.matchAll(/(?:^|[{\s,])color(?:\s*:\s*|=\{)([^,}]+?)(?=[,}]|\s*\}|\s*\/>|$)/g)].map((m) => m[1]!);
    if (!fgs.length) return;
    // подложка: в той же строке, иначе у ближайшей строки выше с меньшим отступом, где есть backgroundColor (родитель в JSX)
    const indent = (x: string): number => x.length - x.trimStart().length;
    let bgM = /backgroundColor\s*:\s*([^,}]+)/.exec(l);
    if (!bgM) {
      let cur = indent(raw);
      for (let k = i - 1; k >= Math.max(0, i - 40); k--) {
        const up = lines[k]!; if (!up.trim()) continue;
        const ind = indent(up);
        if (ind < cur) { const m = /backgroundColor\s*:\s*([^,}]+)/.exec(up.replace(/\/\/.*$/, '')); if (m && /<|style=|\[/.test(up)) { bgM = m; break; } cur = ind; if (ind === 0) break; }
      }
    }
    const bg = bgM ? refOf(bgM[1]!) : null;
    // только текст и значки (разделители и рамки с color= — не текст)
    if (!/<(Text|Animated\.Text|FlowText|Ionicons|ActivityIndicator|MaterialCommunityIcons|Feather)\b|color\s*:/.test(l) || /<(RowDivider|Divider|Separator)\b/.test(l)) return;
    const icon = /<(Ionicons|ActivityIndicator|MaterialCommunityIcons|Feather)\b/.test(l);
    const branches = (x: string): string[] => {
      const q = x.indexOf('?'); if (q < 0) return [x];
      const rest = x.slice(q + 1); const c = rest.lastIndexOf(':'); if (c < 0) return [x];
      return [...branches(rest.slice(0, c).replace(/^\s*\(/, '')), ...branches(rest.slice(c + 1).replace(/\)\s*$/, ''))];
    };
    for (const f of fgs.flatMap((x) => branches(x.replace(/^\{/, '')))) {
      const ref = refOf(f);
      if (!ref) { if (/['"`#]|\.\w+/.test(f)) unresolved.push({ file, line: i + 1, code: l.trim().slice(0, 110) }); continue; }
      if (!bg && /^(accentInk|ctaInk|ctaFillInk|textOnGold|correctText|onAccent|mediaInk|mediaInkSoft|buttonInkDisabled|accentOn)$/.test(ref.key)) { inkNoBg.push({ file, line: i + 1, code: l.trim().slice(0, 110) }); continue; }
      pairs.push({ file, line: i + 1, fg: ref, bg, icon, code: l.trim().slice(0, 110) });
    }
  });
}

type G = ReturnType<typeof liquidGlassTokens>;
type T = ReturnType<typeof makeLiquidGlassTheme>;
const pick = (r: Ref, g: G, t: T): string | null => {
  if (r.src === 'lit') return r.key;
  if (r.src === 'ink') return (semanticInk(g) as Record<string, string>)[r.key] ?? null;
  if (r.src === 'mp') { const v = (mpColors(g) as unknown as Record<string, unknown>)[r.key]; return typeof v === 'string' ? v : null; }
  const v = (r.src === 'glass' ? (g as unknown as Record<string, unknown>)[r.key] : (t as unknown as Record<string, unknown>)[r.key]);
  return typeof v === 'string' && /^(#|rgb)/.test(v) ? v : null;
};
type Res = { p: Pair; min: number; where: string; bad: number; total: number; assumed: boolean };
const res: Res[] = [];
const COMBOS: [string, string, string][] = [];
for (const app of ['light', 'dark']) for (const level of ['calm', 'accent', 'max']) for (const id of LIQUID_GLASS_THEME_IDS) COMBOS.push([id, level, app]);
const ctx = COMBOS.map(([id, level, app]) => {
  const g = liquidGlassTokens(id as never, { level, appearance: app } as never);
  const t = makeLiquidGlassTheme(id as never, {} as never, { level, appearance: app } as never);
  const screen = flattenOver(g.bg, '#000000');
  return { id, level, app, g, t, screen, card: flattenOver(g.opaqueCard, screen) };
});
for (const p of pairs) {
  let min = 99, where = '', bad = 0, total = 0;
  const thr = p.icon ? 3 : 4.5;
  for (const c of ctx) {
    const fg = pick(p.fg, c.g, c.t); if (!fg) continue;
    const bgs = p.bg ? [pick(p.bg, c.g, c.t)].filter((x): x is string => !!x).map((b) => flattenOver(b, c.screen)) : [c.screen, c.card];
    if (!bgs.length) continue;
    total++;
    const v = Math.min(...bgs.map((b) => contrastRatio(flattenOver(fg, b), b)));
    if (v < thr) bad++;
    if (v < min) { min = v; where = `${c.id} · ${c.app === 'light' ? 'светлая' : 'тёмная'} · ${c.level}`; }
  }
  if (total) res.push({ p, min, where, bad, total, assumed: !p.bg });
}
const owner = new Map<string, string>();
const ownerOf = (f: string): string => {
  if (owner.has(f)) return owner.get(f)!;
  let v = '—';
  try { const s = execFileSync('git', ['log', '-1', '--format=%h %s', '--', f], { cwd: ROOT, encoding: 'utf8' }).trim(); const scope = /^\w+ \w+\(([^)]+)\)/.exec(s)?.[1] ?? /\[([A-Z0-9-]+)\]/.exec(s)?.[1] ?? s.slice(8, 40); v = `${scope} · ${s.slice(0, 9)}`; } catch (e) { v = `git log: ${e instanceof Error ? e.message.slice(0, 40) : 'ошибка'}`; }
  owner.set(f, v); return v;
};
const f2 = (n: number): string => n.toFixed(2).replace('.', ',');
const name = (r: Ref): string => (r.src === 'lit' ? `\`${r.key}\`` : r.src === 'ink' ? `semanticInk.${r.key}` : r.src === 'mp' ? `mpColors.${r.key}` : `${r.src === 'glass' ? 'glass' : 'theme'}.${r.key}`);
const failing = res.filter((r) => r.bad > 0).sort((a, b) => Number(a.assumed) - Number(b.assumed) || a.min - b.min);
console.log(`Файлов: ${FILES.filter((f) => fs.existsSync(path.join(ROOT, f))).length}, пар цвет/подложка: ${res.length} (подложка рядом: ${res.filter((r) => !r.assumed).length}), не разобрано выражений: ${unresolved.length}`);
console.log(`Нарушают хотя бы в одном сочетании: ${failing.length} (подложка рядом: ${failing.filter((r) => !r.assumed).length})`);
console.log('\n| Файл:строка | Цвет | Подложка | Порог | Минимум | Где | Нарушений | Владелец | Код |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const r of failing) console.log(`| ${r.p.file}:${r.p.line} | ${name(r.p.fg)} | ${r.p.bg ? name(r.p.bg) : '_не рядом: экран и карточка_'} | ${r.p.icon ? '3,00' : '4,50'} | ${f2(r.min)} | ${r.where} | ${r.bad} из ${r.total} | ${ownerOf(r.p.file)} | \`${r.p.code.replace(/\|/g, '¦')}\` |`);
console.log(`\nПРОХОДЯТ во всех сочетаниях: ${res.length - failing.length} пар.`);
console.log(`\nЧЕРНИЛА ЗАЛИВОК без найденной подложки (не мерены, проверить глазами): ${inkNoBg.length}`);
for (const x of inkNoBg) console.log(`- ${x.file}:${x.line} \`${x.code.replace(/\|/g, '¦')}\``);
console.log(`\nНЕ РАЗОБРАНО (цвет из локальной переменной/палитры экрана): ${unresolved.length}`);
for (const x of unresolved) console.log(`- ${x.file}:${x.line} \`${x.code.replace(/\|/g, '¦')}\``);

// ── ручные пары: чернила заливок, у которых автомат не нашёл подложку (подложка найдена глазами по коду) ──
// зачем: бейдж счётчика подсказок в lesson1.tsx (~1650–1661) — цифра accentInk на cta, а без подсказок на mutedText; это не пара темы
const MANUAL: { id: string; what: string; fg: (g: G) => string; bg: (g: G) => string; thr: number }[] = [
  { id: 'B1', what: 'lesson1 бейдж подсказок: accentInk на cta (подсказки есть)', fg: (g) => g.accentInk, bg: (g) => g.cta, thr: 4.5 },
  { id: 'B2', what: 'lesson1 бейдж подсказок: accentInk на mutedText (подсказок нет)', fg: (g) => g.accentInk, bg: (g) => g.mutedText, thr: 4.5 },
  { id: 'B1*', what: 'замена: ctaInk на cta', fg: (g) => g.ctaInk, bg: (g) => g.cta, thr: 4.5 },
  { id: 'B2*', what: 'замена: buttonInkDisabled на buttonFillDisabled', fg: (g) => g.buttonInkDisabled, bg: (g) => g.buttonFillDisabled, thr: 4.5 },
  { id: 'W1', what: 'lesson1 плитка слова при вспышке: ctaInk на cta', fg: (g) => g.ctaInk, bg: (g) => g.cta, thr: 4.5 },
  { id: 'A1', what: 'accentInk на accent (NoEnergyModal, ResultsSequence, PanelKit, PracticeKit)', fg: (g) => g.accentInk, bg: (g) => g.accent, thr: 4.5 },
  { id: 'A2', what: 'ctaFillInk на ctaFill (PanelKit, кнопка)', fg: (g) => g.ctaFillInk, bg: (g) => g.ctaFill, thr: 4.5 },
];
console.log('\n### Ручные пары (подложка найдена по коду глазами)\n');
console.log('| № | Что | Порог | Минимум | Где | Нарушений |');
console.log('|---|---|---|---|---|---|');
for (const m of MANUAL) {
  let min = 99, where = '', bad = 0;
  for (const c of ctx) { const v = contrastRatio(m.fg(c.g), m.bg(c.g)); if (v < m.thr) bad++; if (v < min) { min = v; where = `${c.id} · ${c.app === 'light' ? 'светлая' : 'тёмная'} · ${c.level}`; } }
  console.log(`| ${m.id} | ${m.what} | ${f2(m.thr)} | ${f2(min)} | ${where} | ${bad ? `**${bad} из ${ctx.length}**` : `0 из ${ctx.length}`} |`);
}
