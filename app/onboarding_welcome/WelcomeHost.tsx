// ════════════════════════════════════════════════════════════════════════════
// WelcomeHost.tsx — гейтинг + запуск приветствия (один раз).
//
// Решает, показывать ли приветствие и в какой ветке, и рендерит WelcomeSlides
// (отдельный экран-слайды). Логика «ровно один раз / без повторов» — в
// welcome_gate (флаг + синхронная защёлка). Реагирует на принудительный запуск
// из админ-лаборатории (одноразовый QA-флаг).
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePremium } from '../../components/PremiumContext';
import { useOverlayVisible } from '../../components/OverlayArbiter';
import { emitAppEvent } from '../events';
import { readPersonalPlanState } from '../personal_plan_state';
import WelcomeSlides from './WelcomeSlides';
import {
  consumeForcedWelcomeBranch,
  decideShouldShowWelcome,
  isWelcomeLatched,
  latchWelcomeShown,
  markWelcomeSeen,
  readWelcomeSeen,
  type WelcomeBranch,
} from './welcome_gate';

// РЕЛИЗ-ХОТФИКС: приветствие-«компас» после онбординга вызывало фриз на iOS
// (нативный <Modal> мигал и оставлял прозрачный слой-перехватчик касаний: скролл
// работал, кнопки/табы — нет). До переделки на не-модальный показ ВЫКЛЮЧЕНО полностью,
// чтобы гарантированно убрать гонку модалок после онбординга. Переключатель — одна
// константа: вернуть true, когда показ будет переписан без нативного Modal.
const WELCOME_ENABLED = false;

export default function WelcomeHost() {
  const { hasPremiumAccess } = usePremium();
  const [branch, setBranch] = useState<WelcomeBranch | null>(null);
  const busyRef = useRef(false); // одно вычисление за раз (анти-гонка двух триггеров)

  const evaluate = useCallback(async () => {
    if (!WELCOME_ENABLED) return; // релиз-хотфикс: компас выключен
    if (busyRef.current) return;
    if (isWelcomeLatched()) return; // уже решали в этом запуске
    busyRef.current = true;
    try {

    const [seenRaw, onboardingRaw, forced, planState] = await Promise.all([
      readWelcomeSeen(),
      AsyncStorage.getItem('onboarding_done').catch(() => null),
      consumeForcedWelcomeBranch(),
      readPersonalPlanState().catch(() => null),
    ]);

    if (isWelcomeLatched()) return; // мог решиться, пока ждали await

    const decision = decideShouldShowWelcome({
      seenRaw,
      onboardingDone: onboardingRaw === '1',
      latched: false,
      forced,
      hasPremiumAccess,
      hasActivePlan: !!planState,
    });

    if (decision.show) {
      // Латчим СИНХРОННО до показа: ремаунт главной не запустит второй раз.
      latchWelcomeShown();
      setBranch(decision.branch);
    }
    } finally {
      busyRef.current = false;
    }
  }, [hasPremiumAccess]);

  useEffect(() => {
    void evaluate();
  }, [evaluate]);

  // Повторно оценить при возврате фокуса на главную — нужно для принудительного
  // запуска из админ-лаборатории (навигация на уже смонтированную главную).
  // Латч процесса не даёт этому стать повторным показом в обычном потоке.
  useFocusEffect(
    useCallback(() => {
      void evaluate();
    }, [evaluate]),
  );

  const handleClose = useCallback((_completed: boolean) => {
    setBranch(null);
    void markWelcomeSeen();
    // Сообщаем, что компас-приветствие закрыто → _layout показывает подарок 3 дня
    // (introFullAccess 'welcome') СТРОГО после, а не по слепому таймеру (анти-гонка
    // с арбитром: иначе подарок мог занять слот раньше компаса).
    emitAppEvent('welcome_closed');
  }, []);

  // Пропускаем показ через OverlayArbiter (приоритет 'onboardingWelcome' — самый высокий).
  // Welcome — полноэкранный нативный <Modal>; без арбитра он презентовался ОДНОВРЕМЕННО с
  // наградной/update-модалкой (perfectWeekReward, compassBriefing, update…), которую сразу
  // после онбординга отдавал арбитр. На iOS два present подряд ломают стек презентаций:
  // первый (welcome) схлопывается («мелькнул и пропал»), второй виснет полупрезентованным →
  // фриз. Через арбитр welcome держит единственный слот первым, остальные ждут очереди.
  // Хук вызываем безусловно (правила хуков); сам <Modal> монтируем только когда арбитр
  // выбрал наш ключ — иначе welcome всё равно конкурировал бы за нативную презентацию.
  const arbitratedVisible = useOverlayVisible('onboardingWelcome', branch != null);

  if (!branch || !arbitratedVisible) return null;

  return <WelcomeSlides branch={branch} onClose={handleClose} />;
}
