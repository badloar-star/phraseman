// done_chain_sound.ts — звуки и хаптик «семи ударов» m10 через движок sound_v2, старые fc_* — запасной путь при выключенном sound_v2.
// зачем (координатор 15.10, тайм-лист ETALON_MOMENTS_V3_TRANSFER m10: tap, correct, coins_many, streak_small, lesson_done): у каждого удара свой звук и вес хаптика
// по образцу (звёзды — лёгкий, монеты — лёгкий, серия — средний, «Сегодня» — успех). Движок грузится лениво; любой отказ пишет причину, а не молчит.
import type { SoundV2EventId } from '../../modules/sound_v2/catalog';
import type { FcSfxName } from '../../app/flashcards/SoundService';
import { hapticLightImpact, hapticMediumImpact, hapticSuccess } from '../../hooks/use-haptics';
import { DONE_CHAIN_LOG } from './done_chain_gate';

type Plan = Readonly<{ v2: SoundV2EventId; fc: FcSfxName; haptic: 'none' | 'light' | 'medium' | 'success' }>;

/** По удару 0…6 (кнопки — без звука). */
export const DONE_CHAIN_BEAT_SOUND: readonly Plan[] = [
  { v2: 'tap', fc: 'tick', haptic: 'none' }, // «Урок пройден»
  { v2: 'correct', fc: 'star', haptic: 'light' }, // три звезды
  { v2: 'tap', fc: 'tick', haptic: 'none' }, // название урока
  { v2: 'tap', fc: 'tick', haptic: 'light' }, // верно / ошибки / точность
  { v2: 'coins_many', fc: 'correct', haptic: 'light' }, // монеты летят в баланс
  { v2: 'streak_small', fc: 'star', haptic: 'medium' }, // серия, огонь зажёгся
  { v2: 'lesson_done', fc: 'session_complete', haptic: 'success' }, // «Сегодня» 1/1
];

function haptic(kind: Plan['haptic']): void {
  if (kind === 'none') return;
  const run = kind === 'light' ? hapticLightImpact : kind === 'medium' ? hapticMediumImpact : hapticSuccess;
  run().catch((error: unknown) => console.warn(`${DONE_CHAIN_LOG} хаптик ${kind} не сработал (${error instanceof Error ? error.message : String(error)})`));
}

/** Звук и хаптик удара i. withSound=false — строка «сегодня» статична/данных нет: хаптик да, звук праздника не играем. */
export function playDoneChainBeat(i: number, withSound = true): void {
  const plan = DONE_CHAIN_BEAT_SOUND[i];
  if (!plan) return;
  haptic(plan.haptic);
  if (!withSound) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isSoundV2Enabled } = require('../../modules/sound_v2/sound_v2_flag') as typeof import('../../modules/sound_v2/sound_v2_flag');
    if (isSoundV2Enabled()) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { playEvent } = require('../../modules/sound_v2/sound_bank') as typeof import('../../modules/sound_v2/sound_bank');
      const result = playEvent(plan.v2);
      if (!result.played) console.log(`${DONE_CHAIN_LOG} звук v2 ${plan.v2} не сыграл: ${String(result.reason)}`); // guard-ok: причина отказа движка
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { playSfx } = require('../../app/flashcards/SoundService') as typeof import('../../app/flashcards/SoundService');
    playSfx(plan.fc);
  } catch (error) {
    console.warn(`${DONE_CHAIN_LOG} звук ${plan.v2}/${plan.fc} не сыграл (${error instanceof Error ? error.message : String(error)})`); // guard-ok: причина отказа
  }
}
