// ═══════════════════════════════════════════════════════════════════════════
// SpireRankCoin.tsx — аватар участника Шпиля: монета ранга.
//
// зачем (владелец 13.10, «должно показывать аватары ников — монеты рангов»): вместо кружка
// с буквой (соперники у этажей, «кто на этаже», «Все участники», пьедестал) — та же монета,
// что в «Друзья на этой неделе» и в комментариях Карточек (AvatarView + coinRank).
// Ранг неизвестен (в документе комнаты его ещё нет) — базовая монета ранга 0, буква не
// показывается никогда. Мемо по (ранг, размер): строки списков не перерисовываются зря.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useState } from 'react';
import { View } from 'react-native';
import AvatarView from '../AvatarView';
import { useSpirePalette } from './useSpirePalette';

/** Ранг 0 — бесплатный старт (app/coin_rank_table_v1): монета «по умолчанию» для неизвестного ранга. */
export const SPIRE_BASE_COIN_RANK = 0;

type Props = Readonly<{
  /** Ранг монеты 0..19 или null/undefined = неизвестен. */
  rank?: number | null;
  size: number;
}>;

function SpireRankCoin({ rank, size }: Props) {
  // зачем (Макеты df9ecf2c3: монеты над подиумом и в списках пустые до ~9 с после данных): пока картинка не отрисована — круг тона скелета
  // того же размера (как у скелета подиума), место не «пустое» и ничего не прыгает; после onLoad подложка прозрачная (нет ореола по краю монеты).
  const p = useSpirePalette();
  const [loaded, setLoaded] = useState(false);
  const onCoinLoad = useCallback(() => setLoaded(true), []);
  // зачем (№28, доступность 13.10): монета — картинка без смысла для TalkBack; имя, место и ступени читает подпись строки/колонки-родителя (
  // подиум, «Все участники», «кто на этаже»). Скрываем потомков, чтобы читалка не пыталась озвучить безымянную картинку; размер обёртки = размеру монеты.
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: loaded ? 'transparent' : p.card }}>
      <AvatarView avatar="" coinRank={rank ?? SPIRE_BASE_COIN_RANK} size={size} onCoinLoad={onCoinLoad} loadTrace="[PIK-IMG]" />
    </View>
  );
}

export default memo(SpireRankCoin);
