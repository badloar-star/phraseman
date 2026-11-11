/**
 * Лента «Итоги недели» наверху вкладки «Друзья» (идея 6, docs/design/v2-app/friends-full.html #week, `rail` и `wEmpty`).
 *
 * зачем (координатор 22.10, 1:1 с макетом): заголовок секции со счётчиком и «пн · 9:00» справа, карточки листаются вбок от края до
 * края экрана; итогов нет — блока нет (пустую плашку владелец убрал 11.11). Кого показывать, решает friend_week_rail (чистая
 * функция над снапшотом пар — 0 чтений); здесь только вид. До понедельника 9:00 ленты нет совсем.
 */
import React, { memo, useCallback } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';

import type { Lang } from '../../constants/i18n';
import type { FriendWeekCard as FriendWeekCardModel, FriendWeekRail as FriendWeekRailModel } from '../../app/friends_together/friend_week_rail';
import { weekCopy } from '../../app/friends_together/friend_week_copy';
import { FlowText } from '../text-integrity';
import { FriendsSectionTitle, type FriendsGlass } from '../friends/FriendsGlassKit';
import type { FriendCallState } from './FriendCallPill';
import FriendWeekCard, { FRIEND_WEEK_CARD_WIDTH } from './FriendWeekCard';

const CARD_GAP = 10;
const keyOf = (card: FriendWeekCardModel) => card.uid;

function FriendWeekRail({ glass, textScale, lang, rail, sidePad, highFivedUids, callStateByUid, onOpen, onHighFive, onCall }: Readonly<{
  glass: FriendsGlass;
  textScale: number;
  lang: Lang;
  rail: FriendWeekRailModel;
  /** Боковое поле списка — лента выходит за него до края экрана (макет: margin 0 −20px, padding 0 20px). */
  sidePad: number;
  /** Больше не используется: пустая плашка убрана (владелец 11.11). Удалить вместе с передачей в friends.tsx. */
  showEmpty?: boolean;
  highFivedUids: ReadonlySet<string>;
  callStateByUid: Readonly<Record<string, FriendCallState>>;
  onOpen: (uid: string) => void;
  onHighFive: (uid: string) => void;
  onCall: (uid: string) => void;
}>) {
  // зачем (PERF-GUARD): друзей может быть много — лента виртуализирована (FlatList), карточка мемоизирована
  const renderCard = useCallback<ListRenderItem<FriendWeekCardModel>>(({ item }) => (
    <FriendWeekCard
      glass={glass}
      textScale={textScale}
      lang={lang}
      weekKey={rail.week}
      card={item}
      highFived={highFivedUids.has(item.uid)}
      callState={callStateByUid[item.uid] ?? 'idle'}
      onOpen={onOpen}
      onHighFive={onHighFive}
      onCall={onCall}
    />
  ), [callStateByUid, glass, highFivedUids, lang, onCall, onHighFive, onOpen, rail.week, textScale]);
  if (!rail.open) return null;
  // зачем (владелец 11.11): плашку «Итоги недели — в понедельник / первый итог после 7 дней дружбы» убрали совсем —
  // карточек нет, значит и блока нет. Проп showEmpty пока остаётся в типе (его передаёт friends.tsx, который правит другая сессия).
  if (rail.cards.length === 0) return null;
  return (
    <View testID="friend-week-rail">
      <View style={styles.head}>
        <View style={styles.title}>
          <FriendsSectionTitle glass={glass} textScale={textScale}>{weekCopy(lang, 'railTitle')}</FriendsSectionTitle>
          <View style={[styles.count, { backgroundColor: glass.opaqueControl }]}>
            <FlowText testID="friend-week-rail-count" provenance="authored" style={{ color: glass.text, fontSize: 13 * textScale, lineHeight: 17 * textScale, fontWeight: '700' }}>{String(rail.cards.length)}</FlowText>
          </View>
        </View>
        <FlowText testID="friend-week-rail-when" provenance="authored" style={{ flexShrink: 0, color: glass.secondary, fontSize: 16 * textScale, lineHeight: 21 * textScale, fontWeight: '600' }}>{weekCopy(lang, 'railWhen')}</FlowText>
      </View>
      <FlatList
        horizontal
        data={rail.cards}
        keyExtractor={keyOf}
        renderItem={renderCard}
        extraData={rail.week}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={FRIEND_WEEK_CARD_WIDTH + CARD_GAP}
        snapToAlignment="start"
        initialNumToRender={3}
        windowSize={5}
        style={{ marginHorizontal: -sidePad }}
        contentContainerStyle={[styles.row, { paddingHorizontal: sidePad }]}
      />
    </View>
  );
}

export default memo(FriendWeekRail);

const styles = StyleSheet.create({
  // макет `.sect`: 44 высота, поля 16 сверху и 10 снизу
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 44, marginTop: 16, marginBottom: 10 },
  title: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  count: { minWidth: 33, height: 24, paddingHorizontal: 9, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  // макет: зазор 10, поля 2 сверху и 14 снизу — тень карточек не обрезается
  row: { gap: CARD_GAP, paddingTop: 2, paddingBottom: 14, alignItems: 'stretch' },
});
