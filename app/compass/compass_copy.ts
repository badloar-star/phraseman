/**
 * Компас — тексты. Волна 2.2. ЕДИНЫЙ источник канона тона Компаса.
 *
 * ВСЕ строки — строго по `PHRASEMAN_BIBLE.md` + `docs/personal-plans-copy-style.md`:
 *  - голос Тренера: тёплый, на «ты», поддержка + конкретный глагол;
 *  - gain-framing (говорим что ученик получит, не что потеряет);
 *  - ≤10 слов, одна мысль — одна строка;
 *  - запрещённые слова заменены: урок→сессия, ошибка→почти/разбор,
 *    статистика→твой путь, цена→инвестиция, купить→открыть;
 *  - максимум один эмодзи (огонь/компас), без восклицаний через слово;
 *  - кнопки = глагол + объект (Apple HIG).
 *
 * Формат: каждая строка — объект под `triLang(lang, {...})` (ru/uk/es минимум +
 * остальные UI-языки). Подстановки (имя темы, день) делаются вызывающим кодом.
 */

/** Многоязычная строка для triLang (8 UI-языков). */
export interface CompassText {
  ru: string;
  uk: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
}

import type { CompassDayType } from './compass_brain';

/** Заголовок брифинга дня. «День N» подставляет вызывающий код. */
export const COMPASS_BRIEFING_TITLE: CompassText = {
  ru: 'Компас',
  uk: 'Компас',
  es: 'Brújula',
  'pt-BR': 'Bússola',
  vi: 'La bàn',
  id: 'Kompas',
  tr: 'Pusula',
  pl: 'Kompas',
};

/** Кнопка старта дня (глагол + объект, по Библии). */
export const COMPASS_START_DAY: CompassText = {
  ru: 'Начать день',
  uk: 'Почати день',
  es: 'Empezar el día',
  'pt-BR': 'Começar o dia',
  vi: 'Bắt đầu ngày',
  id: 'Mulai hari',
  tr: 'Güne başla',
  pl: 'Zacznij dzień',
};

/** Мягкий «позже» (не давим). */
export const COMPASS_LATER: CompassText = {
  ru: 'Позже',
  uk: 'Пізніше',
  es: 'Más tarde',
  'pt-BR': 'Mais tarde',
  vi: 'Để sau',
  id: 'Nanti',
  tr: 'Sonra',
  pl: 'Później',
};

/**
 * Тёплый комментарий дня по типу (fallback, когда ИИ-голос выключен).
 * Стиль Тренер + Человек. gain-framing, поддержка. ≤10 слов.
 */
export const COMPASS_DAY_COMMENT: Record<CompassDayType, CompassText> = {
  easy: {
    ru: 'Сегодня без спешки. Закрепим вчерашнее.',
    uk: 'Сьогодні без поспіху. Закріпимо вчорашнє.',
    es: 'Hoy sin prisa. Afianzamos lo de ayer.',
    'pt-BR': 'Hoje sem pressa. Reforçamos o de ontem.',
    vi: 'Hôm nay thong thả. Củng cố lại hôm qua.',
    id: 'Hari ini santai. Mantapkan yang kemarin.',
    tr: 'Bugün aceleye gerek yok. Dünü pekiştirelim.',
    pl: 'Dziś bez pośpiechu. Utrwalimy wczorajsze.',
  },
  deep_dive: {
    ru: 'Сегодня новое. Зову тебя в сессию — там понятнее.',
    uk: 'Сьогодні нове. Кличу тебе в сесію — там зрозуміліше.',
    es: 'Hoy algo nuevo. Te llevo a una sesión más clara.',
    'pt-BR': 'Hoje algo novo. Levo você a uma sessão mais clara.',
    vi: 'Hôm nay có cái mới. Mời bạn vào một buổi rõ hơn.',
    id: 'Hari ini ada yang baru. Kuajak ke sesi yang lebih jelas.',
    tr: 'Bugün yeni bir şey var. Seni daha net bir oturuma çağırıyorum.',
    pl: 'Dziś coś nowego. Zapraszam cię na jaśniejszą sesję.',
  },
  repair: {
    ru: 'Сегодня чиним пару фраз, что ускользают. Спокойно.',
    uk: 'Сьогодні лагодимо кілька фраз, що вислизають. Спокійно.',
    es: 'Hoy arreglamos unas frases que se escapan. Con calma.',
    'pt-BR': 'Hoje ajustamos umas frases que escapam. Com calma.',
    vi: 'Hôm nay sửa vài câu hay tuột. Cứ bình tĩnh.',
    id: 'Hari ini benahi beberapa frasa yang lolos. Santai.',
    tr: 'Bugün kaçan birkaç ifadeyi onaralım. Sakince.',
    pl: 'Dziś poprawimy kilka uciekających fraz. Spokojnie.',
  },
  comeback: {
    ru: 'Ты вернулся. Хорошо. Начнём с трёх фраз.',
    uk: 'Ти повернувся. Добре. Почнімо з трьох фраз.',
    es: 'Has vuelto. Bien. Empezamos con tres frases.',
    'pt-BR': 'Você voltou. Que bom. Começamos com três frases.',
    vi: 'Bạn đã trở lại. Tốt. Bắt đầu với ba câu.',
    id: 'Kamu kembali. Bagus. Mulai dari tiga frasa.',
    tr: 'Geri döndün. Güzel. Üç ifadeyle başlayalım.',
    pl: 'Wróciłeś. Dobrze. Zacznijmy od trzech fraz.',
  },
};

/** Подпись задачи дня по виду (короткая человеческая цель, copy-style планов). */
export const COMPASS_TASK_TITLE = {
  lesson_dive: {
    ru: 'Сессия за глубиной',
    uk: 'Сесія для глибини',
    es: 'Sesión para profundizar',
    'pt-BR': 'Sessão para aprofundar',
    vi: 'Buổi học đào sâu',
    id: 'Sesi untuk mendalami',
    tr: 'Derinleşme oturumu',
    pl: 'Sesja na głębiej',
  },
  mistake_repair: {
    ru: 'Разбор твоих фраз',
    uk: 'Розбір твоїх фраз',
    es: 'Repaso de tus frases',
    'pt-BR': 'Revisão das suas frases',
    vi: 'Xem lại các câu của bạn',
    id: 'Ulas frasamu',
    tr: 'İfadelerini gözden geçir',
    pl: 'Przegląd twoich fraz',
  },
  flashcards_review: {
    ru: 'Повтори фразы, пока свежо',
    uk: 'Повтори фрази, поки свіжо',
    es: 'Repite frases mientras están frescas',
    'pt-BR': 'Repita frases enquanto estão frescas',
    vi: 'Ôn câu khi còn mới',
    id: 'Ulang frasa selagi segar',
    tr: 'İfadeleri tazeyken tekrarla',
    pl: 'Powtórz frazy, póki świeże',
  },
  pronunciation: {
    ru: 'Скажи фразу вслух',
    uk: 'Скажи фразу вголос',
    es: 'Di la frase en voz alta',
    'pt-BR': 'Diga a frase em voz alta',
    vi: 'Đọc câu thành tiếng',
    id: 'Ucapkan frasa dengan suara',
    tr: 'İfadeyi yüksek sesle söyle',
    pl: 'Powiedz frazę na głos',
  },
  plan_continue: {
    ru: 'Продолжить день плана',
    uk: 'Продовжити день плану',
    es: 'Continuar el día del plan',
    'pt-BR': 'Continuar o dia do plano',
    vi: 'Tiếp tục ngày của kế hoạch',
    id: 'Lanjutkan hari rencana',
    tr: 'Plan gününe devam et',
    pl: 'Kontynuuj dzień planu',
  },
} satisfies Record<string, CompassText>;

/** Плашка-зов в сессию при ошибке (Эксперт + Тренер, ≤10 слов). «{topic}» подставляется. */
export const COMPASS_LESSON_INVITE: CompassText = {
  ru: 'Путаешься? Сессия разложит это по полкам.',
  uk: 'Плутаєшся? Сесія розкладе це по поличках.',
  es: '¿Te lías? Una sesión lo deja claro.',
  'pt-BR': 'Confuso? Uma sessão deixa tudo claro.',
  vi: 'Bối rối? Một buổi học sẽ làm rõ.',
  id: 'Bingung? Satu sesi akan menjelaskannya.',
  tr: 'Karıştın mı? Bir oturum netleştirir.',
  pl: 'Mylisz się? Sesja to poukłada.',
};

/** Кнопка открытия сессии из плашки-зова (глагол + объект). */
export const COMPASS_OPEN_SESSION: CompassText = {
  ru: 'Открыть сессию',
  uk: 'Відкрити сесію',
  es: 'Abrir sesión',
  'pt-BR': 'Abrir sessão',
  vi: 'Mở buổi học',
  id: 'Buka sesi',
  tr: 'Oturumu aç',
  pl: 'Otwórz sesję',
};

/** Запертый Компас для бесплатного (Инвестор + Тренер). «купить» НЕ говорим. */
export const COMPASS_LOCKED_TITLE: CompassText = {
  ru: 'Твой Компас почти готов',
  uk: 'Твій Компас майже готовий',
  es: 'Tu Brújula está casi lista',
  'pt-BR': 'Sua Bússola está quase pronta',
  vi: 'La bàn của bạn gần xong',
  id: 'Kompasmu hampir siap',
  tr: 'Pusulan neredeyse hazır',
  pl: 'Twój Kompas jest prawie gotowy',
};

export const COMPASS_LOCKED_BODY: CompassText = {
  ru: 'Он будет вести тебя каждый день — по твоему пути.',
  uk: 'Він вестиме тебе щодня — твоїм шляхом.',
  es: 'Te guiará cada día, por tu propio camino.',
  'pt-BR': 'Vai te guiar todo dia, no seu próprio caminho.',
  vi: 'Nó sẽ dẫn bạn mỗi ngày, theo con đường của bạn.',
  id: 'Ia memandumu setiap hari, di jalanmu sendiri.',
  tr: 'Seni her gün kendi yolunda yönlendirir.',
  pl: 'Poprowadzi cię każdego dnia — twoją drogą.',
};

/** Кнопка открытия полного доступа (Библия: не «купить»). */
export const COMPASS_OPEN_ACCESS: CompassText = {
  ru: 'Открыть полный доступ',
  uk: 'Відкрити повний доступ',
  es: 'Abrir acceso completo',
  'pt-BR': 'Abrir acesso completo',
  vi: 'Mở quyền truy cập đầy đủ',
  id: 'Buka akses penuh',
  tr: 'Tam erişimi aç',
  pl: 'Otwórz pełny dostęp',
};

// ── Крыло «Мотивация»: пуши и серия (Библия: без запугивания и фальшивой срочности) ──

/** Пуш-возврат после паузы (Человек + Тренер). gain-framing: всё на месте. */
export const COMPASS_PUSH_COMEBACK: CompassText = {
  ru: 'Давно не виделись. Всё твоё на месте.',
  uk: 'Давно не бачились. Усе твоє на місці.',
  es: 'Cuánto tiempo. Todo lo tuyo sigue aquí.',
  'pt-BR': 'Quanto tempo. Tudo seu continua aqui.',
  vi: 'Lâu rồi không gặp. Mọi thứ của bạn vẫn còn.',
  id: 'Lama tak jumpa. Semua milikmu masih ada.',
  tr: 'Görüşmeyeli uzun oldu. Her şeyin yerinde.',
  pl: 'Dawno się nie widzieliśmy. Wszystko twoje czeka.',
};

/** Пуш «новые фразы в твоей теме» (Игра). */
export const COMPASS_PUSH_NEW_PHRASES: CompassText = {
  ru: 'В твоей теме — новые фразы. Откроем?',
  uk: 'У твоїй темі — нові фрази. Відкриємо?',
  es: 'Hay frases nuevas en tu tema. ¿Las abrimos?',
  'pt-BR': 'Há frases novas no seu tema. Abrimos?',
  vi: 'Có câu mới trong chủ đề của bạn. Mở nhé?',
  id: 'Ada frasa baru di topikmu. Buka, yuk?',
  tr: 'Konunda yeni ifadeler var. Açalım mı?',
  pl: 'W twoim temacie są nowe frazy. Otworzymy?',
};

/**
 * Пуш защиты серии. ВНИМАНИЕ (Библия, правило 2): лёгкий loss-framing «серия
 * ждёт» допустим ТОЛЬКО для активных с серией 7+ дней. Для новых — только gain.
 * Здесь даём gain-вариант; loss-вариант выбирает compass_retention по правилу.
 */
export const COMPASS_PUSH_STREAK_GAIN: CompassText = {
  ru: 'Пять минут — и серия растёт дальше.',
  uk: 'П’ять хвилин — і серія росте далі.',
  es: 'Cinco minutos y tu racha sigue creciendo.',
  'pt-BR': 'Cinco minutos e sua sequência continua.',
  vi: 'Năm phút và chuỗi của bạn dài thêm.',
  id: 'Lima menit dan rangkaianmu makin panjang.',
  tr: 'Beş dakika ve serin uzamaya devam eder.',
  pl: 'Pięć minut i seria rośnie dalej.',
};

/** Пуш защиты серии для активных 7+ дней (мягкий loss-framing, по правилу Библии). */
export const COMPASS_PUSH_STREAK_KEEP: CompassText = {
  ru: 'Серия {days} дней ждёт тебя сегодня.',
  uk: 'Серія {days} днів чекає на тебе сьогодні.',
  es: 'Tu racha de {days} días te espera hoy.',
  'pt-BR': 'Sua sequência de {days} dias espera hoje.',
  vi: 'Chuỗi {days} ngày đang đợi bạn hôm nay.',
  id: 'Rangkaian {days} hari menunggumu hari ini.',
  tr: '{days} günlük serin bugün seni bekliyor.',
  pl: 'Seria {days} dni czeka na ciebie dziś.',
};
