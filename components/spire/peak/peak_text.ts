// peak_text — чистые (без React Native) помощники каркаса Пика: строка рекорда и размер тап-цели.
// зачем (координатор 04.11): отдельный файл, чтобы тесты проверяли их без движка RN; компоненты каркаса импортируют отсюда.
import type { Lang } from '../../../constants/i18n';
import { spireGameText } from '../spire_game_strings';
import { formatPeakTime, type PeakStepRecord } from '../../../modules/spire/peak_model';

/** Минимальная тап-цель (dp) стрелок «этаж ниже/выше». */
export const PEAK_TAP_TARGET = 44;

/** Сколько ступеней на этаже: до 5-го этажа floor+4, дальше 10 (схема адресов рекордов этаж:ступень). */
export function peakMaxStep(floor: number): number {
  return floor <= 5 ? floor + 4 : 10;
}

/** Текст рекорда: «Рекорд: имя — мм:сс.сс» или «—», если данных нет (в приложении никаких «нужны данные»). */
export function peakRecordLine(lang: Lang, record: PeakStepRecord | null): string {
  const time = record ? formatPeakTime(record.durationMs) : null;
  if (!record || time === null) return '—';
  return spireGameText(lang, 'peakRecordBy', { name: record.name?.trim() || '—', time });
}
