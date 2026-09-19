import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing as REasing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';

import { LinearGradient } from './SafeLinearGradient';
import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { LUM } from '../constants/motionHybrid';
import { useReduceMotion } from '../hooks/use_reduce_motion';

interface HomeDiscountBadgeProps {
  onPress: () => void;
  /** Текст на бейдже, например "−50%". Пусто → компонент не рендерится (родитель уже гейтит, но защита двойная). */
  percentLabel: string;
}

/**
 * Компактный бейдж скидки в строке хедера Главной (владелец 2026-09-17: «в
 * хедере прям, посередине» — между колокольчиком слева и кнопкой профиля
 * справа, в общем потоке вёрстки, не поверх экрана). Процент — единственная
 * цифра, которую держит владелец вручную в «Пульте»; реальная цена и сама
 * скидка приходят с пейвола из pricingPhases пакета (getStorePromoPricing) —
 * бейдж её не хранит и не может разойтись с ценой в сторе.
 */
export default function HomeDiscountBadge({ onPress, percentLabel }: HomeDiscountBadgeProps) {
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const pulse = useSharedValue(1);
  const pressed = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      scale.value = 1;
      return;
    }
    opacity.value = withTiming(1, { duration: 260, easing: REasing.out(REasing.cubic) });
    scale.value = withSpring(1, LUM.settle);
    // Тихий, редкий пульс — приглашение посмотреть, не отвлекающая анимация:
    // одно едва заметное дыхание раз в несколько секунд, а не постоянный цикл.
    const timer = setInterval(() => {
      pulse.value = withSpring(1.06, { damping: 9, stiffness: 140 }, () => {
        pulse.value = withSpring(1, { damping: 9, stiffness: 140 });
      });
    }, 4200);
    return () => {
      clearInterval(timer);
      cancelAnimation(opacity);
      cancelAnimation(scale);
      cancelAnimation(pulse);
    };
  }, [reduceMotion, opacity, scale, pulse]);

  const entryStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value * pulse.value * pressed.value }],
  }));

  if (!percentLabel) return null;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Reanimated.View style={entryStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={triLang(lang as Lang, {
            ru: `Скидка ${percentLabel} на подписку — открыть`,
            uk: `Знижка ${percentLabel} на підписку — відкрити`,
            en: `${percentLabel} subscription discount — open`,
            es: `Descuento del ${percentLabel} en la suscripción — abrir`,
            'pt-BR': `Desconto de ${percentLabel} na assinatura — abrir`,
            vi: `Giảm giá ${percentLabel} gói đăng ký — mở`,
            id: `Diskon ${percentLabel} langganan — buka`,
            tr: `Abonelikte ${percentLabel} indirim — aç`,
            pl: `Zniżka ${percentLabel} na subskrypcję — otwórz`,
          })}
          onPress={onPress}
          onPressIn={() => { pressed.value = withSpring(0.94, { damping: 14, stiffness: 260 }); }}
          onPressOut={() => { pressed.value = withSpring(1, { damping: 14, stiffness: 260 }); }}
          hitSlop={6}
          style={{ minHeight: 34, justifyContent: 'center' }}
        >
          <LinearGradient
            colors={['#E7FF93', '#D9FF61', '#B7E94E']}
            locations={[0, 0.52, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingVertical: 6,
              paddingHorizontal: 11,
              borderRadius: 14,
              shadowColor: '#B7E94E',
              shadowOpacity: 0.34,
              shadowOffset: { width: 0, height: 5 },
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <Ionicons name="sparkles" size={12} color="#12200A" />
            <Text maxFontSizeMultiplier={1.2} style={{ color: '#12200A', fontSize: 12, fontWeight: '900' }}>
              {percentLabel}
            </Text>
          </LinearGradient>
        </Pressable>
      </Reanimated.View>
    </View>
  );
}
