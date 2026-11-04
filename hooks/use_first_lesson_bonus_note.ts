/**
 * Строка-подтверждение бонуса для окна результата занятия: появляется, когда бонус выдан (в том числе чуть позже открытия экрана).
 * зачем (владелец 30.10): «видимое подтверждение в окне результата, коротко». Лог: [RANK-GATE] first_lesson_bonus note.
 */
import { useEffect, useState } from 'react';
import type { Lang } from '../constants/i18n';
import { firstLessonBonusText } from '../app/first_lesson_bonus_copy';
import { peekFirstLessonBonusRecentCoins, subscribeFirstLessonBonus } from '../app/first_lesson_bonus';

export function useFirstLessonBonusNote(lang: Lang): string | undefined {
  const [coins, setCoins] = useState<number | null>(() => peekFirstLessonBonusRecentCoins());
  useEffect(() => subscribeFirstLessonBonus((granted) => setCoins(granted)), []);
  return coins ? firstLessonBonusText(lang, coins) : undefined;
}
