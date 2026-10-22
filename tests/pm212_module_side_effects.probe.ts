// PM-212 — ратчет «импорт модуля не запускает сеть / подписку / чтение диска /
// большой JSON».
//
// зачем: PM-212 — в 2.0 удалены XP, лиги, Арена, MAX, подарки и т.д., а их
// модули годами делали работу прямо при ИМПОРТЕ (top-level код): таймеры,
// подписки, чтения AsyncStorage, сеть. Такая работа не видна ни в одном
// useEffect, не отменяется и платится на каждом холодном старте. Проба
// сканирует код, который исполняется при вычислении модуля (top-level
// выражения, инициализаторы констант, тела IIFE), и роняет прогон на любом
// запрещённом вызове вне списка ОСОЗНАННЫХ исключений ниже. Список может только
// сокращаться: устаревшая запись тоже роняет пробу.
//
// Запуск: npx tsx tests/pm212_module_side_effects.probe.ts
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'modules', 'hooks'] as const;
const SKIP_DIRS = new Set(['node_modules', '__tests__', 'graphify-out', '__mocks__']);

// Имена вызовов, которые при вычислении модуля означают сеть, подписку,
// таймер, чтение диска или прогрев.
const FORBIDDEN_CALLEE = /^(fetch|setInterval|setTimeout|setImmediate|requestAnimationFrame|requestIdleCallback|queueMicrotask|onSnapshot|on\w+Changed|add\w*Listener|subscribe\w*|getItem|multiGet|getAllKeys|httpsCallable|getDocs?|prefetch\w*|preload\w*|prewarm\w*|warm\w*|prime\w*|runAfterInteractions|loadAsync|createAsync|defineTask|register\w*|start\w*|init\w*|refresh\w*|sync\w*|flush\w*|hydrate\w*|schedule\w*)$/;

type Allow = Readonly<{ count: number; reason: string }>;

// Ключ: `<файл>::<вызов>` (вызов — последнее имя цепочки), либо `<папка>/*::<вызов>`.
// Каждая запись — осознанное решение с причиной. Новую запись добавлять ТОЛЬКО
// с объяснением, почему работа обязана идти при импорте, а не по вызову.
const ALLOW: Record<string, Allow> = {
  // ── Регистрация в памяти (без сети, без диска) ──────────────────────────
  'app/net_status.ts::registerInteractiveNetworkQuietParticipant': { count: 1, reason: 'то же: пауза проб сети на время занятия; проба идёт только при живых подписчиках' },
  'modules/audio/audio_runtime_arbiter.ts::registerStop': { count: 1, reason: 'процессная связка «голос выключен → стоп речи», чистая память' },
  'modules/audio/audio_runtime_arbiter.ts::subscribeManagedAudioMode': { count: 1, reason: 'микрофон главнее воспроизведения — подписка на локальный стор аудиорежима' },
  'modules/audio/celebrationScenePlayer.ts::registerCelebrationSceneRevoker': { count: 1, reason: 'регистрация функции остановки в локальном реестре' },
  'modules/audio/celebrationBackgroundPlayer.ts::subscribeSoundSettings': { count: 1, reason: 'локальный стор настроек звука, без диска и сети' },
  'modules/audio/sound_director.ts::subscribeSoundSettings': { count: 1, reason: 'локальный стор настроек звука' },
  'modules/audio/sound_director.ts::subscribeAudioActivity': { count: 1, reason: 'локальный счётчик аренд аудиотракта' },
  'modules/audio/sound_director.ts::subscribeManagedAudioMode': { count: 1, reason: 'локальный стор аудиорежима' },
  'modules/audio/voice_playback_policy.ts::subscribeSoundSettings': { count: 1, reason: 'локальный стор настроек звука' },
  // Сброс кэшей в памяти при смене аккаунта — шина поколений аккаунта живёт в памяти.
  'app/energy_peek_cache.ts::subscribeAccountGeneration': { count: 1, reason: 'сброс peek-кэша энергии при смене аккаунта (память)' },
  'app/learning_v2_completion_callable_fetch.ts::subscribeAccountGeneration': { count: 1, reason: 'сброс кэша завершений при смене аккаунта (память)' },
  // ── Осознанные прогревы с диска при импорте (одно чтение, без сети) ──────
  'app/energy_peek_cache.ts::primeEnergyPeekFromBoot': { count: 1, reason: 'решение владельца 2026-08-24: EnergyProvider монтируется ВЫШЕ загрузчика снапшота; прогрев из загрузчика опаздывал к первому кадру' },
  'app/runes_system.ts::primeRunesPeekFromBoot': { count: 1, reason: 'та же причина, что у энергии: счётчик рун на первом кадре Главной' },
  // ── Долг чужих зон (снимать там, где их владелец) ──────────────────────
  'app/flashcards/low_power.ts::getItem': { count: 1, reason: 'ДОЛГ PM-212: app/flashcards/* — файлы сессии «Дизайн»; сделать чтение ленивым по первому вызову' },
  'app/flashcards/SoundService.ts::getItem': { count: 2, reason: 'ДОЛГ PM-212: app/flashcards/* — файлы сессии «Дизайн»; сделать чтение ленивым по первому вызову' },
  'app/flashcards/voice_prefs.ts::getItem': { count: 1, reason: 'ДОЛГ PM-212: app/flashcards/* — файлы сессии «Дизайн»; сделать чтение ленивым по первому вызову' },
};

// Статический JSON при импорте: разрешён только осознанно (размер в байтах на
// момент записи, чтобы рост был заметен в ревью).
const ALLOW_JSON: Record<string, string> = {
  'app/privacy_screen.tsx::./legal/privacy_policy_en.json': 'экран политики, 34 КБ, вычисляется только при открытии роута',
  'app/privacy_screen.tsx::./legal/privacy_policy_en_ios.json': 'то же, iOS-вариант 34 КБ',
  'app/terms_screen.tsx::./legal/terms_of_use_en.json': 'экран условий, 24 КБ',
  'app/terms_screen.tsx::./legal/terms_of_use_en_ios.json': 'то же, iOS-вариант 24 КБ',
  'app/product_analytics_event_catalog.ts::./product_analytics_governance.json': 'каталог событий аналитики, 20 КБ, нужен до первого события',
  'modules/learning-v2/content/source/approved_first_ten_source_v2.ts::./approved_first_ten_candidate_v2.json': '3.3 МБ, старая система Learning V2; модуль достаётся только ленивым require() из authored_sessions_v1 (сессии строятся по обращению)',
  'modules/phone-state/legacy_inventory.ts::../../config/phone-state-legacy-inventory.v1.json': '74 КБ, нужен контрольной точке открытия phone-state на старте (auth/покупки)',
};

type Finding = Readonly<{ file: string; callee: string; line: number }>;
type JsonFinding = Readonly<{ file: string; spec: string; line: number }>;

function listSourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
      const abs = path.join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(abs);
    }
  };
  for (const dir of SCAN_DIRS) walk(path.join(root, dir));
  return out;
}

function calleeName(expression: ts.Expression): string {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return '';
}

function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return current;
}

function scanFile(abs: string): { calls: Finding[]; json: JsonFinding[] } {
  const rel = path.relative(root, abs).replace(/\\/g, '/');
  const source = readFileSync(abs, 'utf8');
  const kind = abs.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(abs, source, ts.ScriptTarget.Latest, true, kind);
  const calls: Finding[] = [];
  const json: JsonFinding[] = [];
  const lineOf = (node: ts.Node): number => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const target = unwrap(node.expression);
      // IIFE исполняется при вычислении модуля — сканируем его тело.
      if (ts.isArrowFunction(target) || ts.isFunctionExpression(target)) {
        ts.forEachChild(target.body, visit);
        node.arguments.forEach(visit);
        return;
      }
      const name = calleeName(node.expression);
      if (FORBIDDEN_CALLEE.test(name)) calls.push({ file: rel, callee: name, line: lineOf(node) });
      if (name === 'require' && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]!)
        && node.arguments[0].text.endsWith('.json')) {
        json.push({ file: rel, spec: node.arguments[0].text, line: lineOf(node) });
      }
    }
    // Тела функций и классов не исполняются при импорте.
    if (ts.isFunctionLike(node) || ts.isClassLike(node)) return;
    ts.forEachChild(node, visit);
  };

  for (const statement of sf.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (statement.importClause?.isTypeOnly) continue;
      const spec = (statement.moduleSpecifier as ts.StringLiteral).text;
      if (spec.endsWith('.json')) json.push({ file: rel, spec, line: lineOf(statement) });
      continue;
    }
    visit(statement);
  }
  return { calls, json };
}

function allowKeyFor(finding: Finding): string {
  const exact = `${finding.file}::${finding.callee}`;
  if (ALLOW[exact]) return exact;
  const dirKey = Object.keys(ALLOW).find((key) => {
    const [pattern, callee] = key.split('::');
    return pattern!.endsWith('/*') && callee === finding.callee
      && finding.file.startsWith(pattern!.slice(0, -1));
  });
  return dirKey ?? exact;
}

const files = listSourceFiles();
const counts = new Map<string, Finding[]>();
const jsonFindings: JsonFinding[] = [];
for (const file of files) {
  const { calls, json } = scanFile(file);
  for (const finding of calls) {
    const key = allowKeyFor(finding);
    counts.set(key, [...(counts.get(key) ?? []), finding]);
  }
  jsonFindings.push(...json);
}

const violations: string[] = [];
for (const [key, findings] of counts) {
  const allow = ALLOW[key];
  if (!allow) {
    for (const f of findings) violations.push(`${f.file}:${f.line} вызывает ${f.callee}() при импорте модуля`);
    continue;
  }
  if (findings.length > allow.count) {
    violations.push(`${key}: при импорте ${findings.length} вызовов, разрешено ${allow.count} (${findings.map((f) => `${f.file}:${f.line}`).join(', ')})`);
  }
}
const stale = Object.entries(ALLOW)
  .filter(([key, allow]) => (counts.get(key)?.length ?? 0) < allow.count)
  .map(([key, allow]) => `${key}: осталось ${counts.get(key)?.length ?? 0} из ${allow.count} — сократи запись ALLOW (ратчет)`);

const jsonKeys = new Set(jsonFindings.map((f) => `${f.file}::${f.spec}`));
for (const f of jsonFindings) {
  const key = `${f.file}::${f.spec}`;
  if (!ALLOW_JSON[key]) violations.push(`${f.file}:${f.line} грузит JSON ${f.spec} при импорте модуля`);
}
const staleJson = Object.keys(ALLOW_JSON)
  .filter((key) => !jsonKeys.has(key))
  .map((key) => `${key}: JSON-импорта больше нет — удали запись ALLOW_JSON (ратчет)`);

if (violations.length > 0 || stale.length > 0 || staleJson.length > 0) {
  console.error('[PM-212] module-evaluation side effects:');
  for (const line of [...violations, ...stale, ...staleJson]) console.error(`  - ${line}`);
}
assert.equal(violations.length, 0, `PM-212: ${violations.length} новых side effect при импорте (см. выше). Сделай работу ленивой (по вызову/после первого кадра) или добавь осознанную запись с причиной.`);
assert.equal(stale.length + staleJson.length, 0, 'PM-212: список исключений устарел — сократи его (ратчет может только уменьшаться)');

const allowedCalls = [...counts.values()].reduce((sum, list) => sum + list.length, 0);
console.log(`PM-212 PROBE PASS: files=${files.length} allowedTopLevelCalls=${allowedCalls} allowEntries=${Object.keys(ALLOW).length} allowedJson=${jsonFindings.length}`);
