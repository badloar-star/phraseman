// зачем (координатор 12.10, покрытие съёмки r1): шаги робота ищут элементы по testID (`#id`, `#prefix*`). Опечатка или переименованный testID делает кадр тихо «не тем состоянием».
// Сторож: каждый селектор `#…` из файлов шагов (dev_links_r1_steps*.py) должен встречаться в исходниках приложения как литерал (для `#prefix*` — как префикс).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const STEP_FILES = fs.readdirSync(path.join(ROOT, 'scripts')).filter((f) => /^dev_links_r1_steps.*\.py$/.test(f));

/**
 * зачем (координатор 12.10): testID часто собираются шаблоном (`language-welcome-option-${item.id}`), а сторож искал только литерал и краснел
 * на верных шагах. Префикс шаблона — литерал от открывающей ` до первого `${`. Шаг `#prefix-<что угодно>` существует, если такой префикс есть
 * в исходниках, оканчивается на «-», «_» или «:», не короче 4 знаков, а после него в шаге есть хоть что-то. Иначе (префикса нет) — красный.
 */
export function templatePrefixes(source: string): Set<string> {
  const out = new Set<string>();
  for (const match of source.matchAll(/`([A-Za-z0-9_\-:.]{4,})\$\{/g)) {
    const prefix = match[1]!;
    if (/[-_:]$/.test(prefix)) out.add(prefix);
  }
  return out;
}

/**
 * Суффиксы шаблонов вида `${base}-header` (конец шаблона → 'end') и `${base}-star-${n}` (дальше подстановка → 'more'): общие компоненты
 * (FeedbackRatingCard, ThemedConfirmModal) приклеивают суффикс к testID/testIDPrefix, который экран передаёт строкой.
 */
export function templateSuffixes(source: string): Map<string, 'end' | 'more'> {
  const out = new Map<string, 'end' | 'more'>();
  for (const match of source.matchAll(/\$\{[^}`]+\}([-_:.A-Za-z0-9]{2,})(`|\$\{)/g)) {
    const suffix = match[1]!;
    if (!/^[-_:]/.test(suffix)) continue;
    const kind = match[2] === '`' ? 'end' : 'more';
    if (out.get(suffix) !== 'end') out.set(suffix, kind);
  }
  return out;
}

export function selectorExists(
  needle: string,
  corpus: string,
  prefixes: ReadonlySet<string>,
  suffixes: ReadonlyMap<string, 'end' | 'more'> = new Map(),
): boolean {
  if (corpus.includes(needle)) return true;
  for (const prefix of prefixes) if (needle.length > prefix.length && needle.startsWith(prefix)) return true;
  // база передаётся строкой в кавычках ("dialogue-v2-memory-clear-dialog"), суффикс — из шаблона общего компонента
  for (const [suffix, kind] of suffixes) {
    let from = needle.indexOf(suffix, 1);
    while (from > 0) {
      const base = needle.slice(0, from);
      const rest = needle.slice(from);
      const restOk = kind === 'end' ? rest === suffix : rest.length > suffix.length && rest.startsWith(suffix);
      if (restOk && (corpus.includes(`"${base}"`) || corpus.includes(`'${base}'`))) return true;
      from = needle.indexOf(suffix, from + 1);
    }
  }
  return false;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.expo', 'tests', '__tests__'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('dev links r1: step selectors exist in the app source', () => {
  const corpus = ['app', 'components', 'modules', 'hooks'].filter((d) => fs.existsSync(path.join(ROOT, d)))
    .flatMap((d) => walk(path.join(ROOT, d))).map((f) => fs.readFileSync(f, 'utf8')).join('\n');

  const selectors = new Map<string, string>();
  for (const file of STEP_FILES) {
    const text = fs.readFileSync(path.join(ROOT, 'scripts', file), 'utf8');
    for (const match of text.matchAll(/['"`](?:tap|long|swipe-left|swipe-right|see):#([A-Za-z0-9_\-:.{}$]+\*?)(?:@\d+)?['"`]/g)) {
      const id = match[1]!;
      if (id.includes('{') || id.includes('$')) continue; // шаблоны (f-строки) проверяются по их постоянной части ниже
      selectors.set(id, file);
    }
    for (const match of text.matchAll(/f['"]tap:#([A-Za-z0-9_\-:.]+)\{/g)) selectors.set(`${match[1]}*`, file);
  }

  it('the step files contain selectors to check', () => {
    expect(STEP_FILES.length).toBeGreaterThan(0);
    expect(selectors.size).toBeGreaterThan(20);
  });

  // testID, собираемые шаблоном (`prefix-${x}`): допустимы только перечисленные значения и только пока шаблон есть в исходниках
  const DYNAMIC: ReadonlyArray<{ template: string; prefix: string; values: readonly string[] }> = [
    { template: 'fc-training-mode-${', prefix: 'fc-training-mode-', values: ['blitz', 'speaking', 'truefalse', 'recall'] },
    { template: 'flashcards-pack-card-${', prefix: 'flashcards-pack-card-', values: ['dev_demo_community_1', 'dev_demo_community_2'] },
    { template: 'manage-subscription-reason-${', prefix: 'manage-subscription-reason-', values: ['too_expensive', 'missing_features'] },
    // зачем (12.10): шаги Макетов/Дизайна на testID, собираемые шаблоном: ответ онбординга, сегмент сообщества, строка заявки (uid вымышленной заявки friends=demo)
    { template: 'onboarding-source-${', prefix: 'onboarding-source-', values: ['tiktok'] },
    { template: 'community-sections-${', prefix: 'community-sections-', values: ['spire'] },
    { template: 'friend-request-row-${', prefix: 'friend-request-row-', values: ['dev-demo-friend-request-1'] },
  ];
  const prefixes = templatePrefixes(corpus);
  const suffixes = templateSuffixes(corpus);
  const exists = (needle: string): boolean => selectorExists(needle, corpus, prefixes, suffixes)
    || DYNAMIC.some((d) => needle.startsWith(d.prefix) && d.values.includes(needle.slice(d.prefix.length)) && corpus.includes(d.template));

  it('шаблонный testID: шаг с префиксом шаблона существует; без такого префикса — нет', () => {
    const sample = 'const a = <V testID={`language-welcome-option-${item.id}`} />; const b = `x-${y}`; const c = `plain-text`;';
    const sampleTemplates = templatePrefixes(sample);
    expect([...sampleTemplates]).toEqual(['language-welcome-option-']);
    expect(selectorExists('language-welcome-option-everyday', sample, sampleTemplates)).toBe(true);
    expect(selectorExists('language-welcome-missing', sample, sampleTemplates)).toBe(false);
    expect(selectorExists('study-language-option-es', sample, sampleTemplates)).toBe(false); // префикса шаблона в исходнике нет → красный
    expect(selectorExists('plain-text', sample, sampleTemplates)).toBe(true); // литерал как раньше
  });

  it('суффикс общего компонента: база строкой + суффикс шаблона → есть; без базы или с чужим хвостом → нет', () => {
    const sample = [
      'const header = <V testID={`${testID}-header`} />; const star = <V testID={`${testID}-star-${n}`} />;',
      'const ok = <C testIDPrefix={p ? `${testIDPrefix}-confirm` : undefined} />;',
      '<Card testID="dialogue-v2-completion-feedback" /> <Modal testIDPrefix="dialogue-v2-memory-clear-dialog" />',
    ].join('\n');
    const suffixes = templateSuffixes(sample);
    expect(suffixes.get('-header')).toBe('end');
    expect(suffixes.get('-star-')).toBe('more');
    expect(suffixes.get('-confirm')).toBe('end');
    const none = new Set<string>();
    expect(selectorExists('dialogue-v2-completion-feedback-header', sample, none, suffixes)).toBe(true);
    expect(selectorExists('dialogue-v2-completion-feedback-star-4', sample, none, suffixes)).toBe(true);
    expect(selectorExists('dialogue-v2-memory-clear-dialog-confirm', sample, none, suffixes)).toBe(true);
    expect(selectorExists('dialogue-v2-completion-feedback-headerX', sample, none, suffixes)).toBe(false); // хвост не совпал
    expect(selectorExists('dialogue-v2-completion-feedback-star-', sample, none, suffixes)).toBe(false); // после «-star-» нужно значение
    expect(selectorExists('unknown-base-confirm', sample, none, suffixes)).toBe(false); // базы строкой в коде нет → красный
  });

  it('every #selector (or #prefix*) is present as a literal in app/components/modules/hooks', () => {
    const missing: string[] = [];
    for (const [id, file] of selectors) {
      const needle = id.endsWith('*') ? id.slice(0, -1) : id;
      if (!exists(needle)) missing.push(`${file}: #${id}`);
    }
    expect(missing).toEqual([]);
  });
});
