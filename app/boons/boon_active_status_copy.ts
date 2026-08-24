import { triLang, type Lang } from '../../constants/i18n';
import type { BoonId } from './boon_types';

type ActiveStatusKind = 'energy_window' | 'flashcard_trial' | 'day';

const statusKindForBoon = (boon: BoonId): ActiveStatusKind => {
  if (boon === 'energy_free_window') return 'energy_window';
  if (boon === 'flashcard_friday') return 'flashcard_trial';
  return 'day';
};

/** Truthful display duration for the informational daily-boon sheet. */
export function getBoonActiveStatusText(boon: BoonId, lang: Lang): string {
  const kind = statusKindForBoon(boon);
  if (kind === 'energy_window') {
    return triLang(lang, {
      ru: 'Действует до 22:00',
      uk: 'Діє до 22:00',
      es: 'Activo hasta las 22:00',
      'pt-BR': 'Ativo até às 22:00',
      vi: 'Có hiệu lực đến 22:00',
      id: 'Aktif hingga pukul 22.00',
      tr: 'Saat 22.00’ye kadar etkin',
      pl: 'Aktywny do 22:00',
    });
  }
  if (kind === 'flashcard_trial') {
    return triLang(lang, {
      ru: 'Действует 48 часов',
      uk: 'Діє 48 годин',
      es: 'Activo durante 48 horas',
      'pt-BR': 'Ativo por 48 horas',
      vi: 'Có hiệu lực trong 48 giờ',
      id: 'Aktif selama 48 jam',
      tr: '48 saat boyunca etkin',
      pl: 'Aktywny przez 48 godzin',
    });
  }
  return triLang(lang, {
    ru: 'Действует до конца дня',
    uk: 'Діє до кінця дня',
    es: 'Activo hasta el final del día',
    'pt-BR': 'Ativo até o fim do dia',
    vi: 'Có hiệu lực đến hết hôm nay',
    id: 'Aktif hingga akhir hari',
    tr: 'Gün sonuna kadar etkin',
    pl: 'Aktywny do końca dnia',
  });
}
