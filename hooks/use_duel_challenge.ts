/**
 * «Дуэль на 5 фраз» (идея 3) — вызов из вкладки «Друзья»: подготовка, шторка вызова и переход на экран хода.
 *
 * зачем (макет docs/design/v2-app/friends-full.html #hub «Шторка друга» → идея 3 «Вызов»): плитка «Дуэль» в шторке друга →
 * шторка друга закрывается → шторка вызова. Всё, что решает её вид (один ли язык, хватает ли фраз, лимит, идущая дуэль),
 * считается СРАЗУ по тапу, пока закрывается шторка друга — шторка вызова открывается уже в верном состоянии, без мигания
 * «Пока мало пройденных фраз» → «Начать дуэль». «Начать дуэль» → шторка закрывается → экран /friends_duel (окна не наслаиваются).
 * Сети нет: фразы из курса на телефоне, лимит — из своих вызовов на телефоне.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';

import { useIsPlus } from '../components/plus/use_is_plus';
import { useMyCoinRank } from './use_my_coin_rank';
import type { FriendDuelChallengeSheetProps } from '../components/friends_together/FriendDuelChallengeSheet';
import type { Lang } from '../constants/i18n';
import { getLocalDayKey } from '../app/local_date';
import { maskUid } from '../app/diagnostic_mask';
import { DUEL_PHRASES } from '../app/friends_together/duel_core';
import { duelSameLanguage } from '../app/friends_together/duel_eligibility';
import { duelLaunchParams } from '../app/friends_together/duel_launch';
import { duelOpenWithFriend, duelSentToday, readSentDuels } from '../app/friends_together/duel_ledger';
import { pickMyDuelPhrases } from '../app/friends_together/duel_phrase_source';
import type { DuelPhrase } from '../app/friends_together/duel_phrases';

export type DuelChallengeFriend = Readonly<{ uid: string; name: string; coinRank: number | null; isPlus: boolean; studyLanguages: readonly string[] | null }>;

type Prepared = Readonly<{
  friend: DuelChallengeFriend;
  phrases: readonly DuelPhrase[];
  sameLanguage: boolean;
  sentToday: number;
  openWithFriend: boolean;
}>;

const LOG = '[FRIENDS-DUEL]';

async function prepareChallenge(friend: DuelChallengeFriend, studyTarget: string, lang: Lang): Promise<Prepared> {
  const startedAt = Date.now();
  const sameLanguage = duelSameLanguage(studyTarget, friend.studyLanguages);
  // зачем: разные языки — фразы не нужны вовсе (шторка покажет «Дуэль — когда учите один язык»), курс не трогаем
  const seed = Math.floor(Math.random() * 0xffffffff) >>> 0;
  const [phrases, sent] = await Promise.all([
    sameLanguage ? pickMyDuelPhrases({ studyTarget, lang, seed }) : Promise.resolve([] as readonly DuelPhrase[]),
    readSentDuels(),
  ]);
  const now = Date.now();
  const prepared: Prepared = {
    friend,
    phrases,
    sameLanguage,
    sentToday: duelSentToday(sent, getLocalDayKey()),
    openWithFriend: duelOpenWithFriend(sent, friend.uid, now),
  };
  console.log(`${LOG} challenge:prepared друг=${maskUid(friend.uid)} язык=${sameLanguage ? 'общий' : 'разный'} фраз=${phrases.length} сегодня=${prepared.sentToday} идёт=${prepared.openWithFriend} ms=${now - startedAt}`); // guard-ok: одна строка на подготовку вызова
  return prepared;
}

export function useDuelChallenge(input: Readonly<{
  studyTarget: string;
  lang: Lang;
  myName: string;
  /** «Позвать на занятие» из шторки вызова (разные языки или мало фраз) — тот же зов, что «Позвать» в шторке друга. */
  onInviteToLesson: (friendUid: string, friendName: string) => void;
}>) {
  const router = useRouter();
  const myCoinRank = useMyCoinRank();
  const myIsPlus = useIsPlus();
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [visible, setVisible] = useState(false);
  const pendingRef = useRef<Readonly<{ id: number; task: Promise<Prepared> }> | null>(null);
  const requestIdRef = useRef(0);
  const afterCloseRef = useRef<'start' | 'invite' | null>(null);
  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; }, []);

  const { studyTarget, lang, myName, onInviteToLesson } = input;

  /** Тап по плитке «Дуэль»: считаем всё сразу, пока шторка друга закрывается. Новый тап отменяет старую подготовку. */
  const prepare = useCallback((friend: DuelChallengeFriend) => {
    requestIdRef.current += 1;
    const id = requestIdRef.current;
    const task = prepareChallenge(friend, studyTarget, lang).catch((error: unknown): Prepared => {
      console.warn(`${LOG} challenge:prepare failed (${error instanceof Error ? error.message : String(error)}) → шторка без фраз`); // guard-ok: catch называет причину
      return { friend, phrases: [], sameLanguage: duelSameLanguage(studyTarget, friend.studyLanguages), sentToday: 0, openWithFriend: false };
    });
    pendingRef.current = { id, task };
  }, [lang, studyTarget]);

  /** Шторка друга закрылась — показываем шторку вызова, как только подготовка готова (обычно уже). */
  const show = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) {
      console.log(`${LOG} challenge:show skip reason=не было подготовки`); // guard-ok: ранний выход называет причину
      return;
    }
    void pending.task.then((next) => {
      if (!aliveRef.current || pending.id !== requestIdRef.current) {
        console.log(`${LOG} challenge:show skip reason=${aliveRef.current ? 'есть новее' : 'вкладка закрыта'}`); // guard-ok: ранний выход называет причину
        return;
      }
      pendingRef.current = null;
      afterCloseRef.current = null;
      setPrepared(next);
      setVisible(true);
    });
  }, []);

  const onClose = useCallback(() => setVisible(false), []);
  const onStart = useCallback(() => { afterCloseRef.current = 'start'; }, []);
  const onInvite = useCallback(() => { afterCloseRef.current = 'invite'; }, []);

  /** Шторка вызова закрыта до конца: только теперь — экран дуэли или зов на занятие. */
  const onDismissed = useCallback(() => {
    const done = prepared;
    const after = afterCloseRef.current;
    afterCloseRef.current = null;
    setPrepared(null);
    setVisible(false);
    if (!done || !after) return;
    if (after === 'invite') {
      onInviteToLesson(done.friend.uid, done.friend.name);
      return;
    }
    if (done.phrases.length !== DUEL_PHRASES) {
      console.warn(`${LOG} challenge:start skip reason=фраз ${done.phrases.length} из ${DUEL_PHRASES}`); // guard-ok: ранний выход называет причину
      return;
    }
    const params = duelLaunchParams({
      mode: 'challenge',
      friendUid: done.friend.uid,
      friendName: done.friend.name,
      friendCoinRank: done.friend.coinRank,
      friendIsPlus: done.friend.isPlus,
      phraseIds: done.phrases.map((p) => p.id),
      duelId: null,
      myName,
    });
    console.log(`${LOG} challenge:start друг=${maskUid(done.friend.uid)} → экран дуэли`); // guard-ok: одна строка на старт
    router.push({ pathname: '/friends_duel', params } as never);
  }, [myName, onInviteToLesson, prepared, router]);

  const sheet: FriendDuelChallengeSheetProps | null = prepared ? {
    visible,
    me: { name: myName, coinRank: myCoinRank, isPlus: myIsPlus },
    friend: { name: prepared.friend.name, coinRank: prepared.friend.coinRank, isPlus: prepared.friend.isPlus },
    sameLanguage: prepared.sameLanguage,
    enoughPhrases: prepared.phrases.length === DUEL_PHRASES,
    sentToday: prepared.sentToday,
    openWithFriend: prepared.openWithFriend,
    onStart,
    onInviteToLesson: onInvite,
    onClose,
    onDismissed,
  } : null;

  // open — пока шторка на экране или ещё закрывается: другие окна вкладки ждут
  return { prepare, show, open: prepared !== null, sheet };
}
