#!/usr/bin/env node
/**
 * PostToolUse hook: контракт стабильности лэйаута («первый кадр = финальная
 * геометрия», AGENTS.md → Performance Bible → Layout stability).
 *
 * зачем: владелец требует Bevel-уровень открытия экранов. Хук ловит нарушения
 * СРАЗУ при правке файла — до тестов и CI, чтобы ИИ-сессия исправила их в том же
 * ходу. Жёсткий гейт — tests/layout_stability_contract.test.ts (тот же baseline).
 *
 * Паттерны и baseline (config/layout-stability-baseline.json) обязаны совпадать
 * с контракт-тестом: меняете здесь — меняйте и там.
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

const filePath = payload?.tool_input?.file_path
  || payload?.tool_response?.filePath
  || payload?.tool_input?.path
  || '';
if (!filePath) process.exit(0);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const relative = path.relative(ROOT, path.resolve(String(filePath))).replace(/\\/g, '/');

const inScope = /^(app|components|hooks)\//.test(relative) && /\.(ts|tsx)$/.test(relative);
if (!inScope || relative === 'app/stable_safe_area_metrics.ts') process.exit(0);

let source = '';
try {
  source = fs.readFileSync(path.join(ROOT, relative), 'utf8');
} catch {
  process.exit(0);
}

let baseline = { adjustsFontSizeToFit: {}, rawSafeAreaInsets: {}, loadingReturnsNull: {} };
try {
  baseline = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'layout-stability-baseline.json'), 'utf8'));
} catch {
  // baseline недоступен — проверяем «с нуля» (любое вхождение = предупреждение)
}

function isCommentLine(line) {
  const trimmed = line.trimStart();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

function countAdjustsFontSizeToFit(src) {
  let count = 0;
  for (const line of src.split('\n')) {
    if (isCommentLine(line)) continue;
    const matches = line.match(/\badjustsFontSizeToFit\b/g);
    if (matches) count += matches.length;
  }
  return count;
}

const RAW_INSETS_IMPORT_RE =
  /import\s*\{[^}]*\buseSafeAreaInsets\b[^}]*\}\s*from\s*['"]react-native-safe-area-context['"]/g;
const LOADING_RETURNS_NULL_RE =
  /if\s*\(\s*[^)]{0,80}(?:[Ll]oading|[Pp]ending|[Bb]usy)[^)]{0,80}\)\s*\{?\s*return\s+null/g;

const findings = [];

const adjusts = relative.endsWith('.tsx') ? countAdjustsFontSizeToFit(source) : 0;
if (adjusts > (baseline.adjustsFontSizeToFit?.[relative] || 0)) {
  findings.push(
    `• adjustsFontSizeToFit (${adjusts} шт., baseline ${baseline.adjustsFontSizeToFit?.[relative] || 0}) — ЗАПРЕЩЁН: на iOS ужимает короткие варианты в мелкий шрифт. Лечите переносом/вёрсткой.`,
  );
}

const rawInsets = (source.match(RAW_INSETS_IMPORT_RE) || []).length;
if (rawInsets > (baseline.rawSafeAreaInsets?.[relative] || 0)) {
  findings.push(
    '• сырой useSafeAreaInsets из react-native-safe-area-context — отдаёт 0 до нативных метрик, контент прыгает. Используйте useStableSafeAreaInsets из app/stable_safe_area_metrics.',
  );
}

const loadingNull = relative.startsWith('app/') && relative.endsWith('.tsx')
  ? (source.match(LOADING_RETURNS_NULL_RE) || []).length
  : 0;
if (loadingNull > (baseline.loadingReturnsNull?.[relative] || 0)) {
  findings.push(
    '• `if (loading) return null` — пустой кадр и «впрыгивание» контента. Дайте SkeletonBlock с финальной геометрией или синхронную peek-гидрацию.',
  );
}

if (findings.length === 0) process.exit(0);

const msg = [
  `LAYOUT STABILITY: правка ${relative} нарушает контракт «первый кадр = финальная геометрия» (AGENTS.md → Performance Bible → Layout stability):`,
  ...findings,
  'Исправьте в этом же ходу — жёсткий гейт: tests/layout_stability_contract.test.ts (упадёт в CI/pre-push).',
].join('\n');

process.stdout.write(JSON.stringify({
  systemMessage: msg,
  hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg },
}));
process.exit(0);
