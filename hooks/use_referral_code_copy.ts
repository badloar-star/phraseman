/**
 * useReferralCodeCopy — копирование реферального кода с мгновенной галочкой (вкладка «Друзья», блок «Лесенка приглашений»).
 *
 * зачем (Optimistic UI, аудит 13.10 — тот же приём, что на экране /referrals): галочка «скопировано» появляется СРАЗУ на тап, до записи в буфер;
 * не вышло (код/аккаунт сменились, буфер недоступен) — откат с причиной в журнале. Запись идёт только для аккаунта, чей код показан
 * (copyReferralCodeForAccount сверяет поколение аккаунта до и после записи). Таймеров вне одной галочки нет, сеть не трогаем.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { captureAccountGeneration } from '../app/account_generation';
import { accountScopeKey } from '../app/account_scope_key';
import { copyReferralCodeForAccount } from '../app/referral_code_clipboard';
import { DebugLogger } from '../app/debug-logger';
import { hapticTap } from './use-haptics';

const LOG = '[REFERRAL-COPY]';
const COPIED_MS = 1600;

export function useReferralCodeCopy(code: string | null, accountKey: string | null): Readonly<{ copied: boolean; copy: () => void }> {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  // зачем: код или аккаунт сменились — старая галочка не должна светиться над новым кодом
  useEffect(() => { setCopied(false); }, [code, accountKey]);

  const copy = useCallback(() => {
    if (!code || !accountKey) {
      console.warn(`${LOG} не копируем: нет ${!code ? 'кода' : 'ключа аккаунта'}`); // guard-ok: ранний выход называет причину
      return;
    }
    hapticTap();
    const token = captureAccountGeneration();
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), COPIED_MS);
    const rollback = (reason: string) => {
      console.warn(`${LOG} откат галочки: ${reason}`); // guard-ok: откат всегда с причиной
      if (timerRef.current) clearTimeout(timerRef.current);
      setCopied(false);
    };
    if (accountScopeKey(token) !== accountKey) { rollback('account_changed_before_copy'); return; }
    void copyReferralCodeForAccount({
      accountToken: token,
      accountKey,
      code,
      readText: Clipboard.getStringAsync,
      writeText: async (value) => { await Clipboard.setStringAsync(value); },
    }).then((ok) => {
      if (!ok) rollback('copy_rejected_account_or_code_changed');
    }).catch((error: unknown) => {
      DebugLogger.error('referral_code_copy:friends_ladder', error instanceof Error ? error : new Error(String(error)), 'warning');
      rollback('clipboard_unavailable');
    });
  }, [accountKey, code]);

  return { copied, copy };
}
