// ═══════════════════════════════════════════════════════════════════════════
// combo_lesson_gate.tsx — Plus-замок на ПРЯМУЮ ссылку `lesson1?combo=…` (комбинированный урок).
//
// зачем (граница доступа, аудит R58 #24, координатор 15.10): выбор тем — платная механика, вход «Обучение» → «Комбо» проверяет Plus, а прямая ссылка на lesson1 с combo
// шла мимо проверки. Fail-closed: пока статус Plus не известен — содержимое комбо не показываем (пустой фон экрана, без спиннера на весь экран и без инициализации урока);
// подтвердился Free → пейвол, а после его закрытия выходим; Plus → обычный урок. Журнал: [COMBO-GATE] {source, premium, resolved, decision}.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import ScreenGradient from '../components/ScreenGradient';
import { usePremium } from '../components/PremiumContext';
import { parseCombinedLessonTopicsParam } from './combined_lesson_pool';
import { safeRouterBack } from './navigation_back';
import { openPremiumPaywall } from './paywall_navigation';

export type ComboGateDecision = 'allow' | 'pending' | 'deny';

/** Чистое решение: не комбо — пускаем; Plus — пускаем; статус неизвестен — ждём (контент закрыт); Free — отказ. */
export function comboGateDecision(input: Readonly<{ comboActive: boolean; hasPremiumAccess: boolean; accessResolved: boolean }>): ComboGateDecision {
  if (!input.comboActive) return 'allow';
  if (input.hasPremiumAccess) return 'allow';
  return input.accessResolved ? 'deny' : 'pending';
}

export function withComboPlusGate<P extends object>(Inner: React.ComponentType<P>): React.ComponentType<P> {
  function ComboPlusGate(props: P) {
    const router = useRouter();
    const params = useLocalSearchParams<{ combo?: string | string[]; from?: string | string[] }>();
    const { hasPremiumAccess, accessResolved } = usePremium();
    const comboActive = parseCombinedLessonTopicsParam(params.combo).length > 0;
    const decision = comboGateDecision({ comboActive, hasPremiumAccess, accessResolved });
    const paywallShownRef = useRef(false);
    const loggedRef = useRef('');
    const source = String(Array.isArray(params.from) ? params.from[0] : params.from ?? 'link');

    useEffect(() => {
      if (!comboActive) return;
      const key = `${decision}|${hasPremiumAccess}|${accessResolved}`;
      if (loggedRef.current === key) return;
      loggedRef.current = key;
      console.log(`[COMBO-GATE] ${JSON.stringify({ source, premium: hasPremiumAccess, resolved: accessResolved, decision })}`); // guard-ok: решение о границе доступа
    }, [accessResolved, comboActive, decision, hasPremiumAccess, source]);

    useFocusEffect(useCallback(() => {
      if (decision !== 'deny') return;
      if (!paywallShownRef.current) {
        paywallShownRef.current = true;
        openPremiumPaywall(router, { context: 'combined_lesson' });
        return;
      }
      console.log('[COMBO-GATE] paywall закрыт без Plus → выход'); // guard-ok: ветка выхода
      safeRouterBack(router, '/(tabs)/lessons' as never);
    }, [decision, router]));

    if (decision === 'allow') return <Inner {...props} />;
    // ждём или отказ: обычный фон экрана, содержимого комбо нет
    return <ScreenGradient>{null}</ScreenGradient>;
  }
  return ComboPlusGate;
}
