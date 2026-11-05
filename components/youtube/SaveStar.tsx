// SaveStar.tsx — звезда «сохранить видео» с маленьким pop при заполнении (ТОП-20 №20 / F22, владелец 04.11 «все подтверждаю», координатор 05.11).
//
// зачем: звезда заполнялась молча. Теперь при переходе «не сохранено → сохранено» (а не при первом показе и не при снятии) значок получает пружину PopIn (scale 0.6 → 1);
// хаптик не дублируем — тап уже даёт лёгкий хаптик на самой кнопке. Reduce Motion уважается внутри PopIn. Раскладка не меняется: тот же Ionicons того же размера.
import React, { memo, useEffect, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PopIn } from '../DoneTick';

type Props = Readonly<{ saved: boolean; size?: number; activeColor: string; idleColor: string }>;

function SaveStarBase({ saved, size = 20, activeColor, idleColor }: Props) {
  const firstRun = useRef(true);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; } // первый показ уже сохранённого — без анимации
    if (saved) setPulse((value) => value + 1);
  }, [saved]);
  if (saved && pulse > 0) {
    return <PopIn key={pulse} haptic={false}><Ionicons name="star" size={size} color={activeColor} /></PopIn>;
  }
  return <Ionicons name={saved ? 'star' : 'star-outline'} size={size} color={saved ? activeColor : idleColor} />;
}

export const SaveStar = memo(SaveStarBase);
