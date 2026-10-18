import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { captureAccountGeneration } from '../app/account_generation';
import { readAiDialogMonthlyQuota } from '../app/ai_dialog_daily_quota';
import { REVENUE_MONTHLY_LIMITS } from '../app/revenue_daily_limits';
import { usePremium } from '../components/PremiumContext';
import { useStudyTarget } from '../components/StudyTargetContext';

const V2_TARGETS = new Set(['en', 'es', 'fr', 'de']);

export type DialogueHubQuota = Readonly<{ remaining: number; total: number }> | null;

/**
 * зачем (D111, макет dialogs.html hubHead): месячный остаток ответов Free для пилюли
 * «💬 N/30» в шапке хаба диалогов. Источник — зеркало квоты на телефоне (0 чтений
 * Firestore); перечитывается при возврате на экран, чтобы после сессии цифра была свежей.
 * У Plus и на неподдержанном языке — null (пилюли нет).
 */
export function useDialogueHubQuota(): DialogueHubQuota {
  const { studyTarget } = useStudyTarget();
  const { accessResolved, hasPremiumAccess } = usePremium();
  const [remaining, setRemaining] = useState<number | null>(null);
  const freeTier = accessResolved && !hasPremiumAccess;
  useFocusEffect(useCallback(() => {
    if (!freeTier || !V2_TARGETS.has(String(studyTarget))) {
      setRemaining(null);
      return undefined;
    }
    let alive = true;
    void readAiDialogMonthlyQuota(studyTarget, captureAccountGeneration().stableId).then((quota) => {
      if (!alive) return;
      // зачем (Макеты 9e311920a, dialogs-001: у Free на хабе нет «30/30», а в раскрытии — есть): зеркала нет или оно из прошлого месяца
      // ('unknown') — ответов в этом месяце с телефона не было, показываем полный лимит, как уже делает DialogsTabContent (repliesLeftThisMonth).
      // Сервер остаётся источником правды: после первой реплики зеркало перезапишется точным остатком.
      const next = quota.status === 'allowed' ? quota.remaining
        : quota.status === 'exhausted' ? 0
          : quota.status === 'unknown' ? REVENUE_MONTHLY_LIMITS.ai_dialog_replies
            : null;
      console.log(`[DIALOGUE-V2] header:quota status=${quota.status} → pill=${next === null ? 'hidden' : `${next}/${REVENUE_MONTHLY_LIMITS.ai_dialog_replies}`}`);
      setRemaining(next);
    }).catch((error: unknown) => {
      console.warn('[DIALOGUE-V2] header:quota → mirror read failed', error instanceof Error ? error.message : String(error));
    });
    return () => { alive = false; };
  }, [freeTier, studyTarget]));
  return remaining === null ? null : { remaining, total: REVENUE_MONTHLY_LIMITS.ai_dialog_replies };
}
