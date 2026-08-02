/**
 * BillingIssueToastHost — тост «проблема с оплатой подписки» (grace-период).
 *
 * Немое место №2 (docs/reports/missing_feedback_designs_2026-06-11.html):
 * когда списание подписки не прошло, RevenueCat ставит billingIssueDetectedAt
 * на активный entitlement. Доступ ещё работает (~16 дней), но потом пропадёт.
 * Приложение об этом молчало — юзер терял Premium «вдруг».
 *
 * Показываем тост error с CTA-подсказкой обновить оплату. Кулдаун 3 дня
 * (проблема висит долго — не долбим каждый запуск). Только store-сборка с RC.
 */
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import Purchases from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { actionToastTri, emitAppEvent } from '../app/events';
import { IS_EXPO_GO } from '../app/config';
import { revenueCatBillingIssueAtMs } from '../app/premium_revenuecat_state';
import { scheduleCoalescedForegroundTask } from '../app/app_resume_policy';

const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;
const LAST_SHOWN_KEY = 'billing_issue_toast_last_shown';
/** Привязка к конкретному инциденту: при новом billing-issue показываем заново. */
const LAST_ISSUE_AT_KEY = 'billing_issue_toast_last_issue_at';
const RC_TIMEOUT_MS = 8000;

function withNullableTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export default function BillingIssueToastHost() {
  const runningRef = useRef(false);
  const scheduledRef = useRef<{ cancel: () => void } | null>(null);

  const check = async () => {
    if (IS_EXPO_GO || runningRef.current) return;
    runningRef.current = true;
    try {
      const info = await withNullableTimeout(Purchases.getCustomerInfo(), RC_TIMEOUT_MS).catch(() => null);
      if (!info) return;

      const issueAt = revenueCatBillingIssueAtMs(info);
      if (issueAt == null) {
        // Проблема решена — сбрасываем привязку, чтобы следующий инцидент показался.
        await AsyncStorage.multiRemove([LAST_ISSUE_AT_KEY]).catch(() => {});
        return;
      }

      const [lastShownRaw, lastIssueRaw] = await Promise.all([
        AsyncStorage.getItem(LAST_SHOWN_KEY).catch(() => null),
        AsyncStorage.getItem(LAST_ISSUE_AT_KEY).catch(() => null),
      ]);
      const lastShown = lastShownRaw ? Number(lastShownRaw) : 0;
      const lastIssue = lastIssueRaw ? Number(lastIssueRaw) : 0;

      // Новый инцидент (другая дата) — показываем сразу; тот же — раз в COOLDOWN.
      const sameIssue = lastIssue === issueAt;
      if (sameIssue && Number.isFinite(lastShown) && Date.now() - lastShown < COOLDOWN_MS) return;

      await AsyncStorage.multiSet([
        [LAST_SHOWN_KEY, String(Date.now())],
        [LAST_ISSUE_AT_KEY, String(issueAt)],
      ]).catch(() => {});

      // зачем: это предупреждение, а не ошибка — доступ ещё работает (грейс-период),
      // сломаться может позже. Тип 'error' звучал как «уже всё пропало».
      emitAppEvent('action_toast', actionToastTri('warning', {
        ru: '💳 Проблема с оплатой подписки — обнови способ оплаты, чтобы не потерять Plus',
        uk: '💳 Проблема з оплатою підписки — онови спосіб оплати, щоб не втратити Plus',
        es: '💳 Problema con el pago de tu suscripción — actualiza el método para no perder Plus',
        'pt-BR': '💳 Problema no pagamento da assinatura — atualize a forma de pagamento para não perder o Plus',
        vi: '💳 Sự cố thanh toán gói đăng ký — cập nhật phương thức để không mất Plus',
        id: '💳 Masalah pembayaran langganan — perbarui metode agar tidak kehilangan Plus',
        tr: '💳 Abonelik ödemesinde sorun var — Plus’u kaybetmemek için ödeme yöntemini güncelle',
        pl: '💳 Problem z płatnością subskrypcji — zaktualizuj metodę, by nie stracić Plus',
      }));
    } catch {
      /* ignore — optional enhancement */
    } finally {
      runningRef.current = false;
    }
  };

  useEffect(() => {
    const scheduleCheck = () => {
      scheduledRef.current?.cancel();
      scheduledRef.current = scheduleCoalescedForegroundTask('billing_issue_toast_check', check);
    };
    scheduleCheck();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') scheduleCheck();
    });
    return () => {
      sub.remove();
      scheduledRef.current?.cancel();
      scheduledRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
