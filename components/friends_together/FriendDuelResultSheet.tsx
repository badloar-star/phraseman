/**
 * «Дуэль на 5 фраз» (идея 3) — «Ход отправлен» и итог: одна шторка, два состояния.
 *
 * зачем (макет docs/design/v2-app/friends-full.html, идея 3 «Ход отправлен», «Ход без сети», «Победа», «Поражение»):
 * свои отметки видны сразу, чужие — песочные часы до хода друга; без сети — «Ход готов · сохранён на телефоне».
 * Итог: счёт и время у обоих, строка «что решило», таблица фраз, «Реванш» в одно касание и «Разобрать ошибки».
 * Поражение — без упрёка, с разбором. Только вид: данные и действия — у экрана.
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import HybridSheetShell from '../modal_fx/HybridSheetShell';
import { FlowText } from '../text-integrity';
import { useLang } from '../LangContext';
import { RowDivider } from '../v2/RowDivider';
import { useFriendsGlass, type FriendsGlass } from '../friends/FriendsGlassKit';
import { triLang } from '../../constants/i18n';
import FriendSheetButton from './FriendSheetButton';
import DuelVersus, { type DuelSide } from './DuelVersus';
import type { DuelOutcome } from '../../app/friends_together/duel_core';
import { duelCopy, duelReviewLabel } from '../../app/friends_together/duel_copy';

export type DuelPhraseRow = Readonly<{ key: string; target: string; meaning: string; mine: boolean; theirs: boolean | null }>;

export interface FriendDuelResultSheetProps {
  visible: boolean;
  mode: 'waiting' | 'offline' | 'result';
  me: DuelSide;
  friend: DuelSide;
  outcome?: DuelOutcome;
  /** Строка «что решило» (duelOutcomeLine) — только в итоге. */
  outcomeLine?: string;
  rows: readonly DuelPhraseRow[];
  onRematch?: () => void;
  onReview?: () => void;
  onClose: () => void;
  onDismissed?: () => void;
}

function Mark({ value, glass }: Readonly<{ value: boolean | null; glass: FriendsGlass }>) {
  const icon = value === null ? 'hourglass-outline' : value ? 'checkmark' : 'close';
  const color = value === null ? glass.secondary : value ? glass.good : glass.bad;
  const fill = value === null ? glass.opaqueControl : value ? glass.goodSoft : glass.badSoft;
  return (
    <View style={[styles.mark, { backgroundColor: fill }]}>
      <Ionicons name={icon} size={15} color={color} accessible={false} />
    </View>
  );
}

function FriendDuelResultSheet({ visible, mode, me, friend, outcome, outcomeLine, rows, onRematch, onReview, onClose, onDismissed }: FriendDuelResultSheetProps) {
  const { glass, textScale } = useFriendsGlass();
  const { lang } = useLang();
  const closeLabel = triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' });
  const isResult = mode === 'result';
  const title = isResult
    ? duelCopy(lang, outcome === 'win' ? 'win' : outcome === 'loss' ? 'loss' : 'draw')
    : duelCopy(lang, mode === 'offline' ? 'offlineTitle' : 'sentTitle');
  const body = isResult ? (outcomeLine ?? '') : duelCopy(lang, mode === 'offline' ? 'offlineBody' : 'sentBody');
  const mistakes = rows.filter((r) => !r.mine).length;

  return (
    <HybridSheetShell visible={visible} onClose={onClose} onDismissed={onDismissed} closeLabel={closeLabel} backdropAccessible={false} testID="friend-duel-result-sheet" material="liquid-glass-opaque" glowColor={glass.cta}>
      {({ requestDismiss }) => (
        <View style={styles.body}>
          <DuelVersus me={me} friend={friend} mid={duelCopy(lang, isResult ? 'resultMid' : 'sentMid')} glass={glass} textScale={textScale} />
          <FlowText testID="friend-duel-result-title" provenance="authored" accessibilityRole="header" style={[styles.center, styles.title, { color: glass.text, fontSize: 25 * textScale, lineHeight: 31 * textScale }]}>
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
          <View style={[styles.table, { backgroundColor: glass.opaqueControl }]}>
            <View style={styles.headRow}>
              <FlowText testID="friend-duel-col-phrase" provenance="authored" style={[styles.headPhrase, { color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }]}>{duelCopy(lang, 'phrase')}</FlowText>{/* guard-ok: заголовок столбца таблицы (.colh макета) */}
              <FlowText testID="friend-duel-col-you" provenance="authored" style={[styles.headMark, { color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }]}>{duelCopy(lang, 'you')}</FlowText>{/* guard-ok: заголовок столбца таблицы (.colh макета) */}
              <FlowText testID="friend-duel-col-friend" provenance="authored" style={[styles.headMark, { color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }]}>{duelCopy(lang, 'friend')}</FlowText>{/* guard-ok: заголовок столбца таблицы (.colh макета) */}
            </View>
            {rows.map((row, index) => (
              <View key={row.key} style={styles.row} accessible accessibilityLabel={`${row.target}. ${row.meaning}`}>
                {index < rows.length - 1 ? <RowDivider color={glass.line} edge="bottom" /> : null}
                <View style={styles.phrase}>
                  <FlowText testID={`friend-duel-row-${index}-target`} provenance="authored" style={{ color: glass.text, fontSize: 16 * textScale, lineHeight: 21 * textScale, fontWeight: '600' }}>{row.target}</FlowText>
                  <FlowText testID={`friend-duel-row-${index}-meaning`} provenance="authored" style={{ color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }}>{row.meaning}</FlowText>{/* guard-ok: перевод фразы под ней (.qr .ru макета) */}
                </View>
                <Mark value={row.mine} glass={glass} />
                <Mark value={row.theirs} glass={glass} />
              </View>
            ))}
          </View>
          <View style={styles.actions}>
            {isResult && onRematch ? (
              <FriendSheetButton glass={glass} textScale={textScale} tone="primary" icon="repeat" label={duelCopy(lang, 'rematch')} testID="friend-duel-rematch" onPress={() => { onRematch(); requestDismiss(); }} />
            ) : null}
            {isResult && onReview && mistakes > 0 ? (
              <FriendSheetButton glass={glass} textScale={textScale} tone="secondary" label={duelReviewLabel(lang, mistakes)} testID="friend-duel-review" onPress={() => { onReview(); requestDismiss(); }} />
            ) : null}
            {isResult ? null : (
              <FriendSheetButton glass={glass} textScale={textScale} tone="primary" label={duelCopy(lang, 'toFriends')} testID="friend-duel-to-friends" onPress={requestDismiss} />
            )}
          </View>
        </View>
      )}
    </HybridSheetShell>
  );
}

export default memo(FriendDuelResultSheet);

const styles = StyleSheet.create({
  body: { paddingBottom: 8 },
  center: { textAlign: 'center' },
  title: { marginTop: 12, fontWeight: '700' },
  para: { marginTop: 8 },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12 },
  table: { marginTop: 16, borderRadius: 16, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6 },
  headPhrase: { flex: 1 },
  headMark: { width: 34, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  phrase: { flex: 1, minWidth: 0 },
  mark: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
  actions: { marginTop: 16, gap: 10 },
});
