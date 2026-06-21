// Weekly Boons — локализованные тексты бонусов (8 языков, на «ты», с лёгким юмором
// — правило библии бренда). Заголовок + короткое описание + emoji для плашки.

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
      ru: 'Воскресенье прощения',
      uk: 'Неділя прощення',
      es: 'Domingo de indulto',
      'pt-BR': 'Domingo do perdão',
      vi: 'Chủ nhật khoan hồng',
      id: 'Minggu pengampunan',
      tr: 'Af Pazarı',
      pl: 'Niedziela wybaczenia',
    },
    subtitle: {
      ru: 'Серия под защитой — сегодня пропуск тебе с рук сойдёт.',
      uk: 'Серія під захистом — сьогодні пропуск зійде тобі з рук.',
      es: 'Tu racha está protegida: hoy un descanso no te cuesta nada.',
      'pt-BR': 'Sua sequência está protegida: hoje uma folga sai de graça.',
      vi: 'Chuỗi của bạn được bảo vệ — hôm nay nghỉ một hôm cũng không sao.',
      id: 'Streak-mu aman — hari ini bolos pun tak masalah.',
      tr: 'Serin korumada — bugün bir gün kaçırmak sorun değil.',
      pl: 'Twoja seria jest chroniona — dziś przerwa ujdzie ci na sucho.',
    },
  },
  mystery_monday: {
    emoji: '🎁',
    title: {
      ru: 'Загадочный понедельник',
      uk: 'Загадковий понеділок',
      es: 'Lunes misterioso',
      'pt-BR': 'Segunda misteriosa',
      vi: 'Thứ Hai bí ẩn',
      id: 'Senin misteri',
      tr: 'Gizemli Pazartesi',
      pl: 'Tajemniczy poniedziałek',
    },
    subtitle: {
      ru: 'Открой сундук недели — внутри что-то приятное.',
      uk: 'Відкрий скриню тижня — всередині щось приємне.',
      es: 'Abre el cofre de la semana: hay algo bueno dentro.',
      'pt-BR': 'Abra o baú da semana: tem algo bom lá dentro.',
      vi: 'Mở rương tuần — bên trong có điều bất ngờ.',
      id: 'Buka peti minggu ini — ada kejutan di dalam.',
      tr: 'Haftanın sandığını aç — içinde güzel bir şey var.',
      pl: 'Otwórz skrzynię tygodnia — w środku coś miłego.',
    },
  },
  turbo_regen: {
    emoji: '⚡',
    title: {
      ru: 'Турбо-энергия',
      uk: 'Турбо-енергія',
      es: 'Energía turbo',
      'pt-BR': 'Energia turbo',
      vi: 'Năng lượng tăng tốc',
      id: 'Energi turbo',
      tr: 'Turbo enerji',
      pl: 'Turbo-energia',
    },
    subtitle: {
      ru: 'Энергия восстанавливается вдвое быстрее — учись дольше.',
      uk: 'Енергія відновлюється вдвічі швидше — вчись довше.',
      es: 'La energía se recarga el doble de rápido: estudia más.',
      'pt-BR': 'A energia recarrega o dobro mais rápido: estude mais.',
      vi: 'Năng lượng hồi nhanh gấp đôi — học lâu hơn nào.',
      id: 'Energi pulih dua kali lebih cepat — belajar lebih lama.',
      tr: 'Enerji iki kat hızlı dolar — daha uzun çalış.',
      pl: 'Energia odnawia się dwa razy szybciej — ucz się dłużej.',
    },
  },
  energy_free_window: {
    emoji: '🔋',
    title: {
      ru: 'Окно без энергии',
      uk: 'Вікно без енергії',
      es: 'Ventana sin energía',
      'pt-BR': 'Janela sem energia',
      vi: 'Khung giờ miễn năng lượng',
      id: 'Jendela tanpa energi',
      tr: 'Enerjisiz pencere',
      pl: 'Okno bez energii',
    },
    subtitle: {
      ru: 'Вечером 19:00–22:00 уроки не тратят энергию. Налетай!',
      uk: 'Ввечері 19:00–22:00 уроки не витрачають енергію. Налітай!',
      es: 'Por la noche, de 19:00 a 22:00, las lecciones no gastan energía.',
      'pt-BR': 'À noite, das 19h às 22h, as lições não gastam energia.',
      vi: 'Tối 19:00–22:00 bài học không tốn năng lượng. Tranh thủ nhé!',
      id: 'Malam 19.00–22.00 pelajaran tak memakai energi. Gas!',
      tr: 'Akşam 19:00–22:00 dersler enerji harcamaz. Kapışın!',
      pl: 'Wieczorem 19:00–22:00 lekcje nie zużywają energii. Korzystaj!',
    },
  },
  double_xp: {
    emoji: '✖️2',
    title: {
      ru: 'Двойной четверг',
      uk: 'Подвійний четвер',
      es: 'Jueves doble',
      'pt-BR': 'Quinta dobrada',
      vi: 'Thứ Năm nhân đôi',
      id: 'Kamis ganda',
      tr: 'Çift Perşembe',
      pl: 'Podwójny czwartek',
    },
    subtitle: {
      ru: 'Весь опыт сегодня ×2 — лучший день рвануть вверх в лиге.',
      uk: 'Весь досвід сьогодні ×2 — найкращий день рвонути вгору в лізі.',
      es: 'Hoy toda la XP es ×2: el mejor día para subir en tu liga.',
      'pt-BR': 'Hoje toda a XP é ×2: o melhor dia pra subir na liga.',
      vi: 'Hôm nay toàn bộ XP ×2 — ngày tuyệt vời để leo hạng.',
      id: 'Hari ini semua XP ×2 — hari terbaik naik liga.',
      tr: 'Bugün tüm XP ×2 — ligde yükselmek için en iyi gün.',
      pl: 'Dziś całe XP ×2 — najlepszy dzień, by skoczyć w lidze.',
    },
  },
  flashcard_friday: {
    emoji: '🃏',
    title: {
      ru: 'Карточная пятница',
      uk: "Карткова п'ятниця",
      es: 'Viernes de tarjetas',
      'pt-BR': 'Sexta dos cartões',
      vi: 'Thứ Sáu thẻ từ',
      id: 'Jumat kartu',
      tr: 'Kart Cuması',
      pl: 'Fiszkowy piątek',
    },
    subtitle: {
      ru: 'Открыт пробный набор карточек на 48 часов — забирай.',
      uk: 'Відкрито пробний набір карток на 48 годин — забирай.',
      es: 'Tienes un set de tarjetas de prueba por 48 horas: aprovecha.',
      'pt-BR': 'Um conjunto de cartões liberado por 48 horas: aproveite.',
      vi: 'Bộ thẻ dùng thử mở trong 48 giờ — nhận ngay.',
      id: 'Set kartu coba terbuka 48 jam — ambil sekarang.',
      tr: '48 saatliğine deneme kart seti açık — kap kapabilirsen.',
      pl: 'Próbny zestaw fiszek na 48 godzin — bierz.',
    },
  },
  arena_saturday: {
    emoji: '🏟',
    title: {
      ru: 'Турнирная суббота',
      uk: 'Турнірна субота',
      es: 'Sábado de arena',
      'pt-BR': 'Sábado de arena',
      vi: 'Thứ Bảy đấu trường',
      id: 'Sabtu arena',
      tr: 'Arena Cumartesisi',
      pl: 'Turniejowa sobota',
    },
    subtitle: {
      ru: 'Лишние битвы в Арене сегодня — зови друзей и качай рейтинг.',
      uk: 'Додаткові битви в Арені сьогодні — клич друзів і качай рейтинг.',
      es: 'Hoy batallas extra en la Arena: llama a tus amigos y sube.',
      'pt-BR': 'Hoje batalhas extras na Arena: chame os amigos e suba.',
      vi: 'Hôm nay thêm trận ở Đấu trường — gọi bạn bè cùng leo hạng.',
      id: 'Hari ini pertandingan Arena ekstra — ajak teman, naikkan peringkat.',
      tr: 'Bugün Arena’da ekstra maçlar — arkadaşlarını çağır, puan topla.',
      pl: 'Dziś dodatkowe walki w Arenie — zwołaj znajomych i pnij się w górę.',
    },
  },
  speaking_saturday: {
    emoji: '🗣',
    title: {
      ru: 'Говорящая суббота',
      uk: 'Розмовна субота',
      es: 'Sábado de habla',
      'pt-BR': 'Sábado de fala',
      vi: 'Thứ Bảy luyện nói',
      id: 'Sabtu bicara',
      tr: 'Konuşma Cumartesisi',
      pl: 'Gadająca sobota',
    },
    subtitle: {
      ru: 'Произношение открыто для всех — самое время заговорить.',
      uk: 'Вимова відкрита для всіх — саме час заговорити.',
      es: 'La pronunciación está abierta para todos: hora de hablar.',
      'pt-BR': 'A pronúncia está liberada para todos: hora de falar.',
      vi: 'Phần luyện nói mở cho mọi người — đến lúc cất tiếng rồi.',
      id: 'Mode bicara terbuka untuk semua — saatnya ngomong.',
      tr: 'Telaffuz herkese açık — konuşma vakti geldi.',
      pl: 'Wymowa otwarta dla wszystkich — czas się odezwać.',
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
