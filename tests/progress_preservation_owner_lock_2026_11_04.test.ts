// ЗАМОК ВЛАДЕЛЬЦА 04.11: «прогресс пользователей, начавших старый курс, не должен пропасть НИ В КОЕМ СЛУЧАЕ
// (внутриурочный, завершённость, монеты, медали, достижения, серверные события)». Реестр: docs/work/OWNER_LOCKS.md.
// Сторож-храповик: число вызовов removeItem / multiRemove / AsyncStorage.clear в клиентском коде не растёт ни в одном файле
// и не появляется в новых. Базовая линия снята с HEAD 04.11 (tests/fixtures/progress_key_removal_baseline_2026_11_04.json).
// Если правке нужно новое удаление ключа (не прогресса!) — это слово владельца или явная пометка в базовой линии с причиной.
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const DIRS = ['app', 'modules', 'hooks', 'components', 'shared'];
const REMOVAL = /removeItem\(|multiRemove\(|AsyncStorage\.clear\(/g;
const SKIP = /(^|\/)tests?\/|\.test\.|\.spec\.|__tests__|\.d\.ts$|node_modules|graphify-out/;

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    const full = join(ROOT, rel);
    const st = statSync(full);
    if (st.isDirectory()) { if (!SKIP.test(`${rel}/`)) walk(rel, out); continue; }
    if (/\.(ts|tsx)$/.test(name) && !SKIP.test(rel)) out.push(rel);
  }
}

describe('ЗАМОК ВЛАДЕЛЬЦА 04.11: прогресс старого курса не удаляется', () => {
  const baseline = JSON.parse(readFileSync(join(__dirname, 'fixtures/progress_key_removal_baseline_2026_11_04.json'), 'utf8')) as Record<string, number>;
  const files: string[] = [];
  DIRS.forEach((d) => walk(d, files));

  it('число удалений ключей хранилища не выросло ни в одном файле и не появилось в новых', () => {
    const grown: string[] = [];
    for (const f of files) {
      const text = readFileSync(join(ROOT, f), 'utf8');
      const n = (text.match(REMOVAL) ?? []).length;
      const allowed = baseline[f] ?? 0;
      if (n > allowed) grown.push(`${f}: ${n} > ${allowed}`);
    }
    expect(grown).toEqual([]);
  });

  it('удаление ключей прогресса урока (lessonN_*, *_v2::<язык>::, медали, журнал монет) не пишется литералом', () => {
    const PROGRESS_KEY = /(removeItem|multiRemove)\([^)]*(['"`]lesson\d*_|_v2::|completed_lessons|lessons_completed|lesson_progress|medal|star_ledger|rune_ledger)/;
    const bad: string[] = [];
    for (const f of files) {
      if (baseline[f] === undefined) {
        const text = readFileSync(join(ROOT, f), 'utf8');
        if (PROGRESS_KEY.test(text)) bad.push(f);
      }
    }
    expect(bad).toEqual([]);
  });
});
