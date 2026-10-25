/**
 * ЗАМОК ВЛАДЕЛЬЦА 25.10: «что за дурацкий текст!!!! стадия огня».
 * Фразы «стадия огня» / «flame stage» нет ни в одной строке интерфейса ни на одном из 9 языков: подписи рубежей 7/30/100 — по схеме
 * «До … — N дней», в окнах «Два года» и «Легенда» над заголовком — путь до Легенды и сама серия.
 */
import * as fs from 'fs';
import * as path from 'path';

import { STREAK_MOMENT_LANGS, streakMilestoneSubline } from '../components/streak/moments/streak_moments_strings';
import { STREAK_MILESTONES } from '../components/streak/moments/streak_milestones';

const ROOT = path.resolve(__dirname, '..');
/** Как фраза звучала на 9 языках (из удалённых строк stageNew / stageNewYear / finalStage). */
const BANNED = [
  /стадия огня/i, /стадія вогню/i, /flame stage/i, /fase de la llama/i, /fase da chama/i, /fase final da chama/i,
  /giai đoạn lửa/i, /tahap api/i, /alev aşaması/i, /etap ognia/i,
];

function walk(dir: string, out: string[]): void {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) { if (name !== 'node_modules' && !name.startsWith('.')) walk(full, out); }
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
}

describe('ЗАМОК 25.10: нет «стадии огня» ни на одном языке', () => {
  it('подписи всех рубежей серии на 9 языках — без «стадии огня»', () => {
    for (const lang of STREAK_MOMENT_LANGS) {
      for (const m of STREAK_MILESTONES) {
        const sub = streakMilestoneSubline(lang, m);
        for (const re of BANNED) expect({ lang, m, sub, hit: re.test(sub) }).toEqual({ lang, m, sub, hit: false });
      }
    }
  });

  it('в строках приложения (app, components, modules, constants) фразы нет', () => {
    const files: string[] = [];
    for (const d of ['app', 'components', 'modules', 'constants']) walk(path.join(ROOT, d), files);
    const hits: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      for (const re of BANNED) if (re.test(src)) hits.push(`${path.relative(ROOT, f)} ${re}`);
    }
    expect(hits).toEqual([]);
  });

  it('замок записан в журнале замков владельца', () => {
    expect(fs.readFileSync(path.join(ROOT, 'docs/work/OWNER_LOCKS.md'), 'utf8')).toContain('tests/owner_locks_no_flame_stage_2026_10_25.test.ts');
  });
});
