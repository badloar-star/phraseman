/**
 * «Урок вместе» (идея 2) — шторка выбора друзей: «Позвать на занятие».
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html, идея 2 «Выбор друзей», «Выбраны трое», «Нет друзей»):
 * после занятия — до трёх друзей за раз. Кому урок открыт — отмечены сразу; кто уже прошёл — можно позвать повторить;
 * у кого урок закрыт — строка неактивна. Предел виден до нажатия (строка под кнопкой). Только вид и выбор — отправку
 * делает экран (onSend), шторка закрывается сразу (Optimistic UI: «Позвал…» в финале до ответа сервера).
 */
import React, { memo, useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import HybridSheetShell from '../modal_fx/HybridSheetShell';
import PressableHybrid from '../PressableHybrid';
import { FlowText } from '../text-integrity';
import { useLang } from '../LangContext';
import { RowDivider } from '../v2/RowDivider';
import { FriendsCoin, useFriendsGlass, type FriendsGlass } from '../friends/FriendsGlassKit';
import { triLang } from '../../constants/i18n';
import FriendSheetButton from './FriendSheetButton';
import {
  LESSON_INVITE_MAX,
  defaultLessonInvitePicks,
  orderLessonInviteRows,
  toggleLessonInvitePick,
  type LessonInviteRow,
} from '../../app/friends_together/lesson_together';
import {
  lessonInviteCta,
  lessonInviteEmptyCopy,
  lessonInviteLimitNote,
  lessonInviteSheetBody,
  lessonInviteSheetTitle,
  lessonInviteStatusLine,
} from '../../app/friends_together/lesson_together_copy';

export interface FriendLessonInviteSheetProps {
  visible: boolean;
  /** Номер урока — для подписей «Урок 2 открыт / ещё закрыт». */
  lesson: number;
  /** «Урок 2 · Занятие 3 · Are you…?» — строка занятия под заголовком. */
  lessonLine: string;
  /** Друзья для выбора; пусто — «Пока некого позвать». */
  rows: readonly LessonInviteRow[];
  onSend: (friendUids: readonly string[]) => void;
  onAddFriend: () => void;
  onClose: () => void;
  onDismissed?: () => void;
}

const log = (line: string): void => { console.log(`[FRIENDS-2] ${line}`); }; // guard-ok: журнал выбора «Урок вместе», одна строка на шаг

function PickRow({ row, picked, lesson, lang, glass, textScale, onToggle, last }: Readonly<{
  row: LessonInviteRow;
  picked: boolean;
  lesson: number;
  lang: Parameters<typeof lessonInviteStatusLine>[0];
  glass: FriendsGlass;
  textScale: number;
  onToggle: (row: LessonInviteRow) => void;
  last: boolean;
}>) {
  const locked = row.status === 'locked';
  const status = lessonInviteStatusLine(lang, row.status, lesson);
  return (
    <PressableHybrid
      testID={`lesson-invite-row-${row.friendUid}`}
      variant="card"
      onPress={locked ? undefined : () => onToggle(row)}
      disabled={locked}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: picked, disabled: locked }}
      accessibilityLabel={status ? `${row.name}, ${status}` : row.name}
      style={locked ? styles.rowLocked : undefined}
      contentStyle={styles.row}
    >
      {last ? null : <RowDivider color={glass.line} edge="bottom" />}
      <FriendsCoin coinRank={row.coinRank} name={row.name} size={40} glass={glass} plus={row.isPlus} />
      <View style={styles.rowText}>
        <FlowText testID={`lesson-invite-row-name-${row.friendUid}`} provenance="authored" style={{ color: glass.text, fontSize: 16 * textScale, lineHeight: 21 * textScale, fontWeight: '700' }}>
          {row.name}
        </FlowText>
        {status ? (
          <FlowText testID={`lesson-invite-row-status-${row.friendUid}`} provenance="authored" style={{ color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }}>
            {status}
          </FlowText>
        ) : null}
      </View>
      {locked ? null : (
        <View style={[styles.dot, { backgroundColor: picked ? glass.text : glass.opaqueControl }]}>
          {picked ? <Ionicons name="checkmark" size={15} color={glass.opaqueCard} /> : null}
        </View>
      )}
    </PressableHybrid>
  );
}

function FriendLessonInviteSheet({ visible, lesson, lessonLine, rows, onSend, onAddFriend, onClose, onDismissed }: FriendLessonInviteSheetProps) {
  const { glass, textScale } = useFriendsGlass();
  const { lang } = useLang();
  const { height } = useWindowDimensions();
  const [picked, setPicked] = useState<readonly string[]>([]);
  const closeLabel = triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' });

  // зачем (макет «Выбор друзей»): при каждом открытии — заново отмечены те, у кого урок открыт; пока шторка открыта, выбор не сбрасываем
  useEffect(() => {
    if (!visible) return;
    const initial = defaultLessonInvitePicks(rows);
    log(`picker:open rows=${rows.length} preselected=${initial.length} lesson=${lesson}`);
    setPicked(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggle = useCallback((row: LessonInviteRow) => {
    setPicked((current) => {
      const next = toggleLessonInvitePick(current, row);
      if (next === current) log(`picker:toggle ignored reason=${row.status === 'locked' ? 'locked' : 'limit'}`);
      return next;
    });
  }, []);

  const ordered = orderLessonInviteRows(rows);
  const empty = rows.length === 0;
  const full = picked.length >= LESSON_INVITE_MAX;
  const emptyCopy = lessonInviteEmptyCopy(lang);

  return (
    <HybridSheetShell visible={visible} onClose={onClose} onDismissed={onDismissed} closeLabel={closeLabel} backdropAccessible={false} testID="friend-lesson-invite-sheet" material="liquid-glass-opaque" glowColor={glass.cta}>
      {({ requestDismiss }) => (empty ? (
        <View style={styles.body}>
          <View style={[styles.emptyIcon, { backgroundColor: glass.opaqueControl }]}>
            <Ionicons name="people-outline" size={26} color={glass.text} />
          </View>
          <FlowText testID="lesson-invite-empty-title" provenance="authored" accessibilityRole="header" style={[styles.center, styles.title, { color: glass.text, fontSize: 25 * textScale, lineHeight: 31 * textScale }]}>
            {emptyCopy.title}
          </FlowText>
          <FlowText testID="lesson-invite-empty-body" provenance="authored" style={[styles.center, styles.para, { color: glass.secondary, fontSize: 16 * textScale, lineHeight: 22 * textScale }]}>
            {emptyCopy.body}
          </FlowText>
          <View style={styles.actions}>
            <FriendSheetButton glass={glass} textScale={textScale} tone="primary" icon="person-add-outline" label={emptyCopy.add} testID="lesson-invite-empty-add" onPress={() => { log('picker:empty add_friend'); onAddFriend(); requestDismiss(); }} />
            <FriendSheetButton glass={glass} textScale={textScale} tone="secondary" label={emptyCopy.later} testID="lesson-invite-empty-later" onPress={requestDismiss} />
          </View>
        </View>
      ) : (
        <View style={styles.body}>
          <FlowText testID="lesson-invite-title" provenance="authored" accessibilityRole="header" style={[styles.center, styles.title, { color: glass.text, fontSize: 25 * textScale, lineHeight: 31 * textScale }]}>
            {lessonInviteSheetTitle(lang)}
          </FlowText>
          <FlowText testID="lesson-invite-body" provenance="authored" style={[styles.center, styles.para, { color: glass.secondary, fontSize: 16 * textScale, lineHeight: 22 * textScale }]}>
            {lessonInviteSheetBody(lang, lessonLine)}
          </FlowText>
          {/* зачем (PERF-GUARD): друзей может быть много — список с виртуализацией, высота до 42% экрана */}
          <FlatList
            data={ordered}
            keyExtractor={(row) => row.friendUid}
            extraData={picked}
            initialNumToRender={10}
            bounces={false}
            style={[styles.list, { maxHeight: Math.round(height * 0.42) }]}
            renderItem={({ item, index }) => (
              <PickRow row={item} picked={picked.includes(item.friendUid)} lesson={lesson} lang={lang} glass={glass} textScale={textScale} onToggle={toggle} last={index === ordered.length - 1} />
            )}
          />
          <View style={styles.actions}>
            <FriendSheetButton
              glass={glass}
              textScale={textScale}
              tone={picked.length > 0 ? 'primary' : 'off'}
              icon="paper-plane-outline"
              label={lessonInviteCta(lang, picked.length)}
              testID="lesson-invite-send"
              onPress={picked.length > 0 ? () => { log(`picker:send count=${picked.length}`); onSend(picked); requestDismiss(); } : undefined}
            />
          </View>
          <FlowText testID="lesson-invite-limit" provenance="authored" style={[styles.center, styles.note, { color: glass.accentTextSafe, fontSize: 13 * textScale, lineHeight: 17 * textScale }]}>
            {lessonInviteLimitNote(lang, full)}
          </FlowText>
        </View>
      ))}
    </HybridSheetShell>
  );
}

export default memo(FriendLessonInviteSheet);

const styles = StyleSheet.create({
  body: { paddingBottom: 8 },
  center: { textAlign: 'center' },
  title: { marginTop: 14, fontWeight: '700' },
  para: { marginTop: 10 },
  list: { marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  rowLocked: { opacity: 0.45 },
  rowText: { flex: 1, minWidth: 0 },
  dot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actions: { marginTop: 16, gap: 10 },
  note: { marginTop: 10, fontWeight: '700' },
  emptyIcon: { alignSelf: 'center', marginTop: 20, width: 61, height: 61, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
