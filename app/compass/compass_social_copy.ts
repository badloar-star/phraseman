/**
 * Компас — тексты соц-сводки «Кстати…».
 *
 * Маленький блок-контейнер в брифинге Компаса: «Кстати, username принял твою
 * заявку в друзья» / «…кинул заявку» / «…поставил лайк». Все тексты — по Библии
 * Phraseman: тёплый человеческий тон, «ты», коротко, без пафоса и слоганов.
 *
 * Чистый модуль текстов: никакого Firestore/состояния — только сборка строк по
 * данным и языку. Тестируется отдельно от загрузки.
 */
import { triLang, type Lang } from '../../constants/i18n';

/**
 * Тип соц-события для сводки.
 *  • friend_request   — тебе прислали входящую заявку;
 *  • friend_accepted  — ОТПРАВЛЕННУЮ тобой заявку приняли (по маркеру acceptedAt);
 *  • friend_added     — вы стали друзьями (ты принял входящую) — нейтрально, без направления;
 *  • like             — тебе поставили лайк.
 */
export type CompassSocialKind = 'friend_request' | 'friend_accepted' | 'friend_added' | 'like';

/** Заголовок блока: «Кстати…» (тёплая преамбула). */
export const COMPASS_SOCIAL_HEADER = {
  ru: 'Кстати',
  uk: 'До речі',
  es: 'Por cierto',
  'pt-BR': 'A propósito',
  vi: 'Nhân tiện',
  id: 'Ngomong-ngomong',
  tr: 'Bu arada',
  pl: 'Przy okazji',
} as const;

/** Безопасное имя отправителя: триммим, обрезаем длину, fallback «друг». */
export function safeSocialName(name: string | undefined, lang: Lang): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) {
    return triLang(lang, {
      ru: 'друг',
      uk: 'друг',
      es: 'un amigo',
      'pt-BR': 'um amigo',
      vi: 'một người bạn',
      id: 'seorang teman',
      tr: 'bir arkadaş',
      pl: 'znajomy',
    });
  }
  // Обрезаем слишком длинные имена, чтобы строка не ломала вёрстку блока.
  return trimmed.length > 24 ? `${trimmed.slice(0, 23)}…` : trimmed;
}

/**
 * Строка для ОДНОГО соц-события: «{name} принял твою заявку в друзья» и т.п.
 * Имя уже считается безопасным (см. safeSocialName) и подставляется как есть.
 */
export function socialLineForKind(kind: CompassSocialKind, name: string, lang: Lang): string {
  switch (kind) {
    case 'friend_accepted':
      return triLang(lang, {
        ru: `${name} принял твою заявку в друзья 🤝`,
        uk: `${name} прийняв твою заявку в друзі 🤝`,
        es: `${name} aceptó tu solicitud de amistad 🤝`,
        'pt-BR': `${name} aceitou seu pedido de amizade 🤝`,
        vi: `${name} đã chấp nhận lời mời kết bạn của bạn 🤝`,
        id: `${name} menerima permintaan pertemananmu 🤝`,
        tr: `${name} arkadaşlık isteğini kabul etti 🤝`,
        pl: `${name} przyjął twoje zaproszenie do znajomych 🤝`,
      });
    case 'friend_added':
      return triLang(lang, {
        ru: `Теперь вы друзья с ${name} 🤝`,
        uk: `Тепер ви друзі з ${name} 🤝`,
        es: `Ahora eres amigo de ${name} 🤝`,
        'pt-BR': `Agora você é amigo de ${name} 🤝`,
        vi: `Giờ bạn và ${name} đã là bạn bè 🤝`,
        id: `Sekarang kamu berteman dengan ${name} 🤝`,
        tr: `Artık ${name} ile arkadaşsın 🤝`,
        pl: `Teraz jesteś znajomym ${name} 🤝`,
      });
    case 'friend_request':
      return triLang(lang, {
        ru: `${name} хочет добавить тебя в друзья 👋`,
        uk: `${name} хоче додати тебе в друзі 👋`,
        es: `${name} quiere agregarte como amigo 👋`,
        'pt-BR': `${name} quer te adicionar como amigo 👋`,
        vi: `${name} muốn kết bạn với bạn 👋`,
        id: `${name} ingin menambahkanmu sebagai teman 👋`,
        tr: `${name} seni arkadaş olarak eklemek istiyor 👋`,
        pl: `${name} chce dodać cię do znajomych 👋`,
      });
    case 'like':
      return triLang(lang, {
        ru: `${name} поставил тебе лайк ❤️`,
        uk: `${name} поставив тобі лайк ❤️`,
        es: `${name} te dio un like ❤️`,
        'pt-BR': `${name} curtiu seu perfil ❤️`,
        vi: `${name} đã thích bạn ❤️`,
        id: `${name} menyukaimu ❤️`,
        tr: `${name} seni beğendi ❤️`,
        pl: `${name} polubił cię ❤️`,
      });
  }
}

/**
 * Краткое резюме, когда событий одного типа НЕСКОЛЬКО: «и ещё N».
 * Возвращает суффикс-строку (или пусто, если extra <= 0).
 */
export function socialMoreSuffix(extra: number, lang: Lang): string {
  if (extra <= 0) return '';
  return triLang(lang, {
    ru: ` и ещё ${extra}`,
    uk: ` і ще ${extra}`,
    es: ` y ${extra} más`,
    'pt-BR': ` e mais ${extra}`,
    vi: ` và ${extra} người nữa`,
    id: ` dan ${extra} lagi`,
    tr: ` ve ${extra} kişi daha`,
    pl: ` i jeszcze ${extra}`,
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
