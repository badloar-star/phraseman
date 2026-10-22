/**
 * Визитка друга: какие из трёх чисел показать (дни серии · этаж Пика · дней вдвоём) — идея 1.
 *
 * зачем (макет docs/design/v2-app/friends-full.html «Визитка», `.vstat`): чисел без данных не выдумываем — такой ячейки нет;
 * нет ни одного — блока нет. Чистая функция, чтобы проверять без отрисовки.
 */
import type { Lang } from '../../constants/i18n';
import { pairCardStatLabels } from './pair_copy';

export type FriendCardStatsData = Readonly<{
  /** Личная серия друга (дней подряд). */
  streak: number | null;
  /** Лучший этаж Пика за эту неделю. */
  spireFloor: number | null;
  /** Дней вместе (общих дней занятий). */
  daysTogether: number | null;
}>;

export type FriendCardCell = Readonly<{ key: 'streak' | 'spire' | 'together'; value: number; label: string }>;

const isCount = (n: number | null): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

export function friendCardCells(stats: FriendCardStatsData, lang: Lang): readonly FriendCardCell[] {
  const labels = pairCardStatLabels(lang, stats.streak ?? 0, stats.daysTogether ?? 0);
  const cells: FriendCardCell[] = [];
  if (isCount(stats.streak)) cells.push({ key: 'streak', value: stats.streak, label: labels.streak });
  if (isCount(stats.spireFloor)) cells.push({ key: 'spire', value: stats.spireFloor, label: labels.spire });
  if (isCount(stats.daysTogether)) cells.push({ key: 'together', value: stats.daysTogether, label: labels.together });
  return cells;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
