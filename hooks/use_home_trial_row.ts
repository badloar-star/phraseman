// ═══════════════════════════════════════════════════════════════════════════
// use_home_trial_row.ts — строка «Попробуй Plus бесплатно» для «Сегодня» на Главной и на экране «Сегодня» (одно решение на двоих).
//
// зачем (владелец 29.10: «когда доступен триал — вместо опроса появляется задание «Попробуй Plus бесплатно»; можно отклонить крестиком»; координатор: Главная и today_tasks
// решают одинаково, отклонение общее): всё локально — PremiumContext, кулдаун триала, дата первого входа и отметка ✕ в AsyncStorage; Firebase не читается.
// Правила и причины — app/home_trial_row.ts; журнал [TRIAL-ROW].
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import { usePremium } from '../components/PremiumContext';
import type { Lang } from '../constants/i18n';
import { ONBOARDING_COMPLETED_AT_KEY } from '../app/fresh_install_gate';
import { HOME_TRIAL_ROW_DISMISS_MS, homeTrialRowCopy, homeTrialRowDayNumber, homeTrialRowDecision, homeTrialRowDismissLabel, type HomeTrialRowReason } from '../app/home_trial_row';
import { loadHomeTrialRowDismissedAt, saveHomeTrialRowDismissedAt } from '../app/home_trial_row_dismiss';
import { openPremiumPaywall } from '../app/paywall_navigation';
import { getLastTrialOrPurchaseMarker, getTrialReofferBlockedByCooldown } from '../app/premium_trial_eligibility';
import { getCanonicalUserId } from '../app/user_id_policy';

export type HomeTrialRow = Readonly<{ title: string; subtitle: string; onPress: () => void; onDismiss: () => void; dismissLabel: string; plus: true }>;

type Facts = Readonly<{ accountId: string | null; hadTrialBefore: boolean; firstEntryMs: number | null; dismissedAtMs: number | null }>;

export function useHomeTrialRow(lang: Lang, runtimeActive: boolean): Readonly<{ show: boolean; reason: HomeTrialRowReason; row: HomeTrialRow | null }> {
  const router = useRouter();
  const { isPremium, isVip, isPro, trialEligible, accessResolved } = usePremium();
  const [startedLocally, setStartedLocally] = useState(false);
  const [facts, setFacts] = useState<Facts>({ accountId: null, hadTrialBefore: false, firstEntryMs: null, dismissedAtMs: null });
  useEffect(() => {
    if (!runtimeActive) return undefined;
    let cancelled = false;
    void (async () => {
      const [blocked, marker, firstEntryRaw, accountId] = await Promise.all([
        getTrialReofferBlockedByCooldown(), getLastTrialOrPurchaseMarker(), AsyncStorage.getItem(ONBOARDING_COMPLETED_AT_KEY), getCanonicalUserId(),
      ]);
      const dismissedAtMs = await loadHomeTrialRowDismissedAt(accountId);
      if (cancelled) return;
      const firstEntryMs = firstEntryRaw !== null && Number.isFinite(Number(firstEntryRaw)) ? Number(firstEntryRaw) : null;
      setStartedLocally(blocked);
      // свежее локальное ✕ не затирается позднее прочитанным значением
      setFacts((prev) => ({ accountId, hadTrialBefore: marker !== null, firstEntryMs, dismissedAtMs: Math.max(prev.dismissedAtMs ?? 0, dismissedAtMs ?? 0) || null }));
    })().catch((error: unknown) => {
      console.warn('[TRIAL-ROW] local facts read failed', error instanceof Error ? error.message : String(error));
    });
    return () => { cancelled = true; };
  }, [runtimeActive, isPremium, isVip, isPro]);

  const nowMs = Date.now();
  const dayNumber = homeTrialRowDayNumber(facts.firstEntryMs, nowMs);
  const hasPlus = isPremium || isVip || isPro;
  const decision = homeTrialRowDecision({ hasPlus, trialEligible, accessResolved, startedLocally, hadTrialBefore: facts.hadTrialBefore, dayNumber, dismissedAtMs: facts.dismissedAtMs, nowMs });
  useEffect(() => {
    console.log('[TRIAL-ROW]', JSON.stringify({ shown: decision.show, reason: decision.reason, isPremium, isVip, isPro, trialEligible, accessResolved, startedLocally, hadTrialBefore: facts.hadTrialBefore, firstEntryMs: facts.firstEntryMs, dayNumber, dismissedAtMs: facts.dismissedAtMs, signal: 'PremiumContext.trialEligible + premium_trial_eligibility cooldown' })); // guard-ok: одна строка на смену решения
  }, [decision.show, decision.reason, isPremium, isVip, isPro, trialEligible, accessResolved, startedLocally, facts, dayNumber]);

  // зачем: ✕ скрывает мгновенно (локальное состояние), запись в AsyncStorage догоняет фоном; окно подписки не открывает
  const accountId = facts.accountId;
  const onDismiss = useCallback(() => {
    const at = Date.now();
    console.log('[TRIAL-ROW]', JSON.stringify({ event: 'dismiss', at, hiddenForMs: HOME_TRIAL_ROW_DISMISS_MS })); // guard-ok: одна строка на нажатие ✕
    setFacts((prev) => ({ ...prev, dismissedAtMs: at }));
    void saveHomeTrialRowDismissedAt(accountId, at);
  }, [accountId]);
  const onPress = useCallback(() => {
    console.log('[TRIAL-ROW]', JSON.stringify({ event: 'tap', opened: true, context: 'home_trial_row' })); // guard-ok: одна строка на тап
    openPremiumPaywall(router, { context: 'home_trial_row' });
  }, [router]);

  return { show: decision.show, reason: decision.reason, row: decision.show ? { ...homeTrialRowCopy(lang), onPress, onDismiss, dismissLabel: homeTrialRowDismissLabel(lang), plus: true } : null };
}
