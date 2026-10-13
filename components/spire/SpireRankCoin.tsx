// ═══════════════════════════════════════════════════════════════════════════
// SpireRankCoin.tsx — аватар участника Шпиля: монета ранга.
//
// зачем (владелец 13.10, «должно показывать аватары ников — монеты рангов»): вместо кружка
// с буквой (соперники у этажей, «кто на этаже», «Все участники», пьедестал) — та же монета,
// что в «Друзья на этой неделе» и в комментариях Карточек (AvatarView + coinRank).
// Ранг неизвестен (в документе комнаты его ещё нет) — базовая монета ранга 0, буква не
// показывается никогда. Мемо по (ранг, размер): строки списков не перерисовываются зря.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import AvatarView from '../AvatarView';

/** Ранг 0 — бесплатный старт (app/coin_rank_table_v1): монета «по умолчанию» для неизвестного ранга. */
export const SPIRE_BASE_COIN_RANK = 0;

type Props = Readonly<{
  /** Ранг монеты 0..19 или null/undefined = неизвестен. */
  rank?: number | null;
  size: number;
}>;

function SpireRankCoin({ rank, size }: Props) {
  return <AvatarView avatar="" coinRank={rank ?? SPIRE_BASE_COIN_RANK} size={size} />;
}

export default memo(SpireRankCoin);
