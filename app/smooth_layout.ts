import { LayoutAnimation, Platform, UIManager } from "react-native";

// зачем: владелец требует Bevel-уровень стабильности лэйаута — элементы,
// которые появляются/исчезают в потоке (баннеры, вставные карточки), не должны
// «телепортировать» контент. Любой flip видимости оборачивается в плавный
// layout-переход, чтобы сдвиг читался как намеренная анимация, а не дёрганье.
// Контракт: AGENTS.md → Performance Bible → «Layout Stability».

if (
  Platform.OS === "android" &&
  typeof UIManager?.setLayoutAnimationEnabledExperimental === "function"
) {
  // Старая архитектура Android требует явного включения; на Fabric — no-op.
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Планирует плавную анимацию СЛЕДУЮЩЕГО изменения лэйаута (~220мс ease).
 * Вызывать строго перед setState, который вставляет/убирает элемент из потока.
 */
export function animateNextLayoutTransition(durationMs: number = 220): void {
  LayoutAnimation.configureNext(
    LayoutAnimation.create(
      durationMs,
      LayoutAnimation.Types.easeInEaseOut,
      LayoutAnimation.Properties.opacity,
    ),
  );
}

/**
 * Сдвигает уже видимые элементы, но не скрывает вставляемые на первом кадре.
 * Подходит для раскрытия больших inline-списков: новые строки сразу видимы,
 * соседний контент при этом мягко освобождает им место.
 */
export function animateNextLayoutShiftWithoutEntryFade(
  durationMs: number = 220,
): void {
  LayoutAnimation.configureNext({
    duration: durationMs,
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    delete: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
  });
}
