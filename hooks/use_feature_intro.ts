// ─── useFeatureIntro — показ обучающей модалки фичи по фокусу экрана ──────
// зачем: единая точка подключения для FeatureIntroModal на любом экране.
// Показывается через 600мс ПОСЛЕ фокуса экрана (не мгновенно на маунт — даёт
// первому кадру экрана осесть, паттерн «ничего не прыгает поверх ещё не
// осевшего layout»), и только ОДИН раз за сессию экрана (повторный фокус того
// же смонтированного экрана не переоткрывает, пока компонент не размонтирован).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  markFeatureIntroSeen,
  shouldShowFeatureIntro,
} from '../app/feature_intro_registry';

const SHOW_DELAY_MS = 600;

export type UseFeatureIntroResult = Readonly<{
  visible: boolean;
  /** dismiss(true) — отметить показанным (CTA «Понятно»). dismiss(false) — закрыть без пометки («Позже»/бэкдроп/свайп). */
  dismiss: (markSeen: boolean) => void;
}>;

export function useFeatureIntro(id: string, enabled = true): UseFeatureIntroResult {
  const [visible, setVisible] = useState(false);
  // Один показ за время жизни экрана: повторный фокус (например, после
  // возврата с дочернего экрана) не должен снова поднимать модалку.
  const offeredOnceRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return undefined;
      if (offeredOnceRef.current) return undefined;
      let alive = true;
      const timer = setTimeout(() => {
        if (!alive) return;
        void shouldShowFeatureIntro(id).then((show) => {
          if (!alive || !show) return;
          offeredOnceRef.current = true;
          setVisible(true);
        });
      }, SHOW_DELAY_MS);
      return () => {
        alive = false;
        clearTimeout(timer);
      };
    }, [enabled, id]),
  );

  // Сброс «один раз за экран» при смене id (тот же хук на разных фичах на
  // одном месте — редко, но не должно залипать на предыдущей фиче).
  useEffect(() => {
    offeredOnceRef.current = false;
  }, [id]);

  // Главные вкладки живут внутри одного navigation route, поэтому потеря
  // визуального владения не вызывает blur. Уже открытое интро обязано закрыться
  // сразу, иначе нативная Modal останется поверх соседней вкладки.
  useEffect(() => {
    if (!enabled) setVisible(false);
  }, [enabled]);

  const dismiss = useCallback((markSeen: boolean) => {
    setVisible(false);
    if (markSeen) void markFeatureIntroSeen(id);
  }, [id]);

  return { visible, dismiss };
}
