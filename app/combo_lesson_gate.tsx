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

/** Потолок ожидания статуса Plus / активации после пейвола. */
export const COMBO_GATE_CAP_MS = 5000;

export function withComboPlusGate<P extends object>(Inner: React.ComponentType<P>): React.ComponentType<P> {
  const MemoInner = React.memo(Inner) as unknown as React.ComponentType<P>;
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

    const leave = useCallback((reason: string) => {
      console.log(`[COMBO-GATE] выход reason=${reason}`); // guard-ok: ветка выхода
      safeRouterBack(router, '/(tabs)/lessons' as never);
    }, [router]);

    // зачем (Ревизор c3271a1c0): статус не прояснился за потолок — закрыто и выход (не вечный пустой фон)
    useEffect(() => {
      if (decision !== 'pending') return undefined;
      const timer = setTimeout(() => leave(`pending_cap_${COMBO_GATE_CAP_MS}ms`), COMBO_GATE_CAP_MS);
      return () => clearTimeout(timer);
    }, [decision, leave]);

    // зачем (Ревизор c3271a1c0): после покупки на пейволе статус Plus приходит с задержкой (premium_activated) — сразу выходить нельзя; ждём потолок и решаем
    const afterPaywallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
      if (decision === 'allow' && afterPaywallTimerRef.current) {
        clearTimeout(afterPaywallTimerRef.current);
        afterPaywallTimerRef.current = null;
        console.log('[COMBO-GATE] Plus подтвердился после пейвола → пускаем'); // guard-ok: ветка допуска
      }
    }, [decision]);
    useEffect(() => () => { if (afterPaywallTimerRef.current) clearTimeout(afterPaywallTimerRef.current); }, []);

    useFocusEffect(useCallback(() => {
      if (decision !== 'deny') return;
      if (!paywallShownRef.current) {
        paywallShownRef.current = true;
        openPremiumPaywall(router, { context: 'combined_lesson' });
        return;
      }
      if (afterPaywallTimerRef.current) return;
      console.log(`[COMBO-GATE] paywall закрыт, Plus ещё не виден — жду до ${COMBO_GATE_CAP_MS}мс`); // guard-ok: ожидание активации
      afterPaywallTimerRef.current = setTimeout(() => {
        afterPaywallTimerRef.current = null;
        leave('paywall_closed_without_plus');
      }, COMBO_GATE_CAP_MS);
    }, [decision, leave, router]));

    if (decision === 'allow') return <MemoInner {...props} />;
    // ждём или отказ: обычный фон экрана, содержимого комбо нет
    return <ScreenGradient>{null}</ScreenGradient>;
  }
  return ComboPlusGate;
}
