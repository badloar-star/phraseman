import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Modal, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { ConfettiBurst } from '../feedback/ConfettiBurst';
import { KitTouchable } from '../KitTouchable';
import { LinearGradient } from '../SafeLinearGradient';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { contestPrize } from '../../shared/community_month_contest';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';

export type CommunityWinner = Readonly<{ monthId: string; packTitle: string; place: 1 | 2 | 3; claimed: boolean }>;
export function CommunityWinnerDialog({ winner, onClaim, onClose }: Readonly<{
  winner: CommunityWinner | null; onClaim: () => Promise<void>; onClose: () => void;
}>): React.JSX.Element | null {
  const { liquidGlassThemeId } = useTheme();
  const { lang } = useLang();
  const LP = (ru: string, en: string): string => triLang(lang, { ru, uk: en, es: en, en });
  const g = liquidGlassTokens(liquidGlassThemeId);
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
  const prize = contestPrize(winner.place);
  const reward = prize?.kind === 'plus' ? LP('Plus на 3 месяца', 'Plus for 3 months') : LP(`${prize?.kind === 'coins' ? prize.amount : 0} монет`, `${prize?.kind === 'coins' ? prize.amount : 0} coins`);
  const claim = async (): Promise<void> => {
    if (claimLock.current || winner.claimed) return;
    claimLock.current = true;
    setClaiming(true); setError(false);
    try { await onClaim(); } catch { setError(true); } finally { claimLock.current = false; setClaiming(false); }
  };
  return <Modal transparent visible animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}><View style={s.backdrop}>
    <View style={[s.dialog, { backgroundColor: g.opaqueCard }]}>
      {!reduced && !winner.claimed ? <ConfettiBurst count={64} colors={['#F5BD58', '#FFE7AB', g.accent, '#A6DCEB']} /> : null}
      <View style={s.art}><Animated.View entering={reduced ? undefined : ZoomIn.springify().damping(12)}><LinearGradient colors={['#FFF1BD', '#F1BC52', '#D98A20']} style={s.medal}><Ionicons name="trophy" size={65} color="#82500C" /></LinearGradient></Animated.View><View style={s.rank}><Text style={s.rankText}>{LP(`${winner.place} МЕСТО`, `PLACE ${winner.place}`)}</Text></View></View>
      <Animated.View entering={reduced ? undefined : FadeInDown.delay(300).duration(400)}><Text style={[s.month, { color: g.secondary }]}>{LP('Набор месяца', 'Pack of the month')} · {winner.monthId}</Text><Text style={[s.title, { color: g.text }]}>{winner.claimed ? LP('Награда получена!', 'Reward received!') : LP('Поздравляем!', 'Congratulations!')}</Text><Text style={[s.body, { color: g.secondary }]}>{LP(`Твой набор «${winner.packTitle}»`, `Your pack “${winner.packTitle}”`)}{ '\n' }{winner.place === 1 ? LP('победил в конкурсе!', 'won the contest!') : LP(`занял ${winner.place}-е место!`, `finished in place ${winner.place}!`)}</Text></Animated.View>
      <View style={[s.prize, { backgroundColor: g.opaqueControl }]}><Ionicons name={prize?.kind === 'plus' ? 'diamond-outline' : 'ellipse-outline'} size={22} color={g.accent} /><Text style={[s.prizeText, { color: g.text }]}>{reward}</Text></View>
      {error ? <Text accessibilityLiveRegion="polite" style={[s.body, { color: g.secondary }]}>{LP('Приз сохранён. Не удалось получить подтверждение — попробуй ещё раз.', 'Your prize is saved. Confirmation failed — please try again.')}</Text> : null}
      <KitTouchable disabled={claiming} accessibilityRole="button" accessibilityState={{ busy: claiming }} onPress={winner.claimed ? onClose : () => { void claim(); }} style={[s.button, { backgroundColor: g.ctaFill }]}><Text style={[s.prizeText, { color: g.ctaFillInk }]}>{winner.claimed ? LP('Отлично!', 'Great!') : claiming ? LP('Получаем награду…', 'Claiming reward…') : error ? LP('Повторить', 'Try again') : LP('Забрать приз', 'Claim prize')}</Text></KitTouchable>
      {!winner.claimed ? <KitTouchable onPress={onClose} accessibilityRole="button" style={s.later}><Text style={{ color: g.secondary, fontSize: 14 }}>{LP('Позже', 'Later')}</Text></KitTouchable> : null}
    </View>
  </View></Modal>;
}

// theme-exempt: gold is the prize illustration, all surfaces and text use theme tokens.
const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  dialog: { width: '100%', maxWidth: 430, borderRadius: 30, padding: 20, overflow: 'hidden' },
  art: { height: 190, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, medal: { width: 122, height: 122, borderRadius: 61, alignItems: 'center', justifyContent: 'center' }, rank: { position: 'absolute', bottom: 12, backgroundColor: '#F8D985', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 22 }, rankText: { color: '#65400B', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  month: { fontSize: 13, fontWeight: '700', textAlign: 'center' }, title: { fontSize: 31, lineHeight: 38, fontWeight: '800', textAlign: 'center', marginTop: 8 }, body: { fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 10 }, prize: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', minHeight: 54, borderRadius: 18, marginTop: 22 }, prizeText: { fontSize: 17, fontWeight: '700' }, button: { minHeight: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginTop: 18 }, later: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
});
