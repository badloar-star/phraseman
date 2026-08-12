/**
 * Реактивный гейт мастер-флага «Рулетка Plus + реферальная программа».
 *
 * Ключ: remote_config/app.numbers.referral_roulette_enabled (boolean, дефолт true).
 * Пишется из админки (adminSetReferralRouletteEnabled) / скриптом; на клиент
 * приезжает через remote_config_client (кэш + foreground polling) → applyRemoteConfigSnapshot
 * → событие 'remote_config_changed'. Хук перечитывает флаг на это событие, так
 * что выключение из админки прячет UI живьём, без перезапуска приложения.
 */
import { useEffect, useState } from 'react';
import { onAppEvent } from './events';
import {
  hasRemoteConfigSnapshotApplied,
  isReferralRouletteEmergencyStopped,
  isReferralRouletteEnabled,
} from './remote_flags';

export type ReferralRouletteClientPolicy = Readonly<{
  softEnabled: boolean;
  emergencyStop: boolean;
  remoteHydrated: boolean;
}>;

function readPolicy(): ReferralRouletteClientPolicy {
  return {
    softEnabled: isReferralRouletteEnabled(),
    emergencyStop: isReferralRouletteEmergencyStopped(),
    remoteHydrated: hasRemoteConfigSnapshotApplied(),
  };
}

export function useReferralRoulettePolicy(): ReferralRouletteClientPolicy {
  const [policy, setPolicy] = useState<ReferralRouletteClientPolicy>(() => readPolicy());
  useEffect(() => {
    const sub = onAppEvent('remote_config_changed', () => {
      const next = readPolicy();
      setPolicy((current) => (
        current.softEnabled === next.softEnabled
          && current.emergencyStop === next.emergencyStop
          && current.remoteHydrated === next.remoteHydrated
          ? current
          : next
      ));
    });
    return () => sub.remove();
  }, []);
  return policy;
}

export function useReferralRouletteEnabled(): boolean {
  const policy = useReferralRoulettePolicy();
  return policy.softEnabled && !policy.emergencyStop;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
