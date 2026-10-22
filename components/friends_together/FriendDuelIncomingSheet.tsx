/**
 * «Дуэль на 5 фраз» (идея 3) — вызов у друга: маркер «щит» на строке → эта шторка.
 *
 * зачем (макет docs/design/v2-app/friends-full.html, идея 3 «Вызов у Ирины»): «Алекс вызывает на дуэль», счёт вызвавшего
 * закрыт («?») до своего хода, факты «5 фраз · N ч осталось · 0 энергии», «Принять» / «Отказаться». Отказ тихий — вызвавший
 * увидит строку в «Сообщениях». Шторка закрывается сразу (Optimistic UI), запрос к серверу — у экрана.
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import HybridSheetShell from '../modal_fx/HybridSheetShell';
import { FlowText } from '../text-integrity';
import { useLang } from '../LangContext';
import { useFriendsGlass } from '../friends/FriendsGlassKit';
import { triLang } from '../../constants/i18n';
import FriendSheetButton from './FriendSheetButton';
import DuelVersus, { type DuelSide } from './DuelVersus';
import { duelCopy, duelFacts, duelIncomingTitle } from '../../app/friends_together/duel_copy';

export interface FriendDuelIncomingSheetProps {
  visible: boolean;
  me: DuelSide;
  /** Вызвавший; его счёт до своего хода не показываем — score «?». */
  friend: DuelSide;
  hoursLeft: number;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
  onDismissed?: () => void;
}

function FriendDuelIncomingSheet({ visible, me, friend, hoursLeft, onAccept, onDecline, onClose, onDismissed }: FriendDuelIncomingSheetProps) {
  const { glass, textScale } = useFriendsGlass();
  const { lang } = useLang();
  const closeLabel = triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' });
  return (
    <HybridSheetShell visible={visible} onClose={onClose} onDismissed={onDismissed} closeLabel={closeLabel} backdropAccessible={false} testID="friend-duel-incoming-sheet" material="liquid-glass-opaque" glowColor={glass.cta}>
      {({ requestDismiss }) => (
        <View style={styles.body}>
          <DuelVersus me={me} friend={{ ...friend, score: '?' }} mid={duelCopy(lang, 'versus')} glass={glass} textScale={textScale} />
          <FlowText testID="friend-duel-incoming-title" provenance="authored" accessibilityRole="header" style={[styles.center, styles.title, { color: glass.text, fontSize: 25 * textScale, lineHeight: 31 * textScale }]}>
            {duelIncomingTitle(lang, friend.name)}
          </FlowText>
          <FlowText testID="friend-duel-incoming-body" provenance="authored" style={[styles.center, styles.para, { color: glass.secondary, fontSize: 16 * textScale, lineHeight: 22 * textScale }]}>
            {duelCopy(lang, 'incomingBody')}
          </FlowText>
          <View style={styles.facts}>
            {duelFacts(lang, hoursLeft).map((fact, i) => (
              <View key={`fact-${i}`} style={styles.fact} accessible accessibilityLabel={`${fact.value} ${fact.label}`}>
                <FlowText testID={`friend-duel-incoming-fact-${i}-value`} provenance="authored" style={[styles.center, { color: glass.text, fontSize: 20 * textScale, lineHeight: 26 * textScale, fontWeight: '700' }]}>{fact.value}</FlowText>
                <FlowText testID={`friend-duel-incoming-fact-${i}-label`} provenance="authored" style={[styles.center, { color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }]}>{fact.label}</FlowText>{/* guard-ok: подпись числа в ряду фактов (.facts макета 2.0) */}
              </View>
            ))}
          </View>
          <View style={styles.actions}>
            <FriendSheetButton glass={glass} textScale={textScale} tone="primary" icon="shield-half-outline" label={duelCopy(lang, 'accept')} testID="friend-duel-accept" onPress={() => { onAccept(); requestDismiss(); }} />
            <FriendSheetButton glass={glass} textScale={textScale} tone="secondary" label={duelCopy(lang, 'decline')} testID="friend-duel-decline" onPress={() => { onDecline(); requestDismiss(); }} />
          </View>
        </View>
      )}
    </HybridSheetShell>
  );
}

export default memo(FriendDuelIncomingSheet);

const styles = StyleSheet.create({
  body: { paddingBottom: 8 },
  center: { textAlign: 'center' },
  title: { marginTop: 14, fontWeight: '700' },
  para: { marginTop: 10 },
  facts: { marginTop: 14, flexDirection: 'row', justifyContent: 'center', gap: 28 },
  fact: { alignItems: 'center' },
  actions: { marginTop: 18, gap: 10 },
});
