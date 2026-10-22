/**
 * «Урок вместе» (идея 2) — кнопка в финале занятия под «Продолжить»: «Позвать друга на это занятие» → выбор друзей →
 * «Приглашения ушли: Ирина, Олег».
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html, идея 2 «Финал занятия», «Отправлено», «Нет друзей»):
 * вторичная кнопка-пилюля (.c2) под главной; «Продолжить» — как сейчас. Друзья для выбора — из снимка «Вместе» на телефоне
 * (без сети); прогресса курса друга в профиле пока нет — статус «не знаем», выбор свободный, до трёх.
 * Optimistic UI: после «Позвать» кнопка сразу «Приглашения ушли…» и тост; сбой сервера — кнопка возвращается, тост ошибки.
 * Виден только при FRIENDS_TOGETHER_UI_ENABLED, включённом friends_together_enabled и известном занятии (lessonKey).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

import PressableHybrid from '../PressableHybrid';
import { FlowText } from '../text-integrity';
import { useLang } from '../LangContext';
import { useFriendsGlass } from '../friends/FriendsGlassKit';
import FriendLessonInviteSheet from './FriendLessonInviteSheet';
import { emitAppEvent } from '../../app/events';
import { getLocalDayKey } from '../../app/local_date';
import { FRIENDS_TOGETHER_UI_ENABLED, useFriendsTogetherEnabled } from '../../app/friends_together/together_config';
import { primeFriendsTogetherSnapshot, readMyActiveDays } from '../../app/friends_together/together_store';
import { pairCandidatesFromSnapshot } from '../../app/friends_together/pair_today';
import type { LessonInviteRow } from '../../app/friends_together/lesson_together';
import { sendLessonInvites } from '../../app/friends_together/lesson_invite_client';
import {
  lessonInviteButton,
  lessonInviteFailToast,
  lessonInviteLessonLine,
  lessonInviteSentLine,
  lessonInviteSentToast,
} from '../../app/friends_together/lesson_together_copy';

export interface FinishLessonInviteProps {
  /** Ключ занятия, как его записывает засчитывание (sessionId) — по нему сервер сверит «прошёл вместе». */
  lessonKey: string | undefined;
  lesson: number;
  sessionOrdinal: number;
  stars: number;
  elapsedMs: number;
}

const log = (line: string): void => { console.log(`[FRIENDS-2] ${line}`); }; // guard-ok: журнал кнопки «Урок вместе», одна строка на шаг

function toast(type: 'success' | 'error', t: ReturnType<typeof lessonInviteSentToast>): void {
  emitAppEvent('action_toast', {
    type,
    messageRu: t.ru, messageUk: t.uk, messageEn: t.en, messageEs: t.es, messagePtBr: t.ptBr,
    messageVi: t.vi, messageId: t.id, messageTr: t.tr, messagePl: t.pl,
  });
}

export default function FinishLessonInvite({ lessonKey, lesson, sessionOrdinal, stars, elapsedMs }: FinishLessonInviteProps) {
  const { enabled } = useFriendsTogetherEnabled();
  const on = FRIENDS_TOGETHER_UI_ENABLED && enabled && !!lessonKey;
  const { glass, textScale } = useFriendsGlass();
  const { lang } = useLang();
  const [rows, setRows] = useState<readonly LessonInviteRow[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sentNames, setSentNames] = useState<readonly string[] | null>(null);
  const inFlightRef = useRef(false);

  // зачем: друзья читаются один раз при показе финала (снимок в памяти или диск, мс) — тап открывает выбор сразу
  useEffect(() => {
    if (!on) return undefined;
    let alive = true;
    void (async () => {
      try {
        const [snapshot, myDays] = await Promise.all([primeFriendsTogetherSnapshot(), readMyActiveDays()]);
        if (!alive) {
          log('finish:invite rows skip reason=unmounted');
          return;
        }
        const next = snapshot
          ? pairCandidatesFromSnapshot(snapshot, myDays, getLocalDayKey()).map((c): LessonInviteRow => ({ friendUid: c.friendUid, name: c.name, coinRank: c.coinRank, isPlus: c.isPlus, status: 'unknown' }))
          : [];
        log(`finish:invite rows=${next.length} snapshot=${snapshot ? 'yes' : 'none'} lesson=${lessonKey}`);
        setRows(next);
      } catch (e) {
        console.warn(`[FRIENDS-2] finish:invite rows failed → выбор пустой: ${e instanceof Error ? e.message : String(e)}`); // guard-ok: catch называет причину
      }
    })();
    return () => { alive = false; };
  }, [lessonKey, on]);

  const onSend = useCallback((friendUids: readonly string[]) => {
    if (!lessonKey || inFlightRef.current) {
      log(`finish:invite send skip reason=${lessonKey ? 'in_flight' : 'no_lesson'}`);
      return;
    }
    inFlightRef.current = true;
    const names = friendUids.map((uid) => rows.find((r) => r.friendUid === uid)?.name ?? '').filter(Boolean);
    setSentNames(names); // зачем (Optimistic UI): «Приглашения ушли…» сразу, до ответа сервера
    toast('success', lessonInviteSentToast());
    void sendLessonInvites({ friendUids, lessonKey, minutes: Math.round(elapsedMs / 60_000), stars })
      .then((result) => {
        log(`finish:invite result ok=${result.ok}${result.ok ? '' : ` reason=${result.reason}`}`);
        if (result.ok) return;
        setSentNames(null);
        toast('error', lessonInviteFailToast(result.reason === 'limit'));
      })
      .catch((e: unknown) => {
        console.warn(`[FRIENDS-2] finish:invite failed → кнопка снова «Позвать»: ${e instanceof Error ? e.message : String(e)}`); // guard-ok: catch называет причину
        setSentNames(null);
        toast('error', lessonInviteFailToast(false));
      })
      .finally(() => { inFlightRef.current = false; });
  }, [elapsedMs, lessonKey, rows, stars]);

  if (!on) return null;
  const sent = sentNames !== null;
  const label = sent ? lessonInviteSentLine(lang, sentNames) : lessonInviteButton(lang);
  const ink = sent ? glass.good : glass.text;
  return (
    <>
      <PressableHybrid
        testID="finish-lesson-invite"
        variant="secondary"
        disabled={sent}
        onPress={sent ? undefined : () => { log('finish:invite open'); setSheetOpen(true); }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: sent }}
        style={styles.wrap}
        contentStyle={[styles.pill, { backgroundColor: glass.opaqueControl }]}
      >
        <Ionicons name={sent ? 'checkmark' : 'person-add-outline'} size={18} color={ink} accessible={false} />
        <FlowText testID="finish-lesson-invite-label" provenance="authored" style={{ flexShrink: 1, textAlign: 'center', color: ink, fontSize: 16 * textScale, lineHeight: 21 * textScale, fontWeight: '700' }}>
          {label}
        </FlowText>
      </PressableHybrid>
      <FriendLessonInviteSheet
        visible={sheetOpen}
        lesson={lesson}
        lessonLine={lessonInviteLessonLine(lang, lesson, sessionOrdinal)}
        rows={rows}
        onSend={onSend}
        onAddFriend={() => { log('finish:invite add_friend → friends tab'); router.push('/(tabs)/friends' as never); }}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  pill: { minHeight: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 8 },
});
