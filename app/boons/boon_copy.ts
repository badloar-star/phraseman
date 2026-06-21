// Weekly Boons — локализованные тексты бонусов (8 языков).
//
// СТИЛЬ по Библии Phraseman: «ИГРА» (Game Voice) — язык наград и владения:
// «твоё», «открыто», «разблокировано», короткие строки, один эмодзи максимум
// (огонь/молния/звезда — не смайлики), на «ты», без пафоса и без loss-framing
// («защити серию», не «пропустишь»). Запрещённые слова Библии не используются
// (урок→раунд/сессия, ошибка→попытка, статистика→результаты, бесплатно→попробуй).

import { triLang, type Lang } from '../../constants/i18n';
import type { BoonId } from './boon_types';

export interface BoonCopy {
  emoji: string;
  title: string;
  subtitle: string;
}

type TriText = { ru: string; uk: string; es: string } & Partial<
  Record<'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', string>
>;

interface BoonCopySource {
  emoji: string;
  title: TriText;
  subtitle: TriText;
}

const BOON_COPY: Record<BoonId, BoonCopySource> = {
  streak_saver: {
    emoji: '🛡',
    title: {
      ru: 'Серия под щитом',
      uk: 'Серія під щитом',
      es: 'Racha protegida',
      'pt-BR': 'Sequência protegida',
      vi: 'Chuỗi được bảo vệ',
      id: 'Streak terlindungi',
      tr: 'Seri kalkan altında',
      pl: 'Seria pod tarczą',
    },
    subtitle: {
      ru: 'Сегодня твоя серия под защитой. Заходи спокойно.',
      uk: 'Сьогодні твоя серія під захистом. Заходь спокійно.',
      es: 'Hoy tu racha está a salvo. Entra tranquilo.',
      'pt-BR': 'Hoje sua sequência está segura. Entre tranquilo.',
      vi: 'Hôm nay chuỗi của bạn an toàn. Cứ thoải mái.',
      id: 'Hari ini streak-mu aman. Santai saja.',
      tr: 'Bugün serin güvende. Rahatça gir.',
      pl: 'Dziś twoja seria jest bezpieczna. Wejdź spokojnie.',
    },
  },
  mystery_monday: {
    emoji: '🎁',
    title: {
      ru: 'Сундук недели',
      uk: 'Скриня тижня',
      es: 'Cofre de la semana',
      'pt-BR': 'Baú da semana',
      vi: 'Rương của tuần',
      id: 'Peti minggu ini',
      tr: 'Haftanın sandığı',
      pl: 'Skrzynia tygodnia',
    },
    subtitle: {
      ru: 'Внутри награда. Открой и забери своё.',
      uk: 'Усередині нагорода. Відкрий і забери своє.',
      es: 'Dentro hay una recompensa. Ábrelo y es tuyo.',
      'pt-BR': 'Dentro tem recompensa. Abra e pegue o seu.',
      vi: 'Bên trong có phần thưởng. Mở ra và nhận đi.',
      id: 'Ada hadiah di dalam. Buka dan ambil milikmu.',
      tr: 'İçinde ödül var. Aç ve seninki olsun.',
      pl: 'W środku nagroda. Otwórz i bierz swoje.',
    },
  },
  turbo_regen: {
    emoji: '⚡',
    title: {
      ru: 'Заряд на максимум',
      uk: 'Заряд на максимум',
      es: 'Carga al máximo',
      'pt-BR': 'Carga no máximo',
      vi: 'Sạc tối đa',
      id: 'Isi penuh ekstra',
      tr: 'Tam şarj',
      pl: 'Ładowanie na maksa',
    },
    subtitle: {
      ru: 'Заряд возвращается вдвое быстрее. Жми дольше.',
      uk: 'Заряд повертається вдвічі швидше. Тисни довше.',
      es: 'La carga vuelve el doble de rápido. Dale más.',
      'pt-BR': 'A carga volta o dobro mais rápido. Vá mais longe.',
      vi: 'Năng lượng hồi gấp đôi. Chơi lâu hơn.',
      id: 'Daya pulih dua kali cepat. Lanjut lebih lama.',
      tr: 'Şarj iki kat hızlı döner. Daha çok devam et.',
      pl: 'Ładunek wraca dwa razy szybciej. Graj dłużej.',
    },
  },
  energy_free_window: {
    emoji: '🔋',
    title: {
      ru: 'Вечер без лимитов',
      uk: 'Вечір без лімітів',
      es: 'Noche sin límites',
      'pt-BR': 'Noite sem limites',
      vi: 'Tối không giới hạn',
      id: 'Malam tanpa batas',
      tr: 'Sınırsız akşam',
      pl: 'Wieczór bez limitów',
    },
    subtitle: {
      ru: 'С 19:00 до 22:00 заряд не тратится. Налетай.',
      uk: 'З 19:00 до 22:00 заряд не витрачається. Налітай.',
      es: 'De 19:00 a 22:00 no gastas carga. Aprovecha.',
      'pt-BR': 'Das 19h às 22h a carga não acaba. Aproveite.',
      vi: 'Từ 19:00 đến 22:00 không tốn năng lượng. Tận hưởng.',
      id: 'Pukul 19.00–22.00 daya tak terpakai. Gas.',
      tr: '19:00–22:00 arası şarj harcanmaz. Kapışın.',
      pl: 'Od 19:00 do 22:00 ładunek się nie zużywa. Korzystaj.',
    },
  },
  double_xp: {
    emoji: '✖️2',
    title: {
      ru: 'Двойной опыт',
      uk: 'Подвійний досвід',
      es: 'Experiencia doble',
      'pt-BR': 'Experiência dobrada',
      vi: 'Kinh nghiệm nhân đôi',
      id: 'XP ganda',
      tr: 'Çift tecrübe',
      pl: 'Podwójne XP',
    },
    subtitle: {
      ru: 'Весь опыт сегодня ×2. Лучший день рвануть в лиге.',
      uk: 'Весь досвід сьогодні ×2. Найкращий день рвонути в лізі.',
      es: 'Hoy toda la XP es ×2. El día para subir en tu liga.',
      'pt-BR': 'Hoje toda XP é ×2. O dia pra subir na liga.',
      vi: 'Hôm nay XP ×2. Ngày tuyệt để leo hạng.',
      id: 'Hari ini semua XP ×2. Hari terbaik naik liga.',
      tr: 'Bugün tüm XP ×2. Ligde yükselme günü.',
      pl: 'Dziś całe XP ×2. Dzień, by skoczyć w lidze.',
    },
  },
  flashcard_friday: {
    emoji: '🃏',
    title: {
      ru: 'Колода в подарок',
      uk: 'Колода в подарунок',
      es: 'Mazo de regalo',
      'pt-BR': 'Baralho de presente',
      vi: 'Bộ thẻ tặng bạn',
      id: 'Dek hadiah',
      tr: 'Hediye deste',
      pl: 'Talia w prezencie',
    },
    subtitle: {
      ru: 'Набор фраз открыт на 48 часов. Забирай.',
      uk: 'Набір фраз відкрито на 48 годин. Забирай.',
      es: 'Un set de frases abierto 48 horas. Es tuyo.',
      'pt-BR': 'Um conjunto de frases aberto por 48 horas. Pegue.',
      vi: 'Bộ cụm từ mở trong 48 giờ. Nhận ngay.',
      id: 'Set frasa terbuka 48 jam. Ambil.',
      tr: '48 saatliğine ifade seti açık. Kap.',
      pl: 'Zestaw fraz otwarty na 48 godzin. Bierz.',
    },
  },
  arena_saturday: {
    emoji: '🔥',
    title: {
      ru: 'Бой за рейтинг',
      uk: 'Бій за рейтинг',
      es: 'Combate por el ranking',
      'pt-BR': 'Batalha por ranking',
      vi: 'Đấu giành hạng',
      id: 'Duel peringkat',
      tr: 'Sıralama savaşı',
      pl: 'Walka o ranking',
    },
    subtitle: {
      ru: 'Лишние бои на Арене сегодня. Зови друзей.',
      uk: 'Додаткові бої на Арені сьогодні. Клич друзів.',
      es: 'Hoy más batallas en la Arena. Llama a tus amigos.',
      'pt-BR': 'Hoje mais batalhas na Arena. Chame os amigos.',
      vi: 'Hôm nay thêm trận ở Đấu trường. Gọi bạn bè.',
      id: 'Hari ini lebih banyak duel Arena. Ajak teman.',
      tr: 'Bugün Arena’da ekstra maçlar. Arkadaşlarını çağır.',
      pl: 'Dziś więcej walk w Arenie. Zwołaj znajomych.',
    },
  },
  speaking_saturday: {
    emoji: '🗣',
    title: {
      ru: 'День голоса',
      uk: 'День голосу',
      es: 'Día de la voz',
      'pt-BR': 'Dia da voz',
      vi: 'Ngày luyện nói',
      id: 'Hari bicara',
      tr: 'Konuşma günü',
      pl: 'Dzień głosu',
    },
    subtitle: {
      ru: 'Произношение открыто для всех. Пора заговорить.',
      uk: 'Вимова відкрита для всіх. Час заговорити.',
      es: 'La pronunciación está abierta para todos. A hablar.',
      'pt-BR': 'A pronúncia está aberta para todos. Hora de falar.',
      vi: 'Phần luyện nói mở cho mọi người. Cất tiếng nào.',
      id: 'Mode bicara terbuka untuk semua. Saatnya ngomong.',
      tr: 'Telaffuz herkese açık. Konuşma zamanı.',
      pl: 'Wymowa otwarta dla wszystkich. Czas mówić.',
    },
  },
};

/** Локализованный текст бонуса для текущего языка интерфейса. */
export function getBoonCopy(id: BoonId, lang: Lang): BoonCopy {
  const src = BOON_COPY[id];
  // triLang всегда падает на src.*.ru (обязательная строка), но из-за опциональных
  // ключей TS виден тип string|undefined — страхуемся явным fallback на ru.
  return {
    emoji: src.emoji,
    title: triLang(lang, src.title) ?? src.title.ru,
    subtitle: triLang(lang, src.subtitle) ?? src.subtitle.ru,
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
