/**
 * OnboardingWelcomeHost — глобальный хост приветственной шторки после онбординга.
 *
 * зачем: владелец (2026-07-27) — «этот модал должен быть не на этом экране, а
 * когда открылся экран главной». Шторка жила внутри CleanOnboarding и выезжала
 * поверх последнего экрана анкеты, задерживая onDone до своего закрытия. Теперь
 * онбординг только ставит флаг (markOnboardingWelcomePending) и сразу отпускает
 * управление, а шторку поднимает этот хост — уже над главной.
 *
 * Монтируется из app/_layout.tsx внутри OverlayArbiterProvider, поэтому не
 * требует правок home.tsx. Видимостью управляет арбитр через
 * useOverlayVisible('onboardingWelcome', …) — ключ стоит ПЕРВЫМ в приоритете,
 * так что новичок видит приветствие раньше наград и update-модалок, и два
 * нативных Modal не презентуются одновременно (см. OverlayArbiter.tsx).
 */
import React, { useCallback, useEffect, useState } from 'react';

import OnboardingWelcomeSheet from './OnboardingWelcomeSheet';
import { useOverlayVisible } from './OverlayArbiter';
import { getRemoteBool } from '../app/remote_flags';
import {
  clearOnboardingWelcomePending,
  isOnboardingWelcomePending,
} from '../app/onboarding_welcome_state';

export default function OnboardingWelcomeHost() {
  const [wantShow, setWantShow] = useState(false);
  const visible = useOverlayVisible('onboardingWelcome', wantShow);

  // Одно чтение AsyncStorage при монтировании — никакой сети и Firestore.
  // Рубильник из админки проверяем здесь же: выключен → шторки нет, но флаг
  // снимаем, чтобы он не всплыл при следующем включении у старого юзера.
  useEffect(() => {
    let alive = true;
    isOnboardingWelcomePending()
      .then((pending) => {
        if (!alive || !pending) return;
        if (!getRemoteBool('onboarding_welcome_sheet_enabled')) {
          void clearOnboardingWelcomePending();
          return;
        }
        setWantShow(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // зачем: флаг снимаем сразу при закрытии — шторка одноразовая, а повторный
  // показ после перезапуска читался бы как баг. Локальное состояние гасим
  // мгновенно, запись в сторе догоняет фоном (откатывать нечего).
  const handleClose = useCallback(() => {
    setWantShow(false);
    void clearOnboardingWelcomePending();
  }, []);

  if (!visible) return null;

  return <OnboardingWelcomeSheet visible={visible} onClose={handleClose} />;
}
