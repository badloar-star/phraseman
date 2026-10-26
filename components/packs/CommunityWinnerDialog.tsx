import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeInDown, Keyframe } from 'react-native-reanimated';
import { CommunityAwardConfetti, CommunityAwardRays } from './CommunityAwardDecoration';
import { KitTouchable } from '../KitTouchable';
import { LinearGradient } from '../SafeLinearGradient';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { contestPrize } from '../../shared/community_month_contest';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';

export type CommunityWinner = Readonly<{ monthId: string; packTitle: string; place: 1 | 2 | 3; claimed: boolean }>;
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
  const LP = (ru: string, en: string): string => triLang(lang, { ru, uk: en, es: en, en });
  const insets = useStableSafeAreaInsets();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const prize = contestPrize(winner.place);
  const reward = prize?.kind === 'plus' ? LP('Plus на 3 месяца', 'Plus for 3 months') : LP(`${prize?.kind === 'coins' ? prize.amount : 0} монет`, `${prize?.kind === 'coins' ? prize.amount : 0} coins`);
  return <Modal transparent visible animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}><View style={[s.backdrop, { paddingTop: Math.max(22, insets.top), paddingBottom: Math.max(22, insets.bottom) }]}>
    <View style={[s.dialog, { backgroundColor: g.opaqueCard }]}>
      {!reduced && !winner.claimed ? <CommunityAwardConfetti accent={g.accent} /> : null}
      <ScrollView style={s.content} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={s.art}><CommunityAwardRays reduced={reduced} /><Animated.View entering={reduced ? undefined : trophyArrival}><LinearGradient colors={['#FFF1BD', '#F1BC52', '#D98A20']} style={s.medal}><Ionicons name="trophy" size={65} color="#82500C" /></LinearGradient></Animated.View><View style={s.rank}><Text style={s.rankText}>{LP(`${winner.place} МЕСТО`, `PLACE ${winner.place}`)}</Text></View></View>
      <Animated.View entering={reduced ? undefined : FadeInDown.delay(450).duration(600)}><Text style={[s.month, { color: g.secondary }]}>{LP('Набор месяца', 'Pack of the month')} · {winner.monthId}</Text><Text style={[s.title, { color: g.text }]}>{winner.claimed ? LP('Награда получена!', 'Reward received!') : LP('Поздравляем!', 'Congratulations!')}</Text><Text style={[s.body, { color: g.secondary }]}>{LP(`Твой набор «${winner.packTitle}»`, `Your pack “${winner.packTitle}”`)}{ '\n' }{winner.place === 1 ? LP('победил в конкурсе!', 'won the contest!') : LP(`занял ${winner.place}-е место!`, `finished in place ${winner.place}!`)}</Text></Animated.View>
      <Animated.View entering={reduced ? undefined : FadeInDown.delay(820).duration(600)} style={[s.prize, { backgroundColor: g.opaqueControl }]}><Ionicons name={prize?.kind === 'plus' ? 'diamond-outline' : 'ellipse-outline'} size={22} color={g.accent} /><Text style={[s.prizeText, { color: g.text }]}>{reward}</Text></Animated.View>
      </ScrollView>
      {error ? <Text accessibilityLiveRegion="polite" style={[s.body, { color: g.secondary }]}>{LP('Приз сохранён. Не удалось получить подтверждение — попробуй ещё раз.', 'Your prize is saved. Confirmation failed — please try again.')}</Text> : null}
      <Animated.View entering={reduced ? undefined : FadeInDown.delay(950).duration(600)}><KitTouchable disabled={claiming} accessibilityRole="button" accessibilityState={{ busy: claiming }} onPress={winner.claimed ? onClose : onClaim} style={[s.button, { backgroundColor: g.cta }]}><Text style={[s.prizeText, { color: g.ctaInk }]}>{winner.claimed ? LP('Отлично!', 'Great!') : claiming ? LP('Получаем награду…', 'Claiming reward…') : error ? LP('Повторить', 'Try again') : LP('Забрать приз', 'Claim prize')}</Text></KitTouchable></Animated.View>
      {!winner.claimed ? <KitTouchable onPress={onClose} accessibilityRole="button" style={s.later}><Text style={{ color: g.secondary, fontSize: 14 }}>{LP('Позже', 'Later')}</Text></KitTouchable> : null}
    </View>
  </View></Modal>;
}

// theme-exempt: gold is the prize illustration, all surfaces and text use theme tokens.
const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  dialog: { width: '100%', maxWidth: 430, maxHeight: '100%', borderRadius: 30, padding: 20, overflow: 'hidden' },
  content: { flexGrow: 0, flexShrink: 1 },
  art: { height: 190, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, medal: { width: 122, height: 122, borderRadius: 61, alignItems: 'center', justifyContent: 'center' }, rank: { position: 'absolute', bottom: 12, backgroundColor: '#F8D985', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 22 }, rankText: { color: '#65400B', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  month: { fontSize: 13, fontWeight: '700', textAlign: 'center' }, title: { fontSize: 31, lineHeight: 38, fontWeight: '800', textAlign: 'center', marginTop: 8 }, body: { fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 10 }, prize: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', minHeight: 54, borderRadius: 18, marginTop: 22 }, prizeText: { fontSize: 17, fontWeight: '700' }, button: { minHeight: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginTop: 18 }, later: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
});
