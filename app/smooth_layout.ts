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

// зачем (владелец 11.11, вылет iOS «Attempt to unmount a view which has a different index» после ответа на «Фразу дня»; правило «сперва логи»):
// анимация раскладки общая на ВСЁ приложение — заказанная одним экраном, она применяется к ближайшему изменению любого другого, включая открытую шторку.
// Подозрение: она совпала с закрытием шторки. Временная трассировка [SHEET-CRASH]: кто и когда её заказал (только dev). Убрать после починки.
function traceLayoutAnimationRequest(kind: string, durationMs: number): void {
  if (!(typeof __DEV__ !== "undefined" && __DEV__)) return;
  const caller = (new Error().stack ?? "").split("\n").slice(3, 5).map((line) => line.trim().slice(0, 80)).join(" <- ");
  console.log(`[SHEET-CRASH] layout_anim kind=${kind} durationMs=${durationMs} t=${Date.now() % 100000} from=${caller}`); // guard-ok: временная трассировка вылета шторки
}

/**
 * Планирует плавную анимацию СЛЕДУЮЩЕГО изменения лэйаута (~220мс ease).
 * Вызывать строго перед setState, который вставляет/убирает элемент из потока.
 */
export function animateNextLayoutTransition(durationMs: number = 220): void {
  traceLayoutAnimationRequest("transition", durationMs);
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
  traceLayoutAnimationRequest("shift_no_entry_fade", durationMs);
  LayoutAnimation.configureNext({
    duration: durationMs,
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    delete: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
  });
}
