/**
 * EnergyCostBadge — угловой бейдж «−1» поверх кнопки старта активности.
 *
 * зачем: владелец 2026-08-23 — энергия теперь платится за ВХОД в активность
 * (урок, тренировка, Арена, карточки, диалоги), а не за ошибки. Раз плата
 * берётся в момент нажатия, человек обязан видеть цену ДО нажатия — иначе
 * списание выглядит как необъяснимая пропажа заряда. Владелец выбрал угловой
 * бейдж (не строку в тексте кнопки и не подпись под ней).
 *
 * зачем без иконки молнии (владелец 2026-08-24): значок читался как посторонний
 * ассет на плитке, а не как понятная цена. Голое число крупнее и однозначнее —
 * та же условность, что у бейджа уведомлений/счётчика.
 *
 * зачем полностью снаружи, а не наполовину внутри (владелец 2026-08-24): раньше
 * `top:-8` при высоте ~22px оставляло бейдж наполовину под верхним краем кнопки —
 * выглядело как деталь ВНУТРИ плашки. Теперь смещение равно половине высоты
 * бейджа — центр бейджа стоит РОВНО на кромке угла, как счётчик уведомлений.
 *
 * Скрыт целиком при безлимите (Плюс/VIP, тестер, «вечер без лимитов», фичегейт
 * «энергия бесплатна всем»): подписчику надпись «−1» врала бы — он ничего не
 * теряет, а без иконки-заглушки показывать больше нечего.
 *
 * Движение: постоянно висящий элемент НЕ должен привлекать внимание всё время
 * (принцип «часто видимое — не анимируем»), поэтому по умолчанию бейдж
 * появляется одним мягким входом и дальше стоит неподвижно. Пульс включается
 * только `urgent` — когда это последняя единица и предупреждение оправдано.
 * Само списание анимирует общий EnergySpendFlightHost (молния по центру экрана) —
 * бейджу отдельная анимация траты не нужна (владелец 2026-08-24).
 */
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from './ThemeContext';
import { useEnergy } from './EnergyContext';
import { useReduceMotion } from '../hooks/use_reduce_motion';

interface EnergyCostBadgeProps {
  /** Сколько единиц спишется. По умолчанию 1 — единое правило экономики. */
  cost?: number;
  /** Подсветить как предупреждение (например, это последняя единица). */
  urgent?: boolean;
  /** Позиция угла относительно родителя-кнопки. */
  corner?: 'topRight' | 'topLeft';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function EnergyCostBadge({
  cost = 1,
  urgent = false,
  corner = 'topRight',
  style,
  testID,
}: EnergyCostBadgeProps) {
  const { theme: t } = useTheme();
  const { isUnlimited } = useEnergy();
  const reduceMotion = useReduceMotion();

  // Вход: не из scale(0) — элемент не должен возникать из ничего.
  const enter = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) { enter.setValue(1); return; }
    Animated.timing(enter, {
      toValue: 1,
      duration: 220,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
      useNativeDriver: true,
    }).start();
  }, [enter, reduceMotion]);

  useEffect(() => {
    if (!urgent || reduceMotion) { pulse.setValue(0); return; }
    // Мягкое «дыхание» только в предупреждающем состоянии.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 720, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 720, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => { loop.stop(); pulse.setValue(0); };
  }, [urgent, pulse, reduceMotion]);

  // зачем: без иконки значку нечего показывать при безлимите — заглушки
  // больше нет, так что бейдж просто не рендерится (Плюс/VIP/тестер/вечернее
  // окно ничего не платят, показывать нечего). Владелец 2026-08-24.
  if (isUnlimited) return null;

  const scale = Animated.add(
    enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }),
    pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.05] }),
  );

  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.badge,
        corner === 'topRight' ? styles.topRight : styles.topLeft,
        {
          // Тоном, не обводкой: плотная подложка темы вместо рамки.
          backgroundColor: urgent ? t.wrongBg : t.bgSurface2,
          opacity: enter,
          transform: [{ scale }],
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: urgent ? t.wrong : t.textPrimary }]}>
        {`−${cost}`}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    minWidth: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 15,
    zIndex: 3,
    elevation: 3,
  },
  // зачем: центр бейджа лежит РОВНО на углу плашки (смещение = половина
  // высоты/ширины) — бейдж торчит полностью наружу, как счётчик уведомлений,
  // а не наполовину прячется под кнопкой (владелец 2026-08-24). Все 13 текущих
  // мест вызова проверены точечно: контейнер вокруг самой кнопки старта нигде
  // не режет overflow:hidden (он стоит только на внешних шторках/декоративных
  // полосках, кнопка внутри них не у самого обрезаемого края).
  topRight: { top: -15, right: -10 },
  topLeft: { top: -15, left: -10 },
  label: { fontWeight: '900', fontSize: 15 },
});

export default memo(EnergyCostBadge);
