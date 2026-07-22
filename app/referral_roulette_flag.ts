/**
 * Реактивный гейт мастер-флага «Рулетка Plus + реферальная программа».
 *
 * Ключ: remote_config/app.numbers.referral_roulette_enabled (boolean, дефолт true).
 * Пишется из админки (adminSetReferralRouletteEnabled) / скриптом; на клиент
 * приезжает через remote_config_client (onSnapshot) → applyRemoteConfigSnapshot
 * → событие 'remote_config_changed'. Хук перечитывает флаг на это событие, так
 * что выключение из админки прячет UI живьём, без перезапуска приложения.
 */
import { useEffect, useState } from 'react';
import { onAppEvent } from './events';
import { isReferralRouletteEnabled } from './remote_flags';

export function useReferralRouletteEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => isReferralRouletteEnabled());
  useEffect(() => {
    const sub = onAppEvent('remote_config_changed', () => {
      setEnabled(isReferralRouletteEnabled());
    });
    return () => sub.remove();
  }, []);
  return enabled;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
