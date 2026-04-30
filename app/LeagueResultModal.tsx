// ════════════════════════════════════════════════════════════════════════════
//  LeagueResultModal — итоги недели в лиге
//  Ультра-красивый дизайн: градиенты, хало, конфетти/искры, подиум, аватары,
//  премиум-подсветка, бонус новой лиги, хаптика, накат-волна на CTA.
//
//  Один источник правды для модалки. components/ClubResultModal.tsx — re-export.
// ════════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Modal, Animated, Easing, TouchableOpacity,
  Dimensions, ScrollView, Image, StyleSheet, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import {
  LeagueResult, LEAGUES, CLUBS, clearPendingResult, GroupMember,
} from './league_engine';
import AvatarView from '../components/AvatarView';
import PremiumAvatarHalo from '../components/PremiumAvatarHalo';
import { premiumMemberNameStyle } from '../components/premiumMemberStyles';
import { getBestAvatarForLevel } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import { triLang, type Lang } from '../constants/i18n';
import { hapticSuccess, hapticWarning, hapticTap, hapticSoftImpact } from '../hooks/use-haptics';

const { width: W, height: H } = Dimensions.get('window');
const CARD_W = Math.min(W - 24, 420);

// ─── Палитры исходов ───────────────────────────────────────────────────────
const PROMO_COLORS  = { primary: '#34C759', accent: '#FFD24A', glow: '#FFD24A' };
const DEMO_COLORS   = { primary: '#FF453A', accent: '#FF6B6B', glow: '#FF453A' };
const CONFETTI_PROMO = ['#FFD24A', '#34C759', '#7BD389', '#FFFFFF', '#22D3EE', '#A78BFA'];
const CONFETTI_DEMO  = ['#FF6B6B', '#FF453A', '#7A1A1A'];

// ─── Confetti particle ─────────────────────────────────────────────────────
const ConfettiPiece = memo(function ConfettiPiece({
  color, delay, startX, drift, size,
}: { color: string; delay: number; startX: number; drift: number; size: number }) {
  const y   = useRef(new Animated.Value(-30)).current;
  const x   = useRef(new Animated.Value(0)).current;
  const rot = useRef(new Animated.Value(0)).current;
  const op  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fall = Animated.parallel([
      Animated.timing(y,   { toValue: H + 40, duration: 2400 + Math.random() * 1100, delay, useNativeDriver: true }),
      Animated.timing(x,   { toValue: drift,  duration: 2400, delay, useNativeDriver: true }),
      Animated.timing(rot, { toValue: 1080,   duration: 2200, delay, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(delay + 1700),
        Animated.timing(op, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    ]);
    fall.start();
    return () => fall.stop();
  }, [delay, drift, x, y, rot, op]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', top: 0, left: startX,
        width: size, height: size * 0.45,
        borderRadius: 1.5,
        backgroundColor: color,
        opacity: op,
        transform: [
          { translateY: y },
          { translateX: x },
          { rotate: rot.interpolate({ inputRange:[0,1080], outputRange:['0deg','1080deg'] }) },
        ],
      }}
    />
  );
});

// ─── Лёгкая искра-звёздочка для не-промо состояний ─────────────────────────
const Sparkle = memo(function Sparkle({
  color, delay, startX, startY,
}: { color: string; delay: number; startX: number; startY: number }) {
  const op    = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const rise  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(op,    { toValue: 1,    duration: 600,  useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1,    duration: 600,  useNativeDriver: true }),
          Animated.timing(rise,  { toValue: -30,  duration: 1800, useNativeDriver: true }),
        ]),
        Animated.timing(op,    { toValue: 0,    duration: 800, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.4,  duration: 0,   useNativeDriver: true }),
        Animated.timing(rise,  { toValue: 0,    duration: 0,   useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, op, scale, rise]);

  return (
    <Animated.Text
      pointerEvents="none"
      style={{
        position: 'absolute', left: startX, top: startY,
        fontSize: 12, color, opacity: op,
        textShadowColor: color, textShadowRadius: 6,
        transform: [{ scale }, { translateY: rise }],
      }}
    >✦</Animated.Text>
  );
});

// ─── Хало вокруг иконки клуба (вращающийся conic-like glow) ────────────────
function ClubHalo({ color, size, intensity = 1 }: { color: string; size: number; intensity?: number }) {
  const rot = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const r = Animated.loop(
      Animated.timing(rot, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true }),
    );
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 1300, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 1300, useNativeDriver: true }),
      ]),
    );
    r.start(); p.start();
    return () => { r.stop(); p.stop(); };
  }, [rot, pulse]);

  const ringSize  = size * 1.7;
  const ringSize2 = size * 1.35;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', alignSelf: 'center',
        width: ringSize, height: ringSize,
        alignItems: 'center', justifyContent: 'center',
        opacity: intensity,
      }}
    >
      <Animated.View style={{
        position: 'absolute',
        width: ringSize, height: ringSize,
        transform: [{ rotate: rot.interpolate({ inputRange:[0,1], outputRange:['0deg','360deg'] }) }],
      }}>
        <LinearGradient
          colors={[color + '00', color + 'CC', color + '00', color + '88', color + '00']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={{ width: '100%', height: '100%', borderRadius: ringSize / 2 }}
        />
      </Animated.View>
      <Animated.View style={{
        position: 'absolute',
        width: ringSize2, height: ringSize2,
        borderRadius: ringSize2 / 2,
        backgroundColor: color,
        opacity: pulse.interpolate({ inputRange:[0,1], outputRange:[0.08, 0.22] }),
      }}/>
    </View>
  );
}

interface Props {
  visible: boolean;
  result:  LeagueResult;
  onClose: () => void;
}

export default function LeagueResultModal({ visible, result, onClose }: Props) {
  const { theme: t, themeMode, f } = useTheme();
  const { lang } = useLang();

  const prevLeague = LEAGUES[result.prevLeagueId] ?? LEAGUES[0];
  const newLeague  = LEAGUES[result.newLeagueId]  ?? LEAGUES[0];
  const club       = CLUBS[result.newLeagueId]    ?? CLUBS[0];

  const isPromo  = result.promoted;
  const isDemo   = result.demoted;
  const isStay   = !isPromo && !isDemo;

  // Цветовая схема под исход
  const palette = isPromo ? PROMO_COLORS : isDemo ? DEMO_COLORS
    : { primary: club.color, accent: club.color, glow: club.color };

  // ─── Анимации входа ─────────────────────────────────────────────────────
  const cardScale      = useRef(new Animated.Value(0.8)).current;
  const cardOpacity    = useRef(new Animated.Value(0)).current;
  const heroIconScale  = useRef(new Animated.Value(0)).current;
  const heroIconRot    = useRef(new Animated.Value(0)).current;
  const titleY         = useRef(new Animated.Value(20)).current;
  const titleOp        = useRef(new Animated.Value(0)).current;
  const transitionOp   = useRef(new Animated.Value(0)).current;
  const transitionX    = useRef(new Animated.Value(-20)).current;
  const rankScale      = useRef(new Animated.Value(0)).current;
  const rankRot        = useRef(new Animated.Value(0)).current;
  const podiumOp       = useRef(new Animated.Value(0)).current;
  const podiumY        = useRef(new Animated.Value(30)).current;
  const listOp         = useRef(new Animated.Value(0)).current;
  const myRowGlow      = useRef(new Animated.Value(0)).current;
  const rewardOp       = useRef(new Animated.Value(0)).current;
  const rewardScale    = useRef(new Animated.Value(0.85)).current;
  const btnOp          = useRef(new Animated.Value(0)).current;
  const btnShine       = useRef(new Animated.Value(0)).current;

  const [showConfetti, setShowConfetti]   = useState(false);
  const confettiSeed = useRef(Math.random()).current;

  useEffect(() => {
    if (!visible) return;

    // Сброс
    cardScale.setValue(0.86); cardOpacity.setValue(0);
    heroIconScale.setValue(0); heroIconRot.setValue(0);
    titleY.setValue(20); titleOp.setValue(0);
    transitionOp.setValue(0); transitionX.setValue(-20);
    rankScale.setValue(0); rankRot.setValue(-0.05);
    podiumOp.setValue(0); podiumY.setValue(30);
    listOp.setValue(0); myRowGlow.setValue(0);
    rewardOp.setValue(0); rewardScale.setValue(0.85);
    btnOp.setValue(0); btnShine.setValue(0);

    // Хаптика по исходу — мгновенно
    if (isPromo) hapticSuccess();
    else if (isDemo) hapticWarning();
    else hapticSoftImpact();

    Animated.sequence([
      // 1. Карточка появляется
      Animated.parallel([
        Animated.spring(cardScale,   { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      ]),
      // 2. Иконка клуба «вылетает»
      Animated.parallel([
        Animated.spring(heroIconScale, { toValue: 1, friction: 5, tension: 110, useNativeDriver: true }),
        Animated.spring(heroIconRot,   { toValue: 1, friction: 6, tension: 80,  useNativeDriver: true }),
      ]),
      // 3. Заголовок и переход
      Animated.parallel([
        Animated.timing(titleY,       { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(titleOp,      { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(transitionOp, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.spring(transitionX,  { toValue: 0, friction: 7, tension: 90,  useNativeDriver: true }),
      ]),
      // 4. Место (rank)
      Animated.parallel([
        Animated.spring(rankScale, { toValue: 1, friction: 4, tension: 130, useNativeDriver: true }),
        Animated.spring(rankRot,   { toValue: 0, friction: 5, tension: 120, useNativeDriver: true }),
      ]),
      // 5. Подиум
      Animated.parallel([
        Animated.timing(podiumOp, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(podiumY,  { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
      ]),
      // 6. Список группы
      Animated.timing(listOp, { toValue: 1, duration: 320, useNativeDriver: true }),
      // 7. Reward + кнопка
      Animated.parallel([
        Animated.timing(rewardOp,   { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(rewardScale,{ toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
        Animated.timing(btnOp,      { toValue: 1, duration: 260, useNativeDriver: true }),
      ]),
    ]).start();

    // Свечение моей строки — пульс
    const myGlowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(myRowGlow, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(myRowGlow, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    myGlowLoop.start();

    // Блик на CTA — повторяющаяся волна
    const shineLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(1200),
        Animated.timing(btnShine, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(btnShine, { toValue: 0, duration: 0,    useNativeDriver: true }),
      ]),
    );
    shineLoop.start();

    // Конфетти
    let t1: ReturnType<typeof setTimeout> | null = null;
    let t2: ReturnType<typeof setTimeout> | null = null;
    if (isPromo || isDemo) {
      t1 = setTimeout(() => setShowConfetti(true), 350);
      t2 = setTimeout(() => setShowConfetti(false), isPromo ? 4200 : 2600);
    }

    return () => {
      myGlowLoop.stop();
      shineLoop.stop();
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, [
    visible, isPromo, isDemo,
    cardScale, cardOpacity, heroIconScale, heroIconRot, titleY, titleOp,
    transitionOp, transitionX, rankScale, rankRot, podiumOp, podiumY,
    listOp, myRowGlow, rewardOp, rewardScale, btnOp, btnShine,
  ]);

  const handleClose = useCallback(async () => {
    hapticTap();
    await clearPendingResult();
    onClose();
  }, [onClose]);

  // ─── Тексты ─────────────────────────────────────────────────────────────
  const titleText = triLang(lang, { ru: 'Итоги недели', uk: 'Підсумки тижня', es: 'Resultados de la semana' });

  const outcomeText = isPromo
    ? triLang(lang, {
        ru: `Повышен до ${newLeague.nameRU}`,
        uk: `Підвищено до ${newLeague.nameUK}`,
        es: `Has ascendido a ${newLeague.nameES}`,
      })
    : isDemo
      ? triLang(lang, {
          ru: `Понижен до ${newLeague.nameRU}`,
          uk: `Понижено до ${newLeague.nameUK}`,
          es: `Has descendido a ${newLeague.nameES}`,
        })
      : triLang(lang, {
          ru: `Остаёшься в лиге ${newLeague.nameRU}`,
          uk: `Залишаєшся в лізі ${newLeague.nameUK}`,
          es: `Sigues en ${newLeague.nameES}`,
        });

  const outcomeIcon = isPromo ? 'trending-up' : isDemo ? 'trending-down' : 'shield-checkmark';

  const btnText = isPromo
    ? triLang(lang, { ru: '🚀 Вперёд!', uk: '🚀 Уперед!', es: '🚀 ¡Adelante!' })
    : isDemo
      ? triLang(lang, { ru: 'Попробую ещё раз', uk: 'Спробую ще раз', es: 'Lo intentaré de nuevo' })
      : triLang(lang, { ru: 'Продолжить', uk: 'Продовжити', es: 'Continuar' });

  const motivation = isPromo
    ? triLang(lang, {
        ru: 'Новая лига — новые вызовы и бонусы!',
        uk: 'Нова ліга — нові виклики й бонуси!',
        es: '¡Nueva liga: nuevos retos y bonificaciones!',
      })
    : isDemo
      ? triLang(lang, {
          ru: 'Не сдавайся — быстро вернёшься выше.',
          uk: 'Не здавайся — швидко повернешся вище.',
          es: 'No te rindas: pronto volverás a subir.',
        })
      : triLang(lang, {
          ru: 'Хороший результат, держи темп!',
          uk: 'Гарний результат, тримай темп!',
          es: 'Buen resultado, ¡mantén el ritmo!',
        });

  // Процентиль
  const percentile = result.totalInGroup > 0
    ? Math.max(1, Math.round(100 - (result.myRank - 1) / result.totalInGroup * 100))
    : 100;

  const top3 = result.group.slice(0, 3);
  const restList = result.group.slice(0, 10);

  const leagueName = (row: (typeof LEAGUES)[number]) =>
    triLang(lang, { ru: row.nameRU, uk: row.nameUK, es: row.nameES });

  // ─── Подцвет градиентов ─────────────────────────────────────────────────
  const cardGradient: [string, string, string] = isPromo
    ? ['#0F2818', '#0A1F12', '#06140A']
    : isDemo
      ? ['#2A0E0C', '#1A0907', '#100404']
      : [t.bgCard, t.bgCard, t.bgPrimary];

  const borderGradient: [string, string, string] = isPromo
    ? ['#FFD24A', '#34C759', '#FFD24A']
    : isDemo
      ? ['#FF453A', '#7A1A1A', '#FF453A']
      : [palette.primary + 'AA', palette.primary + '55', palette.primary + 'AA'];

  const heroGradient: [string, string] = isPromo
    ? ['rgba(52,199,89,0.22)', 'rgba(52,199,89,0)']
    : isDemo
      ? ['rgba(255,69,58,0.22)', 'rgba(255,69,58,0)']
      : [club.color + '33', club.color + '00'];

  const ctaGradient: [string, string] = isPromo
    ? ['#34C759', '#1FA34A']
    : isDemo
      ? ['#FF6B6B', '#D93B30']
      : [club.color, club.color];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose} statusBarTranslucent>
      <Pressable
        onPress={handleClose}
        accessible={false}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 12 }}
      >
        {/* ─── Фон-затемнение + цветной радиальный отблеск ──────────────── */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.86)' }]} />
          <LinearGradient
            colors={[palette.glow + '33', 'transparent']}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.7 }}
            style={[StyleSheet.absoluteFill]}
          />
          <LinearGradient
            colors={['transparent', palette.glow + '14']}
            start={{ x: 0.5, y: 0.5 }} end={{ x: 0.5, y: 1 }}
            style={[StyleSheet.absoluteFill]}
          />
        </View>

        {/* ─── Конфетти/искры на фоне ────────────────────────────────────── */}
        {showConfetti && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {(isPromo ? CONFETTI_PROMO : CONFETTI_DEMO).flatMap((color, ci) =>
              Array.from({ length: isPromo ? 10 : 6 }, (_, i) => {
                const seed = (ci * 17 + i * 31 + confettiSeed * 1000) % 1;
                return (
                  <ConfettiPiece
                    key={`c-${ci}-${i}`}
                    color={color}
                    delay={i * 80 + ci * 40}
                    startX={seed * W}
                    drift={(seed - 0.5) * 120}
                    size={6 + (i % 3) * 3}
                  />
                );
              }),
            )}
          </View>
        )}
        {!isPromo && !isDemo && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {Array.from({ length: 14 }).map((_, i) => (
              <Sparkle
                key={`s-${i}`}
                color={club.color}
                delay={i * 200}
                startX={Math.random() * W}
                startY={H * 0.2 + Math.random() * H * 0.6}
              />
            ))}
          </View>
        )}

        {/* ─── Карточка с градиентной обводкой ───────────────────────────── */}
        <Pressable onPress={() => { /* swallow tap */ }}>
          <Animated.View
            style={{
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
              shadowColor: palette.glow,
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.45,
              shadowRadius: 28,
              elevation: 24,
            }}
          >
            {/* Градиентная рамка */}
            <LinearGradient
              colors={borderGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ borderRadius: 28, padding: 1.5 }}
            >
              <View style={{
                width: CARD_W,
                maxHeight: H * 0.92,
                borderRadius: 26,
                overflow: 'hidden',
                backgroundColor: t.bgPrimary,
              }}>
                {/* ── HERO (заголовок + иконка клуба + переход лиг) ─── */}
                <View style={{ paddingTop: 22, paddingBottom: 14, alignItems: 'center', overflow: 'hidden' }}>
                  <LinearGradient
                    colors={cardGradient}
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    colors={heroGradient}
                    style={StyleSheet.absoluteFill}
                  />

                  {/* Кнопка-крестик */}
                  <TouchableOpacity
                    onPress={handleClose}
                    accessibilityLabel={triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar' })}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={{
                      position: 'absolute', top: 10, right: 10, zIndex: 4,
                      width: 30, height: 30, borderRadius: 15,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <Ionicons name="close" size={18} color={t.textMuted} />
                  </TouchableOpacity>

                  {/* Заголовок */}
                  <Animated.Text
                    style={{
                      opacity: titleOp,
                      transform: [{ translateY: titleY }],
                      color: t.textMuted,
                      fontSize: f.label,
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      fontWeight: '700',
                      marginBottom: 12,
                    }}
                  >
                    {titleText}
                  </Animated.Text>

                  {/* Иконка клуба + хало */}
                  <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center' }}>
                    <ClubHalo color={palette.glow} size={84} intensity={isStay ? 0.7 : 1} />
                    <Animated.View
                      style={{
                        transform: [
                          { scale: heroIconScale },
                          { rotate: heroIconRot.interpolate({ inputRange:[0,1], outputRange:['-25deg','0deg'] }) },
                        ],
                      }}
                    >
                      <Image
                        source={club.imageUri}
                        style={{ width: 110, height: 110 }}
                        resizeMode="contain"
                      />
                    </Animated.View>
                  </View>

                  {/* Чип исхода */}
                  <Animated.View
                    style={{
                      opacity: titleOp,
                      transform: [{ translateY: titleY }],
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: palette.primary + '22',
                      borderWidth: 1,
                      borderColor: palette.primary + '55',
                      marginTop: 8,
                    }}
                  >
                    <Ionicons name={outcomeIcon as any} size={16} color={palette.primary} />
                    <Text style={{
                      color: palette.primary,
                      fontSize: f.body,
                      fontWeight: '800',
                      letterSpacing: 0.3,
                    }}>
                      {outcomeText}
                    </Text>
                  </Animated.View>

                  {/* Переход лиг (если меняется) */}
                  {(isPromo || isDemo) && (
                    <Animated.View
                      style={{
                        opacity: transitionOp,
                        transform: [{ translateX: transitionX }],
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 12,
                        paddingHorizontal: 12, paddingVertical: 6,
                        borderRadius: 12,
                        backgroundColor: 'rgba(0,0,0,0.32)',
                      }}
                    >
                      <Image source={prevLeague.imageUri} style={{ width: 18, height: 18, opacity: 0.7 }} resizeMode="contain" />
                      <Text style={{ color: t.textMuted, fontSize: f.caption }}>
                        {triLang(lang, { ru: prevLeague.nameRU, uk: prevLeague.nameUK, es: prevLeague.nameES })}
                      </Text>
                      <Ionicons
                        name={isPromo ? 'arrow-forward' : 'arrow-back'}
                        size={14}
                        color={palette.primary}
                      />
                      <Image source={newLeague.imageUri} style={{ width: 18, height: 18 }} resizeMode="contain" />
                      <Text style={{ color: palette.primary, fontSize: f.caption, fontWeight: '700' }}>
                        {triLang(lang, { ru: newLeague.nameRU, uk: newLeague.nameUK, es: newLeague.nameES })}
                      </Text>
                    </Animated.View>
                  )}
                </View>

                {/* ── RANK + PERCENTILE ──────────────────────────── */}
                <Animated.View
                  style={{
                    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8,
                    alignItems: 'center',
                    transform: [
                      { scale: rankScale },
                      { rotate: rankRot.interpolate({ inputRange:[-1,0], outputRange:['-12deg','0deg'] }) },
                    ],
                  }}
                >
                  <Text style={{
                    color: t.textMuted,
                    fontSize: f.label,
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                    fontWeight: '700',
                  }}>
                    {triLang(lang, { ru: 'Твоё место', uk: 'Твоє місце', es: 'Tu puesto' })}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
                    <Text style={{
                      color: palette.primary,
                      fontSize: 64,
                      fontWeight: '900',
                      lineHeight: 70,
                      letterSpacing: -1.5,
                      textShadowColor: palette.glow + '99',
                      textShadowRadius: 12,
                    }}>
                      {result.myRank}
                    </Text>
                    <Text style={{
                      color: t.textMuted,
                      fontSize: f.body,
                      fontWeight: '600',
                      marginLeft: 6,
                    }}>
                      / {result.totalInGroup}
                    </Text>
                  </View>

                  {/* Процентиль */}
                  {result.totalInGroup >= 3 && (
                    <View style={{
                      marginTop: 8,
                      paddingHorizontal: 10, paddingVertical: 5,
                      borderRadius: 10,
                      backgroundColor: t.bgSurface,
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                    }}>
                      <Ionicons name="flame" size={12} color={t.gold} />
                      <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '700' }}>
                        {triLang(lang, {
                          ru: `Топ ${100 - percentile + 1}% группы`,
                          uk: `Топ ${100 - percentile + 1}% групи`,
                          es: `Top ${100 - percentile + 1} % del grupo`,
                        })}
                      </Text>
                    </View>
                  )}
                </Animated.View>

                {/* ── PODIUM (top-3) ──────────────────────────────── */}
                {top3.length === 3 && (
                  <Animated.View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      gap: 8,
                      paddingHorizontal: 18,
                      marginTop: 8,
                      opacity: podiumOp,
                      transform: [{ translateY: podiumY }],
                    }}
                  >
                    <PodiumColumn member={top3[1]} place={2} themeMode={themeMode} f={f} t={t} lang={lang} />
                    <PodiumColumn member={top3[0]} place={1} themeMode={themeMode} f={f} t={t} lang={lang} />
                    <PodiumColumn member={top3[2]} place={3} themeMode={themeMode} f={f} t={t} lang={lang} />
                  </Animated.View>
                )}

                {/* ── СПИСОК ГРУППЫ ───────────────────────────────── */}
                <Animated.View style={{ opacity: listOp, marginTop: 12 }}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 18, marginBottom: 4,
                  }}>
                    <Text style={{
                      color: t.textMuted,
                      fontSize: f.label,
                      letterSpacing: 1.2,
                      textTransform: 'uppercase',
                      fontWeight: '700',
                    }}>
                      {triLang(lang, { ru: 'Группа недели', uk: 'Група тижня', es: 'Grupo de la semana' })}
                    </Text>
                    <Text style={{ color: t.textGhost, fontSize: f.caption, fontWeight: '600' }}>
                      {result.totalInGroup} {triLang(lang, { ru: 'чел.', uk: 'осіб', es: 'pers.' })}
                    </Text>
                  </View>
                  <ScrollView
                    style={{ maxHeight: H * 0.32 }}
                    contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 4 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {restList.map((member, i) => (
                      <GroupRow
                        key={`${member.uid ?? member.botId ?? member.name}-${i}`}
                        member={member}
                        place={i + 1}
                        palette={palette}
                        myRowGlow={myRowGlow}
                        themeMode={themeMode}
                        t={t}
                        f={f}
                        lang={lang}
                      />
                    ))}
                    {result.group.length > 10 && (
                      <Text style={{
                        color: t.textGhost, fontSize: f.caption, textAlign: 'center', padding: 8,
                      }}>
                        +{result.group.length - 10} {triLang(lang, { ru: 'участников', uk: 'учасників', es: 'participantes' })}
                      </Text>
                    )}
                  </ScrollView>
                </Animated.View>

                {/* ── REWARD STRIP (бонус новой лиги) ─────────────── */}
                {(isPromo || isStay) && (
                  <Animated.View
                    style={{
                      marginHorizontal: 18,
                      marginTop: 10,
                      borderRadius: 14,
                      overflow: 'hidden',
                      opacity: rewardOp,
                      transform: [{ scale: rewardScale }],
                    }}
                  >
                    <LinearGradient
                      colors={[palette.primary + '20', palette.primary + '08']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10,
                        paddingHorizontal: 12, paddingVertical: 10,
                        borderWidth: 1, borderColor: palette.primary + '33', borderRadius: 14,
                      }}
                    >
                      <View style={{
                        width: 32, height: 32, borderRadius: 10,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: palette.primary + '33',
                      }}>
                        <Ionicons name="flash" size={18} color={palette.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                          {triLang(lang, { ru: newLeague.tagRU, uk: newLeague.tagUK, es: newLeague.tagES })}
                        </Text>
                        <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 1 }}>
                          {isPromo
                            ? triLang(lang, {
                              ru: 'Бонус активирован — новая лига!',
                              uk: 'Бонус активовано — нової ліги!',
                              es: '¡Bonificación activada: nueva liga!',
                            })
                            : triLang(lang, {
                              ru: 'Бонус лиги действует',
                              uk: 'Бонус ліги діє',
                              es: 'La bonificación de la liga está activa',
                            })}
                        </Text>
                      </View>
                    </LinearGradient>
                  </Animated.View>
                )}

                {isDemo && (
                  <Animated.View
                    style={{
                      marginHorizontal: 18,
                      marginTop: 10,
                      borderRadius: 14,
                      paddingHorizontal: 14, paddingVertical: 10,
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
                      opacity: rewardOp,
                      transform: [{ scale: rewardScale }],
                    }}
                  >
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                      {motivation}
                    </Text>
                  </Animated.View>
                )}

                {/* ── CTA ─────────────────────────────────────────── */}
                <Animated.View style={{ opacity: btnOp, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 20 }}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={handleClose}
                    accessibilityRole="button"
                    accessibilityLabel={btnText}
                  >
                    <View style={{
                      borderRadius: 16,
                      overflow: 'hidden',
                      shadowColor: palette.primary,
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.45,
                      shadowRadius: 10,
                      elevation: 8,
                    }}>
                      <LinearGradient
                        colors={ctaGradient}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{ paddingVertical: 16, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{
                          color: '#FFFFFF',
                          fontSize: f.bodyLg,
                          fontWeight: '900',
                          letterSpacing: 0.5,
                        }}>
                          {btnText}
                        </Text>

                        {/* Блик-волна */}
                        <Animated.View
                          pointerEvents="none"
                          style={{
                            position: 'absolute',
                            top: 0, bottom: 0,
                            left: -80,
                            width: 80,
                            transform: [{
                              translateX: btnShine.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, CARD_W],
                              }),
                            }, { skewX: '-20deg' }],
                          }}
                        >
                          <LinearGradient
                            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
                            start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                            style={{ flex: 1 }}
                          />
                        </Animated.View>
                      </LinearGradient>
                    </View>
                  </TouchableOpacity>
                </Animated.View>

              </View>
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  PodiumColumn — мини-колонка подиума (1/2/3 место)
// ════════════════════════════════════════════════════════════════════════════
const PODIUM_HEIGHTS = { 1: 58, 2: 44, 3: 36 } as const;
const PODIUM_COLORS  = {
  1: { primary: '#FFD24A', glow: '#FFD24A' },
  2: { primary: '#C7CCD1', glow: '#C7CCD1' },
  3: { primary: '#E0915C', glow: '#E0915C' },
} as const;
const PODIUM_MEDAL  = { 1: '🥇', 2: '🥈', 3: '🥉' } as const;

const PodiumColumn = memo(function PodiumColumn({
  member, place, themeMode, t, f, lang,
}: {
  member: GroupMember;
  place: 1 | 2 | 3;
  themeMode: string;
  t: any;
  f: any;
  lang: Lang;
}) {
  const cfg    = PODIUM_COLORS[place];
  const height = PODIUM_HEIGHTS[place];
  const xp     = member?.totalXp ?? 0;
  const avatar = member?.avatar ?? String(getBestAvatarForLevel(getLevelFromXP(xp)));
  const name   = (member?.name ?? '—').slice(0, 10);

  return (
    <View style={{ flex: 1, alignItems: 'center', maxWidth: 110 }}>
      {/* Аватар + медаль */}
      <View style={{ alignItems: 'center', marginBottom: 6 }}>
        <PremiumAvatarHalo
          enabled={!!member?.isPremium}
          avatarSize={place === 1 ? 44 : 36}
          maskColor={t.bgCard}
        >
          <AvatarView avatar={avatar} totalXP={xp} size={place === 1 ? 44 : 36} />
        </PremiumAvatarHalo>
        <Text style={{ position: 'absolute', top: -8, right: -8, fontSize: 18 }}>
          {PODIUM_MEDAL[place]}
        </Text>
      </View>

      {/* Имя */}
      <Text
        numberOfLines={1}
        style={premiumMemberNameStyle(
          {
            color: member?.isMe ? cfg.primary : t.textPrimary,
            fontSize: f.caption,
            fontWeight: member?.isMe ? '900' : '700',
            maxWidth: 90,
            textAlign: 'center',
          },
          !!member?.isPremium,
          themeMode,
        )}
      >
        {name}{member?.isMe ? triLang(lang, { ru: ' (ты)', uk: ' (ти)', es: ' (tú)' }) : ''}
      </Text>

      {/* Очки */}
      <Text style={{ color: cfg.primary, fontSize: f.caption, fontWeight: '800', marginTop: 1 }}>
        {member?.points ?? 0}
      </Text>

      {/* Колонна */}
      <LinearGradient
        colors={[cfg.primary, cfg.primary + '88']}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={{
          width: '92%',
          height,
          borderTopLeftRadius: 8, borderTopRightRadius: 8,
          marginTop: 6,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: cfg.glow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 6,
        }}
      >
        <Text style={{ color: 'rgba(0,0,0,0.55)', fontSize: 18, fontWeight: '900' }}>{place}</Text>
      </LinearGradient>
    </View>
  );
});

// ════════════════════════════════════════════════════════════════════════════
//  GroupRow — строка участника группы
// ════════════════════════════════════════════════════════════════════════════
const GroupRow = memo(function GroupRow({
  member, place, palette, myRowGlow, themeMode, t, f, lang,
}: {
  member: GroupMember;
  place: number;
  palette: { primary: string; accent: string; glow: string };
  myRowGlow: Animated.Value;
  themeMode: string;
  t: any;
  f: any;
  lang: Lang;
}) {
  const xp     = member.totalXp ?? 0;
  const avatar = member.avatar ?? String(getBestAvatarForLevel(getLevelFromXP(xp)));
  const isTop3 = place <= 3;
  const rowBg  = member.isMe
    ? palette.primary + '22'
    : 'transparent';

  const glowOpacity = useMemo(
    () => myRowGlow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.95] }),
    [myRowGlow],
  );

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 10, paddingVertical: 8,
      marginVertical: 2,
      borderRadius: 12,
      backgroundColor: rowBg,
      overflow: 'hidden',
    }}>
      {/* Светящийся бордер моей строки */}
      {member.isMe && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: 3, borderRadius: 2,
            backgroundColor: palette.primary,
            opacity: glowOpacity,
            shadowColor: palette.glow,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9, shadowRadius: 4,
          }}
        />
      )}

      {/* Место */}
      <View style={{ width: 28, alignItems: 'center', marginRight: 6 }}>
        {isTop3 ? (
          <Text style={{ fontSize: 18 }}>
            {place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉'}
          </Text>
        ) : (
          <Text style={{
            color: t.textMuted, fontSize: f.body, fontWeight: '700',
          }}>
            {place}
          </Text>
        )}
      </View>

      {/* Аватар */}
      <PremiumAvatarHalo
        enabled={!!member.isPremium}
        avatarSize={32}
        maskColor={member.isMe ? t.bgCard : t.bgPrimary}
        style={{ marginRight: 10 }}
      >
        <AvatarView avatar={avatar} totalXP={xp} size={32} />
      </PremiumAvatarHalo>

      {/* Имя */}
      <Text
        numberOfLines={1}
        style={premiumMemberNameStyle(
          {
            flex: 1,
            fontSize: f.body,
            color: member.isMe ? t.textPrimary : t.textPrimary,
            fontWeight: member.isMe ? '800' : '600',
          },
          !!member.isPremium,
          themeMode,
        )}
      >
        {member.name}{member.isMe ? triLang(lang, { ru: ' (ты)', uk: ' (ти)', es: ' (tú)' }) : ''}
      </Text>

      {/* Очки */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons
          name="star"
          size={12}
          color={isTop3 ? t.gold : member.isMe ? palette.primary : t.textMuted}
        />
        <Text style={{
          color: isTop3 ? t.gold : member.isMe ? palette.primary : t.textMuted,
          fontSize: f.body,
          fontWeight: '800',
        }}>
          {member.points}
        </Text>
      </View>
    </View>
  );
});
