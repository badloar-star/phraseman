// ════════════════════════════════════════════════════════════════════════════
// SeasonPassBuyButton — CTA «Открыть пропуск» на экране Season Pass.
//
// зачем 2026-08-24 (владелец: «исправь кнопку купить пропуск, сделай другой
// дизайн кнопки, сделай её анимированной»): раньше это была плоская заливка
// `backgroundColor: t.gold` со скруглением 18 и без единого движения — самая
// дорогая кнопка в приложении выглядела дешевле обычных вторичных кнопок и
// ничем не притягивала взгляд на длинной прокручиваемой дорожке.
//
// Собрано из уже существующего в проекте языка премиума (PremiumGoldButton):
// многоступенчатый металлический градиент + медленный блик. Отличия сделаны
// осознанно, чтобы кнопка не выглядела копией пейволла:
//   • градиент строится ИЗ ТОКЕНА ТЕМЫ `t.gold`, а не из хардкода #D4AF37 —
//     в светлых темах gold тёмно-бронзовый (#8B6320) с белым текстом, и
//     хардкод дал бы нечитаемый жёлтый на белом (класс бага «isLightTheme»);
//   • «дыхание» подложки (мягкое свечение под кнопкой) вместо рамки — обводки
//     у владельца под запретом, глубина даётся тоном и тенью;
//   • жемчужина слегка покачивается в такт дыханию — взгляд цепляется за цену.
//
// Всё движение — на нативном драйвере (transform/opacity), лупы гасятся, когда
// экран не в фокусе или приложение свёрнуто (useRuntimeActive), иначе
// freezeOnBlur:false грел бы телефон на ушедшем экране.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { softShadow } from '../constants/androidGlow';
import { buttonForegroundForBackground } from '../constants/color_contrast';

// зачем: градиент строится ИЗ токена темы, а не из хардкода — значит нужны две
// чистые функции смешения. Локально, а не импортом из components/ui/v2_theme:
// там такой же mixHex лежит рядом с токенами режима «Турниры», и тянуть турнирный
// модуль в экран сезона ради двух строк арифметики — лишняя связь между режимами.
/** Смешение #RRGGBB: t — доля цвета `b`. Не-hex токен возвращается как есть. */
function mixHex(a: string, b: string, t: number): string {
  // Сегодня все темы дают gold в виде #RRGGBB, но токен приходит извне —
  // на любом другом формате (rgba/имя) parseInt дал бы NaN и цвет «#NaNNaN».
  if (!/^#[0-9a-fA-F]{6}$/.test(a)) return a;
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sa: number, sb: number) => Math.round(sa * (1 - t) + sb * t);
  const r = ch((pa >> 16) & 255, (pb >> 16) & 255);
  const g = ch((pa >> 8) & 255, (pb >> 8) & 255);
  const bl = ch(pa & 255, pb & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1).toUpperCase()}`;
}

/** Осветление (amount > 0) или затемнение (amount < 0) на долю 0..1. */
function shadeHex(hex: string, amount: number): string {
  return amount >= 0 ? mixHex(hex, '#FFFFFF', amount) : mixHex(hex, '#000000', -amount);
}

const RADIUS = 22;
const SHINE_SWEEP_MS = 3200;
const SHINE_GAP_MS = 2600;
const BREATH_MS = 2400;

type Props = {
  label: string;
  price: number;
  pearlIcon: ImageSourcePropType;
  gold: string;
  textOnGold: string;
  busy?: boolean;
  onPress: () => void;
  testID?: string;
};

function SeasonPassBuyButton({ label, price, pearlIcon, gold, textOnGold, busy = false, onPress, testID }: Props) {
  const animationsActive = useRuntimeActive();
  const shine = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;

  // Бегущий блик: проход + пауза, чтобы кнопка не мигала непрерывно (это
  // читается как «загрузка»). Пауза сделана нулевым отрезком в конце
  // последовательности, а не delay — так луп не накапливает дрейф.
  useEffect(() => {
    if (!animationsActive || busy) {
      shine.stopAnimation();
      shine.setValue(0);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shine, {
          toValue: 1,
          duration: SHINE_SWEEP_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(SHINE_GAP_MS),
        Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [animationsActive, busy, shine]);

  // «Дыхание» — очень медленное и неглубокое (свечение 0.35→0.75, жемчужина
  // ±1.5°). Всё, что заметно сильнее, на длинном экране начинает раздражать.
  useEffect(() => {
    if (!animationsActive || busy) {
      breath.stopAnimation();
      breath.setValue(0);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: BREATH_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: BREATH_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [animationsActive, busy, breath]);

  const onPressIn = useCallback(() => {
    Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  }, [press]);

  const onPressOut = useCallback(() => {
    Animated.spring(press, { toValue: 0, useNativeDriver: true, speed: 24, bounciness: 8 }).start();
  }, [press]);

  // Хаптик НЕ здесь: вызывающий (onBuyPress в season_pass.tsx) уже делает
  // hapticTap() сам, и второй вызов дал бы двойную вибрацию на одно нажатие.

  // Металлическая лестница из одного токена: тёмная фаска снизу, светлый блик
  // сверху. shadeHex/mixHex держат оттенок темы — в бронзовой светлой теме
  // получается бронза, в жёлтой тёмной — золото.
  const gradientColors: readonly [string, string, string, string, string] = [
    shadeHex(gold, -0.34),
    shadeHex(gold, -0.06),
    mixHex(gold, '#FFFFFF', 0.34),
    shadeHex(gold, -0.1),
    shadeHex(gold, -0.4),
  ];

  const pressScale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.965] });
  const shineTranslate = shine.interpolate({ inputRange: [0, 1], outputRange: [-220, 460] });
  const haloOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });
  const haloScale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.02] });
  const pearlRotate = breath.interpolate({ inputRange: [0, 1], outputRange: ['-1.5deg', '1.5deg'] });
  const pearlScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });

  // Плашка цены — золото, притемнённое на 30%. Текст на ней НЕ хардкодим белым:
  // в бронзовой светлой теме подложка выходит тёмной (белый верен), а в жёлтой
  // (#FFC800 → #B28C00) белый даёт слабый контраст. Помощник проекта выбирает
  // светлый или тёмный текст по реальной яркости — работает и на будущих темах.
  const priceChipBg = mixHex(gold, '#000000', 0.3);
  const priceChipText = buttonForegroundForBackground(priceChipBg);

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      {/* Свечение-подложка: даёт объём вместо запрещённой обводки. За кнопкой,
          не перехватывает касания. */}
      <Animated.View
        pointerEvents="none"
        accessible={false}
        style={[
          styles.halo,
          {
            backgroundColor: gold,
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          },
        ]}
      />
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label} — ${price}`}
        accessibilityState={{ busy, disabled: busy }}
        disabled={busy}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.shell, softShadow({ color: gold, radius: 16, opacity: 0.45, offsetY: 8, backgroundColor: gold, elevation: 8 })]}
      >
        <LinearGradient
          colors={gradientColors}
          locations={[0, 0.34, 0.5, 0.66, 1]}
          start={{ x: 0.08, y: 0 }}
          end={{ x: 0.92, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Бегущая полоса света. Живёт внутри overflow:'hidden' оболочки. */}
        <Animated.View
          pointerEvents="none"
          accessible={false}
          style={[styles.shineTrack, { transform: [{ translateX: shineTranslate }, { skewX: '-16deg' }] }]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.30)', 'rgba(255,255,255,0.62)', 'rgba(255,255,255,0.30)', 'transparent']}
            locations={[0, 0.36, 0.5, 0.64, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <View style={styles.row}>
          {busy ? <ActivityIndicator size="small" color={textOnGold} /> : null}
          <Text style={[styles.label, { color: textOnGold }]} numberOfLines={1}>
            {label}
          </Text>
          <View style={[styles.priceChip, { backgroundColor: priceChipBg }]}>
            <Animated.Image
              source={pearlIcon}
              accessible={false}
              resizeMode="contain"
              style={[styles.pearl, { transform: [{ rotate: pearlRotate }, { scale: pearlScale }] }]}
            />
            <Text style={[styles.price, { color: priceChipText }]}>{price}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 10,
    bottom: -4,
    borderRadius: RADIUS,
    opacity: 0.4,
  },
  shell: {
    borderRadius: RADIUS,
    overflow: 'hidden',
    // Высота фиксирована содержимым (paddingVertical + строка), поэтому первый
    // кадр совпадает с финальной геометрией — экран не дёргается.
    paddingVertical: 15,
    paddingHorizontal: 18,
    backgroundColor: 'transparent',
  },
  shineTrack: {
    position: 'absolute',
    top: -30,
    bottom: -30,
    width: 84,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  priceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pearl: {
    width: 17,
    height: 17,
  },
  price: {
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
});

export default memo(SeasonPassBuyButton);
