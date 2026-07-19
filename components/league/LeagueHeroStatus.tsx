import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeInUp } from 'react-native-reanimated';
import { triLang, type Lang } from '../../constants/i18n';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import type { LeagueHubPalette } from './leagueHubPalette';

/**
 * Hero-статус Лиги: моё место, зона и отрыв до следующего места.
 * Моушн строго конечный (count-up 620мс, одноразовый блик эмблемы, одноразовая
 * заливка прогресс-бара) — без withRepeat/loop/setInterval, как требует
 * tests/league_club_hub_contract.test.ts и Performance Bible.
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
    return triLang(lang, { ru: 'Зона повышения', uk: 'Зона підвищення', es: 'Zona de ascenso', 'pt-BR': 'Zona de promoção', vi: 'Vùng thăng hạng', id: 'Zona promosi', tr: 'Yükselme bölgesi', pl: 'Strefa awansu' });
  }
  if (zone === 'relegation') {
    return triLang(lang, { ru: 'Зона вылета', uk: 'Зона вильоту', es: 'Zona de descenso', 'pt-BR': 'Zona de queda', vi: 'Vùng xuống hạng', id: 'Zona degradasi', tr: 'Düşme bölgesi', pl: 'Strefa spadku' });
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

function LeagueHeroStatusComponent({ lang, palette, leagueName, participantCount, leagueIcon, myRank, zone, gap }: LeagueHeroStatusProps) {
  const reduceMotion = useReduceMotion();
  const rankDisplay = useCountUp(myRank, reduceMotion);

  // Одноразовый блик через эмблему (900мс, один прогон за маунт — не цикл).
  const sheenX = useRef(new Animated.Value(-84)).current;
  useEffect(() => {
    if (reduceMotion) return undefined;
    const anim = Animated.timing(sheenX, {
      toValue: 84,
      duration: 900,
      delay: 620,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [reduceMotion, sheenX]);

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
      style={[styles.shell, { backgroundColor: palette.surface }]}
      testID="league-hero-status"
      accessibilityLabel={`${a11y}${zone ? `, ${zoneLabel(zone, lang)}` : ''}`}
    >
      <View style={styles.topRow}>
        <View style={[styles.emblem, { borderColor: 'rgba(255,212,59,0.35)', backgroundColor: palette.elevated }]}>
          {leagueIcon}
          {!reduceMotion ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.sheen, { transform: [{ translateX: sheenX }, { rotate: '18deg' }] }]}
            />
          ) : null}
        </View>
        <View style={styles.titleWrap}>
          <Text numberOfLines={1} style={[styles.name, { color: palette.text }]}>{leagueName}</Text>
          <Text style={[styles.sub, { color: palette.muted }]}>{participantsLabel(lang, participantCount)}</Text>
        </View>
      </View>

      {myRank > 0 ? (
        <View style={styles.rankRow}>
          <Text testID="league-hero-rank" style={[styles.rank, { color: palette.warning }]}>{rankDisplay}</Text>
          {zone ? (
            <View style={[styles.zoneBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.zoneText, { color: badge.text }]}>{zoneLabel(zone, lang)}</Text>
            </View>
          ) : null}
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
  shell: { borderRadius: 26, padding: 18, gap: 15, overflow: 'hidden' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  emblem: {
    width: 66,
    height: 66,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  sheen: {
    position: 'absolute',
    top: -18,
    bottom: -18,
    width: 20,
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  titleWrap: { flex: 1, minWidth: 0 },
  name: { fontSize: 20, lineHeight: 25, fontWeight: '900', letterSpacing: -0.2 },
  sub: { fontSize: 12, fontWeight: '700', marginTop: 3 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 58 },
  rank: { fontSize: 56, lineHeight: 58, fontWeight: '900', letterSpacing: -1.5 },
  zoneBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  zoneText: { fontSize: 12, fontWeight: '900' },
  gapWrap: { gap: 7 },
  gapLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gapLabel: { fontSize: 11, fontWeight: '800' },
  gapValue: { fontSize: 12, fontWeight: '900' },
  track: { height: 9, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
});
