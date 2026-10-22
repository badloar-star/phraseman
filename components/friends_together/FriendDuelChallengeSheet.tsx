/**
 * «Дуэль на 5 фраз» (идея 3) — шторка вызова из шторки друга или визитки.
 *
 * зачем (макет docs/design/v2-app/friends-full.html, идея 3 «Вызов», «Нет общих занятий»): «ты против друга», факты,
 * правило в одну строку и «Начать дуэль» с пометкой «Без энергии · три вызова в день». Когда дуэль невозможна — честная
 * неактивная кнопка с причиной и путь дальше: разные языки или мало пройденных фраз → «Позвать на занятие» (идея 2);
 * три вызова за сегодня или дуэль с этим другом уже идёт → только «Позже». Только вид: решение — canChallenge и экран.
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
import { canChallenge } from '../../app/friends_together/duel_core';
import { duelCopy, duelFacts, type DuelCopyKey } from '../../app/friends_together/duel_copy';

export interface FriendDuelChallengeSheetProps {
  visible: boolean;
  me: DuelSide;
  friend: DuelSide;
  /** Учим один язык — иначе дуэль недоступна (тексты занятий у языков разные). */
  sameLanguage: boolean;
  /** Есть пять разных пройденных фраз. */
  enoughPhrases: boolean;
  sentToday: number;
  openWithFriend: boolean;
  onStart: () => void;
  onInviteToLesson: () => void;
  onClose: () => void;
  onDismissed?: () => void;
}

/** Почему дуэль сейчас недоступна; null — можно начинать. */
function blockReason(p: Pick<FriendDuelChallengeSheetProps, 'sameLanguage' | 'enoughPhrases' | 'sentToday' | 'openWithFriend'>): DuelCopyKey | null {
  if (!p.sameLanguage) return 'otherLanguage';
  if (!p.enoughPhrases) return 'notEnough';
  const check = canChallenge({ sentToday: p.sentToday, openWithFriend: p.openWithFriend });
  if (!check.ok) return check.reason === 'limit' ? 'limit' : 'openDuel';
  return null;
}

function FriendDuelChallengeSheet(props: FriendDuelChallengeSheetProps) {
  const { visible, me, friend, onStart, onInviteToLesson, onClose, onDismissed } = props;
  const { glass, textScale } = useFriendsGlass();
  const { lang } = useLang();
  const closeLabel = triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' });
  const blocked = blockReason(props);
  // зачем: разные языки и мало фраз лечит общее занятие (идея 2); лимит и идущая дуэль — только время
  const offerLesson = blocked === 'otherLanguage' || blocked === 'notEnough';

  return (
    <HybridSheetShell visible={visible} onClose={onClose} onDismissed={onDismissed} closeLabel={closeLabel} backdropAccessible={false} testID="friend-duel-challenge-sheet" material="liquid-glass-opaque" glowColor={glass.cta}>
      {({ requestDismiss }) => (
        <View style={styles.body}>
          <DuelVersus me={me} friend={friend} mid={duelCopy(lang, 'versus')} glass={glass} textScale={textScale} />
          <FlowText testID="friend-duel-title" provenance="authored" accessibilityRole="header" style={[styles.center, styles.title, { color: glass.text, fontSize: 25 * textScale, lineHeight: 31 * textScale }]}>
            {duelCopy(lang, 'title')}
          </FlowText>
          <View style={styles.facts}>
            {duelFacts(lang, null).map((fact, i) => (
              <View key={`fact-${i}`} style={styles.fact} accessible accessibilityLabel={`${fact.value} ${fact.label}`}>
                <FlowText testID={`friend-duel-fact-${i}-value`} provenance="authored" style={[styles.center, { color: glass.text, fontSize: 20 * textScale, lineHeight: 26 * textScale, fontWeight: '700' }]}>{fact.value}</FlowText>
                <FlowText testID={`friend-duel-fact-${i}-label`} provenance="authored" style={[styles.center, { color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }]}>{fact.label}</FlowText>{/* guard-ok: подпись числа в ряду фактов (.facts макета 2.0) */}
              </View>
            ))}
          </View>
          <FlowText testID="friend-duel-body" provenance="authored" style={[styles.center, styles.para, { color: glass.secondary, fontSize: 16 * textScale, lineHeight: 22 * textScale }]}>
            {duelCopy(lang, 'challengeBody')}
          </FlowText>
          <View style={styles.actions}>
            {blocked ? (
              <FriendSheetButton glass={glass} textScale={textScale} tone="off" label={duelCopy(lang, blocked)} testID="friend-duel-blocked" />
            ) : (
              <FriendSheetButton glass={glass} textScale={textScale} tone="primary" icon="shield-half-outline" label={duelCopy(lang, 'start')} testID="friend-duel-start" onPress={() => { onStart(); requestDismiss(); }} />
            )}
            {blocked ? null : (
              <FlowText testID="friend-duel-free" provenance="authored" style={[styles.center, styles.note, { color: glass.accentTextSafe, fontSize: 13 * textScale, lineHeight: 17 * textScale }]}>
                {duelCopy(lang, 'freeNote')}
              </FlowText>
            )}
            {offerLesson ? (
              <FriendSheetButton glass={glass} textScale={textScale} tone="secondary" icon="book-outline" label={duelCopy(lang, 'inviteToLesson')} testID="friend-duel-invite-lesson" onPress={() => { onInviteToLesson(); requestDismiss(); }} />
            ) : (
              <FriendSheetButton glass={glass} textScale={textScale} tone="secondary" label={duelCopy(lang, 'later')} testID="friend-duel-later" onPress={requestDismiss} />
            )}
          </View>
        </View>
      )}
    </HybridSheetShell>
  );
}

export default memo(FriendDuelChallengeSheet);

const styles = StyleSheet.create({
  body: { paddingBottom: 8 },
  center: { textAlign: 'center' },
  title: { marginTop: 14, fontWeight: '700' },
  facts: { marginTop: 14, flexDirection: 'row', justifyContent: 'center', gap: 28 },
  fact: { alignItems: 'center' },
  para: { marginTop: 12 },
  actions: { marginTop: 18, gap: 10 },
  note: { fontWeight: '700' },
});
