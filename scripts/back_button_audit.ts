/**
 * Аудит кнопки «назад» по коду (только чтение исходников) → docs/work/back-button-audit-2026-10-26.md.
 *
 * зачем (координатор 25.10, приказ владельца «последовательность кнопки назад на всех экранах, подэкранах»): для каждого маршрута
 * app/** сравнить, куда «назад» ведёт по коду, и куда должна по реестру ролей маршрутов (app/navigation_back.ts →
 * navigationFallbackForPath). Компонент «назад» — один, общий: components/v2/ScreenBackButton.tsx (позиция по kit.css). Плюс
 * Android BackHandler и свайп iOS (gestureEnabled). Детерминированно: тот же код → тот же отчёт.
 *   npx tsx scripts/back_button_audit.ts [--json <путь>]
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
// зачем (Макеты e9d51db21): общая кнопка рисуется не только <ScreenBackButton> — распознавание всех её экспортов в одном модуле, его же проверяет тест
import { sharedBackTag, sharedCloseTag } from './back_button_audit_detect.mjs';

const ROOT = path.resolve(__dirname, '..');

/**
 * Реестр ролей маршрутов — из самого app/navigation_back.ts (транспиляция в CJS). Единственный импорт модуля, трассировка
 * закрытия пейвола, подменяется пустой функцией: через config она тянет react-native, а он в node не грузится.
 */
type NavBackAudit = {
  navigationFallbackForPath: (p: string) => string;
  navigationRoutePolicyForAudit: (p: string) => { role: string; section: string | null };
};
function loadNavigationBack(): NavBackAudit {
  const source = fs.readFileSync(path.join(ROOT, 'app/navigation_back.ts'), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  const req = (name: string): unknown => {
    if (name === './paywall_close_trace') return { paywallCloseMark: () => undefined };
    throw new Error(`back_button_audit: неожиданный импорт navigation_back → ${name}`);
  };
  // eslint-disable-next-line no-new-func
  new Function('require', 'module', 'exports', js)(req, mod, mod.exports);
  return mod.exports as unknown as NavBackAudit;
}
const { navigationFallbackForPath, navigationRoutePolicyForAudit } = loadNavigationBack();
const OUT = path.join(ROOT, 'docs/work/back-button-audit-2026-10-26.md');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    const stat = fs.statSync(path.join(ROOT, rel));
    if (stat.isDirectory()) { if (name !== 'node_modules' && !name.startsWith('.')) walk(rel, out); }
    else if (/\.tsx$/.test(name)) out.push(rel);
  }
  return out;
}

/** app/(tabs)/home.tsx → /(tabs)/home; app/x/index.tsx → /x. */
function routeOf(rel: string): string {
  const p = rel.replace(/^app/, '').replace(/\.tsx$/, '').replace(/\/index$/, '');
  return p === '' ? '/' : p;
}

const OWN_BACK = /\b(BackButton|PracticeBackButton|DialogueGlassBackButton|ResultsGlassBackButton|BackGlyph)\b|['"](chevron-back|arrow-back|chevron-left|arrow-left)[^'"]*['"]/;
const CLOSE_UI = /['"](close|close-outline|close-circle)['"]|testID=\{?['"][^'"]*close[^'"]*['"]/i;

const baselineRaw = JSON.parse(read('config/screen_back_baseline.json')) as unknown;
const baseline = new Set<string>(Array.isArray(baselineRaw) ? baselineRaw as string[] : ((baselineRaw as { files?: string[] }).files ?? Object.keys(baselineRaw as object)));

/** Зона по пути — для раздачи владельцам (координатор уточнит). */
function zoneOf(route: string): string {
  const r = route.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/flashcard|cards|collection|deck|community_pack/, 'Карточки'],
    [/dialog|dialogue|ai_dialog|ai_companion|speaking|premium_dialog/, 'Диалоги'],
    [/spire|peak|tower/, 'Пик'],
    [/learning_v2|lesson|exam|theory|mistake|practice|chapter|course|season/, 'Обучение (Learning V2)'],
    [/lingman|video|youtube|playlist/, 'Видео'],
    [/premium|paywall|plus|subscription|vip/, 'Пейвол / Plus'],
    [/auth|account|sign|login|delete|privacy|settings|profile|notification|reminder|support|legal|terms/, 'Вход, аккаунт, настройки'],
    [/streak|achievement|moment|coin|rank|shop|wallet|statistic|hall_of_fame|level/, 'Моменты / монеты'],
    [/theme|appearance/, 'Темы'],
    [/friend|referral|invite|duel|social/, 'Друзья'],
    [/onboarding|welcome|intro/, 'Онбординг'],
    [/dev_|_preview|debug/, 'dev (не в релизе)'],
  ];
  return rules.find(([rx]) => rx.test(r))?.[1] ?? '?';
}

type Row = {
  file: string; route: string; role: string; section: string | null; expected: string;
  back: string; position: string; leads: string; android: string; ios: string; flags: string[]; zone: string;
};

/** Второй аргумент каждого safeRouterBack(router, …) целиком: скобки и кавычки внутри ('/(tabs)/home') не обрывают разбор. */
function safeBackFallbacks(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/safeRouterBack\(/g)) {
    let i = (m.index ?? 0) + m[0].length;
    let depth = 1;
    let quote: string | null = null;
    const start = i;
    for (; i < src.length && depth > 0; i += 1) {
      const ch = src[i];
      if (quote) { if (ch === quote && src[i - 1] !== '\\') quote = null; continue; }
      if (ch === '"' || ch === "'" || ch === '`') quote = ch;
      else if (ch === '(' || ch === '{' || ch === '[') depth += 1;
      else if (ch === ')' || ch === '}' || ch === ']') depth -= 1;
    }
    const args = src.slice(start, i - 1);
    const comma = args.indexOf(',');
    out.push((comma < 0 ? 'HOME' : args.slice(comma + 1)).replace(/\s+/g, ' ').replace(/\s+as\s+\w+\s*$/, '').trim() || 'HOME');
  }
  return out;
}

/** Локальные импорты файла (относительные пути) → существующие файлы. */
function localImports(fromRel: string, src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/(?:from|import\()\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), m[1]));
    for (const cand of [`${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`]) {
      if (fs.existsSync(path.join(ROOT, cand))) { out.push(cand); break; }
    }
  }
  return out;
}
/**
 * зачем: экраны рисуют «назад» через общие шапки (PracticeChrome, шапка Пика, SectionSheetHeader…). Смотрим импорты на две
 * ступени вглубь (кроме app/navigation_back и самой ScreenBackButton): чья обёртка рисует общую кнопку или свою.
 */
function backViaImports(fileRel: string, src: string): { shared: string | null; sharedTag: string | null; sharedClose: string | null; own: string | null } {
  let shared: string | null = null;
  let sharedTag: string | null = null;
  let sharedClose: string | null = null;
  let own: string | null = null;
  const seen = new Set<string>([fileRel]);
  let level = localImports(fileRel, src);
  for (let depth = 0; depth < 2 && level.length; depth += 1) {
    const next: string[] = [];
    for (const dep of level) {
      if (seen.has(dep) || dep === 'components/v2/ScreenBackButton.tsx') continue;
      seen.add(dep);
      const depSrc = read(dep);
      const depTag = sharedBackTag(depSrc);
      if (!shared && depTag) { shared = dep; sharedTag = depTag; }
      if (!sharedClose && sharedCloseTag(depSrc)) sharedClose = dep;
      if (!own && OWN_BACK.test(depSrc) && /<(BackButton|PracticeBackButton|DialogueGlassBackButton|ResultsGlassBackButton|BackGlyph)\b/.test(depSrc)) own = dep;
      if (dep.startsWith('components/')) next.push(...localImports(dep, depSrc));
    }
    level = next;
  }
  return { shared, sharedTag, sharedClose, own };
}

/**
 * Куда в коде есть переходы: строковые пути '/…' в app, components, modules, hooks (router.push/replace, href, next=…).
 * зачем: expo-router делает маршрутом КАЖДЫЙ файл app/** с export default — в app/flashcards/ лежат обычные компоненты
 * (строки списка, кнопки), на которые никто не переходит. Экраном считаем маршрут, на который есть переход.
 */
function collectNavigatedPaths(): Set<string> {
  const out = new Set<string>();
  const files: string[] = [];
  const walkAll = (dir: string): void => {
    if (!fs.existsSync(path.join(ROOT, dir))) return;
    for (const name of fs.readdirSync(path.join(ROOT, dir))) {
      const rel = `${dir}/${name}`;
      const stat = fs.statSync(path.join(ROOT, rel));
      if (stat.isDirectory()) { if (name !== 'node_modules' && !name.startsWith('.') && name !== '__tests__') walkAll(rel); }
      else if (/\.(tsx?|jsx?)$/.test(name) && !/\.test\./.test(name) && !/\.generated\./.test(name)) files.push(rel);
    }
  };
  for (const dir of ['app', 'components', 'modules', 'hooks']) walkAll(dir);
  for (const rel of files) {
    for (const m of read(rel).matchAll(/['"`](\/[A-Za-z0-9_\-()/[\]]+)/g)) {
      const p = m[1].replace(/\/+$/, '');
      out.add(p);
      out.add(p.replace(/^\/\(tabs\)/, ''));
    }
  }
  return out;
}
const navigated = collectNavigatedPaths();
const isNavigated = (route: string): boolean => navigated.has(route) || navigated.has(route.replace(/^\/\(tabs\)/, ''))
  || /\[[^\]]+\]/.test(route); // динамические маршруты считаем экранами

const rows: Row[] = [];
const skippedNotScreens: string[] = [];
for (const file of walk('app').sort()) {
  const base = path.basename(file);
  if (base.startsWith('_') || base.startsWith('+')) continue;
  const src = read(file);
  if (!/export default/.test(src)) continue;
  const route = routeOf(file);
  // не экран: компонент в app/ без переходов на него (или служебный модуль с заглушкой маршрута)
  if (!isNavigated(route) || /export default function __RouteShim/.test(src)) { skippedNotScreens.push(file); continue; }
  const policy = navigationRoutePolicyForAudit(route);
  const expected = policy.role === 'root' ? '—' : navigationFallbackForPath(route);
  const via = backViaImports(file, src);
  const sharedDirect = sharedBackTag(src);
  const usesShared = sharedDirect !== null || via.shared !== null;
  const ownDirect = OWN_BACK.exec(src)?.[0]?.replace(/['"]/g, '') ?? null;
  const own = ownDirect ?? (via.own ? `через ${via.own}` : null);
  const close = CLOSE_UI.test(src) || sharedCloseTag(src) !== null || via.sharedClose !== null;
  const back = usesShared ? (sharedDirect ?? `${via.sharedTag} через ${via.shared}`) : own ? `своя: ${own}` : close ? 'нет («закрыть»)' : 'нет';
  const position = usesShared ? 'общая (20 / 48 / безопасный верх)' : own ? 'своя' : '—';
  const fallbacks = safeBackFallbacks(src);
  const routerBack = (src.match(/\brouter\.back\(\)/g) ?? []).length;
  const replaces = (src.match(/\brouter\.replace\(/g) ?? []).length;
  const dismissTab = /dismissToTabRoute\(/.test(src);
  const leadsParts: string[] = [];
  if (fallbacks.length) leadsParts.push(`safeRouterBack → ${[...new Set(fallbacks)].join(' | ')}`);
  if (routerBack) leadsParts.push(`router.back ×${routerBack}`);
  if (dismissTab) leadsParts.push('dismissToTabRoute');
  if (replaces) leadsParts.push(`replace ×${replaces}`);
  const leads = leadsParts.join('; ') || '—';
  const android = /BackHandler\.addEventListener/.test(src) ? 'своя (BackHandler)' : 'общая';
  const ios = /gestureEnabled:\s*false/.test(src) ? 'свайп выключен' : 'свайп';
  const flags: string[] = [];
  const nonRoot = policy.role !== 'root';
  if (nonRoot && back.startsWith('нет') && !route.includes('dev_')) flags.push(back === 'нет' ? 'НЕТ «назад»' : 'только «закрыть»');
  if (nonRoot && own && !usesShared) flags.push('нестандартная кнопка');
  if (routerBack > 0 && fallbacks.length === 0) flags.push('router.back мимо safeRouterBack');
  const literalFallbacks = fallbacks.filter((f) => /^['"`]/.test(f)).map((f) => f.replace(/^['"`]|['"`]$/g, '').split('?')[0]);
  // у портала fallback зависит от раздела-источника (navigationFallbackForPath смотрит текущую запись) — сверяем только дочерние
  if (policy.role === 'child' && literalFallbacks.some((f) => f !== expected.split('?')[0])) flags.push(`fallback ≠ реестр (${expected})`);
  // роль unknown: popBackCandidate сбрасывает историю (leaving.section === null) — «назад» всегда на fallback, а не к открывшему
  if (policy.role === 'unknown' && !route.includes('dev_') && !/_preview$/.test(route)) flags.push('нет в реестре ролей — «назад» сбрасывает историю на fallback');
  if (policy.role === 'root' && (usesShared || own)) flags.push('«назад» на корневом экране');
  if (android.startsWith('своя')) flags.push('своя Android-назад — проверить логом');
  rows.push({ file, route, role: policy.role, section: policy.section, expected, back, position, leads, android, ios, flags, zone: zoneOf(route) });
}

const esc = (s: string): string => s.replace(/\|/g, '/');

/**
 * Правда эталонов от Макетов (988d643cd): что на макете и вывод по экрану. Ключ — маршрут без начального слэша.
 * зачем (координатор 26.10): сканер читает код, а гейт «приложение = макет» главнее — у каждой находки рядом эталон.
 */
const MOCKUP_TRUTH = 'docs/work/back-button-mockup-truth-2026-10-26.md';
const mockupTruth = new Map<string, string>();
if (fs.existsSync(path.join(ROOT, MOCKUP_TRUTH))) {
  for (const line of read(MOCKUP_TRUTH).split(/\r?\n/)) {
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 6 || !cells[1] || cells[1] === 'Экран' || /^-+$/.test(cells[1])) continue;
    const etalon = cells[2].replace(/\*\*/g, '').replace(/\s*\(.*$/, '').trim();
    const verdict = cells[cells.length - 2].replace(/\*\*/g, '').replace(/[:：].*$/, '').trim();
    mockupTruth.set(cells[1].replace(/^\//, ''), `${etalon} → ${verdict}`.slice(0, 90));
  }
}
const etalonOf = (route: string): string => mockupTruth.get(route.replace(/^\//, '')) ?? '—';
const flagged = rows.filter((r) => r.flags.length && r.zone !== 'dev (не в релизе)');
const count = (pred: (r: Row) => boolean): number => rows.filter(pred).length;
const lines: string[] = [];
lines.push('# Аудит кнопки «назад» — все маршруты app/** (25→26.10)', '');
lines.push('Governance-ID: TG-03C9A99A4B85');
lines.push('Собрал 1 · ЯДРО скриптом `scripts/back_button_audit.ts` (только чтение исходников, детерминированно). «Должна» — fallback по реестру ролей `app/navigation_back.ts` (`navigationFallbackForPath`); у корневых — «—».', '');
lines.push('## Сводка', '');
lines.push(`- маршрутов-экранов: ${rows.length}; корневых: ${count((r) => r.role === 'root')}; dev-экранов: ${count((r) => r.zone === 'dev (не в релизе)')}`);
lines.push(`- общая ScreenBackButton (вкл. SafeTopBackButton): ${count((r) => r.back === 'ScreenBackButton' || r.back === 'SafeTopBackButton')}; своя кнопка: ${count((r) => r.back.startsWith('своя'))}; без «назад»: ${count((r) => r.back === 'нет' && r.role !== 'root')}; только «закрыть»: ${count((r) => r.back.startsWith('нет («') && r.role !== 'root')}`);
lines.push(`- router.back мимо safeRouterBack: ${count((r) => r.flags.includes('router.back мимо safeRouterBack'))}; fallback не как в реестре: ${count((r) => r.flags.some((f) => f.startsWith('fallback')))}; своя Android-назад: ${count((r) => r.android.startsWith('своя'))}; свайп iOS выключен: ${count((r) => r.ios !== 'свайп')}`);
lines.push(`- в базе непереведённых (config/screen_back_baseline.json): ${baseline.size}`);
lines.push(`- не экраны (компоненты в app/ без переходов на них, заглушки маршрутов) — в таблицы не вошли: ${skippedNotScreens.length}`, '');
// ручной разбор (что из находок — настоящее, что шум сканера, кому чинить) живёт отдельно: повторный прогон его не сотрёт
const NOTES = 'docs/work/back-button-audit-notes-2026-10-26.md';
if (fs.existsSync(path.join(ROOT, NOTES))) lines.push(read(NOTES).trim(), '');
lines.push('## Находки сканера (без dev-экранов)', '');
lines.push(`Колонка «эталон» — из таблицы Макетов [${MOCKUP_TRUTH}](${MOCKUP_TRUTH.replace('docs/work/', '')}) (988d643cd): что на макете → вывод. «—» — эталон по этому экрану ещё не сверен; находка без эталона в правку не идёт.`, '');
lines.push('| экран | маршрут | роль · раздел | «назад» | ведёт | должна | Android | iOS | что не так | эталон | зона |', '|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of flagged) lines.push(`| ${r.file} | ${esc(r.route)} | ${r.role}${r.section ? ` · ${r.section}` : ''} | ${esc(r.back)} | ${esc(r.leads)} | ${esc(r.expected)} | ${r.android} | ${r.ios} | ${esc(r.flags.join('; '))} | ${esc(etalonOf(r.route))} | ${r.zone} |`);
lines.push('', '## Все экраны', '');
lines.push('| экран | есть/нет | компонент | позиция | ведёт | должна | Android | iOS | эталон | зона |', '|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) lines.push(`| ${r.file} | ${r.role === 'root' ? 'корень' : r.back.startsWith('нет') ? 'нет' : 'есть'} | ${esc(r.back)} | ${r.position} | ${esc(r.leads)} | ${esc(r.expected)} | ${r.android} | ${r.ios} | ${esc(etalonOf(r.route))} | ${r.zone} |`);
// зачем (координатор 26.10: «раздел Дизайна не трогай»): разделы других сессий живут ниже маркера — пересборка их переносит, а не стирает
const FOREIGN_MARK = '## Разделы других сессий';
const previous = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
const foreignAt = previous.indexOf(FOREIGN_MARK);
const foreign = foreignAt >= 0 ? previous.slice(foreignAt).trimEnd() : `${FOREIGN_MARK}\n\nСюда — свои разделы (Дизайн, владельцы зон). Пересборка скрипта переносит всё ниже этого заголовка как есть.`;
lines.push('', foreign);
fs.writeFileSync(OUT, `${lines.join('\n')}\n`, 'utf8');
const jsonAt = process.argv.indexOf('--json');
if (jsonAt > 0) fs.writeFileSync(process.argv[jsonAt + 1], JSON.stringify(rows, null, 1), 'utf8');
console.log('[BACK-AUDIT]', JSON.stringify({ screens: rows.length, flagged: flagged.length, out: path.relative(ROOT, OUT) }));
