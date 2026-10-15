import fs from 'node:fs';
import path from 'node:path';

// зачем (Ревизор 2.76, координатор 15.10): «Добить: Ещё учу» на итоге урока, «Добить» после диалога и «Ещё N» на финале тренировки
// открывали /mistake_practice_session прямо, без чека дневной квоты — Free добивал ошибки мимо лимита. Сторож: КАЖДЫЙ переход в
// тренировку ошибок в приложении сначала проходит гейт (tryStartSession, при отказе — выход) и несёт чек этого тапа в маршруте.
// Dev-инструменты (components/dev) — исключение: их нет в стор-сборке.

const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'hooks', 'modules'];
const EXEMPT = [/^components[\\/]dev[\\/]/];
const NAV_RE = /router\.(push|replace)\(\{\s*pathname:\s*'\/mistake_practice_session'/g;

function listSources(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : listSources(rel);
    return /\.(ts|tsx)$/.test(entry.name) ? [rel] : [];
  });
}

type NavSite = { file: string; line: number; fnBody: string; statement: string };

function navigationSites(): NavSite[] {
  const sites: NavSite[] = [];
  for (const file of SCAN_DIRS.flatMap(listSources)) {
    if (EXEMPT.some((re) => re.test(file))) continue;
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');
    for (const match of src.matchAll(NAV_RE)) {
      const at = match.index ?? 0;
      // тело обработчика: от ближайшего объявления функции-константы выше перехода до самого перехода
      const before = src.slice(0, at);
      const fnStart = Math.max(before.lastIndexOf('= useCallback('), before.lastIndexOf('= () => {'));
      const statementEnd = src.indexOf(';', at);
      sites.push({
        file,
        line: before.split('\n').length,
        fnBody: src.slice(fnStart, at),
        statement: src.slice(at, statementEnd + 1),
      });
    }
  }
  return sites;
}

describe('every entry into mistake practice goes through the daily-quota gate', () => {
  const sites = navigationSites();

  it('finds the known entries (the guard actually scans)', () => {
    const files = new Set(sites.map((site) => site.file.split(path.sep).join('/')));
    for (const expected of [
      'app/lesson_complete.tsx',
      'app/mistake_practice_session.tsx',
      'hooks/useDialogueV2MistakeCapture.ts',
      'app/mistakes_hub.tsx',
      'app/mistakes_list.tsx',
      'app/mistake_detail.tsx',
    ]) {
      expect(files).toContain(expected);
    }
  });

  it.each(navigationSites().map((site) => [`${site.file}:${site.line}`, site] as const))('%s: gate first, receipt in the route', (_label, site) => {
    // гейт вызывается в том же обработчике, и отказ гейта — выход до перехода
    expect(site.fnBody).toMatch(/if \(!\w+\.tryStartSession\([^)]*\)\)/);
    // чек этого тапа взят из гейта и уходит в параметры маршрута
    expect(site.fnBody + site.statement).toMatch(/\w+\.takeQuotaReceiptParam\(\)/);
    const receiptSpread = /\.\.\.(receipt|\w+\.takeQuotaReceiptParam\(\))/.test(site.statement)
      || (/\bflowParams\b/.test(site.statement) && /const flowParams = \{[^}]*\.\.\.\w+\.takeQuotaReceiptParam\(\)/.test(site.fnBody));
    expect(receiptSpread).toBe(true);
  });

  it('lesson finish and dialogue finish keep the lesson/dialogue mistake ids (finish exactly these mistakes)', () => {
    const lesson = sites.find((site) => site.file.endsWith('lesson_complete.tsx'));
    const dialogue = sites.find((site) => site.file.endsWith('useDialogueV2MistakeCapture.ts'));
    expect(lesson?.statement).toContain("mistakeIds: ids.join(',')");
    expect(dialogue?.statement).toContain("mistakeIds: mistakeIds.join(',')");
  });

  it('each new gate source is a known paywall source', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PAYWALL_SOURCE_VALUES } = require('../app/paywall_entry_contract') as { PAYWALL_SOURCE_VALUES: readonly string[] };
    for (const source of ['lesson_complete_finish', 'mistake_finale_more', 'dialogue_v2_finish_mistakes']) {
      expect(PAYWALL_SOURCE_VALUES).toContain(source);
    }
  });
});
