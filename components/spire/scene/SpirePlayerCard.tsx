// ═══════════════════════════════════════════════════════════════════════════
// SpirePlayerCard.tsx — карточка игрока по тапу на «Сцене» Пика (аватарка соперника на башне, призёр, своё место, своя метка).
//
// зачем (владелец 22.10: «КСТАТИ, НАДО, ЧТОБЫ АВАТАРКИ НАЖИМАЛИСЬ»; координатор: карточка, как в «Друзьях», без новых чтений): общая
// карточка игрока PlayerProfileModal — та же, что в «Друзьях» и на Главной. Модуль грузится лениво, при первом тапе (не утяжеляет вход
// на Пик); данные строки — из кэша комнаты недели, визитка — из кэша самой карточки (память → диск → сеть по сроку).
// ═══════════════════════════════════════════════════════════════════════════
import React, { Suspense, lazy, useEffect, useState } from 'react';

import type { PlayerInfo } from '../../PlayerProfileModal';

const PlayerProfileModal = lazy(() => import('../../PlayerProfileModal'));

type Props = Readonly<{ player: PlayerInfo | null; myName: string; onClose: () => void }>;

export default function SpirePlayerCard({ player, myName, onClose }: Props) {
  // зачем: модуль карточки монтируется после первого открытия и остаётся — повторный тап открывает мгновенно, без новой загрузки
  const [mounted, setMounted] = useState(player !== null);
  useEffect(() => {
    if (player !== null) setMounted(true);
  }, [player]);
  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <PlayerProfileModal player={player} myInfo={{ name: myName, avatar: '', frame: '' }} onClose={onClose} />
    </Suspense>
  );
}
