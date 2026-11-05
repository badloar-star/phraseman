// зачем (theme_sliders_v1, слово владельца через координатора 05.11): жест ползунка «Оттенок/Насыщенность» живёт на UI-потоке, а в JS приходят только
// СМЕНЫ ЦЕЛОГО ШАГА (оттенок 0…359, насыщенность 0…100) и отпускание. Правила: смена шага → перекраска превью без записи на диск (onPreview);
// отпускание или прерывание → ровно ОДНА запись (onCommit), сколько бы ни было движений; тап по дорожке и шаг доступности → сразу запись.
// Логика отделена от компонента, чтобы проверяться тестом без жестов (как theme_intensity_drag.ts).

export type TuneDragCallbacks = Readonly<{
  onPreview: (value: number) => void;
  onCommit: (value: number) => void;
}>;

export type TuneDragController = Readonly<{
  /** Палец коснулся ползунка. */
  begin: (value: number) => void;
  /** Шаг сменился во время перетаскивания. */
  step: (value: number) => void;
  /** Палец отпущен или жест прерван — сохранить последнее положение. */
  end: (value?: number) => void;
  /** Не перетаскивание: тап по дорожке или шаг доступности — сразу сохранить. */
  commitNow: (value: number) => void;
  isDragging: () => boolean;
}>;

export function createTuneDragController(cb: TuneDragCallbacks): TuneDragController {
  let dragging = false;
  let last = Number.NaN;
  return Object.freeze({
    begin(value: number) {
      dragging = true;
      last = value;
      cb.onPreview(value);
    },
    step(value: number) {
      if (!dragging || value === last) return;
      last = value;
      cb.onPreview(value);
    },
    end(value?: number) {
      if (!dragging) return;
      dragging = false;
      const v = value === undefined ? last : value;
      last = v;
      cb.onCommit(v);
    },
    commitNow(value: number) {
      last = value;
      cb.onCommit(value);
    },
    isDragging: () => dragging,
  });
}
