/**
 * EnergyCostBadge — угловой бейдж «−1 ⚡» поверх кнопки старта активности.
 *
 * зачем: владелец 2026-08-23 — энергия теперь платится за ВХОД в активность
 * (урок, тренировка, Арена, карточки, диалоги), а не за ошибки. Раз плата
 * берётся в момент нажатия, человек обязан видеть цену ДО нажатия — иначе
 * списание выглядит как необъяснимая пропажа заряда. Владелец выбрал угловой
 * бейдж (не строку в тексте кнопки и не подпись под ней).
 *
 * Иконка — ассет АКТИВНОЙ ТЕМЫ (тот же EnergyIcon, что в шапке), поэтому бейдж
 * везде выглядит родным для текущего оформления.
 *
 * Скрыт при безлимите (Плюс/VIP, тестер, «вечер без лимитов», фичегейт «энергия
 * бесплатна всем»): подписчику надпись «−1» врала бы — он ничего не теряет.
 *
 * Движение: постоянно висящий элемент НЕ должен привлекать внимание всё время
 * (принцип «часто видимое — не анимируем»), поэтому по умолчанию бейдж
 * появляется одним мягким входом и дальше стоит неподвижно. Пульс включается
 * только `urgent` — когда это последняя единица и предупреждение оправдано.
 */
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from './ThemeContext';
import { useEnergy } from './EnergyContext';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import EnergyIcon from './EnergyIcon';

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
  const { theme: t, themeMode, f } = useTheme();
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

  // Безлимит — бейджа нет вовсе (решение владельца 2026-08-23).
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
      <Text style={[styles.label, { color: urgent ? t.wrong : t.textPrimary, fontSize: f.caption }]}>
        {`−${cost}`}
      </Text>
      <EnergyIcon filled themeMode={themeMode} size={14} animateChange={false} themeColor={t.accent} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    zIndex: 3,
    elevation: 3,
  },
  // зачем: смещение внутрь, а не наружу. Кнопки старта нередко стоят в
  // контейнерах с overflow:hidden (шторка Learning V2, карточки Арены) — бейдж,
  // вылезающий за границу кнопки, там обрезался бы. Внутреннее положение
  // выглядит так же «угловым», но не может быть срезано ни в одном контейнере.
  topRight: { top: -8, right: 6 },
  topLeft: { top: -8, left: 6 },
  label: { fontWeight: '900' },
});

export default memo(EnergyCostBadge);
