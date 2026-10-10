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
    if (!enabled) return undefined;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const interaction = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        timer = null;
        // зачем (ВРЕМЕННО, Сверка 21:55; сперва логи): синхронная часть прогрева — не она ли держит JS после открытия.
        const warmStart = Date.now();
        void warmDialogueV2Functions(source);
        console.log('[DIALOGS-OPEN] warm:sync_part', JSON.stringify({ source, syncMs: Date.now() - warmStart }));
      }, WARM_DELAY_MS);
    });
    return () => {
      interaction.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [enabled, source]);
}
