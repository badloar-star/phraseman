/**
 * BoonActivatedModal — праздничный модал «бонус дня активирован» для «тихих»
 * бонусов (без осколков: двойной опыт, заряд на максимум, вечер без лимитов,
 * колода в подарок, бой за рейтинг, день голоса, серия под щитом).
 *
 * Эти бонусы включают режим/модификатор на день — не сундук. Поэтому показываем
 * не открытие коробки, а яркое уведомление: парящая иконка бонуса + свечение +
 * название + короткое описание. Раз в день, при первом заходе (через арбитр).
 *
 * Презентация (анимации) — общий язык с WeeklyBoonDetailModal: пружинное
 * появление карточки + парящая/«дышащая» иконка + мягкое свечение за ней.
 */
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { getBoonCopy } from '../app/boons/boon_copy';
import type { BoonId } from '../app/boons/boon_types';
import { GiftOpenBurst } from './GiftOpenEffects';
import BoonActivatedHybrid from './celebration/BoonActivatedHybrid';
import RetiredRasterFallback from './feedback/RetiredRasterFallback';

import { noAndroidOutline } from '../constants/androidGlow';
interface BoonActivatedModalProps {
  visible: boolean;
  /** Тихий бонус дня (null = нечего показывать). */
  boon: BoonId | null;
  onClose: () => void;
  /**
   * зачем: гибрид «Световод + Чекан» (макет .motion-mockups/phraseman-hybrid.html,
   * сцена M3 «Сундук-награда») живёт РЯДОМ со старой версией под флагом.
   * Production default — hybrid; explicit `classic` сохранён для rollback/QA.
   */
  motionVariant?: 'classic' | 'hybrid';
}

function BoonActivatedModal({ visible, boon, onClose, motionVariant = 'hybrid' }: BoonActivatedModalProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  const isClassic = motionVariant === 'classic';

  const entrance = useRef(new Animated.Value(0)).current;
  const iconEntrance = useRef(new Animated.Value(0)).current; // влёт иконки (пружина+поворот)
  const iconFloat = useRef(new Animated.Value(0)).current; // парение/дыхание после влёта
  const flash = useRef(new Animated.Value(0)).current; // одноразовая вспышка-всплеск
  const shimmer = useRef(new Animated.Value(0)).current; // бегущий блик по кнопке
  const floatLoop = useRef<Animated.CompositeAnimation | null>(null);
  const shimmerLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!visible || !isClassic) {
      floatLoop.current?.stop();
      shimmerLoop.current?.stop();
      return;
    }
    entrance.setValue(0);
    iconEntrance.setValue(0);
    iconFloat.setValue(0);
    flash.setValue(0);
    shimmer.setValue(0);
    void hapticSuccess();

    // Карточка появляется пружиной; иконка влетает чуть позже с поворотом;
    // одновременно — вспышка-всплеск (мягкое свечение), затем плавно гаснет.
    Animated.parallel([
      Animated.spring(entrance, { toValue: 1, useNativeDriver: true, tension: 120, friction: 12 }),
      Animated.sequence([
        Animated.delay(90),
        Animated.spring(iconEntrance, { toValue: 1, useNativeDriver: true, tension: 150, friction: 9 }),
      ]),
      Animated.sequence([
        Animated.delay(90),
        Animated.timing(flash, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(flash, { toValue: 0.55, duration: 620, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ]).start();

    floatLoop.current?.stop();
    floatLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(iconFloat, { toValue: 1, duration: 1250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(iconFloat, { toValue: 0, duration: 1250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    floatLoop.current.start();

    // Блик пробегает по кнопке (пауза между проходами).
    shimmerLoop.current?.stop();
    shimmerLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(1700),
      ]),
    );
    shimmerLoop.current.start();

    return () => {
      floatLoop.current?.stop();
      shimmerLoop.current?.stop();
    };
  }, [visible, isClassic, entrance, iconEntrance, iconFloat, flash, shimmer]);

  const handleClose = () => {
    hapticTap();
    onClose();
  };

  if (!boon) return null;

  const copy = getBoonCopy(boon, lang);
  const kicker = triLang(lang, {
    ru: 'Бонус дня активирован',
    uk: 'Бонус дня активовано',
    en: 'Daily bonus activated',
    es: 'Bono del día activado',
    'pt-BR': 'Bônus do dia ativado',
    vi: 'Đã kích hoạt ưu đãi hôm nay',
    id: 'Bonus hari ini aktif',
    tr: 'Günün bonusu etkin',
    pl: 'Bonus dnia aktywny',
  });
  // зачем (аудит по Библии, 2026-08-26): «Отлично» — восклицание-реакция,
  // а не действие (Правило 1: в кнопке глагол).
  const ctaLabel = triLang(lang, {
    ru: 'Продолжить',
    uk: 'Продовжити',
    en: 'Continue',
    es: 'Continuar',
    'pt-BR': 'Continuar',
    vi: 'Tiếp tục',
    id: 'Lanjutkan',
    tr: 'Devam et',
    pl: 'Kontynuuj',
  });

  if (motionVariant === 'hybrid') {
    return (
      <BoonActivatedHybrid
        visible={visible}
        kicker={kicker}
        title={copy.title}
        subtitle={copy.subtitle}
        ctaLabel={ctaLabel}
        onClose={onClose}
      />
    );
  }

  const cardScale = entrance.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const cardY = entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  // Влёт иконки: масштаб 0→1 с лёгким поворотом, дальше — парение/дыхание.
  const iconEnterScale = iconEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const iconEnterRotate = iconEntrance.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '0deg'] });
  const iconEnterOpacity = iconEntrance.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] });
  // зачем: пульсация — ТОЛЬКО масштаб на месте. Вертикальный ход убран:
  // бесконечное «плавание» иконки читалось как зацикленная анимация появления.
  const iconBreath = iconFloat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.055] });
  const glowOpacity = iconFloat.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.7] });
  // Вспышка-всплеск при появлении (мягкое свечение, БЕЗ лучей).
  const flashOpacity = flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] });
  const flashScale = flash.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] });
  // Блик пробегает слева направо по кнопке.
  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-220, 220] });

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
      <View style={styles.screen}>
        <Animated.View
          testID="boon-activated-card"
          style={[
            styles.card,
            {
              backgroundColor: t.bgCard,
              borderColor: `${t.accent}55`,
              shadowColor: t.accent,
              transform: [{ scale: cardScale }, { translateY: cardY }],
            },
          ]}
        >
          <View pointerEvents="none" style={[styles.topGlow, { backgroundColor: `${t.accent}1A` }]} />

          {/* Иконка бонуса: вспышка-всплеск при появлении + влёт с поворотом +
              парение/дыхание + мягкое свечение. БЕЗ лучей (только радиальное свечение). */}
          <View style={styles.iconFrame}>
            {/* Вспышка-всплеск при появлении (gasнет, мягкое радиальное свечение). */}
            <Animated.View
              pointerEvents="none"
              style={[styles.burst, { opacity: flashOpacity, transform: [{ scale: flashScale }] }]}
            >
              <GiftOpenBurst tier="sparkle" size={140} />
            </Animated.View>
            {/* Постоянное мягкое свечение за иконкой. */}
            <Animated.View pointerEvents="none" style={[styles.iconGlow, { opacity: glowOpacity }]}>
              <LinearGradient
                colors={[`${t.accent}66`, `${t.accent}00`]}
                start={{ x: 0.5, y: 0.5 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <Animated.View
              style={{
                opacity: iconEnterOpacity,
                transform: [
                  { scale: Animated.multiply(iconEnterScale, iconBreath) },
                  { rotate: iconEnterRotate },
                ],
              }}
            >
              <RetiredRasterFallback kind="boon" size={104} color={t.accent} />
            </Animated.View>
          </View>

          <Text style={[styles.kicker, { color: t.accent }]}>{kicker}</Text>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{copy.title}</Text>
          <Text style={[styles.subtitle, { color: t.textSecond, fontSize: f.body }]}>{copy.subtitle}</Text>

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.85}
            onPress={handleClose}
            style={[styles.cta, { backgroundColor: t.accent }]}
          >
            <View pointerEvents="none" style={styles.ctaGloss} />
            {/* Блик пробегает по кнопке. */}
            <Animated.View pointerEvents="none" style={[styles.ctaShimmer, { transform: [{ translateX: shimmerX }, { rotate: '18deg' }] }]}>
              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <Text style={[styles.ctaText, { color: t.correctText, fontSize: f.body }]}>{ctaLabel}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 0,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
    overflow: 'hidden',
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    ...noAndroidOutline,
  },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 90 },
  iconFrame: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    marginBottom: 10,
  },
  iconImage: { width: 104, height: 104 },
  burst: {
    position: 'absolute',
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    overflow: 'hidden',
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
    textAlign: 'center',
  },
  title: {
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  cta: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ctaGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  ctaShimmer: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: 60,
  },
  ctaText: { fontWeight: '800', zIndex: 1 },
});

export default memo(BoonActivatedModal);
