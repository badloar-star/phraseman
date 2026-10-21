/**
 * Веха серии вдвоём (7 / 30 / 100 дней) — шторка-праздник. Монет нет: награда — сам момент и цвет огня пары.
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html «Серия вдвоём — 30 дней»): длинная общая серия заслуживает
 * отдельного момента — две монеты, соединённые перемычкой цвета темы, заголовок, строка о цвете огня, «Дать пять» и «Отлично».
 * Показ решает экран по pairStreakMilestoneReached (только когда огонь зажёгся у обоих) — здесь только вид.
 */
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import HybridSheetShell from '../modal_fx/HybridSheetShell';
import { FlowText } from '../text-integrity';
import { useLang } from '../LangContext';
import { FriendsCoin, useFriendsGlass } from '../friends/FriendsGlassKit';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { triLang } from '../../constants/i18n';
import { pairCopy, pairMilestoneBody, pairMilestoneTitle } from '../../app/friends_together/pair_copy';
import FriendSheetButton from './FriendSheetButton';

export interface FriendPairMilestoneSheetProps {
  visible: boolean;
  /** 7, 30 или 100 (PAIR_STREAK_MILESTONES). */
  milestone: number;
  friendName: string;
  friendCoinRank: number | null;
  friendIsPlus: boolean;
  myName: string;
  myCoinRank: number | null;
  myIsPlus: boolean;
  highFived: boolean;
  onHighFive: () => void;
  onClose: () => void;
  onDismissed?: () => void;
}

const COIN = 64;
// зачем (emil: редкий праздник — можно чуть радости): перемычка «дотягивается» от монеты к монете за 360 мс с сильным ease-out
const BRIDGE_IN_MS = 360;
const BRIDGE_DELAY_MS = 180;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

function FriendPairMilestoneSheet({
  visible,
  milestone,
  friendName,
  friendCoinRank,
  friendIsPlus,
  myName,
  myCoinRank,
  myIsPlus,
  highFived,
  onHighFive,
  onClose,
  onDismissed,
}: FriendPairMilestoneSheetProps) {
  const { glass, textScale } = useFriendsGlass();
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const bridge = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const closeLabel = triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' });

  useEffect(() => {
    if (!visible) return undefined;
    if (reduceMotion) {
      bridge.setValue(1);
      return undefined;
    }
    bridge.setValue(0);
    const animation = Animated.timing(bridge, { toValue: 1, duration: BRIDGE_IN_MS, delay: BRIDGE_DELAY_MS, easing: EASE_OUT, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [bridge, reduceMotion, visible]);

  const title = pairMilestoneTitle(lang, milestone);
  return (
    <HybridSheetShell visible={visible} onClose={onClose} onDismissed={onDismissed} closeLabel={closeLabel} backdropAccessible={false} testID="friend-pair-milestone-sheet" material="liquid-glass-opaque" glowColor={glass.cta}>
      {({ requestDismiss }) => (
        <View style={styles.body}>
          <View style={styles.hero} accessible accessibilityLabel={`${myName} · ${friendName}`}>
            <View style={styles.coin}><FriendsCoin coinRank={myCoinRank} name={myName} size={COIN} glass={glass} plus={myIsPlus} /></View>
            <Animated.View
              testID="friend-pair-milestone-bridge"
              style={[styles.bridge, { backgroundColor: glass.accentGraphic, opacity: bridge, transform: [{ scaleX: bridge.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }]}
            />
            <View style={styles.coin}><FriendsCoin coinRank={friendCoinRank} name={friendName} size={COIN} glass={glass} plus={friendIsPlus} /></View>
          </View>
          <FlowText testID="friend-pair-milestone-title" provenance="authored" accessibilityRole="header" style={[styles.center, { marginTop: 14, color: glass.text, fontSize: 25 * textScale, lineHeight: 31 * textScale, fontWeight: '700' }]}>
            {title}
          </FlowText>
          <FlowText testID="friend-pair-milestone-body" provenance="authored" style={[styles.center, { marginTop: 10, color: glass.secondary, fontSize: 16 * textScale, lineHeight: 22 * textScale }]}>
            {pairMilestoneBody(lang, milestone)}
          </FlowText>
          <View style={styles.actions}>
            <FriendSheetButton
              glass={glass}
              textScale={textScale}
              tone={highFived ? 'off' : 'primary'}
              icon={highFived ? 'checkmark' : 'hand-left-outline'}
              label={pairCopy(lang, highFived ? 'highFived' : 'highFive')}
              testID="friend-pair-milestone-high-five"
              onPress={highFived ? undefined : onHighFive}
            />
            <FriendSheetButton glass={glass} textScale={textScale} tone="secondary" label={pairCopy(lang, 'great')} testID="friend-pair-milestone-done" onPress={requestDismiss} />
          </View>
        </View>
      )}
    </HybridSheetShell>
  );
}

export default memo(FriendPairMilestoneSheet);

const styles = StyleSheet.create({
  body: { paddingBottom: 8 },
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  coin: { zIndex: 1 },
  bridge: { width: 54, height: 8, borderRadius: 4, marginHorizontal: -6, zIndex: 0 },
  center: { textAlign: 'center' },
  actions: { marginTop: 18, gap: 10 },
});
