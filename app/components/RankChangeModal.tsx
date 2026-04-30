// ════════════════════════════════════════════════════════════════════════════
//  RankChangeModal — повышение / понижение арены
//  Премиум-режим: вращающееся conic-halo, градиентная обводка карточки,
//  каскадные пружины входа, конфетти / искры, shine-волна на CTA, glow-pulse,
//  hapticka. Дизайн в одном языке с LeagueResultModal.
// ════════════════════════════════════════════════════════════════════════════

import React, { memo, useEffect, useRef } from 'react';
import {
  Animated, Dimensions, Easing, Image, Modal, Pressable,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useModalBackdropFade } from '../../hooks/useModalBackdropFade';
import { getRankImage } from '../../hooks/use-arena-rank';
import { hapticSuccess, hapticTap, hapticWarning } from '../../hooks/use-haptics';
import { useLang } from '../../components/LangContext';
import { triLang } from '../../constants/i18n';

const { width: W, height: H } = Dimensions.get('window');

const TIER_LABELS_RU: Record<string, string> = {
  bronze: 'Бронза', silver: 'Серебро', gold: 'Золото',
  platinum: 'Платина', diamond: 'Алмаз', master: 'Мастер',
  grandmaster: 'Грандмастер', legend: 'Легенда',
};
const TIER_LABELS_UK: Record<string, string> = {
  bronze: 'Бронза', silver: 'Срібло', gold: 'Золото',
  platinum: 'Платина', diamond: 'Діамант', master: 'Майстер',
  grandmaster: 'Грандмайстер', legend: 'Легенда',
};
const TIER_LABELS_ES: Record<string, string> = {
  bronze: 'Bronce', silver: 'Plata', gold: 'Oro',
  platinum: 'Platino', diamond: 'Diamante', master: 'Maestro',
  grandmaster: 'Gran maestro', legend: 'Leyenda',
};
export const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700',
  platinum: '#E5E4E2', diamond: '#B9F2FF', master: '#9B59B6',
  grandmaster: '#E74C3C', legend: '#F39C12',
};

const NUM_STARS = 8;
const NUM_CONFETTI = 14;
const CONFETTI_COLORS_PROMO = ['#FFD24A', '#FFAE00', '#FFFFFF', '#22D3EE', '#A78BFA', '#34C759'];
const CONFETTI_COLORS_DEMO  = ['#FF6B6B', '#FF453A', '#7A1A1A', '#FFB199'];

// ─── Star particle (sparkle, остаётся) ────────────────────────────────────
const StarParticle = memo(function StarParticle({
  index, total, promoted,
}: { index: number; total: number; promoted: boolean }) {
  const angle = (index / total) * 2 * Math.PI;
  const radius = 110 + Math.random() * 70;
  const tx = Math.cos(angle) * radius;
  const ty = Math.sin(angle) * radius - 20;

  const anim    = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0)).current;
  const rotate  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 35 + Math.random() * 120;
    const seq = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 0.7 + Math.random() * 0.6, useNativeDriver: true, friction: 5 }),
        Animated.timing(anim, {
          toValue: { x: tx, y: ty },
          duration: 700 + Math.random() * 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 400, delay: 350, useNativeDriver: true }),
    ]);
    seq.start();
    return () => seq.stop();
  }, [index, anim, opacity, scale, rotate, tx, ty]);

  const rot = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${promoted ? 360 : -180}deg`],
  });

  return (
    <Animated.Text style={{
      position: 'absolute',
      fontSize: 16,
      opacity,
      transform: [
        { translateX: anim.x }, { translateY: anim.y },
        { scale }, { rotate: rot },
      ],
    }}>
      {promoted ? '✦' : '·'}
    </Animated.Text>
  );
});

// ─── Confetti — каскад полосок (как в LeagueResultModal) ──────────────────
const ConfettiPiece = memo(function ConfettiPiece({
  color, delay, startX, drift, size,
}: { color: string; delay: number; startX: number; drift: number; size: number }) {
  const y   = useRef(new Animated.Value(-40)).current;
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
          { translateY: y }, { translateX: x },
          { rotate: rot.interpolate({ inputRange: [0, 1080], outputRange: ['0deg', '1080deg'] }) },
        ],
      }}
    />
  );
});

// ─── Вращающееся conic-like halo (как в LeagueResultModal) ────────────────
function RankHalo({ color, intensity = 1 }: { color: string; intensity?: number }) {
  const rot   = useRef(new Animated.Value(0)).current;
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

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', alignSelf: 'center',
        width: 230, height: 230,
        alignItems: 'center', justifyContent: 'center',
        opacity: intensity,
      }}
    >
      <Animated.View style={{
        position: 'absolute',
        width: 230, height: 230,
        transform: [{ rotate: rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}>
        <LinearGradient
          colors={[color + '00', color + 'CC', color + '00', color + '88', color + '00']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={{ width: '100%', height: '100%', borderRadius: 115 }}
        />
      </Animated.View>
      <Animated.View style={{
        position: 'absolute',
        width: 180, height: 180,
        borderRadius: 90,
        backgroundColor: color,
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.26] }),
      }}/>
    </View>
  );
}

interface Props {
  visible: boolean;
  promoted: boolean;
  tier: string;
  level: string;
  onClose: () => void;
  accentColor: string;
}

export function RankChangeModal({ visible, promoted, tier, level, onClose, accentColor }: Props) {
  const backdropOpacity = useModalBackdropFade(visible);
  const { lang } = useLang();

  const cardScale     = useRef(new Animated.Value(0.82)).current;
  const cardOpacity   = useRef(new Animated.Value(0)).current;
  const iconScale     = useRef(new Animated.Value(0)).current;
  const iconRotate    = useRef(new Animated.Value(0)).current;
  const titleY        = useRef(new Animated.Value(24)).current;
  const titleOp       = useRef(new Animated.Value(0)).current;
  const badgeScale    = useRef(new Animated.Value(0)).current;
  const subtitleOp    = useRef(new Animated.Value(0)).current;
  const btnOp         = useRef(new Animated.Value(0)).current;
  const btnShine      = useRef(new Animated.Value(0)).current;
  const shakeX        = useRef(new Animated.Value(0)).current;
  const heroPulse     = useRef(new Animated.Value(0)).current;

  const tierColor = TIER_COLORS[tier] ?? accentColor;
  const tierLabel = triLang(lang, {
    ru: TIER_LABELS_RU[tier] ?? tier,
    uk: TIER_LABELS_UK[tier] ?? tier,
    es: TIER_LABELS_ES[tier] ?? tier,
  });
  const rankImage = getRankImage(tier as any, level);

  // Палитра под исход
  const haloColor   = promoted ? tierColor : '#777';
  const accentText  = promoted ? tierColor : '#bbb';
  const cardGradient: [string, string, string] = promoted
    ? ['#1A2A14', '#0F1A0E', '#070D06']
    : ['#2A0E0C', '#1A0907', '#100404'];
  const borderGradient: [string, string, string] = promoted
    ? [tierColor, '#FFFFFFAA', tierColor]
    : ['#FF6B6B', '#7A1A1A', '#FF6B6B'];
  const heroGradient: [string, string] = promoted
    ? [tierColor + '38', 'transparent']
    : ['rgba(255,69,58,0.22)', 'transparent'];
  const ctaGradient: [string, string] = promoted
    ? [tierColor, tierColor + 'CC']
    : ['#6E6E6E', '#3F3F3F'];

  useEffect(() => {
    if (!visible) {
      cardScale.setValue(0.82); cardOpacity.setValue(0);
      iconScale.setValue(0); iconRotate.setValue(0);
      titleY.setValue(24); titleOp.setValue(0);
      badgeScale.setValue(0); subtitleOp.setValue(0);
      btnOp.setValue(0); btnShine.setValue(0);
      shakeX.setValue(0); heroPulse.setValue(0);
      return;
    }

    if (promoted) hapticSuccess(); else hapticWarning();

    // ВАЖНО (Fabric): все запущенные анимации СОХРАНЯЕМ в local list,
    // чтобы в cleanup гарантированно остановить ВСЕ — иначе при unmount
    // (Modal animationType="none" — одномоментный disposal дерева)
    // нативные ноды получают update на уже отдетаченный view → крах
    // NativeAnimatedNodesManager.disconnect.
    const running: Animated.CompositeAnimation[] = [];

    // 1. Каскад входа
    const cascade = Animated.sequence([
      Animated.parallel([
        Animated.spring(cardScale,   { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(iconScale,  { toValue: 1, friction: 4, tension: 130, useNativeDriver: true }),
        Animated.spring(iconRotate, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleY,     { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(titleOp,    { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(badgeScale, { toValue: 1, friction: 5, tension: 110, useNativeDriver: true }),
        Animated.timing(subtitleOp, { toValue: 1, duration: 240, useNativeDriver: true, delay: 120 }),
      ]),
      Animated.timing(btnOp, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]);
    cascade.start();
    running.push(cascade);

    // 2. Heartbeat heroGradient
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(heroPulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(heroPulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    running.push(pulse);

    // 3. Блик на CTA — между итерациями делаем ЯВНУЮ паузу с conventional
    // duration (НЕ duration:0 — на Fabric мгновенный snap внутри loop иногда
    // вызывает агрессивный disconnect ноды между кадрами).
    const shineLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(btnShine, { toValue: 0, duration: 1, useNativeDriver: true }),
        Animated.delay(1100),
        Animated.timing(btnShine, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    shineLoop.start();
    running.push(shineLoop);

    // 4. Shake при понижении
    if (!promoted) {
      const shake = Animated.sequence([
        Animated.delay(420),
        Animated.timing(shakeX, { toValue: 10,  duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 8,   duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -8,  duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0,   duration: 60, useNativeDriver: true }),
      ]);
      shake.start();
      running.push(shake);
    }

    return () => {
      // Останавливаем ВСЕ запущенные анимации до того как Fabric
      // успеет удалить view — иначе native crash.
      running.forEach(a => a.stop());
    };
  }, [
    visible, promoted, cardScale, cardOpacity, iconScale, iconRotate,
    titleY, titleOp, badgeScale, subtitleOp, btnOp, btnShine, shakeX, heroPulse,
  ]);

  const iconRot = iconRotate.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] });
  const heroOpacity = heroPulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  const handleClose = () => { hapticTap(); onClose(); };

  const CARD_W = Math.min(W - 32, 360);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <Pressable style={s.wrap} onPress={handleClose} accessible={false}>
        {/* Фон-затемнение + цветной радиальный отблеск */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.86)', opacity: backdropOpacity }]}
        />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
          <LinearGradient
            colors={[haloColor + '33', 'transparent']}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.7 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['transparent', haloColor + '14']}
            start={{ x: 0.5, y: 0.5 }} end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Конфетти / искры */}
        {visible && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {(promoted ? CONFETTI_COLORS_PROMO : CONFETTI_COLORS_DEMO).flatMap((color, ci) =>
              Array.from({ length: Math.ceil(NUM_CONFETTI / (promoted ? 6 : 4)) }, (_, i) => {
                const seed = ((ci * 17 + i * 31) % 100) / 100;
                return (
                  <ConfettiPiece
                    key={`c-${ci}-${i}`}
                    color={color}
                    delay={i * 90 + ci * 50}
                    startX={seed * W}
                    drift={(seed - 0.5) * 140}
                    size={6 + (i % 3) * 3}
                  />
                );
              }),
            )}
          </View>
        )}

        <Pressable onPress={() => { /* swallow tap внутри карточки */ }}>
          <Animated.View
            style={{
              opacity: cardOpacity,
              transform: [{ scale: cardScale }, { translateX: shakeX }],
              shadowColor: haloColor,
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.55,
              shadowRadius: 28,
              elevation: 24,
            }}
          >
            {/* Градиентная обводка */}
            <LinearGradient
              colors={borderGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ borderRadius: 30, padding: 1.5 }}
            >
              <View style={{
                width: CARD_W, borderRadius: 28.5,
                overflow: 'hidden', backgroundColor: '#070D06',
              }}>
                {/* Внутренние градиенты */}
                <LinearGradient colors={cardGradient} style={StyleSheet.absoluteFill} />
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: heroOpacity }]}>
                  <LinearGradient
                    colors={heroGradient}
                    start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.55 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>

                <View style={s.inner}>
                  {/* Hero icon area */}
                  <View style={s.heroWrap}>
                    <RankHalo color={haloColor} intensity={promoted ? 1 : 0.55} />

                    {/* Локальный star-burst */}
                    {visible && Array.from({ length: NUM_STARS }).map((_, i) => (
                      <StarParticle key={`p-${i}`} index={i} total={NUM_STARS} promoted={promoted} />
                    ))}

                    <Animated.View style={{
                      transform: [
                        { scale: iconScale },
                        { rotate: iconRot },
                      ],
                    }}>
                      {rankImage ? (
                        <Image source={rankImage} style={s.rankImg} resizeMode="contain" />
                      ) : (
                        <Text style={s.fallbackEmoji}>{promoted ? '🏆' : '📉'}</Text>
                      )}
                    </Animated.View>
                  </View>

                  {/* Title */}
                  <Animated.Text
                    style={[
                      s.title,
                      {
                        color: accentText,
                        opacity: titleOp,
                        transform: [{ translateY: titleY }],
                        textShadowColor: haloColor + '99',
                        textShadowRadius: promoted ? 12 : 4,
                      },
                    ]}
                  >
                    {triLang(lang, {
                      uk: promoted ? '🚀 Підвищення рангу!' : '⬇️ Зниження рангу',
                      ru: promoted ? '🚀 Повышение ранга!' : '⬇️ Понижение ранга',
                      es: promoted ? '🚀 ¡Subes de rango!' : '⬇️ Bajada de rango',
                    })}
                  </Animated.Text>

                  {/* Tier badge */}
                  <Animated.View style={{ transform: [{ scale: badgeScale }] }}>
                    <LinearGradient
                      colors={[tierColor + '33', tierColor + '11']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={[s.rankBadge, { borderColor: tierColor }]}
                    >
                      <Text style={[s.rankTier, { color: tierColor }]}>{tierLabel}</Text>
                      <Text style={[s.rankLevel, { color: tierColor + 'cc' }]}>{level}</Text>
                    </LinearGradient>
                  </Animated.View>

                  {/* Subtitle */}
                  <Animated.Text style={[s.subtitle, { color: promoted ? '#bbb' : '#888', opacity: subtitleOp }]}>
                    {triLang(lang, {
                      uk: promoted ? 'Ти впорався — новий ранг заслужений!' : 'Не здавайся, повернеш позицію!',
                      ru: promoted ? 'Ты справился — новый ранг заслужен!' : 'Не сдавайся, вернёшь позицию!',
                      es: promoted
                        ? '¡Lo lograste — te mereces el nuevo rango!'
                        : 'No te rindas: recuperarás tu posición.',
                    })}
                  </Animated.Text>

                  {/* CTA с shine-волной */}
                  <Animated.View style={{ opacity: btnOp, alignSelf: 'stretch' }}>
                    <TouchableOpacity activeOpacity={0.88} onPress={handleClose}>
                      <View style={{
                        borderRadius: 18,
                        overflow: 'hidden',
                        shadowColor: haloColor,
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.55,
                        shadowRadius: 10,
                        elevation: 8,
                      }}>
                        <LinearGradient
                          colors={ctaGradient}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={{ paddingVertical: 16, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={s.btnText}>
                            {triLang(lang, {
                              uk: promoted ? 'Чудово! 🎉' : 'Зрозуміло 💪',
                              ru: promoted ? 'Отлично! 🎉' : 'Понял 💪',
                              es: promoted ? '¡Genial! 🎉' : 'Entendido 💪',
                            })}
                          </Text>
                          {/* Блик-волна */}
                          <Animated.View
                            pointerEvents="none"
                            style={{
                              position: 'absolute',
                              top: 0, bottom: 0, left: -90,
                              width: 90,
                              transform: [
                                { translateX: btnShine.interpolate({ inputRange: [0, 1], outputRange: [0, CARD_W + 60] }) },
                                { skewX: '-20deg' },
                              ],
                            }}
                          >
                            <LinearGradient
                              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
                              start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                              style={{ flex: 1 }}
                            />
                          </Animated.View>
                        </LinearGradient>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  inner: {
    paddingTop: 6, paddingBottom: 24, paddingHorizontal: 22,
    alignItems: 'center', gap: 14,
  },
  heroWrap: {
    width: 230, height: 200,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4, marginBottom: -6,
  },
  rankImg: { width: 130, height: 130 },
  fallbackEmoji: { fontSize: 80 },
  title: {
    fontSize: 22, fontWeight: '900', textAlign: 'center',
    letterSpacing: 0.3, marginTop: 2,
  },
  rankBadge: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    borderWidth: 1.5, borderRadius: 22,
    paddingHorizontal: 22, paddingVertical: 9,
  },
  rankTier:  { fontSize: 19, fontWeight: '900' },
  rankLevel: { fontSize: 17, fontWeight: '800' },
  subtitle: {
    fontSize: 13, textAlign: 'center', lineHeight: 18,
    marginTop: -2, marginBottom: 6,
  },
  btnText: {
    fontSize: 17, fontWeight: '900', color: '#fff',
    letterSpacing: 0.4,
  },
});

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
