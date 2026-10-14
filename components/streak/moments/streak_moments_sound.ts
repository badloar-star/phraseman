// streak_moments_sound.ts — звуки рубежей серии и колец «Сегодня» через движок sound_v2 (0fbf2ef9a), старые fc_* — запасной путь при выключенном флаге sound_v2.
// зачем (координатор 14.10): звуки по тайм-листу ETALON_MOMENTS_V3_TRANSFER.md: малый — streak_small + tap, средний — streak_mid + tap, большой — streak_big + tap,
// «Год» — tap + streak_year, «Легенда» — streak_legend + correct, кольцо — tap + ring, «День выполнен» — day_done. Событие имеет 4 варианта, колода «не повторять подряд» — внутри движка.
// Движок и запасной проигрыватель грузятся лениво (холодный старт не платит); любой отказ пишет причину в журнал, а не молчит.
import type { SoundV2EventId } from '../../../modules/sound_v2/catalog';
import type { FcSfxName } from '../../../app/flashcards/SoundService';
import type { StreakMomentKind } from './streak_milestones';

const LOG = '[STREAK-MOMENT-SOUND]';

type Plan = Readonly<{ v2: SoundV2EventId; fc: FcSfxName }>;

/** Главный звук сцены по уровню праздника (колонка «звуки» тайм-листа). */
export const STREAK_SCENE_SOUND: Readonly<Record<StreakMomentKind, Plan>> = {
  toast: { v2: 'streak_small', fc: 'star' },
  medium: { v2: 'streak_mid', fc: 'star' },
  big: { v2: 'streak_big', fc: 'session_complete' },
  half500: { v2: 'streak_big', fc: 'session_complete' },
  year: { v2: 'streak_year', fc: 'session_complete' },
  twoYears: { v2: 'streak_year', fc: 'session_complete' },
  legend: { v2: 'streak_legend', fc: 'session_complete' },
};

const TAP: Plan = { v2: 'tap', fc: 'tick' };
/** Второй звук «Легенды» на втором акте (тайм-лист: streak_legend, correct). */
const LEGEND_SECOND: Plan = { v2: 'correct', fc: 'correct' };
const RING: Plan = { v2: 'ring', fc: 'star' };
const DAY_DONE: Plan = { v2: 'day_done', fc: 'session_complete' };

function play(plan: Plan, advance = false): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isSoundV2Enabled } = require('../../../modules/sound_v2/sound_v2_flag') as typeof import('../../../modules/sound_v2/sound_v2_flag');
    if (isSoundV2Enabled()) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { playEvent } = require('../../../modules/sound_v2/sound_bank') as typeof import('../../../modules/sound_v2/sound_bank');
      const result = playEvent(plan.v2, advance ? { advance: true } : undefined);
      if (!result.played) console.log(`${LOG} v2 ${plan.v2} не сыграл: ${String(result.reason)}`); // guard-ok: причина отказа движка
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { playSfx } = require('../../../app/flashcards/SoundService') as typeof import('../../../app/flashcards/SoundService');
    playSfx(plan.fc);
  } catch (error) {
    console.warn(`${LOG} звук ${plan.v2}/${plan.fc} не сыграл (${error instanceof Error ? error.message : String(error)})`); // guard-ok: причина отказа
  }
}

/** Главный звук сцены рубежа. */
export function playStreakSceneSound(kind: StreakMomentKind): void {
  play(STREAK_SCENE_SOUND[kind]);
}
/** Тап: появление текстов сцены, частичное движение кольца. */
export function playStreakTapSound(): void {
  play(TAP);
}
/** Второй звук «Легенды». */
export function playStreakLegendSecondSound(): void {
  play(LEGEND_SECOND);
}
/** Кольцо дня закрылось (ходит по кругу 0→1→2 — движок двигает серию). */
export function playTodayRingClosedSound(): void {
  play(RING, true);
}
/** Закрыты все три кольца. */
export function playTodayDayDoneSound(): void {
  play(DAY_DONE);
}
