/**
 * [SPIRE-STREAK-HEART] «Сердечко за серию» (владелец 25.10, ТЗ docs/work/tasks/spire-engagement-2026-10-25.md §2):
 * 5 верных подряд возвращают одно потерянное сердце; ошибка обнуляет серию; РАЗ ЗА СТУПЕНЬ; флаг по умолчанию выключен;
 * монет и сервера нет.
 */
import * as fs from 'fs';
import * as path from 'path';
import { normalizeEol } from './helpers/read_source';
import {
  SPIRE_STREAK_HEART_START,
  SPIRE_STREAK_HEART_TARGET,
  spireStreakHeartStep,
  spireStreakHeartVisible,
  type SpireStreakHeartState,
} from '../modules/spire/streak_heart';

const MAX = 3;
const read = (rel: string) => normalizeEol(fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8'));

/** Прогон ответов: true — верно, false — ошибка (теряет сердце, как движок ступени). */
function run(answers: readonly boolean[], startHearts = MAX) {
  let st: SpireStreakHeartState = SPIRE_STREAK_HEART_START;
  let hearts = startHearts;
  let refills = 0;
  for (const ok of answers) {
    const afterEngine = ok ? hearts : hearts - 1;
    const step = spireStreakHeartStep(st, ok, afterEngine, MAX);
    st = step.state; hearts = step.hearts; if (step.refilled) refills += 1;
  }
  return { st, hearts, refills };
}

describe('правило сердечка за серию', () => {
  it('цель — 5 верных подряд', () => {
    expect(SPIRE_STREAK_HEART_TARGET).toBe(5);
  });

  it('потеряно сердце → 5 верных подряд возвращают его', () => {
    const r = run([false, true, true, true, true, true]);
    expect(r.hearts).toBe(3);
    expect(r.refills).toBe(1);
    expect(r.st.given).toBe(true);
  });

  it('ошибка обнуляет серию: 4 верных, ошибка, 4 верных — сердце не вернулось', () => {
    const r = run([false, true, true, true, true, false, true, true, true, true]);
    expect(r.refills).toBe(0);
    expect(r.hearts).toBe(1);
    expect(r.st.streak).toBe(4);
  });

  it('СТОРОЖ «раз за ступень»: вторая серия из 5 после второй потери сердце не возвращает', () => {
    const r = run([false, true, true, true, true, true, false, true, true, true, true, true]);
    expect(r.refills).toBe(1);
    expect(r.hearts).toBe(2);
  });

  it('все сердца на месте — 5/5 ничего не даёт (пропуск full), выше потолка не бывает', () => {
    const r = run([true, true, true, true, true, true, true]);
    expect(r.hearts).toBe(3);
    expect(r.refills).toBe(0);
    const step = spireStreakHeartStep({ streak: 4, given: false }, true, 3, MAX);
    expect(step.skip).toBe('full');
  });

  it('шкала видна только когда сердце потеряно и сердце за серию ещё не давали', () => {
    expect(spireStreakHeartVisible({ streak: 0, given: false }, 3, MAX)).toBe(false);
    expect(spireStreakHeartVisible({ streak: 2, given: false }, 2, MAX)).toBe(true);
    expect(spireStreakHeartVisible({ streak: 0, given: true }, 2, MAX)).toBe(false);
    expect(spireStreakHeartVisible({ streak: 0, given: false }, 0, MAX)).toBe(false);
  });
});

describe('флаг и проводка', () => {
  it('флаг spire_streak_heart в реестре «Пульта»: по умолчанию ВЫКЛ, пропускается снимком конфига', () => {
    jest.isolateModules(() => {
      const flags = require('../app/remote_flags') as typeof import('../app/remote_flags');
      expect(flags.getRemoteBool('spire_streak_heart')).toBe(false);
      flags.applyRemoteConfigSnapshot({ bools: { spire_streak_heart: true } });
      expect(flags.getRemoteBool('spire_streak_heart')).toBe(true);
      flags.applyRemoteConfigSnapshot({ bools: { spire_streak_heart: 'true' } });
      expect(flags.getRemoteBool('spire_streak_heart')).toBe(false);
    });
    const hook = read('app/spire/use_spire_streak_heart.ts');
    expect(hook).toContain("getRemoteBool(SPIRE_STREAK_HEART_FLAG_KEY) === true");
    expect(hook).toContain('useState(() => readSpireStreakHeartFlag(runId))');
  });

  it('«Пульт» админки: переключатель spire_streak_heart, общий писатель, по умолчанию выкл', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '..', 'admin/v2/legacy.html'), 'utf8');
    expect(html).toContain('id="cp-bool-spire_streak_heart"');
    expect(html).toContain("onchange=\"saveControlPanelBool('spire_streak_heart', this.checked)\"");
    const list = html.slice(html.indexOf('const CP_FEATURE_TOGGLES = ['), html.indexOf('];', html.indexOf('const CP_FEATURE_TOGGLES = [')));
    expect(list).toMatch(/key: 'spire_streak_heart',[^\n]*def: false/);
  });

  it('раннер пропускает КАЖДЫЙ ответ через apply до commit; выключенный флаг возвращает состояние без изменений', () => {
    const runner = read('app/spire/use_spire_step_runner.ts');
    expect(runner).toContain('const next = streakHeart.apply(raw, fb.ok, fb.taskIndex + 1); commit(next);');
    expect(runner).toContain('streakHeart: streakHeart.view,');
    const hook = read('app/spire/use_spire_streak_heart.ts');
    expect(hook).toContain('if (!enabledRef.current) return next;');
    expect(hook).toContain("tryPlayV2Event('plus', 'spire_streak_heart');");
    expect(hook).toContain('[SPIRE-STREAK-HEART]');
  });

  it('только телефон: ни монет, ни сети, ни Firestore', () => {
    const hook = read('app/spire/use_spire_streak_heart.ts');
    const rule = read('modules/spire/streak_heart.ts');
    for (const src of [hook, rule]) {
      expect(src).not.toMatch(/firestore|httpsCallable|addSpirePendingCoins|spireReportSteps/i);
    }
  });

  it('экран: шкала стоит абсолютно под плашкой сердец (без сдвига шапки), вечных циклов нет', () => {
    const row = read('components/spire/SpireHeartsRow.tsx');
    expect(row).toMatch(/streak: \{ position: 'absolute', left: 13, right: 13, top: 42/);
    expect(row).not.toMatch(/withRepeat/);
    expect(row).toContain('useReducedMotion');
    expect(read('components/spire/SpireStepScreen.tsx')).toContain('<SpireHeartsRow lang={lang} hearts={hearts} streak={props.streakHeart ?? null} />');
  });
});
