// Две графы фактов для героического модала бонуса дня.
//
// зачем (владелец, 2026-09-21): в модале Супервоскресенья внизу стоит полоса
// «Множитель ×2 / Действует до 00:00 UTC» — она отвечает на два вопроса сразу:
// ЧТО мне дали и НА СКОЛЬКО. Владелец попросил такой же модал остальным бонусам,
// и с конкретикой, а не с общими словами. Поэтому у каждого бонуса свои две
// графы, а не одна универсальная «Действует».
//
// СРОК не выдумываем: он берётся из boon_active_status_copy.ts, который уже
// отвечает за честную длительность («до 22:00», «48 часов», «до конца дня»).
// Здесь — только короткая форма того же факта, чтобы влезть в колонку.

import { triLang, type Lang } from '../../constants/i18n';
import type { BoonId } from './boon_types';

export interface BoonFact {
  label: string;
  value: string;
}

export interface BoonFacts {
  /** Что именно даёт бонус. */
  effect: BoonFact;
  /** Сколько это длится. */
  duration: BoonFact;
}

/** Подпись графы «сколько длится» — короткая форма, без слова «Действует» внутри. */
function durationValue(boon: BoonId, lang: Lang): string {
  if (boon === 'energy_free_window') {
    return triLang(lang, {
      ru: 'С 19:00 до 22:00',
      uk: 'З 19:00 до 22:00',
      en: '19:00 to 22:00',
      es: 'De 19:00 a 22:00',
      'pt-BR': 'Das 19:00 às 22:00',
      vi: 'Từ 19:00 đến 22:00',
      id: 'Pukul 19.00–22.00',
      tr: '19.00 – 22.00 arası',
      pl: 'Od 19:00 do 22:00',
    });
  }
  if (boon === 'flashcard_friday') {
    return triLang(lang, {
      ru: '48 часов',
      uk: '48 годин',
      en: '48 hours',
      es: '48 horas',
      'pt-BR': '48 horas',
      vi: '48 giờ',
      id: '48 jam',
      tr: '48 saat',
      pl: '48 godzin',
    });
  }
  return triLang(lang, {
    ru: 'Весь день',
    uk: 'Увесь день',
    en: 'All day',
    es: 'Todo el día',
    'pt-BR': 'O dia todo',
    vi: 'Cả ngày',
    id: 'Seharian',
    tr: 'Gün boyu',
    pl: 'Cały dzień',
  });
}

function durationLabel(lang: Lang): string {
  return triLang(lang, {
    ru: 'Действует',
    uk: 'Діє',
    en: 'Active',
    es: 'Activo',
    'pt-BR': 'Ativo',
    vi: 'Hiệu lực',
    id: 'Aktif',
    tr: 'Geçerlilik',
    pl: 'Działa',
  });
}

function effectFact(boon: BoonId, lang: Lang): BoonFact {
  switch (boon) {
    case 'streak_saver':
      return {
        label: triLang(lang, {
          ru: 'Защита',
          uk: 'Захист',
          en: 'Protection',
          es: 'Protección',
          'pt-BR': 'Proteção',
          vi: 'Bảo vệ',
          id: 'Perlindungan',
          tr: 'Koruma',
          pl: 'Ochrona',
        }),
        value: triLang(lang, {
          ru: 'Серия не сгорит',
          uk: 'Серія не згорить',
          en: 'Streak is safe',
          es: 'La racha se mantiene',
          'pt-BR': 'A sequência fica segura',
          vi: 'Chuỗi được giữ',
          id: 'Streak tetap aman',
          tr: 'Seri korunur',
          pl: 'Seria się utrzyma',
        }),
      };
    case 'energy_free_window':
      return {
        label: triLang(lang, {
          ru: 'Заряд',
          uk: 'Заряд',
          en: 'Energy',
          es: 'Energía',
          'pt-BR': 'Energia',
          vi: 'Năng lượng',
          id: 'Energi',
          tr: 'Enerji',
          pl: 'Energia',
        }),
        value: triLang(lang, {
          ru: 'Не тратится',
          uk: 'Не витрачається',
          en: 'Costs nothing',
          es: 'No se gasta',
          'pt-BR': 'Não é gasta',
          vi: 'Không bị trừ',
          id: 'Tidak berkurang',
          tr: 'Harcanmaz',
          pl: 'Nie ubywa',
        }),
      };
    case 'turbo_regen':
      return {
        label: triLang(lang, {
          ru: 'Восстановление',
          uk: 'Відновлення',
          en: 'Recharge',
          es: 'Recarga',
          'pt-BR': 'Recarga',
          vi: 'Hồi phục',
          id: 'Pengisian',
          tr: 'Yenilenme',
          pl: 'Odnawianie',
        }),
        value: triLang(lang, {
          ru: 'Вдвое быстрее',
          uk: 'Удвічі швидше',
          en: 'Twice as fast',
          es: 'El doble de rápido',
          'pt-BR': 'Duas vezes mais rápido',
          vi: 'Nhanh gấp đôi',
          id: 'Dua kali lebih cepat',
          tr: 'İki kat hızlı',
          pl: 'Dwa razy szybciej',
        }),
      };
    case 'flashcard_friday':
      return {
        label: triLang(lang, {
          ru: 'Открыто',
          uk: 'Відкрито',
          en: 'Unlocked',
          es: 'Desbloqueado',
          'pt-BR': 'Liberado',
          vi: 'Đã mở',
          id: 'Terbuka',
          tr: 'Açıldı',
          pl: 'Odblokowane',
        }),
        value: triLang(lang, {
          ru: 'Набор фраз',
          uk: 'Набір фраз',
          en: 'A phrase set',
          es: 'Un set de frases',
          'pt-BR': 'Um conjunto de frases',
          vi: 'Một bộ cụm từ',
          id: 'Satu set frasa',
          tr: 'Bir ifade seti',
          pl: 'Zestaw zwrotów',
        }),
      };
    case 'speaking_saturday':
      return {
        label: triLang(lang, {
          ru: 'Открыто',
          uk: 'Відкрито',
          en: 'Unlocked',
          es: 'Desbloqueado',
          'pt-BR': 'Liberado',
          vi: 'Đã mở',
          id: 'Terbuka',
          tr: 'Açıldı',
          pl: 'Odblokowane',
        }),
        value: triLang(lang, {
          ru: 'Произношение',
          uk: 'Вимова',
          en: 'Pronunciation',
          es: 'Pronunciación',
          'pt-BR': 'Pronúncia',
          vi: 'Phát âm',
          id: 'Pelafalan',
          tr: 'Telaffuz',
          pl: 'Wymowa',
        }),
      };
    default:
      // зачем: у сундука и удвоения свои экраны, сюда они не приходят. Но молчать
      // нельзя — пустая графа выглядела бы как баг вёрстки, а не как «нет данных».
      return {
        label: triLang(lang, {
          ru: 'Бонус',
          uk: 'Бонус',
          en: 'Bonus',
          es: 'Bono',
          'pt-BR': 'Bônus',
          vi: 'Phần thưởng',
          id: 'Bonus',
          tr: 'Bonus',
          pl: 'Bonus',
        }),
        value: triLang(lang, {
          ru: 'Уже работает',
          uk: 'Уже працює',
          en: 'Already active',
          es: 'Ya está activo',
          'pt-BR': 'Já está ativo',
          vi: 'Đang hoạt động',
          id: 'Sudah aktif',
          tr: 'Şimdiden etkin',
          pl: 'Już działa',
        }),
      };
  }
}

export function getBoonFacts(boon: BoonId, lang: Lang): BoonFacts {
  return {
    effect: effectFact(boon, lang),
    duration: { label: durationLabel(lang), value: durationValue(boon, lang) },
  };
}
