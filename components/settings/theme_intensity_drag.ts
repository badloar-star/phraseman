// зачем (владелец 2026-10-04, ползунок темы): жест живёт на UI-потоке и сюда, в JS,
// приходят только СМЕНЫ ШАГА (≤ 21 за весь проход) и отпускание. Здесь — правила:
//   • смена шага → перекраска без записи на диск (onPreview);
//   • опорная точка (0 / 25 / 50 / 75 / 100 %) → щелчок хаптиком, не на каждом шаге;
//   • отпускание/прерывание → ровно ОДНА запись (onCommit), сколько бы ни было движений.
// Логика отделена от компонента, чтобы её можно было проверить тестом без жестов.

import {
  LIQUID_GLASS_INTENSITY_DETENTS,
  quantizeLiquidGlassIntensity,
} from '../../constants/liquidGlassThemeIntensity';

// зачем: в части тестовых окружений глобального __DEV__ нет — лог [THEME-INTENSITY] не должен ронять гидратацию.
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;

export type ThemeIntensityDragCallbacks = Readonly<{
  onPreview: (intensity: number | null) => void;
  onCommit: (intensity: number) => void;
  onDetent?: (intensity: number) => void;
}>;

export type ThemeIntensityDragController = Readonly<{
  /** Палец коснулся ползунка. */
  begin: (intensity: number) => void;
  /** Шаг сменился во время перетаскивания. */
  step: (intensity: number) => void;
  /** Палец отпущен или жест прерван — сохранить последнее положение. */
  end: (intensity?: number) => void;
  /** Не перетаскивание: тап по дорожке или шаг доступности — сразу сохранить. */
  commitNow: (intensity: number) => void;
  isDragging: () => boolean;
}>;

export function createThemeIntensityDragController(cb: ThemeIntensityDragCallbacks): ThemeIntensityDragController {
  let dragging = false;
  let last = 0;

  const emitStep = (q: number) => {
    if (q === last) return;
    last = q;
    cb.onPreview(q);
    if (LIQUID_GLASS_INTENSITY_DETENTS.includes(q)) cb.onDetent?.(q);
  };

  return Object.freeze({
    begin(intensity: number) {
      dragging = true;
      last = quantizeLiquidGlassIntensity(intensity);
      cb.onPreview(last);
    },
    step(intensity: number) {
      if (!dragging) return;
      emitStep(quantizeLiquidGlassIntensity(intensity));
    },
    end(intensity?: number) {
      if (!dragging) return;
      dragging = false;
      const q = intensity === undefined ? last : quantizeLiquidGlassIntensity(intensity);
      last = q;
      if (IS_DEV) console.log('[THEME-INTENSITY] drag end → commit', { intensity: q });
      cb.onCommit(q);
    },
    commitNow(intensity: number) {
      const q = quantizeLiquidGlassIntensity(intensity);
      const crossedDetent = q !== last && LIQUID_GLASS_INTENSITY_DETENTS.includes(q);
      last = q;
      if (crossedDetent) cb.onDetent?.(q);
      cb.onCommit(q);
    },
    isDragging: () => dragging,
  });
}
