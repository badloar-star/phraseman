/**
 * Тихий уход в хаб Диалогов вместо экрана-ошибки.
 *
 * зачем (владелец 01.10 «ТАКОГО НИГДЕ НЕ ДОЛЖНО БЫТЬ», повторно 18.10 на эмуляторе — «Los diálogos no están disponibles» +
 * «Volver»; координатор 07:46): экранов «Диалоги недоступны» / «Не удалось продолжить» в продукте быть не должно. Когда сессия,
 * брифинг или свободный разговор не могут открыться (нет сценария, нет модели, пауза сервиса, старт не удался после тихих
 * повторов), человек без всякой ошибки возвращается в список диалогов. Пока переход решается — тот же экран загрузки (скелет),
 * никакой карточки с облаком. Причина пишется в журнал один раз: [DIALOGUE-V2] <screen> → redirect hub.
 */
import React, { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';

import { DialogueGlassGate, useDialogueGlass } from './glass/DialogueGlassKit';
import { safeRouterBack } from '../../app/navigation_back';

export const DIALOGUE_HUB_ROUTE = '/ai_dialog_home';

export type DialogueHubRedirectReason =
  | 'no_model'
  | 'locked'
  | 'paused'
  | 'unsupported_target'
  | 'start_failed';

export function DialogueHubRedirect({
  screen,
  reason,
  scenarioId,
  testID,
  backLabel,
  loadingLabel,
  details,
}: Readonly<{
  screen: 'session' | 'briefing' | 'freeform';
  reason: DialogueHubRedirectReason;
  scenarioId?: string | null;
  testID: string;
  backLabel: string;
  loadingLabel: string;
  /** Дополнительные значения для журнала (что решило ветку). */
  details?: Readonly<Record<string, unknown>>;
}>) {
  const router = useRouter();
  const glass = useDialogueGlass();
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    // единый префикс правила владельца ([NO-ERROR-SCREEN] экран, причина, что показали) + прежний префикс раздела
    console.warn(`[NO-ERROR-SCREEN] [DIALOGUE-V2] ${screen} → redirect hub`, JSON.stringify({ reason, scenarioId: scenarioId ?? null, shown: 'loading→hub', ...(details ?? {}) })); // guard-ok: один раз на уход, причина и значения
    try {
      router.replace(DIALOGUE_HUB_ROUTE as never);
    } catch (error) {
      // зачем (Ревизор a70855a55 🟡, координатор 08:25): если replace бросил, экран остался бы на скелете навсегда — тоже запрещено.
      // Запасной путь — безопасный «назад» (с откатом на Главную, если истории нет); причину пишем.
      console.warn(`[NO-ERROR-SCREEN] [DIALOGUE-V2] ${screen} → redirect hub failed, fallback back`, error instanceof Error ? error.message : String(error)); // guard-ok: catch называет причину
      try {
        safeRouterBack(router);
      } catch (backError) {
        console.warn(`[NO-ERROR-SCREEN] [DIALOGUE-V2] ${screen} → fallback back failed`, backError instanceof Error ? backError.message : String(backError)); // guard-ok: catch называет причину
      }
    }
  }, [details, reason, router, scenarioId, screen]);

  const goHub = () => router.replace(DIALOGUE_HUB_ROUTE as never);
  return <DialogueGlassGate glass={glass} testID={testID} backLabel={backLabel} onBack={goHub} loading title={loadingLabel} />;
}
