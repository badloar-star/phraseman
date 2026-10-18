import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { captureAccountGeneration } from '../app/account_generation';
import { readAiDialogMonthlyQuota } from '../app/ai_dialog_daily_quota';
import { REVENUE_MONTHLY_LIMITS } from '../app/revenue_daily_limits';
import { usePremium } from '../components/PremiumContext';
import { useStudyTarget } from '../components/StudyTargetContext';

const V2_TARGETS = new Set(['en', 'es', 'fr', 'de']);

/** remaining null — остаток не известен телефону (зеркала нет / прошлый месяц): пилюля «—/30», не обещаем полный лимит. */
export type DialogueHubQuota = Readonly<{ remaining: number | null; total: number }> | null;

/**
 * зачем (D111, макет dialogs.html hubHead): месячный остаток ответов Free для пилюли
 * «💬 N/30» в шапке хаба диалогов. Источник — зеркало квоты на телефоне (0 чтений
 * Firestore); перечитывается при возврате на экран, чтобы после сессии цифра была свежей.
 * У Plus и на неподдержанном языке — null (пилюли нет).
 */
export function useDialogueHubQuota(): DialogueHubQuota {
  const { studyTarget } = useStudyTarget();
  const { accessResolved, hasPremiumAccess } = usePremium();
  const [remaining, setRemaining] = useState<number | 'unknown' | null>(null);
  const freeTier = accessResolved && !hasPremiumAccess;
  useFocusEffect(useCallback(() => {
    if (!freeTier || !V2_TARGETS.has(String(studyTarget))) {
      setRemaining(null);
      return undefined;
    }
    let alive = true;
    void readAiDialogMonthlyQuota(studyTarget, captureAccountGeneration().stableId).then((quota) => {
      if (!alive) return;
      // зачем (Макеты 9e311920a, dialogs-001: у Free на хабе не было пилюли; Ревизор 3.45 a47e2e141): 'unknown' — зеркала на телефоне нет или оно
      // из прошлого месяца. Лимит мог быть потрачен на другом устройстве, поэтому цифру не выдумываем: пилюля есть, но «—/30».
      // Точный остаток появится, когда сервер ответит на реплику и перезапишет зеркало — хаб перечитает его при возврате на экран.
      const next = quota.status === 'allowed' ? quota.remaining
        : quota.status === 'exhausted' ? 0
          : quota.status === 'unknown' ? 'unknown' as const
            : null;
      console.log(`[DIALOGUE-V2] header:quota status=${quota.status} → pill=${next === null ? 'hidden' : next === 'unknown' ? `—/${REVENUE_MONTHLY_LIMITS.ai_dialog_replies}` : `${next}/${REVENUE_MONTHLY_LIMITS.ai_dialog_replies}`}`);
      setRemaining(next);
    }).catch((error: unknown) => {
      console.warn('[DIALOGUE-V2] header:quota → mirror read failed', error instanceof Error ? error.message : String(error));
    });
    return () => { alive = false; };
  }, [freeTier, studyTarget]));
  return remaining === null ? null : { remaining: remaining === 'unknown' ? null : remaining, total: REVENUE_MONTHLY_LIMITS.ai_dialog_replies };
}
