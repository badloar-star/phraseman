// зачем (координатор 12.10, покрытие съёмки r1): шаги робота ищут элементы по testID (`#id`, `#prefix*`). Опечатка или переименованный testID делает кадр тихо «не тем состоянием».
// Сторож: каждый селектор `#…` из файлов шагов (dev_links_r1_steps*.py) должен встречаться в исходниках приложения как литерал (для `#prefix*` — как префикс).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const STEP_FILES = fs.readdirSync(path.join(ROOT, 'scripts')).filter((f) => /^dev_links_r1_steps.*\.py$/.test(f));

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
  ];
  const exists = (needle: string): boolean => corpus.includes(needle)
    || DYNAMIC.some((d) => needle.startsWith(d.prefix) && d.values.includes(needle.slice(d.prefix.length)) && corpus.includes(d.template));

  it('every #selector (or #prefix*) is present as a literal in app/components/modules/hooks', () => {
    const missing: string[] = [];
    for (const [id, file] of selectors) {
      const needle = id.endsWith('*') ? id.slice(0, -1) : id;
      if (!exists(needle)) missing.push(`${file}: #${id}`);
    }
    expect(missing).toEqual([]);
  });
});
