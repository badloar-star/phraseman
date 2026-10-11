// зачем (поправка приоритета координатора 14.10, снимки Макетов по Шпилю: «плашки и кнопки плоские»): Шпиль в стиле «Тень», как остальное приложение —
// плашка = тон + plateBoxShadow, вложенная кнопка/чип = nestedBoxShadow, главная кнопка = цветная тень действия. Токены берутся из активной темы,
// поэтому тема, оформление и ползунок насыщенности работают сами. Логики Шпиля не касается — только вид.
import { useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { actionBoxShadow, nestedBoxShadow, plateBoxShadow, useShadowGlass } from '../v2/ShadowSurface';

export type SpireShadow = Readonly<{
  /** Плашка (карточка вопроса, итог недели, подсказка). */
  plate: ViewStyle;
  /** Вложенная кнопка/чип/пилюля. */
  nested: ViewStyle;
  /** Главная кнопка: цветная тень цвета кнопки. */
  action: (color: string) => ViewStyle;
}>;

export function useSpireShadow(): SpireShadow {
  const g = useShadowGlass();
  return useMemo(() => ({
    plate: { boxShadow: plateBoxShadow(g) },
    nested: { boxShadow: nestedBoxShadow(g) },
    action: (color: string) => ({ boxShadow: actionBoxShadow({ accent: color }) }),
  }), [g]);
}
