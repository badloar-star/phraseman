/**
 * Реактивный гейт «Лесенки приглашений» (владелец 29.10, вместо рулетки Plus).
 *
 * Ключ: remote_config bools.referral_ladder_enabled (boolean, дефолт false). Приезжает с тем же снимком remote_config, который приложение и так читает
 * (кэш + foreground polling → applyRemoteConfigSnapshot → событие 'remote_config_changed'): новых чтений нет. Выключено — экран /referrals прежний;
 * включили в «Пульте» — лесенка появляется живьём, без перезапуска.
 */
import { useEffect, useState } from 'react';
import { onAppEvent } from './events';
import { getRemoteBool } from './remote_flags';

export function isReferralLadderEnabled(): boolean {
  return getRemoteBool('referral_ladder_enabled');
}

/**
 * зачем (координатор 05.11): ключ referral_ladder_enabled в бою включён с 146 (экран лесенки). Новая часть 150 (истории у кольца,
 * текст приглашения с обещанием 500 монет) вынесена на отдельный ключ referral_ladder_v2_enabled с дефолтом ВЫКЛ, чтобы релиз не
 * показал сырое. Старый экран остаётся на прежнем ключе.
 */
export function isReferralLadderV2Enabled(): boolean {
  return getRemoteBool('referral_ladder_v2_enabled');
}

export function useReferralLadderEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => isReferralLadderEnabled());
  useEffect(() => {
    const sub = onAppEvent('remote_config_changed', () => {
      const next = isReferralLadderEnabled();
      setEnabled((current) => {
        if (current !== next) console.log('[REFERRAL-LADDER] флаг сменился', JSON.stringify({ from: current, to: next })); // guard-ok: смена флага — одна строка
        return current === next ? current : next;
      });
    });
    return () => sub.remove();
  }, []);
  return enabled;
}

export function useReferralLadderV2Enabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => isReferralLadderV2Enabled());
  useEffect(() => {
    const sub = onAppEvent('remote_config_changed', () => {
      const next = isReferralLadderV2Enabled();
      setEnabled((current) => {
        if (current !== next) console.log('[REFERRAL-LADDER] флаг v2 сменился', JSON.stringify({ from: current, to: next })); // guard-ok: смена флага без идентификаторов
        return current === next ? current : next;
      });
    });
    return () => sub.remove();
  }, []);
  return enabled;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
