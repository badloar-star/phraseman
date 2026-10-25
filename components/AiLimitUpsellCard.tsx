import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { KIT_MOTION } from '../constants/motionHybrid';
import { useSystemReduceMotion } from '../hooks/use_system_reduce_motion';
import KitTouchable from './KitTouchable';
import { triLang, type Lang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { hapticTap } from '../hooks/use-haptics';
import { useTheme } from './ThemeContext';
import TonalSurface from './TonalSurface';
import type { PaywallSource } from '../app/paywall_entry_contract';
import type { PremiumContext } from '../app/premium_context';

type AiLimitUpsellCardProps = {
  lang: Lang;
  title: string;
  // зачем (координатор 25.10): были `string` — неизвестный литерал у места вызова (ai_explain_limit_card) проходил проверку типов,
  // а в стор-сборке rejectUnknown молча закрывал окно Plus. Типы контракта ловят такое при сборке.
  paywallContext: PremiumContext;
  /** зачем (2026-09-13): без source вызов падал в legacy-дефолт 'direct'. */
  paywallSource: PaywallSource;
  testID: string;
};

export default function AiLimitUpsellCard({
  lang,
  title,
  paywallContext,
  paywallSource,
  testID,
}: AiLimitUpsellCardProps) {
  const { theme: t, f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const router = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  const reduceMotion = useSystemReduceMotion();
  // зачем (координатор 10.10, деньги): router.push на пейвол — второй тап в том же кадре открыл бы пейвол дважды
  const openLockRef = useRef(false);

  // зачем (координатор 10.10, «дизайн везде»): карточка предложения появлялась с пружинным «подпрыгиванием» и тряской по горизонтали —
  // назойливо для денежного предложения и не из словаря кита. Теперь спокойный подъём `.anim-rise` (extension.css: 620 мс
  // cubic-bezier(.2,1,.3,1), opacity 0→1, сдвиг вверх); при «уменьшить движение» — только проявление.
  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(reduceMotion ? 0 : 14);
    const ease = Easing.bezier(KIT_MOTION.sheetEase[0], KIT_MOTION.sheetEase[1], KIT_MOTION.sheetEase[2], KIT_MOTION.sheetEase[3]);
    const anim = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: reduceMotion ? 160 : 620, easing: ease, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: reduceMotion ? 0 : 620, easing: ease, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [opacity, reduceMotion, translateY]);

  const ctaLabel = triLang(lang, {
    ru: 'Посмотреть Plus',
    uk: 'Переглянути Plus',
    en: 'Explore Plus',
    es: 'Ver Plus',
    'pt-BR': 'Conhecer o Plus',
    vi: 'Xem Plus',
    id: 'Lihat Plus',
    tr: 'Plus’a göz at',
    pl: 'Zobacz Plus',
  });

  return (
    <Animated.View
      testID={testID}
      style={[
        styles.animatedShell,
        {
          opacity,
          shadowColor: glass.bg,
          transform: [{ translateY }],
        },
      ]}
    >
      <TonalSurface radius={16} tone="raised" style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: glass.selected }]}>
            <Ionicons name="flash" size={18} color={glass.accentText} />
          </View>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.bodyLg || f.body }]}>
            {title}
          </Text>
        </View>

        <KitTouchable
          testID={`${testID}-full-access-button`}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          onPress={() => {
            if (openLockRef.current) {
              console.warn('[AI-LIMIT-UPSELL] открытие пейвола: повторный тап пропущен');
              return;
            }
            openLockRef.current = true;
            setTimeout(() => { openLockRef.current = false; }, 900);
            hapticTap();
            router.push({ pathname: '/premium_modal', params: { context: paywallContext, source: paywallSource } } as never);
          }}
          style={[styles.cta, { backgroundColor: glass.accent }]}
        >
          <Text style={[styles.ctaLabel, { color: glass.accentInk, fontSize: f.label }]}>
            {ctaLabel}
          </Text>
          <Ionicons name="arrow-forward" size={17} color={glass.ctaInk} />
        </KitTouchable>
      </TonalSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedShell: {
    elevation: 3,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  card: {
    borderRadius: 16, // зачем (владелец 12.10, стиль «Тень»): без обводки — отделяют тон и малая внешняя тень: рамки у карточки нет
    gap: 14,
    overflow: 'hidden',
    padding: 16,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingTop: 2,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 11,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  title: {
    flex: 1,
    fontWeight: '800',
    lineHeight: 23,
  },
  cta: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ctaLabel: {
    flexShrink: 1,
    fontWeight: '800',
  },
});
