import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Reanimated, { FadeInUp } from 'react-native-reanimated';
import { triLang, type Lang } from '../../constants/i18n';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useIsScreenFocused } from '../../hooks/use_is_screen_focused';
import type { LeagueHubPalette } from './leagueHubPalette';

/**
 * Hero-статус Лиги: эмблема по центру (крупная, живая), моё место с сиянием,
 * зона и отрыв до следующего места.
 * Моушн: входные пружины и count-up — конечные; idle float эмблемы и пульс
 * сияния цифры — циклы, загаженные useIsScreenFocused + AppState по паттерну
 * components/AvatarAura.tsx (файл зарегистрирован в runtime_lifecycle_ratchet).
 */

export type LeagueHeroZone = 'promotion' | 'safe' | 'relegation';

export type LeagueHeroGap =
  | { kind: 'to_rank'; targetRank: number; xpNeeded: number; ratio: number }
  | { kind: 'leader'; xpAhead: number; ratio: number };

interface LeagueHeroStatusProps {
  lang: Lang;
  palette: LeagueHubPalette;
  leagueName: string;
  participantCount: number;
  leagueIcon: React.ReactNode;
  myRank: number;
  zone: LeagueHeroZone | null;
  gap: LeagueHeroGap | null;
  style?: ViewStyle;
}

function participantsLabel(lang: Lang, count: number): string {
  const n = Math.max(0, count);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (lang === 'ru' || lang === 'uk') {
    const form = mod10 === 1 && mod100 !== 11 ? 0 : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 1 : 2;
    return `${n} ${(lang === 'ru' ? ['участник', 'участника', 'участников'] : ['учасник', 'учасники', 'учасників'])[form]}`;
  }
  if (lang === 'pl') {
    const form = n === 1 ? 0 : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 1 : 2;
    return `${n} ${['uczestnik', 'uczestnicy', 'uczestników'][form]}`;
  }
  return triLang(lang, {
    ru: `${n} участников`,
    uk: `${n} учасників`,
    es: `${n} participantes`,
    'pt-BR': `${n} participantes`,
    vi: `${n} người tham gia`,
    id: `${n} peserta`,
    tr: `${n} katılımcı`,
    pl: `${n} uczestników`,
  });
}

function zoneLabel(zone: LeagueHeroZone, lang: Lang): string {
  if (zone === 'promotion') {
    return triLang(lang, { ru: '▲ Зона повышения', uk: '▲ Зона підвищення', es: '▲ Zona de ascenso', 'pt-BR': '▲ Zona de promoção', vi: '▲ Vùng thăng hạng', id: '▲ Zona promosi', tr: '▲ Yükselme bölgesi', pl: '▲ Strefa awansu' });
  }
  if (zone === 'relegation') {
    return triLang(lang, { ru: '▼ Зона вылета', uk: '▼ Зона вильоту', es: '▼ Zona de descenso', 'pt-BR': '▼ Zona de queda', vi: '▼ Vùng xuống hạng', id: '▼ Zona degradasi', tr: '▼ Düşme bölgesi', pl: '▼ Strefa spadku' });
  }
  return triLang(lang, { ru: 'Безопасная зона', uk: 'Безпечна зона', es: 'Zona segura', 'pt-BR': 'Zona segura', vi: 'Vùng an toàn', id: 'Zona aman', tr: 'Güvenli bölge', pl: 'Bezpieczna strefa' });
}

function gapLabel(gap: LeagueHeroGap, lang: Lang): string {
  if (gap.kind === 'leader') {
    return triLang(lang, { ru: 'Вы лидируете', uk: 'Ви лідируєте', es: 'Lideras la semana', 'pt-BR': 'Você lidera', vi: 'Bạn đang dẫn đầu', id: 'Kamu memimpin', tr: 'Lidersin', pl: 'Prowadzisz' });
  }
  return triLang(lang, {
    ru: `До ${gap.targetRank}-го места`,
    uk: `До ${gap.targetRank}-го місця`,
    es: `Hasta el puesto ${gap.targetRank}`,
    'pt-BR': `Até o ${gap.targetRank}º lugar`,
    vi: `Tới hạng ${gap.targetRank}`,
    id: `Menuju peringkat ${gap.targetRank}`,
    tr: `${gap.targetRank}. sıraya`,
    pl: `Do ${gap.targetRank}. miejsca`,
  });
}

function gapValue(gap: LeagueHeroGap, lang: Lang): string {
  if (gap.kind === 'leader') {
    return triLang(lang, {
      ru: `отрыв ${gap.xpAhead.toLocaleString()} XP`,
      uk: `відрив ${gap.xpAhead.toLocaleString()} XP`,
      es: `ventaja ${gap.xpAhead.toLocaleString()} XP`,
      'pt-BR': `vantagem ${gap.xpAhead.toLocaleString()} XP`,
      vi: `cách ${gap.xpAhead.toLocaleString()} XP`,
      id: `selisih ${gap.xpAhead.toLocaleString()} XP`,
      tr: `fark ${gap.xpAhead.toLocaleString()} XP`,
      pl: `przewaga ${gap.xpAhead.toLocaleString()} XP`,
    });
  }
  return `${gap.xpNeeded.toLocaleString()} XP`;
}

/** Конечный count-up 620мс (easeOutCubic), один прогон на смену значения. */
function useCountUp(target: number, reduceMotion: boolean): number {
  const [value, setValue] = useState(reduceMotion ? target : 0);
  useEffect(() => {
    if (reduceMotion || target <= 0) {
      setValue(target);
      return undefined;
    }
    let raf = 0;
    const t0 = Date.now();
    const duration = 620;
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduceMotion]);
  return value;
}

function LeagueHeroStatusComponent({ lang, palette, leagueName, participantCount, leagueIcon, myRank, zone, gap, style }: LeagueHeroStatusProps) {
  const reduceMotion = useReduceMotion();
  const isFocused = useIsScreenFocused();
  const rankDisplay = useCountUp(myRank, reduceMotion);

  // Входные пружины (конечные, один раз за маунт).
  const iconScale = useRef(new Animated.Value(0.55)).current;
  const rankScale = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    if (reduceMotion) {
      iconScale.setValue(1);
      rankScale.setValue(1);
      return;
    }
    Animated.spring(iconScale, { toValue: 1, friction: 6, tension: 80, delay: 140, useNativeDriver: true }).start();
    Animated.spring(rankScale, { toValue: 1, friction: 7, tension: 90, delay: 240, useNativeDriver: true }).start();
  }, [reduceMotion, iconScale, rankScale]);

  // Блик через эмблему: конечный прогон при маунте и при каждом возврате фокуса.
  const sheenX = useRef(new Animated.Value(-110)).current;
  useEffect(() => {
    if (reduceMotion || !isFocused) return undefined;
    sheenX.setValue(-110);
    const anim = Animated.timing(sheenX, {
      toValue: 110,
      duration: 950,
      delay: 650,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [reduceMotion, isFocused, sheenX]);

  // Idle-циклы: левитация эмблемы + пульс сияния цифры.
  // Гард по паттерну AvatarAura: только в фокусе и на переднем плане.
  const floatY = useRef(new Animated.Value(0)).current;
  const glowPhase = useRef(new Animated.Value(0)).current;
  const shouldAnimate = !reduceMotion && isFocused;
  useEffect(() => {
    if (!shouldAnimate) {
      floatY.setValue(0);
      glowPhase.setValue(0);
      return undefined;
    }
    let floatLoop: Animated.CompositeAnimation | null = null;
    let glowLoop: Animated.CompositeAnimation | null = null;
    const start = () => {
      if (floatLoop || glowLoop) return;
      floatY.setValue(0);
      glowPhase.setValue(0);
      floatLoop = Animated.loop(Animated.sequence([
        Animated.timing(floatY, { toValue: -4, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      glowLoop = Animated.loop(Animated.sequence([
        Animated.timing(glowPhase, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowPhase, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      floatLoop.start();
      glowLoop.start();
    };
    const stop = () => {
      floatLoop?.stop();
      glowLoop?.stop();
      floatLoop = null;
      glowLoop = null;
    };

    // Анимируем только на переднем плане — в фоне нет смысла перерисовывать.
    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      stop();
    };
  }, [shouldAnimate, floatY, glowPhase]);

  // Одноразовая заливка прогресс-бара до ratio (700мс).
  const fillAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const to = Math.max(0.04, Math.min(1, gap?.ratio ?? 0));
    if (reduceMotion) {
      fillAnim.setValue(to);
      return undefined;
    }
    const anim = Animated.timing(fillAnim, {
      toValue: to,
      duration: 700,
      delay: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width — одноразово, до 45 кадров
    });
    anim.start();
    return () => anim.stop();
  }, [fillAnim, gap?.ratio, reduceMotion]);
  const fillWidth = fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const glowOpacity = glowPhase.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.34] });
  const glowScale = glowPhase.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.07] });

  const badge = zone === 'promotion'
    ? { bg: palette.accent, text: palette.accentText }
    : zone === 'relegation'
      ? { bg: palette.negative, text: '#FFFFFF' }
      : { bg: palette.elevated, text: palette.muted };

  const a11y = myRank > 0
    ? triLang(lang, { ru: `Ваше место: ${myRank}`, uk: `Ваше місце: ${myRank}`, es: `Tu puesto: ${myRank}`, 'pt-BR': `Sua posição: ${myRank}`, vi: `Hạng của bạn: ${myRank}`, id: `Peringkatmu: ${myRank}`, tr: `Sıran: ${myRank}`, pl: `Twoje miejsce: ${myRank}` })
    : leagueName;

  return (
    <Reanimated.View
      entering={reduceMotion ? undefined : FadeInUp.delay(80).duration(260)}
      style={[styles.shell, { backgroundColor: palette.surface }, style]}
      testID="league-hero-status"
      accessibilityLabel={`${a11y}${zone ? `, ${zoneLabel(zone, lang)}` : ''}`}
    >
      <View style={styles.iconStage}>
        <Animated.View style={{ transform: [{ translateY: floatY }] }}>
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <View style={styles.iconClip}>
              {leagueIcon}
              {!reduceMotion ? (
                <Animated.View
                  pointerEvents="none"
                  style={[styles.sheen, { transform: [{ translateX: sheenX }, { rotate: '18deg' }] }]}
                />
              ) : null}
            </View>
          </Animated.View>
        </Animated.View>
      </View>

      <View style={styles.titleWrap}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.name, { color: palette.text }]}>{leagueName}</Text>
        <Text style={[styles.sub, { color: palette.muted }]}>{participantsLabel(lang, participantCount)}</Text>
      </View>

      {myRank > 0 ? (
        <View style={styles.rankStage}>
          <Animated.View
            pointerEvents="none"
            style={[styles.rankGlow, { backgroundColor: palette.warning, opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
          />
          <Animated.Text
            testID="league-hero-rank"
            style={[styles.rank, { color: palette.warning, textShadowColor: palette.warning, transform: [{ scale: rankScale }] }]}
          >
            {rankDisplay}
          </Animated.Text>
        </View>
      ) : null}

      {zone ? (
        <View style={styles.zoneWrap}>
          <View style={[styles.zoneBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.zoneText, { color: badge.text }]}>{zoneLabel(zone, lang)}</Text>
          </View>
        </View>
      ) : null}

      {gap ? (
        <View style={styles.gapWrap}>
          <View style={styles.gapLabelRow}>
            <Text style={[styles.gapLabel, { color: palette.muted }]}>{gapLabel(gap, lang)}</Text>
            <Text style={[styles.gapValue, { color: palette.text }]}>{gapValue(gap, lang)}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: palette.elevated }]}>
            <Animated.View style={[styles.fill, { backgroundColor: palette.accent, width: fillWidth }]} />
          </View>
        </View>
      ) : null}
    </Reanimated.View>
  );
}

export const LeagueHeroStatus = memo(LeagueHeroStatusComponent);

const styles = StyleSheet.create({
  shell: { borderRadius: 26, padding: 18, paddingTop: 20, gap: 8, overflow: 'hidden' },
  iconStage: { alignItems: 'center', marginBottom: 2 },
  iconClip: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    top: -22,
    bottom: -22,
    width: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  titleWrap: { alignItems: 'center' },
  name: { fontSize: 21, lineHeight: 26, fontWeight: '900', letterSpacing: -0.2, textAlign: 'center' },
  sub: { fontSize: 12, fontWeight: '700', marginTop: 3, textAlign: 'center' },
  rankStage: { alignItems: 'center', justifyContent: 'center', minHeight: 92, marginTop: 2 },
  rankGlow: {
    position: 'absolute',
    width: 138,
    height: 78,
    borderRadius: 39,
  },
  rank: {
    fontSize: 76,
    lineHeight: 82,
    fontWeight: '900',
    letterSpacing: -2,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  zoneWrap: { alignItems: 'center', marginTop: 2 },
  zoneBadge: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  zoneText: { fontSize: 12, fontWeight: '900' },
  gapWrap: { gap: 7, marginTop: 6 },
  gapLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gapLabel: { fontSize: 11, fontWeight: '800' },
  gapValue: { fontSize: 12, fontWeight: '900' },
  track: { height: 12, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
});
