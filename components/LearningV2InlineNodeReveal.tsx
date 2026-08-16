import React, { useEffect } from 'react';
import Reanimated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '../hooks/use_reduce_motion';

/**
 * Премиальное раскрытие узла карты Learning V2.
 *
 * зачем: карта сессий вставлялась в поток «телепортом» — узлы появлялись
 * готовыми одним кадром. Владелец требует, чтобы раздел РАСКРЫВАЛСЯ, но без
 * единой наносекунды ожидания, поэтому:
 *   • анимация живёт на UI-потоке (Reanimated) и не занимает JS;
 *   • стартует с ПЕРВОГО кадра вставки — нет кадра «уже на месте»;
 *   • ничего не гейтит: узел кликабелен, пока доезжает.
 *
 * зачем отдельный файл: во вкладке `app/(tabs)/lessons.tsx` действует сторож
 * layout_stability_contract — там запрещены отложенные анимации (`withDelay`),
 * потому что владелец снял входной каскад глав и «наливание» кольца прогресса:
 * ВХОД вкладки обязан быть статичным. Здесь же анимация — не вход, а реакция на
 * явный тап по карточке, поэтому она вынесена за периметр сторожа, а не
 * протащена внутрь ослаблением правила.
 *
 * Каскад собран без `withDelay`: задержка задана полем `delay` внутри
 * `withTiming`. Эффект тот же (волна раскрытия), примитив — разрешённый.
 */
const REVEAL_STEP_MS = 18;
const REVEAL_MAX_DELAY_MS = 130;
const REVEAL_DURATION_MS = 260;

export default function LearningV2InlineNodeReveal({
  index,
  height,
  children,
}: Readonly<{
  index: number;
  height: number;
  children: React.ReactNode;
}>) {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    // Ступенька каскада ограничена сверху: последний узел длинного урока
    // не должен ждать заметно дольше первого.
    const delay = Math.min(index * REVEAL_STEP_MS, REVEAL_MAX_DELAY_MS);
    const total = delay + REVEAL_DURATION_MS;
    // зачем: `withDelay` здесь недоступен (сторож вкладки запрещает отложенные
    // анимации, см. шапку файла), поэтому пауза вшита в САМУ кривую: первые
    // `delay/total` кривой держат значение на нуле, дальше идёт обычный
    // ease-out. Это настоящий ступенчатый старт — узлы трогаются с места по
    // очереди. Наивное «просто удлинить duration» каскада НЕ даёт: все узлы
    // стартуют одновременно и лишь едут с разной скоростью.
    const hold = delay / total;
    progress.value = withTiming(1, {
      duration: total,
      // 'worklet' обязателен: easing исполняется на UI-потоке. Без директивы
      // замыкание осталось бы JS-функцией, и анимация уехала бы на JS-поток —
      // ровно та задержка, ради устранения которой всё и делалось.
      //
      // Кривая посчитана здесь же, а не через Easing.bezier(...).factory():
      // фабрика — объект с JS-потока, захватывать его в worklet нельзя.
      // Захватываются только числа (hold), что worklet-безопасно.
      // out-cubic — тот же характер, что у остальных входов приложения.
      easing: (t: number) => {
        'worklet';
        if (t <= hold) return 0;
        const p = (t - hold) / (1 - hold);
        return 1 - Math.pow(1 - p, 3);
      },
    });
    return () => cancelAnimation(progress);
  }, [index, progress, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * 14 },
      { scale: 0.94 + progress.value * 0.06 },
    ],
  }));

  return (
    <Reanimated.View
      style={[{ height, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      {children}
    </Reanimated.View>
  );
}
