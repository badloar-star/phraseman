/**
 * Окно вехи «Серия вдвоём» на вкладке «Друзья» (идея 1): решение (usePairMilestoneMoment) + шторка FriendPairMilestoneSheet.
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html «Прервалась и веха → 30 дней»): вкладка подключает одно
 * место. Своя монета и кольцо Plus читаются, только когда окно есть, — вкладка без вехи за них не платит.
 * «Дать пять» — тот же лайк профиля, что в строке и шторке друга: сердце меняется сразу, сеть догоняет, сбой — откат и тост.
 */
import React, { memo, useCallback, useEffect } from 'react';

import FriendPairMilestoneSheet from './FriendPairMilestoneSheet';
import { useIsPlus } from '../plus/use_is_plus';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import { usePairMilestoneMoment, type PairMilestoneMoment } from '../../hooks/use_pair_milestone_moment';
import type { FriendsTogetherSnapshot } from '../../app/friends_together/together_store';
import { maskUid } from '../../app/diagnostic_mask';

export interface FriendPairMilestoneHostProps {
  /** Вкладка на экране и «Вместе» включён. */
  active: boolean;
  snapshot: FriendsTogetherSnapshot | null;
  /** Открыто другое окно вкладки: веха ждёт его закрытия. */
  blocked: boolean;
  myName: string;
  highFivedUids: ReadonlySet<string>;
  onHighFive: (friendUid: string) => void;
  /** Окно на экране или уходит — вкладка не открывает поверх свои окна. */
  onOpenChange: (open: boolean) => void;
}

type SheetProps = Readonly<{
  moment: PairMilestoneMoment;
  visible: boolean;
  myName: string;
  highFived: boolean;
  onHighFive: () => void;
  onClose: () => void;
  onDismissed: () => void;
}>;

function MilestoneSheet({ moment, visible, myName, highFived, onHighFive, onClose, onDismissed }: SheetProps) {
  const myCoinRank = useMyCoinRank();
  const myIsPlus = useIsPlus();
  const { candidate } = moment;
  return (
    <FriendPairMilestoneSheet
      visible={visible}
      milestone={moment.milestone}
      friendName={candidate.name}
      friendCoinRank={candidate.coinRank}
      friendIsPlus={candidate.isPlus}
      myName={myName}
      myCoinRank={myCoinRank}
      myIsPlus={myIsPlus}
      highFived={highFived}
      onHighFive={onHighFive}
      onClose={onClose}
      onDismissed={onDismissed}
    />
  );
}

function FriendPairMilestoneHost({ active, snapshot, blocked, myName, highFivedUids, onHighFive, onOpenChange }: FriendPairMilestoneHostProps) {
  const { moment, visible, close, dismissed } = usePairMilestoneMoment({ active, snapshot, blocked });
  // зачем: «окно на вкладке» — только пока шторка на экране или уходит; ожидание слота в очереди не глушит тапы по списку
  const open = moment?.phase === 'open' || moment?.phase === 'closing';
  useEffect(() => { onOpenChange(open); }, [onOpenChange, open]);

  const friendUid = moment?.candidate.friendUid ?? null;
  const highFive = useCallback(() => {
    if (!friendUid) {
      console.log('[FRIENDS-1] milestone:high_five skip reason=no_moment'); // guard-ok: ранний выход называет причину
      return;
    }
    console.log(`[FRIENDS-1] milestone:high_five friend=${maskUid(friendUid)}`); // guard-ok: одна строка на тап
    onHighFive(friendUid);
  }, [friendUid, onHighFive]);

  if (!moment) return null;
  return (
    <MilestoneSheet
      moment={moment}
      visible={visible}
      myName={myName}
      highFived={highFivedUids.has(moment.candidate.friendUid)}
      onHighFive={highFive}
      onClose={close}
      onDismissed={dismissed}
    />
  );
}

export default memo(FriendPairMilestoneHost);
