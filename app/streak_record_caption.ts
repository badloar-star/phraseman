// Подпись под числом серии в Статистике (раунд 2, Статистика п.1, одобрено владельцем 05.11):
// пока рекорд не побит — «до рекорда N дней»; в день побития/равенства — «Рекорд!». Чистая функция: сторож tests/streak_record_caption_2026_11_05.test.ts.
import { triLang, type Lang } from '../constants/i18n';

/** null — подписи нет (серия 0 или рекорда ещё нет): остаётся прежний текст «дней подряд · лучший N». */
export function streakRecordCaption(lang: Lang, totalStreak: number, bestStreak: number): string | null {
  if (!Number.isFinite(totalStreak) || !Number.isFinite(bestStreak) || totalStreak <= 0 || bestStreak <= 0) return null;
  if (totalStreak >= bestStreak) {
    return triLang(lang, { ru: 'Рекорд!', uk: 'Рекорд!', en: 'Record!', es: '¡Récord!', 'pt-BR': 'Recorde!', vi: 'Kỷ lục!', id: 'Rekor!', tr: 'Rekor!', pl: 'Rekord!' });
  }
  const n = bestStreak - totalStreak;
  return triLang(lang, {
    ru: `до рекорда ${n} ${dayRu(n)}`,
    uk: `до рекорду ${n} ${dayUk(n)}`,
    en: `${n} ${n === 1 ? 'day' : 'days'} to the record`,
    es: `${n} ${n === 1 ? 'día' : 'días'} para el récord`,
    'pt-BR': `${n} ${n === 1 ? 'dia' : 'dias'} para o recorde`,
    vi: `còn ${n} ngày đến kỷ lục`,
    id: `${n} hari lagi menuju rekor`,
    tr: `rekora ${n} gün`,
    pl: `do rekordu ${n} ${n === 1 ? 'dzień' : 'dni'}`,
  });
}

function dayRu(n: number): string {
  const m10 = n % 10; const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'день';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'дня';
  return 'дней';
}

function dayUk(n: number): string {
  const m10 = n % 10; const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'день';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'дні';
  return 'днів';
}
