import { useEffect } from 'react';
import { InteractionManager } from 'react-native';

import { warmDialogueV2Functions, type DialogueV2WarmSource } from '../app/dialogue_v2_warmup';

// зачем: прогрев — не работа первого кадра (урок 22.09: прогрев на старте дал 6+ с
// тормозов). Ждём конца анимаций/взаимодействий и ещё немного, и только потом шлём
// два крошечных запроса; уход с экрана до этого отменяет прогрев.
const WARM_DELAY_MS = 1_500;

/** Прогреть функции Диалогов V2, пока экран «Диалоги»/плитка на Главной видны (≤1 раза в 10 мин). */
export function useDialogueV2Warmup(enabled: boolean, source: DialogueV2WarmSource): void {
  useEffect(() => {
    if (!enabled) {
      console.log('[COST-CUT] dialogue_v2_warm skipped reason=disabled', JSON.stringify({ source })); // guard-ok: ранний выход называет причину (Главная не греет Диалоги)
      return undefined;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const interaction = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        timer = null;
        void warmDialogueV2Functions(source);
      }, WARM_DELAY_MS);
    });
    return () => {
      interaction.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [enabled, source]);
}
