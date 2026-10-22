/**
 * «Дуэль на 5 фраз» (идея 3) — «Ход отправлен», «Ход готов» (без сети) и итог: содержимое полного экрана дуэли.
 *
 * зачем (макет docs/design/v2-app/friends-full.html, идея 3 «Ход отправлен», «Ход без сети», «Победа», «Поражение»): в макете
 * это полный экран после пятой фразы (крестик сверху), а не шторка — раньше было FriendDuelResultSheet, по закону владельца 22.10
 * «макет и приложение до бита» стало экраном. Свои отметки видны сразу, чужие — песочные часы до хода друга; без сети —
 * «Ход сохранён на телефоне». Итог: счёт и время у обоих, что решило, таблица фраз, «Реванш» и «Разобрать ошибки».
 * Поражение — без упрёка. Только вид: данные и действия — у экрана app/friends_duel.tsx.
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { FlowText } from '../text-integrity';
import { useLang } from '../LangContext';
import { RowDivider } from '../v2/RowDivider';
import { plateBoxShadow } from '../v2/ShadowSurface';
import { useFriendsGlass, type FriendsGlass } from '../friends/FriendsGlassKit';
import FriendSheetButton from './FriendSheetButton';
import DuelVersus, { type DuelSide } from './DuelVersus';
import type { DuelOutcome } from '../../app/friends_together/duel_core';
import { duelCopy, duelReviewLabel } from '../../app/friends_together/duel_copy';

/** Строка таблицы: фраза, её смысл (если курс его даёт) и отметки — свою и друга (null — друг ещё не ходил). */
export type DuelPhraseRow = Readonly<{ key: string; target: string; meaning: string | null; mine: boolean; theirs: boolean | null }>;

export interface FriendDuelResultViewProps {
  mode: 'waiting' | 'offline' | 'result';
  me: DuelSide;
  friend: DuelSide;
  outcome?: DuelOutcome;
  /** Строка «что решило» (duelOutcomeLine) — только в итоге. */
  outcomeLine?: string;
  rows: readonly DuelPhraseRow[];
  onRematch?: () => void;
  onReview?: () => void;
  onToFriends: () => void;
}

/** `.mk`: 28, радиус 9; верно — бледно-зелёный, неверно — тёплый (как разбор заданий), ждём — тон контрола и песочные часы. */
function Mark({ value, glass, label }: Readonly<{ value: boolean | null; glass: FriendsGlass; label: string }>) {
  const icon = value === null ? 'hourglass-outline' : value ? 'checkmark' : 'close';
  const color = value === null ? glass.secondary : value ? glass.good : glass.warn;
  const fill = value === null ? glass.opaqueControl : value ? glass.goodSoft : glass.warnSoft;
  return (
    <View style={[styles.mark, { backgroundColor: fill }]} accessible accessibilityLabel={label}>
      <Ionicons name={icon} size={16} color={color} accessible={false} />
    </View>
  );
}

function FriendDuelResultView({ mode, me, friend, outcome, outcomeLine, rows, onRematch, onReview, onToFriends }: FriendDuelResultViewProps) {
  const { glass, textScale } = useFriendsGlass();
  const { lang } = useLang();
  const isResult = mode === 'result';
  const title = isResult
    ? duelCopy(lang, outcome === 'win' ? 'win' : outcome === 'loss' ? 'loss' : 'draw')
    : duelCopy(lang, mode === 'offline' ? 'offlineTitle' : 'sentTitle');
  const body = isResult ? (outcomeLine ?? '') : duelCopy(lang, mode === 'offline' ? 'offlineBody' : 'sentBody');
  const mistakes = rows.filter((r) => !r.mine).length;
  const markLabel = (who: string, value: boolean | null) => `${who}: ${value === null ? '…' : value ? '✓' : '✗'}`;

  return (
    <View testID="friend-duel-result" style={styles.root}>
      <DuelVersus me={me} friend={friend} mid={duelCopy(lang, isResult ? 'resultMid' : 'sentMid')} glass={glass} textScale={textScale} coin={56} />
      <FlowText testID="friend-duel-result-title" provenance="authored" accessibilityRole="header" style={[styles.center, styles.title, { color: glass.text, fontSize: 22 * textScale, lineHeight: 28 * textScale }]}>
        {title}
      </FlowText>
      {body ? (
        <FlowText testID="friend-duel-result-body" provenance="authored" style={[styles.center, styles.para, { color: glass.secondary, fontSize: 16 * textScale, lineHeight: 22 * textScale }]}>
          {body}
        </FlowText>
      ) : null}
      {mode === 'offline' ? (
        <View testID="friend-duel-offline-strip" style={[styles.strip, { backgroundColor: glass.warnSoft }]}>
          <Ionicons name="cloud-offline-outline" size={18} color={glass.warn} accessible={false} />
          <FlowText testID="friend-duel-offline-strip-text" provenance="authored" style={{ flex: 1, color: glass.text, fontSize: 16 * textScale, lineHeight: 21 * textScale, fontWeight: '600' }}>
            {duelCopy(lang, 'offlineStrip')}
          </FlowText>
        </View>
      ) : null}
      {/* зачем: строк нет (старый сервер без своих отметок, фраз нет в этой версии курса) — без пустой таблицы, счёт и исход остаются */}
      {rows.length > 0 ? (
      <View style={[styles.table, { backgroundColor: glass.opaqueCard, boxShadow: plateBoxShadow(glass) }]}>
        <View style={styles.headRow}>
          <FlowText testID="friend-duel-col-phrase" provenance="authored" style={[styles.headPhrase, { color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }]}>{duelCopy(lang, 'phrase')}</FlowText>{/* guard-ok: заголовок столбца таблицы (.colh макета) */}
          <FlowText testID="friend-duel-col-you" provenance="authored" style={[styles.headMark, { color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }]}>{duelCopy(lang, 'you')}</FlowText>{/* guard-ok: заголовок столбца таблицы (.colh макета) */}
          <FlowText testID="friend-duel-col-friend" provenance="authored" style={[styles.headMark, { color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }]}>{duelCopy(lang, 'friend')}</FlowText>{/* guard-ok: заголовок столбца таблицы (.colh макета) */}
        </View>
        {rows.map((row, index) => (
          <View key={row.key} style={styles.row}>
            {index < rows.length - 1 ? <RowDivider color={glass.line} edge="bottom" /> : null}
            <View style={styles.phrase} accessible accessibilityLabel={row.meaning ? `${row.target}. ${row.meaning}` : row.target}>
              <FlowText testID={`friend-duel-row-${index}-target`} provenance="authored" style={{ color: glass.text, fontSize: 16 * textScale, lineHeight: 21 * textScale, fontWeight: '700' }}>{row.target}</FlowText>
              {row.meaning ? (
                <FlowText testID={`friend-duel-row-${index}-meaning`} provenance="authored" style={{ marginTop: 1, color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }}>{row.meaning}</FlowText> /* guard-ok: смысл фразы под ней (.qr .ru макета), только если курс его даёт */
              ) : null}
            </View>
            <Mark value={row.mine} glass={glass} label={markLabel(duelCopy(lang, 'you'), row.mine)} />
            <Mark value={row.theirs} glass={glass} label={markLabel(duelCopy(lang, 'friend'), row.theirs)} />
          </View>
        ))}
      </View>
      ) : null}
      <View style={styles.actions}>
        {isResult && onRematch ? (
          <FriendSheetButton glass={glass} textScale={textScale} tone="primary" pill="m" icon="repeat" label={duelCopy(lang, 'rematch')} testID="friend-duel-rematch" onPress={onRematch} />
        ) : null}
        {isResult && onReview && mistakes > 0 ? (
          <FriendSheetButton glass={glass} textScale={textScale} tone="secondary" pill="m" label={duelReviewLabel(lang, mistakes)} testID="friend-duel-review" onPress={onReview} />
        ) : null}
        {isResult ? null : (
          <FriendSheetButton glass={glass} textScale={textScale} tone="primary" pill="m" label={duelCopy(lang, 'toFriends')} testID="friend-duel-to-friends" onPress={onToFriends} />
        )}
      </View>
    </View>
  );
}

export default memo(FriendDuelResultView);

const styles = StyleSheet.create({
  root: { paddingTop: 4, paddingBottom: 24 },
  center: { textAlign: 'center' },
  // `.rt` 22/28 700, отступ 12; `.p` 16/22, отступ 10.
  title: { marginTop: 12, fontWeight: '700' },
  para: { marginTop: 10 },
  // `.offl`: тёплая плашка, радиус 16, поля 10/14, отступ 10.
  strip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginTop: 10 },
  // `.cd`: радиус 22, поля 12/16/4, отступ 16; столбцы `.colh` 1fr 28 28, зазор 10.
  table: { marginTop: 16, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 6 },
  headPhrase: { flex: 1, fontWeight: '700' },
  headMark: { width: 28, textAlign: 'center', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  phrase: { flex: 1, minWidth: 0 },
  mark: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  actions: { marginTop: 16, gap: 12 },
});
