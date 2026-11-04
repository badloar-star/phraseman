import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeInDown, Keyframe } from 'react-native-reanimated';
import { CommunityAwardConfetti, CommunityAwardRays } from './CommunityAwardDecoration';
import { winnerText } from './community_winner_strings';
import { KitTouchable } from '../KitTouchable';
import { LinearGradient } from '../SafeLinearGradient';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import type { Lang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { contestPrize } from '../../shared/community_month_contest';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';

/**
 * plusMonths — сколько месяцев Plus сервер выдал (из истории победителя, contest_last_win): 0 — у человека бессрочный Plus, выдавать нечего, строки про Plus нет.
 * Нет поля (старые квитанции 147/148) — берём приз места из contestPrize.
 */
export type CommunityWinner = Readonly<{ monthId: string; packTitle: string; place: 1 | 2 | 3; claimed: boolean; plusMonths?: number }>;

/** Строка награды или null (бессрочный Plus / места без приза): окно и тест читают одну функцию. Тексты — на всех 9 языках (community_winner_strings). */
export function communityWinnerRewardText(winner: Pick<CommunityWinner, 'place' | 'plusMonths'>, lang: Lang): string | null {
  const prize = contestPrize(winner.place);
  const months = winner.plusMonths !== undefined ? Math.max(0, Math.trunc(winner.plusMonths)) : prize?.kind === 'plus' ? prize.months : 0;
  if (months >= 1 && months <= 3) return winnerText(lang, months === 1 ? 'plus1' : months === 2 ? 'plus2' : 'plus3');
  // зачем: старые квитанции с монетами за места (147/148) остаются читаемыми; новые монеты за места не создаются
  if (winner.plusMonths === undefined && prize?.kind === 'coins') return winnerText(lang, 'coins', { n: prize.amount });
  return null;
}

const trophyArrival = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 40 }, { scale: 0.4 }, { rotate: '-16deg' }] },
  60: { opacity: 1, transform: [{ translateY: -8 }, { scale: 1.1 }, { rotate: '6deg' }], easing: Easing.out(Easing.cubic) },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }, { rotate: '0deg' }], easing: Easing.out(Easing.cubic) },
}).duration(1000);
export function CommunityWinnerDialog({ winner, onClaim, onClose }: Readonly<{
  winner: CommunityWinner | null; onClaim: () => Promise<void>; onClose: () => void;
}>): React.JSX.Element | null {
  const [reduced, setReduced] = useState(true);
  const claimLock = useRef(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => { setError(false); setClaiming(false); }, [winner?.monthId, winner?.place]);
  if (!winner) return null;
  const claim = async (): Promise<void> => {
    if (claimLock.current || winner.claimed) return;
    claimLock.current = true;
    setClaiming(true); setError(false);
    try { await onClaim(); } catch { setError(true); } finally { claimLock.current = false; setClaiming(false); }
  };
  return <CommunityWinnerDialogContent winner={winner} claiming={claiming} error={error} reduced={reduced} onClaim={() => { void claim(); }} onClose={onClose} />;
}

/** Shared presentation for actual claim outcomes and the developer state gallery. */
export function CommunityWinnerDialogContent({ winner, claiming, error, reduced, onClaim, onClose }: Readonly<{
  winner: CommunityWinner; claiming: boolean; error: boolean; reduced: boolean; onClaim: () => void; onClose: () => void;
}>): React.JSX.Element {
  const { liquidGlassThemeId } = useTheme();
  const { lang } = useLang();
  const L = lang as Lang;
  const insets = useStableSafeAreaInsets();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.exec(winner.monthId);
  const monthLabel = month ? new Intl.DateTimeFormat(lang, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, Number(month[1]) - 1, 1))) : winner.monthId;
  const reward = communityWinnerRewardText(winner, L);
  return <Modal transparent visible animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}><View style={[s.backdrop, { paddingTop: Math.max(110, insets.top), paddingBottom: Math.max(22, insets.bottom) }]}>
    <View style={[s.dialog, { backgroundColor: g.opaqueCard }]}>
      {!reduced && !winner.claimed ? <CommunityAwardConfetti accent={g.accentGraphic} /> : null}
      <ScrollView style={s.content} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={s.art}><CommunityAwardRays reduced={reduced} /><Animated.View entering={reduced ? undefined : trophyArrival}><LinearGradient colors={['#FFF1BD', '#F1BC52', '#D98A20']} style={s.medal}><Ionicons name="trophy" size={65} color="#82500C" /></LinearGradient></Animated.View><View style={s.rank}><Text style={s.rankText}>{winnerText(L, 'place', { n: winner.place })}</Text></View></View>{/* theme-exempt: золотая медаль приза — иллюстрация, не поверхность окна */}
      <Animated.View entering={reduced ? undefined : FadeInDown.delay(450).duration(600)}><Text style={[s.month, { color: g.secondary }]}>{winnerText(L, 'packOfMonth')} · {monthLabel}</Text><Text style={[s.title, { color: g.text }]}>{winner.claimed ? winnerText(L, 'received') : winnerText(L, 'congrats')}</Text><Text style={[s.body, { color: g.secondary }]}>{winnerText(L, 'yourPack', { title: winner.packTitle })}{ '\n' }{winner.place === 1 ? winnerText(L, 'won') : winnerText(L, 'finishedPlace', { n: winner.place })}</Text></Animated.View>
      {reward ? <Animated.View entering={reduced ? undefined : FadeInDown.delay(820).duration(600)} style={[s.prize, { backgroundColor: g.opaqueControl }]}><Ionicons name="diamond-outline" size={22} color={g.accentGraphic} /><Text style={[s.prizeText, { color: g.text }]}>{reward}</Text></Animated.View> : null}
      </ScrollView>
      {error ? <Text accessibilityLiveRegion="polite" style={[s.body, { color: g.secondary }]}>{winnerText(L, 'saved')}</Text> : null}
      <Animated.View entering={reduced ? undefined : FadeInDown.delay(950).duration(600)}><KitTouchable disabled={claiming} accessibilityRole="button" accessibilityState={{ busy: claiming }} onPress={winner.claimed ? onClose : onClaim} style={[s.button, { backgroundColor: g.cta }]}><Text style={[s.prizeText, { color: g.ctaInk }]}>{winner.claimed ? winnerText(L, 'great') : claiming ? winnerText(L, 'claiming') : error ? winnerText(L, 'retry') : winnerText(L, 'claim')}</Text></KitTouchable></Animated.View>
      {!winner.claimed ? <KitTouchable onPress={onClose} accessibilityRole="button" style={s.later}><Text style={{ color: g.secondary, fontSize: 14 }}>{winnerText(L, 'later')}</Text></KitTouchable> : null}
    </View>
  </View></Modal>;
}

// theme-exempt: gold is the prize illustration, all surfaces and text use theme tokens.
const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', alignItems: 'center', justifyContent: 'flex-start', padding: 22 }, // theme-exempt: затемнение под окном — единственное разрешённое исключение
  dialog: { width: '100%', maxWidth: 430, maxHeight: '100%', borderRadius: 30, padding: 20, overflow: 'hidden' },
  content: { flexGrow: 0, flexShrink: 1 },
  art: { height: 190, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, // theme-exempt: золото приза (медаль и плашка места) — иллюстрация
  medal: { width: 122, height: 122, borderRadius: 61, alignItems: 'center', justifyContent: 'center' }, rank: { position: 'absolute', bottom: 12, backgroundColor: '#F8D985', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 22 }, rankText: { color: '#65400B', fontSize: 15, fontWeight: '800', letterSpacing: 2 }, // theme-exempt: золото приза — плашка места и её текст
  month: { fontSize: 13, fontWeight: '700', textAlign: 'center' }, title: { fontSize: 31, lineHeight: 38, fontWeight: '800', textAlign: 'center', marginTop: 8 }, body: { fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 10 }, prize: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', minHeight: 54, borderRadius: 18, marginTop: 22 }, prizeText: { fontSize: 17, fontWeight: '700' }, button: { minHeight: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginTop: 18 }, later: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
});
