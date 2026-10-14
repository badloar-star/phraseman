// ═══════════════════════════════════════════════════════════════════════════
// SheetSwipeClose.tsx — свайп вниз закрывает шторку, лист едет за пальцем (правило «ручка ⇒ свайп»).
//
// зачем (координатор 14.10, расследование «закрыл шторку — всё зависло»; владелец): если у шторки видна «ручка»,
// свайп вниз обязан закрывать её ТЕМ ЖЕ путём, что крестик/фон (`onClose`), а лист обязан ехать за пальцем — лист, который не двигается и вдруг
// закрывается, ощущается как поломка. Закон тот же, что у HybridSheetShell / PaywallSwipeSheet: сдвиг > 88 px или рывок > 900 → закрыть;
// иначе пружина назад (SHEET.dragReturn); закрытие не состоялось → шторка возвращается на место, а не висит невидимой; reduceMotion — без следования.
//
// Как подключать:
//   <Modal …><SheetSwipeRoot> …существующее… <SheetSwipeClose name="…" onClose={…}>{ЛИСТ шторки}</SheetSwipeClose> … </SheetSwipeRoot></Modal>
// - SheetSwipeRoot — GestureHandlerRootView на весь экран (Android: жесты внутри Modal без него не работают); раскладку не меняет.
// - SheetSwipeClose оборачивает ЛИСТ ВНЕШНИМ Animated-слоем со своим translateY: внутренние transform-анимации листа остаются на нём,
//   трансформы вкладываются и не дерутся. `wrapStyle` — раскладка внешнего слоя (по умолчанию width:100%, дальше в поток родителя так же, как был лист);
//   шторка, не переносящая внешний слой (лист с position:absolute, процентная высота и т. п.), включает `follow={false}` — тогда жест только закрывает по порогу,
//   без следования (с пометкой в отчёте).
// - Жест живёт ТОЛЬКО в верхней зоне листа (ручка + шапка, hitSlop top:0,height:zoneHeight): тело со списком/полем прокручивается как обычно.
// - `enabled={false}` — оплата/необратимое действие/идущее сохранение: свайп выключен, а ручку прячет вызывающий.
// Сторож: tests/sheet_handle_implies_swipe_contract.test.ts. Логи: [SHEET-SWIPE].
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Dimensions, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing as REasing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { KIT_MOTION, SHEET } from '../../constants/motionHybrid';

/** Корень жестов внутри Modal: flex 1, раскладку содержимого не меняет (содержимое Modal и так занимает весь экран). */
export function SheetSwipeRoot({ children }: Readonly<{ children: React.ReactNode }>) {
  return <GestureHandlerRootView style={{ flex: 1 }}>{children}</GestureHandlerRootView>;
}

type Props = Readonly<{
  /** Тот же обработчик, что у крестика/фона шторки. */
  onClose: () => void;
  /** false — свайп выключен (оплата/необратимое действие/идущее сохранение). По умолчанию true. */
  enabled?: boolean;
  /** Подпись в журнале: какая шторка закрыта свайпом. */
  name: string;
  /**
   * Высота верхней зоны листа, где жест живёт (ручка + шапка), px. Тело шторки со списком/полем жест НЕ перехватывает — прокрутка и ввод не ломаются.
   * По умолчанию 112: ручка 5 + отступы + заголовок.
   */
  zoneHeight?: number;
  /** false — без следования за пальцем (лист не переносит внешний слой): закрывает по порогу, лист не двигается. */
  follow?: boolean;
  /** Раскладка внешнего слоя; по умолчанию только width:100%. */
  wrapStyle?: StyleProp<ViewStyle>;
  /** Лист шторки — один дочерний элемент. */
  children: React.ReactElement;
}>;

/** Сдвиг вниз, после которого шторка закрывается (как HybridSheetShell и PaywallSwipeSheet). */
export const SHEET_SWIPE_CLOSE_DISTANCE = SHEET.dragClosePx;
/** Скорость рывка вниз, после которой шторка закрывается. */
export const SHEET_SWIPE_CLOSE_VELOCITY = SHEET.dragCloseVelocity;

export default function SheetSwipeClose({ onClose, enabled = true, name, zoneHeight = 112, follow = true, wrapStyle, children }: Props) {
  const reduceMotion = useReducedMotion();
  const drag = useSharedValue(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (fallbackRef.current) clearTimeout(fallbackRef.current); }, []);
  const travel = Dimensions.get('window').height;

  const finishClose = useCallback(() => {
    if (__DEV__) console.log(`[SHEET-SWIPE] close source=swipe id=${name} follow=${String(follow)}`); // guard-ok: единичный лог закрытия
    onCloseRef.current();
    // зачем (правило «не висеть невидимой»): если закрытие не состоялось (замок повторного тапа и т. п.), лист возвращается на место.
    // Обычный путь — размонтирование шторки — снимает таймер.
    if (!follow) return;
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    fallbackRef.current = setTimeout(() => {
      console.warn(`[SHEET-SWIPE] close source=swipe id=${name} → закрытие не состоялось, лист возвращён на место`); // guard-ok: ранний выход логируется
      drag.value = withSpring(0, SHEET.dragReturn);
    }, KIT_MOTION.sheetMs + 600);
  }, [drag, follow, name]);

  const startClose = useCallback(() => {
    if (!follow || reduceMotion) { finishClose(); return; }
    drag.value = withTiming(
      travel,
      { duration: KIT_MOTION.sheetMs, easing: REasing.bezier(KIT_MOTION.sheetEase[0], KIT_MOTION.sheetEase[1], KIT_MOTION.sheetEase[2], KIT_MOTION.sheetEase[3]) },
      (finished) => { if (finished) runOnJS(finishClose)(); },
    );
  }, [drag, finishClose, follow, reduceMotion, travel]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        // жест только в верхней зоне листа (ручка + шапка): тело со списком прокручивается как обычно
        .hitSlop({ top: 0, height: zoneHeight })
        .activeOffsetY(10)
        .failOffsetX([-32, 32])
        .onUpdate((e) => {
          'worklet';
          if (!follow || reduceMotion) return;
          const ty = e.translationY;
          drag.value = ty < 0 ? ty * SHEET.dragResist : ty;
        })
        .onEnd((e) => {
          'worklet';
          const dy = follow && !reduceMotion ? drag.value : e.translationY;
          if (dy > SHEET_SWIPE_CLOSE_DISTANCE || e.velocityY > SHEET_SWIPE_CLOSE_VELOCITY) {
            runOnJS(startClose)();
          } else if (follow && !reduceMotion) {
            drag.value = withSpring(0, SHEET.dragReturn);
          }
        }),
    [drag, enabled, follow, reduceMotion, startClose, zoneHeight],
  );

  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drag.value }] }));

  if (!follow) return <GestureDetector gesture={pan}>{children}</GestureDetector>;
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ width: '100%' }, wrapStyle, dragStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}
