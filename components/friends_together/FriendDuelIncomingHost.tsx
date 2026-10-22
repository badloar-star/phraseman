/**
 * «Дуэль на 5 фраз» (идея 3) — вызов у друга поверх вкладки «Друзья»: шторка «Принять / Отказаться» и что после неё.
 *
 * зачем (макет docs/design/v2-app/friends-full.html, идея 3 «Вызов у Ирины»): щит в строке → эта шторка. «Принять» — после
 * закрытия шторки экран хода в ответ (те же 5 фраз из строки вызова; строка гаснет, когда ход сыгран). «Отказаться» — маркер
 * гаснет сразу (Optimistic UI), отказ уходит фоном одним запросом; не дошёл — дуэль закроется по сроку на сервере.
 * Свои монета и Plus — здесь, чтобы большая вкладка не подписывалась на них ради одной шторки.
 */
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';

import FriendDuelIncomingSheet from './FriendDuelIncomingSheet';
import { useIsPlus } from '../plus/use_is_plus';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import type { FriendSocialEvent } from '../../app/friend_social_events';
import { maskUid } from '../../app/diagnostic_mask';
import { submitDuelDecline } from '../../app/friends_together/duel_client';
import { duelAnswerParams, duelHoursLeft, type DuelFriendView } from '../../app/friends_together/duel_routes';

export type DuelIncoming = Readonly<{ event: FriendSocialEvent; friend: DuelFriendView }>;

type Props = Readonly<{
  incoming: DuelIncoming | null;
  myName: string;
  /** Погасить маркер и строку уведомления (тот же путь, что у других событий друзей). */
  onAcknowledge: (event: FriendSocialEvent) => void;
  /** Шторка закрыта до конца — вкладка снимает «окно открыто». */
  onDone: () => void;
}>;

const LOG = '[FRIENDS-DUEL]';

function FriendDuelIncomingHost({ incoming, myName, onAcknowledge, onDone }: Props) {
  const router = useRouter();
  const myCoinRank = useMyCoinRank();
  const myIsPlus = useIsPlus();
  const [visible, setVisible] = useState(false);
  const afterRef = useRef<'accept' | 'decline' | null>(null);

  useEffect(() => {
    if (!incoming) return;
    afterRef.current = null;
    setVisible(true);
    console.log(`${LOG} incoming:open друг=${maskUid(incoming.friend.uid)} дуэль=${incoming.event.duel ? maskUid(incoming.event.duel.duelId) : '—'}`); // guard-ok: одна строка на открытие
  }, [incoming]);

  const onAccept = useCallback(() => { afterRef.current = 'accept'; }, []);
  const onDecline = useCallback(() => { afterRef.current = 'decline'; }, []);
  const onClose = useCallback(() => setVisible(false), []);

  const onDismissed = useCallback(() => {
    const after = afterRef.current;
    afterRef.current = null;
    setVisible(false);
    onDone();
    if (!incoming || !after) return;
    const duel = incoming.event.duel;
    if (!duel) {
      console.warn(`${LOG} incoming:${after} skip reason=в событии нет дуэли`); // guard-ok: ранний выход называет причину
      return;
    }
    if (after === 'decline') {
      onAcknowledge(incoming.event);
      void submitDuelDecline(duel.duelId);
      return;
    }
    console.log(`${LOG} incoming:accept друг=${maskUid(incoming.friend.uid)} → экран хода`); // guard-ok: одна строка на принятие
    router.push({ pathname: '/friends_duel', params: duelAnswerParams(incoming.friend, duel, myName, incoming.event.notificationId ?? null) } as never);
  }, [incoming, myName, onAcknowledge, onDone, router]);

  if (!incoming) return null;
  return (
    <FriendDuelIncomingSheet
      visible={visible}
      me={{ name: myName, coinRank: myCoinRank, isPlus: myIsPlus }}
      friend={{ name: incoming.friend.name, coinRank: incoming.friend.coinRank, isPlus: incoming.friend.isPlus }}
      hoursLeft={duelHoursLeft(incoming.event.expiresAtMs, Date.now())}
      onAccept={onAccept}
      onDecline={onDecline}
      onClose={onClose}
      onDismissed={onDismissed}
    />
  );
}

export default memo(FriendDuelIncomingHost);
