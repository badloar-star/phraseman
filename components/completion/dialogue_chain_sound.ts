// dialogue_chain_sound.ts — звуки и хаптик m18 «Итог диалога» через sound_v2, старые fc_* — запасной путь при выключенном sound_v2.
// зачем (координатор 15.10, тайм-лист ETALON_MOMENTS_V3_TRANSFER m18: tap, correct, coins_many): «думает…» — тихий tap, реакция «довольна» — correct + хаптик успеха
// (спокойная реакция — только tap, без праздника), первая цель — tap + лёгкий хаптик, монеты — coins_many. Движок грузится лениво; отказ пишет причину.
import type { SoundV2EventId } from '../../modules/sound_v2/catalog';
import type { FcSfxName } from '../../app/flashcards/SoundService';
import { hapticLightImpact, hapticSuccess } from '../../hooks/use-haptics';
import { DIALOGUE_CHAIN_LOG } from './dialogue_chain_gate';

export type DialogueChainCue = 'think' | 'pleased' | 'neutral' | 'goal' | 'coins';

const PLAN: Readonly<Record<DialogueChainCue, Readonly<{ v2: SoundV2EventId; fc: FcSfxName; haptic: 'none' | 'light' | 'success' }>>> = {
  think: { v2: 'tap', fc: 'tick', haptic: 'none' },
  pleased: { v2: 'correct', fc: 'correct', haptic: 'success' },
  neutral: { v2: 'tap', fc: 'tick', haptic: 'none' },
  goal: { v2: 'tap', fc: 'tick', haptic: 'light' },
  coins: { v2: 'coins_many', fc: 'star', haptic: 'light' },
};

export function playDialogueChainCue(cue: DialogueChainCue): void {
  const plan = PLAN[cue];
  if (plan.haptic !== 'none') {
    (plan.haptic === 'success' ? hapticSuccess : hapticLightImpact)().catch((error: unknown) => console.warn(`${DIALOGUE_CHAIN_LOG} хаптик ${cue} не сработал (${error instanceof Error ? error.message : String(error)})`));
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isSoundV2Enabled } = require('../../modules/sound_v2/sound_v2_flag') as typeof import('../../modules/sound_v2/sound_v2_flag');
    if (isSoundV2Enabled()) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { playEvent } = require('../../modules/sound_v2/sound_bank') as typeof import('../../modules/sound_v2/sound_bank');
      const result = playEvent(plan.v2);
      if (!result.played) console.log(`${DIALOGUE_CHAIN_LOG} звук v2 ${plan.v2} не сыграл: ${String(result.reason)}`); // guard-ok: причина отказа движка
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { playSfx } = require('../../app/flashcards/SoundService') as typeof import('../../app/flashcards/SoundService');
    playSfx(plan.fc);
  } catch (error) {
    console.warn(`${DIALOGUE_CHAIN_LOG} звук ${plan.v2}/${plan.fc} не сыграл (${error instanceof Error ? error.message : String(error)})`); // guard-ok: причина отказа
  }
}
