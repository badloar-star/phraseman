// ═════════════════════════════════════════════════════════════════════
// lessonsListCardEquality.ts — сравнение ячейки списка «Обучение» по ДАННЫМ урока (R1, L1).
//
// зачем (координатор 12.10, аудит скорости R1 «L1»): корень экрана Уроков коммитится часто (энергия, прогресс, навигация), и на каждом коммите renderLessonCard
// собирал для плашки НОВЫЙ объект `state` ({kind:'progress', pct}) — стандартный React.memo видит новую ссылку и перерисовывает все видимые плашки
// (градиенты, стекло, SVG). Здесь сравниваем само содержимое состояния: перерисовка только когда данные урока реально изменились.
// Файл чистый (без react-native), чтобы сторож гонял сравнение напрямую.
// ═════════════════════════════════════════════════════════════════════
import type { LessonsListCardState } from './LessonsListGlassCard';

type LessonsListCardEqualityProps = {
  glass: unknown;
  lang: string;
  num: number;
  name: string;
  state: LessonsListCardState;
  current: boolean;
  onPressLesson: unknown;
};

/** Одинаковые ли два состояния плашки по содержимому (а не по ссылке). */
export function lessonsListCardStateEqual(a: LessonsListCardState, b: LessonsListCardState): boolean {
  if (a === b) return true;
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'done':
      return a.stars === (b as typeof a).stars;
    case 'progress':
      return a.pct === (b as typeof a).pct;
    case 'locked':
      return a.prevNum === (b as typeof a).prevNum;
    default:
      return true;
  }
}

/**
 * Comparator для React.memo плашки урока: равно ⇒ перерисовки нет. Ссылочные пропсы (glass, onPressLesson) сравниваются по ссылке — они стабильны
 * (токены темы кэшируются, обработчик в useCallback); состояние — по содержимому.
 */
export function lessonsListCardPropsEqual(prev: LessonsListCardEqualityProps, next: LessonsListCardEqualityProps): boolean {
  return (
    prev.glass === next.glass &&
    prev.lang === next.lang &&
    prev.num === next.num &&
    prev.name === next.name &&
    prev.current === next.current &&
    prev.onPressLesson === next.onPressLesson &&
    lessonsListCardStateEqual(prev.state, next.state)
  );
}
