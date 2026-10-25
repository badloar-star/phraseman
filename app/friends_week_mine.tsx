/**
 * «Моя неделя» (идея 6, docs/design/v2-app/friends-full.html #week `wMine`) — Настройки → «Моя неделя».
 *
 * зачем (координатор 22.10, 1:1 с макетом): человек видит свою прошлую неделю так, как её в понедельник видят друзья, кто дал пять, и
 * может скрыть неделю переключателем «Показывать друзьям мою неделю» (флаг hidden в friends_week_v1 — сервер перестаёт отдавать
 * запись друзьям). Всё локально: запись недели — на телефоне, пятёрки — из кэша колокольчика (0 новых чтений). Переключатель
 * меняется сразу (Optimistic UI), сохранение — в хранилище и склеенным патчем синхронизации; сбой — откат и тост.
 * За выключателем FRIENDS_TOGETHER_UI_ENABLED: выключен — экран сразу уходит назад.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ContentWrap from '../components/ContentWrap';
import CustomSwitch from '../components/CustomSwitch';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { FlowText } from '../components/text-integrity';
import { FriendsCoin, useFriendsGlass, type FriendsGlass } from '../components/friends/FriendsGlassKit';
import ScreenBackButton, { ScreenBackZone, ScreenOriginBelowSafeTop } from '../components/v2/ScreenBackButton';
import { plateBoxShadow } from '../components/v2/ShadowSurface';
import { triLang, type Lang } from '../constants/i18n';
import { useMyCoinRank } from '../hooks/use_my_coin_rank';
import { emitAppEvent } from './events';
import { addWeekDays, weekStartOf, type FriendWeekRecord, type FriendWeekSummary } from './friends_together/friend_week';
import {
  clockLabel,
  factLessons,
  factStreakDays,
  gaveFiveLine,
  gaveFiveWhen,
  weekCopy,
  weekRangeLabel,
} from './friends_together/friend_week_copy';
import { bothFivesToday, fivesThisWeek, type FriendWeekFive } from './friends_together/friend_week_fives';
import { readMyFriendWeek, refreshMyFriendWeek, setMyFriendWeekHidden } from './friends_together/friend_week_store';
import { FRIENDS_TOGETHER_UI_ENABLED } from './friends_together/together_config';
import { getFriendsTogetherSnapshot } from './friends_together/together_store';
import { getLocalDayKey } from './local_date';
import { safeRouterBack } from './navigation_back';
import { readCachedUserNotifications } from './user_notifications';

const LOG = '[FRIEND-WEEK]';

/** Своя закрытая неделя — как её видят друзья в понедельник (без учёта «скрыть»: себе показываем всегда). */
function ownClosedWeek(record: FriendWeekRecord | null, todayKey: string): FriendWeekSummary | null {
  const lastWeek = addWeekDays(weekStartOf(todayKey), -7);
  if (record?.prev?.week === lastWeek) return record.prev;
  if (record?.cur?.week === lastWeek) return record.cur;
  return null;
}

function Fact({ id, glass, textScale, value, rise, label }: Readonly<{ id: string; glass: FriendsGlass; textScale: number; value: string; rise?: number | null; label: string }>) {
  return (
    <View style={[styles.fact, { backgroundColor: glass.opaqueControl }]}>
      <FlowText testID={`my-week-fact-${id}`} provenance="authored" style={[styles.center, { color: glass.text, fontSize: 22 * textScale, lineHeight: 26 * textScale, fontWeight: '700' }]}>
        {rise ? `${value} ↑${rise}` : value}
      </FlowText>
      <FlowText testID={`my-week-fact-${id}-label`} provenance="authored" style={[styles.center, { color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }]}>{label}</FlowText>{/* guard-ok: подпись факта под числом — макет #week (исключение 2.0) */}
    </View>
  );
}

export default function FriendsWeekMine() {
  const router = useRouter();
  const { lang } = useLang();
  const l = lang as Lang;
  const { glass, textScale } = useFriendsGlass();
  const myCoinRank = useMyCoinRank();
  const [record, setRecord] = useState<FriendWeekRecord | null>(null);
  const [myName, setMyName] = useState('');
  const [fives, setFives] = useState<readonly FriendWeekFive[]>([]);
  const [shown, setShown] = useState(true);
  const savingRef = useRef(false);
  const todayKey = getLocalDayKey();
  const lastWeek = addWeekDays(weekStartOf(todayKey), -7);
  const week = useMemo(() => ownClosedWeek(record, todayKey), [record, todayKey]);
  const backLabel = triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' });

  useEffect(() => {
    if (!FRIENDS_TOGETHER_UI_ENABLED) {
      console.log(`${LOG} Моя неделя: выключатель «Вместе» выключен → назад в Настройки`); // guard-ok: ранний выход называет причину
      safeRouterBack(router, '/(tabs)/settings' as never);
      return undefined;
    }
    let cancelled = false;
    const startedAt = Date.now();
    void (async () => {
      const rec = (await refreshMyFriendWeek('my_week_screen')) ?? (await readMyFriendWeek().catch((error: unknown) => {
        console.warn(`${LOG} Моя неделя: своя запись не прочиталась: ${error instanceof Error ? error.message : String(error)}`); // guard-ok
        return null;
      }));
      const rows = await readCachedUserNotifications().catch((error: unknown) => {
        console.warn(`${LOG} Моя неделя: кэш уведомлений не прочитался — без пятёрок: ${error instanceof Error ? error.message : String(error)}`); // guard-ok
        return [];
      });
      const name = await AsyncStorage.getItem('user_name').catch(() => null);
      if (cancelled) {
        console.log(`${LOG} Моя неделя: данные пришли после ухода с экрана — не показываем`); // guard-ok: ранний выход
        return;
      }
      const received = fivesThisWeek(rows, new Date());
      setRecord(rec);
      setShown(!(rec?.hidden ?? false));
      setFives(received);
      setMyName((name ?? '').trim());
      console.log(`${LOG} Моя неделя: запись=${rec ? `cur=${rec.cur?.week ?? '—'} prev=${rec.prev?.week ?? '—'}` : 'нет'} hidden=${String(rec?.hidden ?? false)} пятёрок=${received.length} ${Date.now() - startedAt}мс`); // guard-ok: одна строка на открытие
    })();
    return () => { cancelled = true; };
  }, [router]);

  // зачем (Optimistic UI): переключатель меняется сразу, запись — фоном; сбой — откат к прежнему и тост; повторный тап, пока пишем, — мимо
  const onToggle = useCallback((next: boolean) => {
    if (savingRef.current) {
      console.log(`${LOG} показ друзьям: тап мимо — прошлое сохранение ещё идёт`); // guard-ok: ранний выход называет причину
      return;
    }
    savingRef.current = true;
    const before = shown;
    setShown(next);
    void setMyFriendWeekHidden(!next)
      .then((saved) => {
        if (saved) {
          setRecord(saved);
          return;
        }
        console.warn(`${LOG} показ друзьям: не сохранилось → откат к ${String(before)}`); // guard-ok: сбой называет причину
        setShown(before);
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Не вышло с первого раза. Попробуй ещё',
          messageUk: 'Не вийшло з першого разу. Спробуй ще',
          messageEn: "Didn’t work the first time. Try again",
          messageEs: 'No salió a la primera. Inténtalo otra vez',
          messagePtBr: 'Não deu de primeira. Tente de novo',
          messageVi: 'Lần đầu chưa được. Thử lại nhé',
          messageId: 'Belum berhasil di percobaan pertama. Coba lagi',
          messageTr: 'İlk seferde olmadı. Tekrar dene',
          messagePl: 'Nie wyszło za pierwszym razem. Spróbuj jeszcze',
        });
      })
      .finally(() => { savingRef.current = false; });
  }, [shown]);

  const fiveLine = gaveFiveLine(l, fives.slice(0, 2).map((five) => five.name || '—'));
  const fiveWhen = bothFivesToday(fives, new Date()) ? gaveFiveWhen(l, clockLabel(l, fives[0]!.atMs), clockLabel(l, fives[1]!.atMs)) : null;
  const pairs = getFriendsTogetherSnapshot()?.pairs ?? {};
  const streak = week?.streak ?? 0;
  const lessons = week?.lessons ?? 0;

  return (
    <ScreenGradient>
      <SafeAreaView style={styles.flex}>
        <ContentWrap>
          <ScreenOriginBelowSafeTop>
            <ScreenBackButton screen="friends_week_mine" testID="my-week-back" accessibilityLabel={backLabel} onPress={() => safeRouterBack(router, '/(tabs)/settings' as never)} />
          </ScreenOriginBelowSafeTop>
          {/* зачем (замок владельца 22.10 «назад не пересекается»): полоса под кнопкой «назад» — вне прокрутки, контент начинается ниже */}
          <ScreenBackZone />
          <ScrollView decelerationRate="fast" contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <FlowText testID="my-week-title" provenance="authored" accessibilityRole="header" style={{ color: glass.text, fontSize: 25 * textScale, lineHeight: 31 * textScale, fontWeight: '700' }}>
              {weekCopy(l, 'myWeek')}
            </FlowText>
            <FlowText testID="my-week-sub" provenance="authored" style={{ marginTop: 4, color: glass.secondary, fontSize: 16 * textScale, lineHeight: 22 * textScale }}>
              {weekCopy(l, 'myWeekSub')}
            </FlowText>

            <View testID="my-week-card" style={[styles.card, { backgroundColor: glass.opaqueCard, boxShadow: plateBoxShadow(glass) }]}>
              <View style={styles.row}>
                <FriendsCoin coinRank={myCoinRank} name={myName || '—'} size={48} glass={glass} />
                <View style={styles.rowText}>
                  <FlowText testID="my-week-name" provenance="user" style={{ color: glass.text, fontSize: 19 * textScale, lineHeight: 24 * textScale, fontWeight: '700' }}>{myName || '—'}</FlowText>
                  <FlowText testID="my-week-range" provenance="authored" style={{ color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }}>{weekRangeLabel(l, lastWeek)}</FlowText>{/* guard-ok: даты недели под именем — макет #week (исключение 2.0) */}
                </View>
              </View>
              <View style={styles.facts}>
                <Fact id="streak" glass={glass} textScale={textScale} value={String(streak)} label={factStreakDays(l, streak)} />
                <Fact id="lessons" glass={glass} textScale={textScale} value={String(lessons)} label={factLessons(l, lessons)} />
                <Fact id="floor" glass={glass} textScale={textScale} value={week?.floor != null ? String(week.floor) : '—'} rise={week?.rise ?? null} label={weekCopy(l, 'factPeakFloor')} />
              </View>
            </View>

            {fiveLine ? (
              <View testID="my-week-fives" style={[styles.card, styles.row, { backgroundColor: glass.opaqueCard, boxShadow: plateBoxShadow(glass) }]}>
                <View style={styles.pair}>
                  {fives.slice(0, 2).map((five, i) => (
                    <View key={five.uid} style={i > 0 ? styles.pairSecond : null}>
                      <FriendsCoin coinRank={pairs[five.uid]?.coinRank ?? null} name={five.name || '—'} size={32} glass={glass} plus={pairs[five.uid]?.isPlus === true} />
                    </View>
                  ))}
                </View>
                <View style={styles.rowText}>
                  <FlowText testID="my-week-fives-line" provenance="user" style={{ color: glass.text, fontSize: 16 * textScale, lineHeight: 21 * textScale, fontWeight: '700' }}>{fiveLine}</FlowText>
                  {fiveWhen ? <FlowText testID="my-week-fives-when" provenance="authored" style={{ color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }}>{fiveWhen}</FlowText> : null}{/* guard-ok: время пятёрок — макет #week (исключение 2.0) */}
                </View>
              </View>
            ) : null}

            <View style={[styles.card, styles.row, { backgroundColor: glass.opaqueCard, boxShadow: plateBoxShadow(glass) }]}>
              <View style={[styles.iconTile, { backgroundColor: glass.opaqueControl }]}>
                <Ionicons name="eye-outline" size={21} color={glass.text} accessible={false} />
              </View>
              <FlowText testID="my-week-show-label" provenance="authored" style={[styles.rowText, { color: glass.text, fontSize: 16 * textScale, lineHeight: 21 * textScale, fontWeight: '700' }]}>
                {weekCopy(l, 'showMyWeek')}
              </FlowText>
              <CustomSwitch testID="my-week-show-switch" accessibilityLabel={weekCopy(l, 'showMyWeek')} value={shown} onValueChange={onToggle} />
            </View>
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  center: { textAlign: 'center' },
  card: { marginTop: 12, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1, minWidth: 0 },
  facts: { flexDirection: 'row', gap: 10, marginTop: 14 },
  fact: { flex: 1, minWidth: 0, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 6 },
  pair: { flexDirection: 'row', alignItems: 'center' },
  pairSecond: { marginLeft: -10 },
  iconTile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
