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

import type { Lang } from '../../constants/i18n';
import { triLang } from '../../constants/i18n';
import type { CompassDayType, CompassDay, CompassInductionFeature } from './compass_brain';
import type { CompassGoal } from './compass_onboarding_profile';

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
  first_day: {
    ru: 'Рад тебя видеть. Начнём с малого — одна фраза.',
    uk: 'Радий тебе бачити. Почнімо з малого — одна фраза.',
    es: 'Me alegra verte. Empezamos con poco: una frase.',
    'pt-BR': 'Que bom te ver. Começamos com pouco: uma frase.',
    vi: 'Rất vui được gặp bạn. Bắt đầu nhẹ nhàng — một câu.',
    id: 'Senang bertemu kamu. Mulai dari yang kecil — satu frasa.',
    tr: 'Seni görmek güzel. Küçükten başlayalım — bir ifade.',
    pl: 'Miło cię widzieć. Zacznijmy od małego — jedna fraza.',
  },
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
  day_closing: {
    ru: 'Собрал итог и первый шаг на завтра.',
    uk: 'Зібрав підсумок і перший крок на завтра.',
    es: 'Reuní resultado y primer paso para mañana.',
    'pt-BR': 'Juntei resultado e primeiro passo de amanhã.',
    vi: 'Đã gom kết quả và bước đầu ngày mai.',
    id: 'Merangkum hasil dan langkah pertama besok.',
    tr: 'Sonuç ve yarının ilk adımı hazır.',
    pl: 'Zebrano wynik i pierwszy krok na jutro.',
  },
};

/**
 * Детерминированная «ротация дня»: стабильный выбор варианта по ключу даты.
 * Один день → один и тот же текст (кэш-дружелюбно, без Math.random внутри),
 * разные дни → разные варианты. Чистая функция, тестируема.
 */
export function pickCompassDailyVariant<T>(variants: readonly T[], dateKey: string): T {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i += 1) hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  return variants[hash % variants.length];
}

/**
 * Голос вечернего ритуала — НЕ одна вечная фраза, а ротация по дню (иначе
 * «живой наставник» умирает на третий вечер). Все варианты — канон Библии.
 */
export const COMPASS_DAY_CLOSING_COMMENTS: CompassText[] = [
  {
    ru: 'Собрал итог и первый шаг на завтра.',
    uk: 'Зібрав підсумок і перший крок на завтра.',
    es: 'Reuní resultado y primer paso para mañana.',
    'pt-BR': 'Juntei resultado e primeiro passo de amanhã.',
    vi: 'Đã gom kết quả và bước đầu ngày mai.',
    id: 'Merangkum hasil dan langkah pertama besok.',
    tr: 'Sonuç ve yarının ilk adımı hazır.',
    pl: 'Zebrano wynik i pierwszy krok na jutro.',
  },
  {
    ru: 'День поработал на тебя. Смотри, что вышло.',
    uk: 'День попрацював на тебе. Дивись, що вийшло.',
    es: 'El día trabajó para ti. Mira el resultado.',
    'pt-BR': 'O dia trabalhou para você. Veja o resultado.',
    vi: 'Hôm nay đã có ích cho bạn. Xem kết quả nhé.',
    id: 'Hari ini bekerja untukmu. Lihat hasilnya.',
    tr: 'Bugün senin için çalıştı. Sonuca bak.',
    pl: 'Dzień pracował dla ciebie. Zobacz efekt.',
  },
  {
    ru: 'Ещё один день в копилку. Вот итог.',
    uk: 'Ще один день у скарбничку. Ось підсумок.',
    es: 'Otro día a tu favor. Aquí el resumen.',
    'pt-BR': 'Mais um dia a seu favor. Eis o resumo.',
    vi: 'Thêm một ngày tích lũy. Đây là tổng kết.',
    id: 'Satu hari lagi terkumpul. Ini ringkasannya.',
    tr: 'Bir gün daha birikti. İşte özet.',
    pl: 'Kolejny dzień do skarbonki. Oto podsumowanie.',
  },
  {
    ru: 'Ты сегодня продвинулся. Я всё записал.',
    uk: 'Ти сьогодні просунувся. Я все записав.',
    es: 'Hoy avanzaste. Lo anoté todo.',
    'pt-BR': 'Você avançou hoje. Anotei tudo.',
    vi: 'Hôm nay bạn đã tiến bộ. Mình ghi lại hết rồi.',
    id: 'Kamu maju hari ini. Semua kucatat.',
    tr: 'Bugün ilerledin. Hepsini not ettim.',
    pl: 'Dziś zrobiłeś postęp. Wszystko zapisałem.',
  },
  {
    ru: 'Хороший ход. Итог дня — ниже.',
    uk: 'Гарний хід. Підсумок дня — нижче.',
    es: 'Buen ritmo. El resumen está abajo.',
    'pt-BR': 'Bom ritmo. O resumo está abaixo.',
    vi: 'Nhịp tốt. Tổng kết ở bên dưới.',
    id: 'Langkah bagus. Ringkasan di bawah.',
    tr: 'İyi gidiyorsun. Özet aşağıda.',
    pl: 'Dobre tempo. Podsumowanie poniżej.',
  },
  {
    ru: 'День сделан. Завтрашний шаг уже готов.',
    uk: 'День зроблено. Завтрашній крок уже готовий.',
    es: 'Día hecho. El paso de mañana ya está listo.',
    'pt-BR': 'Dia feito. O passo de amanhã já está pronto.',
    vi: 'Ngày đã xong. Bước ngày mai đã sẵn sàng.',
    id: 'Hari selesai. Langkah besok sudah siap.',
    tr: 'Gün tamam. Yarının adımı hazır.',
    pl: 'Dzień zrobiony. Jutrzejszy krok już czeka.',
  },
];

/** Финальные строки празднования закрытия дня — тоже ротация, не одна фраза. */
export const COMPASS_DAY_CLOSING_DONE_VARIANTS: CompassText[] = [
  {
    ru: 'День закрыт. Увидимся утром.',
    uk: 'День закрито. Побачимось уранці.',
    es: 'Día cerrado. Nos vemos mañana.',
    'pt-BR': 'Dia fechado. Até amanhã cedo.',
    vi: 'Ngày đã khép lại. Hẹn sáng mai.',
    id: 'Hari selesai. Sampai jumpa pagi.',
    tr: 'Gün kapandı. Sabah görüşürüz.',
    pl: 'Dzień zamknięty. Do zobaczenia rano.',
  },
  {
    ru: 'День закрыт. Отдыхай спокойно.',
    uk: 'День закрито. Відпочивай спокійно.',
    es: 'Día cerrado. Descansa tranquilo.',
    'pt-BR': 'Dia fechado. Descanse tranquilo.',
    vi: 'Ngày đã khép lại. Nghỉ ngơi thoải mái nhé.',
    id: 'Hari selesai. Istirahatlah dengan tenang.',
    tr: 'Gün kapandı. Rahatça dinlen.',
    pl: 'Dzień zamknięty. Odpoczywaj spokojnie.',
  },
  {
    ru: 'Готово. Завтра продолжим с нужного места.',
    uk: 'Готово. Завтра продовжимо з потрібного місця.',
    es: 'Listo. Mañana seguimos donde toca.',
    'pt-BR': 'Pronto. Amanhã seguimos do ponto certo.',
    vi: 'Xong. Mai ta tiếp tục đúng chỗ cần.',
    id: 'Selesai. Besok lanjut dari titik yang pas.',
    tr: 'Tamam. Yarın kaldığımız yerden süreriz.',
    pl: 'Gotowe. Jutro ruszymy z właściwego miejsca.',
  },
  {
    ru: 'День в копилке. До встречи.',
    uk: 'День у скарбничці. До зустрічі.',
    es: 'Día guardado. Hasta pronto.',
    'pt-BR': 'Dia guardado. Até logo.',
    vi: 'Ngày đã được cất giữ. Hẹn gặp lại.',
    id: 'Hari tersimpan. Sampai jumpa.',
    tr: 'Gün kasada. Görüşürüz.',
    pl: 'Dzień w skarbonce. Do zobaczenia.',
  },
];

/**
 * Вечерние варианты голоса брифинга (после 19:00 локального времени) для
 * обычных дней: «план дня» в 23:00 звучал утренним тоном — вечером Компас
 * говорит по-вечернему. Ротация по дню.
 */
export const COMPASS_EVENING_COMMENTS: CompassText[] = [
  {
    ru: 'Вечер — тихое время. Пара фраз, и день твой.',
    uk: 'Вечір — тихий час. Пара фраз, і день твій.',
    es: 'La noche es tranquila. Dos frases y el día es tuyo.',
    'pt-BR': 'A noite é calma. Duas frases e o dia é seu.',
    vi: 'Buổi tối yên tĩnh. Vài câu là trọn ngày.',
    id: 'Malam itu tenang. Dua frasa, harimu lengkap.',
    tr: 'Akşam sakin bir zaman. Birkaç ifade yeter.',
    pl: 'Wieczór to spokojny czas. Dwie frazy i dzień twój.',
  },
  {
    ru: 'Ещё не поздно. Один короткий шаг сегодня.',
    uk: 'Ще не пізно. Один короткий крок сьогодні.',
    es: 'Aún hay tiempo. Un paso corto hoy.',
    'pt-BR': 'Ainda dá tempo. Um passo curto hoje.',
    vi: 'Vẫn còn kịp. Một bước ngắn hôm nay.',
    id: 'Belum terlambat. Satu langkah kecil hari ini.',
    tr: 'Henüz geç değil. Bugün kısa bir adım.',
    pl: 'Jeszcze nie jest późno. Jeden krótki krok dziś.',
  },
  {
    ru: 'Спокойный вечерний темп. Выбери, что по силам.',
    uk: 'Спокійний вечірній темп. Обери, що до снаги.',
    es: 'Ritmo tranquilo de noche. Elige lo que te venga bien.',
    'pt-BR': 'Ritmo calmo de noite. Escolha o que der.',
    vi: 'Nhịp tối nhẹ nhàng. Chọn việc vừa sức.',
    id: 'Tempo malam yang santai. Pilih yang sanggup.',
    tr: 'Sakin akşam temposu. Sana uyanı seç.',
    pl: 'Spokojne wieczorne tempo. Wybierz, co ci pasuje.',
  },
];

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

// ── Вечерний ритуал: закрыть день без нового экрана ──

export const COMPASS_DAY_CLOSING_TITLE: CompassText = {
  ru: 'Итог дня',
  uk: 'Підсумок дня',
  es: 'Cierre del día',
  'pt-BR': 'Resumo do dia',
  vi: 'Tổng kết ngày',
  id: 'Ringkasan hari',
  tr: 'Gün özeti',
  pl: 'Podsumowanie dnia',
};

export const COMPASS_DAY_CLOSING_TODAY: CompassText = {
  ru: 'Итог сегодня',
  uk: 'Підсумок сьогодні',
  es: 'Resultado de hoy',
  'pt-BR': 'Resultado de hoje',
  vi: 'Kết quả hôm nay',
  id: 'Hasil hari ini',
  tr: 'Bugünkü sonuç',
  pl: 'Dzisiejszy wynik',
};

export const COMPASS_DAY_CLOSING_TOMORROW: CompassText = {
  ru: 'Фокус на завтра',
  uk: 'Фокус на завтра',
  es: 'Foco para mañana',
  'pt-BR': 'Foco para amanhã',
  vi: 'Trọng tâm ngày mai',
  id: 'Fokus besok',
  tr: 'Yarın odağı',
  pl: 'Fokus na jutro',
};

export const COMPASS_DAY_CLOSING_CLOSE: CompassText = {
  ru: 'Готово',
  uk: 'Готово',
  es: 'Listo',
  'pt-BR': 'Pronto',
  vi: 'Xong',
  id: 'Selesai',
  tr: 'Tamam',
  pl: 'Gotowe',
};

/** Кнопка закрытия дня с наградой. «{xp}» подставляет вызывающий код. */
export const COMPASS_DAY_CLOSING_CLOSE_REWARD: CompassText = {
  ru: 'Закрыть день · +{xp} XP',
  uk: 'Закрити день · +{xp} XP',
  es: 'Cerrar el día · +{xp} XP',
  'pt-BR': 'Fechar o dia · +{xp} XP',
  vi: 'Khép lại ngày · +{xp} XP',
  id: 'Tutup hari · +{xp} XP',
  tr: 'Günü kapat · +{xp} XP',
  pl: 'Zamknij dzień · +{xp} XP',
};

/** Финальная строка после закрытия дня (перед автозакрытием модалки). */
export const COMPASS_DAY_CLOSING_DONE: CompassText = {
  ru: 'День закрыт. Увидимся утром.',
  uk: 'День закрито. Побачимось уранці.',
  es: 'Día cerrado. Nos vemos mañana.',
  'pt-BR': 'Dia fechado. Até amanhã cedo.',
  vi: 'Ngày đã khép lại. Hẹn sáng mai.',
  id: 'Hari selesai. Sampai jumpa pagi.',
  tr: 'Gün kapandı. Sabah görüşürüz.',
  pl: 'Dzień zamknięty. Do zobaczenia rano.',
};

/** Бейдж серии закрытых дней. «{days}» подставляет вызывающий код. */
export const COMPASS_DAY_CLOSING_STREAK: CompassText = {
  ru: 'Дней подряд: {days}',
  uk: 'Днів поспіль: {days}',
  es: 'Días seguidos: {days}',
  'pt-BR': 'Dias seguidos: {days}',
  vi: 'Ngày liên tiếp: {days}',
  id: 'Hari berturut: {days}',
  tr: 'Üst üste gün: {days}',
  pl: 'Dni z rzędu: {days}',
};

/** Подпись минут у задачи дня (раньше «мин» было жёстко по-русски). */
export const COMPASS_TASK_MINUTES: CompassText = {
  ru: 'мин',
  uk: 'хв',
  es: 'min',
  'pt-BR': 'min',
  vi: 'phút',
  id: 'mnt',
  tr: 'dk',
  pl: 'min',
};

export const COMPASS_DAY_CLOSING_PREMIUM_TITLE: CompassText = {
  ru: 'В Phraseman Plus итоги каждый вечер',
  uk: 'У Phraseman Plus підсумки щовечора',
  es: 'En Phraseman Plus, resumen cada noche',
  'pt-BR': 'No Phraseman Plus, resumo toda noite',
  vi: 'Phraseman Plus tổng kết mỗi tối',
  id: 'Di Phraseman Plus, ringkasan tiap malam',
  tr: 'Phraseman Plus her akşam özetler',
  pl: 'W Phraseman Plus podsumowanie co wieczór',
};

export const COMPASS_DAY_CLOSING_PREMIUM_BODY: CompassText = {
  ru: 'Компас покажет итог, фокус и что пора повторить.',
  uk: 'Компас покаже підсумок, фокус і що повторити.',
  es: 'Brújula muestra resultado, foco y repaso.',
  'pt-BR': 'A Bússola mostra resultado, foco e revisão.',
  vi: 'La bàn hiện kết quả, trọng tâm và ôn tập.',
  id: 'Kompas menampilkan hasil, fokus, dan ulangannya.',
  tr: 'Pusula sonucu, odağı ve tekrarı gösterir.',
  pl: 'Kompas pokaże wynik, fokus i powtórkę.',
};

export const COMPASS_DAY_CLOSING_PLUS_MORE: CompassText = {
  ru: 'Что ещё входит в Plus',
  uk: 'Що ще входить у Plus',
  es: 'Qué más incluye Plus',
  'pt-BR': 'O que mais entra no Plus',
  vi: 'Plus còn có gì',
  id: 'Apa lagi di Plus',
  tr: 'Plus içinde başka ne var',
  pl: 'Co jeszcze zawiera Plus',
};

export const COMPASS_DAY_CLOSING_PLUS_ITEMS: CompassText[] = [
  { ru: 'Итоги каждый вечер', uk: 'Підсумки щовечора', es: 'Resumen cada noche', 'pt-BR': 'Resumo toda noite', vi: 'Tổng kết mỗi tối', id: 'Ringkasan tiap malam', tr: 'Her akşam özet', pl: 'Podsumowanie co wieczór' },
  { ru: 'Компас с фокусом на завтра', uk: 'Компас із фокусом на завтра', es: 'Brújula con foco para mañana', 'pt-BR': 'Bússola com foco para amanhã', vi: 'La bàn có trọng tâm ngày mai', id: 'Kompas dengan fokus besok', tr: 'Yarın odaklı Pusula', pl: 'Kompas z fokusem na jutro' },
  { ru: 'Личный план', uk: 'Особистий план', es: 'Plan personal', 'pt-BR': 'Plano pessoal', vi: 'Kế hoạch cá nhân', id: 'Rencana pribadi', tr: 'Kişisel plan', pl: 'Plan osobisty' },
  { ru: 'Все сессии курса', uk: 'Усі сесії курсу', es: 'Todas las sesiones', 'pt-BR': 'Todas as sessões', vi: 'Mọi phiên học', id: 'Semua sesi', tr: 'Tüm oturumlar', pl: 'Wszystkie sesje' },
  { ru: 'Энергия без ожидания', uk: 'Енергія без очікування', es: 'Energía sin espera', 'pt-BR': 'Energia sem espera', vi: 'Năng lượng không chờ', id: 'Energi tanpa tunggu', tr: 'Beklemesiz enerji', pl: 'Energia bez czekania' },
  { ru: 'Вызовы без дневного лимита', uk: 'Виклики без денного ліміту', es: 'Retos sin límite diario', 'pt-BR': 'Desafios sem limite diário', vi: 'Thử thách không giới hạn ngày', id: 'Tantangan tanpa batas harian', tr: 'Günlük limitsiz görevler', pl: 'Wyzwania bez limitu dnia' },
  { ru: 'Карточки без лимита', uk: 'Картки без ліміту', es: 'Tarjetas sin límite', 'pt-BR': 'Cartões sem limite', vi: 'Thẻ không giới hạn', id: 'Kartu tanpa batas', tr: 'Limitsiz kartlar', pl: 'Fiszki bez limitu' },
  { ru: 'Повторение без лимита', uk: 'Повторення без ліміту', es: 'Repaso sin límite', 'pt-BR': 'Revisão sem limite', vi: 'Ôn tập không giới hạn', id: 'Ulangan tanpa batas', tr: 'Limitsiz tekrar', pl: 'Powtórki bez limitu' },
  { ru: 'Точечное повторение', uk: 'Точкове повторення', es: 'Repaso focalizado', 'pt-BR': 'Revisão focada', vi: 'Ôn đúng điểm cần', id: 'Ulangan terarah', tr: 'Hedefli tekrar', pl: 'Celowana powtórka' },
  { ru: 'Практика слабых мест', uk: 'Практика слабких місць', es: 'Práctica de puntos débiles', 'pt-BR': 'Prática de pontos fracos', vi: 'Luyện điểm yếu', id: 'Latih titik lemah', tr: 'Zayıf nokta pratiği', pl: 'Praktyka słabych miejsc' },
  { ru: 'Разбор сложных фраз', uk: 'Розбір складних фраз', es: 'Análisis de frases difíciles', 'pt-BR': 'Análise de frases difíceis', vi: 'Phân tích cụm khó', id: 'Bedah frasa sulit', tr: 'Zor ifade analizi', pl: 'Analiza trudnych fraz' },
  { ru: 'Диалоги без лимита', uk: 'Діалоги без ліміту', es: 'Diálogos sin límite', 'pt-BR': 'Diálogos sem limite', vi: 'Hội thoại không giới hạn', id: 'Dialog tanpa batas', tr: 'Limitsiz diyalog', pl: 'Dialogi bez limitu' },
  { ru: 'Режим речи', uk: 'Режим мовлення', es: 'Modo de habla', 'pt-BR': 'Modo de fala', vi: 'Chế độ nói', id: 'Mode bicara', tr: 'Konuşma modu', pl: 'Tryb mówienia' },
  { ru: 'Подсказки по словам', uk: 'Підказки по словах', es: 'Pistas por palabra', 'pt-BR': 'Dicas por palavra', vi: 'Gợi ý theo từ', id: 'Petunjuk per kata', tr: 'Kelime ipuçları', pl: 'Podpowiedzi do słów' },
  { ru: 'Арена без лимита', uk: 'Арена без ліміту', es: 'Arena sin límite', 'pt-BR': 'Arena sem limite', vi: 'Đấu trường không giới hạn', id: 'Arena tanpa batas', tr: 'Limitsiz Arena', pl: 'Arena bez limitu' },
  { ru: 'Карта 365 дней', uk: 'Карта 365 днів', es: 'Mapa de 365 días', 'pt-BR': 'Mapa de 365 dias', vi: 'Bản đồ 365 ngày', id: 'Peta 365 hari', tr: '365 gün haritası', pl: 'Mapa 365 dni' },
  { ru: 'Детальный путь', uk: 'Детальний шлях', es: 'Camino detallado', 'pt-BR': 'Caminho detalhado', vi: 'Lộ trình chi tiết', id: 'Jalur rinci', tr: 'Ayrıntılı yol', pl: 'Szczegółowa droga' },
  { ru: 'Темы и ауры профиля', uk: 'Теми й аури профілю', es: 'Temas y auras del perfil', 'pt-BR': 'Temas e auras do perfil', vi: 'Chủ đề và hào quang hồ sơ', id: 'Tema dan aura profil', tr: 'Profil temaları ve auralar', pl: 'Motywy i aury profilu' },
  { ru: 'Plus-подсветка профиля', uk: 'Plus-підсвітка профілю', es: 'Realce Plus del perfil', 'pt-BR': 'Destaque Plus no perfil', vi: 'Làm nổi hồ sơ Plus', id: 'Sorotan profil Plus', tr: 'Plus profil vurgusu', pl: 'Plusowe wyróżnienie profilu' },
  { ru: 'Защита серии', uk: 'Захист серії', es: 'Protección de racha', 'pt-BR': 'Proteção de sequência', vi: 'Bảo vệ chuỗi', id: 'Perlindungan rangkaian', tr: 'Seri koruması', pl: 'Ochrona serii' },
];

/**
 * Человеческие подписи категорий фокуса (8 языков UI). Единый словарь для
 * вечернего ритуала И меток задач брифинга (раньше жил в панели ритуала).
 */
export const COMPASS_FOCUS_CATEGORY_LABEL: Record<string, CompassText> = {
  verb: { ru: 'глаголы', uk: 'дієслова', es: 'verbos', 'pt-BR': 'verbos', vi: 'động từ', id: 'kata kerja', tr: 'fiiller', pl: 'czasowniki' },
  noun: { ru: 'существительные', uk: 'іменники', es: 'sustantivos', 'pt-BR': 'substantivos', vi: 'danh từ', id: 'kata benda', tr: 'isimler', pl: 'rzeczowniki' },
  pronoun: { ru: 'местоимения', uk: 'займенники', es: 'pronombres', 'pt-BR': 'pronomes', vi: 'đại từ', id: 'kata ganti', tr: 'zamirler', pl: 'zaimki' },
  adjective: { ru: 'прилагательные', uk: 'прикметники', es: 'adjetivos', 'pt-BR': 'adjetivos', vi: 'tính từ', id: 'kata sifat', tr: 'sıfatlar', pl: 'przymiotniki' },
  adverb: { ru: 'наречия', uk: 'прислівники', es: 'adverbios', 'pt-BR': 'advérbios', vi: 'trạng từ', id: 'kata keterangan', tr: 'zarflar', pl: 'przysłówki' },
  preposition: { ru: 'предлоги', uk: 'прийменники', es: 'preposiciones', 'pt-BR': 'preposições', vi: 'giới từ', id: 'preposisi', tr: 'edatlar', pl: 'przyimki' },
  syntax: { ru: 'порядок слов', uk: 'порядок слів', es: 'orden de palabras', 'pt-BR': 'ordem das palavras', vi: 'trật tự từ', id: 'urutan kata', tr: 'kelime sırası', pl: 'szyk zdania' },
  article: { ru: 'артикли', uk: 'артиклі', es: 'artículos', 'pt-BR': 'artigos', vi: 'mạo từ', id: 'artikel', tr: 'artikeller', pl: 'przedimki' },
  existential: { ru: 'there is / there are', uk: 'there is / there are', es: 'there is / there are', 'pt-BR': 'there is / there are', vi: 'there is / there are', id: 'there is / there are', tr: 'there is / there are', pl: 'there is / there are' },
  'to-be': { ru: 'глагол to be', uk: 'дієслово to be', es: 'el verbo to be', 'pt-BR': 'o verbo to be', vi: 'động từ to be', id: 'kata kerja to be', tr: 'to be fiili', pl: 'czasownik to be' },
  conjunction: { ru: 'союзы', uk: 'сполучники', es: 'conjunciones', 'pt-BR': 'conjunções', vi: 'liên từ', id: 'konjungsi', tr: 'bağlaçlar', pl: 'spójniki' },
  modal: { ru: 'модальные глаголы', uk: 'модальні дієслова', es: 'verbos modales', 'pt-BR': 'verbos modais', vi: 'động từ khuyết thiếu', id: 'kata kerja modal', tr: 'modal fiiller', pl: 'czasowniki modalne' },
  phrasal_particle: { ru: 'частицы phrasal verbs', uk: 'частки phrasal verbs', es: 'partículas de phrasal verbs', 'pt-BR': 'partículas de phrasal verbs', vi: 'tiểu từ phrasal verbs', id: 'partikel phrasal verbs', tr: 'phrasal verb ekleri', pl: 'partykuły phrasal verbs' },
  modifier: { ru: 'уточняющие слова', uk: 'уточнювальні слова', es: 'palabras modificadoras', 'pt-BR': 'palavras modificadoras', vi: 'từ bổ nghĩa', id: 'kata pewatas', tr: 'niteleyiciler', pl: 'określniki' },
  determiner: { ru: 'указатели (determiners)', uk: 'вказівники (determiners)', es: 'determinantes', 'pt-BR': 'determinantes', vi: 'từ hạn định', id: 'determiner', tr: 'belirteçler', pl: 'określniki (determiners)' },
};

/** Подпись категории: известная — по словарю, неизвестная — «как есть» без подчёркиваний. */
export function compassFocusCategoryLabel(category: string | undefined, lang: Lang): string {
  if (!category) return '';
  const known = COMPASS_FOCUS_CATEGORY_LABEL[category];
  if (known) return triLang(lang, known);
  return category.replace(/_/g, ' ');
}

/**
 * Строгая версия для меток задач брифинга: ТОЛЬКО известные категории (null для
 * прочего) — иначе в метку утекали бы сырые слаги вроде «recall».
 */
export function compassKnownFocusCategoryLabel(category: string | undefined, lang: Lang): string | null {
  if (!category) return null;
  const known = COMPASS_FOCUS_CATEGORY_LABEL[category];
  return known ? triLang(lang, known) : null;
}

export const COMPASS_DAY_CLOSING_HIGHLIGHT_LABEL: Record<
  'phrases' | 'xp' | 'plan' | 'tasks' | 'cards' | 'rounds' | 'streak',
  CompassText
> = {
  phrases: {
    ru: 'Новых фраз', uk: 'Нових фраз', es: 'Frases nuevas', 'pt-BR': 'Frases novas',
    vi: 'Câu mới', id: 'Frasa baru', tr: 'Yeni ifadeler', pl: 'Nowych fraz',
  },
  xp: {
    ru: 'XP сегодня', uk: 'XP сьогодні', es: 'XP de hoy', 'pt-BR': 'XP de hoje',
    vi: 'XP hôm nay', id: 'XP hari ini', tr: 'Bugünkü XP', pl: 'XP dzisiaj',
  },
  plan: {
    ru: 'Шаги плана', uk: 'Кроки плану', es: 'Pasos del plan', 'pt-BR': 'Passos do plano',
    vi: 'Bước kế hoạch', id: 'Langkah rencana', tr: 'Plan adımları', pl: 'Kroki planu',
  },
  tasks: {
    ru: 'Вызовы дня', uk: 'Виклики дня', es: 'Retos del día', 'pt-BR': 'Desafios do dia',
    vi: 'Thử thách hôm nay', id: 'Tantangan harian', tr: 'Günün çağrıları', pl: 'Wyzwania dnia',
  },
  cards: {
    ru: 'Карточки', uk: 'Картки', es: 'Tarjetas', 'pt-BR': 'Cartões',
    vi: 'Thẻ', id: 'Kartu', tr: 'Kartlar', pl: 'Fiszki',
  },
  rounds: {
    ru: 'Раунды', uk: 'Раунди', es: 'Rondas', 'pt-BR': 'Rodadas',
    vi: 'Vòng', id: 'Ronde', tr: 'Turlar', pl: 'Rundy',
  },
  streak: {
    ru: 'Серия', uk: 'Серія', es: 'Racha', 'pt-BR': 'Sequência',
    vi: 'Chuỗi', id: 'Rangkaian', tr: 'Seri', pl: 'Seria',
  },
};

export const COMPASS_DAY_CLOSING_REPEAT: Record<
  'fresh_phrases' | 'cards' | 'plan' | 'round' | 'one_phrase',
  CompassText
> = {
  fresh_phrases: {
    ru: 'Закрепим сегодняшние фразы.',
    uk: 'Закріпимо сьогоднішні фрази.',
    es: 'Reforzamos las frases de hoy.',
    'pt-BR': 'Reforçamos as frases de hoje.',
    vi: 'Củng cố những câu hôm nay.',
    id: 'Kuatkan frasa hari ini.',
    tr: 'Bugünün ifadelerini pekiştirelim.',
    pl: 'Utrwalimy dzisiejsze frazy.',
  },
  cards: {
    ru: 'Прогоним сохранённые карточки.',
    uk: 'Проженемо збережені картки.',
    es: 'Repasamos las tarjetas guardadas.',
    'pt-BR': 'Revisamos os cartões salvos.',
    vi: 'Ôn lại các thẻ đã lưu.',
    id: 'Ulangi kartu tersimpan.',
    tr: 'Kayıtlı kartları tekrar edelim.',
    pl: 'Powtórzymy zapisane fiszki.',
  },
  plan: {
    ru: 'Продолжим личный план.',
    uk: 'Продовжимо особистий план.',
    es: 'Seguimos con el plan personal.',
    'pt-BR': 'Seguimos com o plano pessoal.',
    vi: 'Tiếp tục kế hoạch cá nhân.',
    id: 'Lanjutkan rencana pribadi.',
    tr: 'Kişisel plana devam edelim.',
    pl: 'Kontynuujemy plan osobisty.',
  },
  round: {
    ru: 'Разберём сложный раунд.',
    uk: 'Розберемо складний раунд.',
    es: 'Repasamos una ronda difícil.',
    'pt-BR': 'Revisamos uma rodada difícil.',
    vi: 'Xem lại một vòng khó.',
    id: 'Ulas satu ronde sulit.',
    tr: 'Zor bir turu inceleyelim.',
    pl: 'Przejrzymy trudną rundę.',
  },
  one_phrase: {
    ru: 'Завтра закрепим сегодняшнее — коротко.',
    uk: 'Завтра закріпимо сьогоднішнє — коротко.',
    es: 'Mañana afianzamos lo de hoy, en corto.',
    'pt-BR': 'Amanhã fixamos o de hoje, rapidinho.',
    vi: 'Mai củng cố lại hôm nay, ngắn thôi.',
    id: 'Besok kuatkan yang hari ini, singkat.',
    tr: 'Yarın bugünü kısaca pekiştiririz.',
    pl: 'Jutro krótko utrwalimy dzisiejsze.',
  },
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

// ── Крыло «Память» / статистика: блок «Твой Компас» (Библия: «твой путь», не «статистика») ──

/** Заголовок блока в общем хабе результатов. */
export const COMPASS_STATS_TITLE: CompassText = {
  ru: 'Твой путь с Компасом',
  uk: 'Твій шлях з Компасом',
  es: 'Tu camino con la Brújula',
  'pt-BR': 'Seu caminho com a Bússola',
  vi: 'Hành trình của bạn với La bàn',
  id: 'Perjalananmu bersama Kompas',
  tr: 'Pusula ile yolculuğun',
  pl: 'Twoja droga z Kompasem',
};

/** Подпись «серия с Компасом» (Игра). */
export const COMPASS_STATS_STREAK: CompassText = {
  ru: 'Серия с Компасом',
  uk: 'Серія з Компасом',
  es: 'Racha con la Brújula',
  'pt-BR': 'Sequência com a Bússola',
  vi: 'Chuỗi với La bàn',
  id: 'Rangkaian dengan Kompas',
  tr: 'Pusula serisi',
  pl: 'Seria z Kompasem',
};

/** Подпись «дней закрыто». */
export const COMPASS_STATS_DAYS: CompassText = {
  ru: 'Дней закрыто',
  uk: 'Днів закрито',
  es: 'Días completados',
  'pt-BR': 'Dias concluídos',
  vi: 'Số ngày hoàn thành',
  id: 'Hari diselesaikan',
  tr: 'Tamamlanan gün',
  pl: 'Dni ukończone',
};

/** Подпись «темы окрепли». */
export const COMPASS_STATS_TOPICS: CompassText = {
  ru: 'Темы окрепли',
  uk: 'Теми зміцніли',
  es: 'Temas reforzados',
  'pt-BR': 'Temas reforçados',
  vi: 'Chủ đề vững hơn',
  id: 'Topik menguat',
  tr: 'Güçlenen konular',
  pl: 'Tematy okrzepły',
};

/** Подписи статусов темы (Библия: «ведём сюда» вместо «слабая»). */
export const COMPASS_TOPIC_STATUS: Record<'confident' | 'growing' | 'guided', CompassText> = {
  confident: {
    ru: 'уверенно', uk: 'упевнено', es: 'con seguridad', 'pt-BR': 'com firmeza',
    vi: 'vững vàng', id: 'percaya diri', tr: 'sağlam', pl: 'pewnie',
  },
  growing: {
    ru: 'крепнет', uk: 'міцніє', es: 'creciendo', 'pt-BR': 'crescendo',
    vi: 'đang vững', id: 'menguat', tr: 'gelişiyor', pl: 'krzepnie',
  },
  guided: {
    ru: 'ведём сюда', uk: 'ведемо сюди', es: 'vamos aquí', 'pt-BR': 'vamos por aqui',
    vi: 'dẫn vào đây', id: 'menuju ke sini', tr: 'buraya yönlendiriyoruz', pl: 'tu prowadzimy',
  },
};

// ── Приветствие первого дня: ЖИВОЙ голос Компаса от первого лица (канон юзера) ──
//
// Компас знакомится сам, как человек: «меня звать Компас, я тут чтобы ты не
// потерялся». Текст — АБЗАЦ-обращение из частей (знакомство + благодарность/роль +
// цель своими словами + «не навязываю» + вопрос), а НЕ стопка слоганов. Запрещено:
// пафос («поведу»), пустые связки, враньё о юзере («база у тебя есть»).

/** Знакомство с именем. «{name}» подставляет билдер. */
export const COMPASS_HELLO_NAMED: CompassText = {
  ru: 'Привет, {name}. Меня звать Компас — я тут, чтобы ты не потерялся.',
  uk: 'Привіт, {name}. Мене звати Компас — я тут, щоб ти не загубився.',
  es: 'Hola, {name}. Me llamo Brújula y estoy aquí para que no te pierdas.',
  'pt-BR': 'Oi, {name}. Meu nome é Bússola e estou aqui pra você não se perder.',
  vi: 'Chào {name}. Mình tên La bàn — ở đây để bạn không lạc lối.',
  id: 'Halo, {name}. Namaku Kompas — aku di sini biar kamu tak tersesat.',
  tr: 'Merhaba {name}. Adım Pusula — kaybolmayasın diye buradayım.',
  pl: 'Cześć, {name}. Mam na imię Kompas — jestem tu, żebyś się nie zgubił.',
};

/** Знакомство без имени. */
export const COMPASS_HELLO: CompassText = {
  ru: 'Привет. Меня звать Компас — я тут, чтобы ты не потерялся.',
  uk: 'Привіт. Мене звати Компас — я тут, щоб ти не загубився.',
  es: 'Hola. Me llamo Brújula y estoy aquí para que no te pierdas.',
  'pt-BR': 'Oi. Meu nome é Bússola e estou aqui pra você não se perder.',
  vi: 'Chào bạn. Mình tên La bàn — ở đây để bạn không lạc lối.',
  id: 'Halo. Namaku Kompas — aku di sini biar kamu tak tersesat.',
  tr: 'Merhaba. Adım Pusula — kaybolmayasın diye buradayım.',
  pl: 'Cześć. Mam na imię Kompas — jestem tu, żebyś się nie zgubił.',
};

/** Если купил доступ на онбординге: благодарность + честно, чем это помогает. */
export const COMPASS_THANKS_PREMIUM: CompassText = {
  ru: 'Спасибо, что открыл полный доступ — так я смогу стать для тебя умнее.',
  uk: 'Дякую, що відкрив повний доступ — так я зможу стати для тебе розумнішим.',
  es: 'Gracias por abrir el acceso completo: así podré volverme más listo para ti.',
  'pt-BR': 'Obrigado por abrir o acesso completo — assim eu fico mais esperto pra você.',
  vi: 'Cảm ơn bạn đã mở quyền đầy đủ — nhờ vậy mình thông minh hơn với bạn.',
  id: 'Terima kasih sudah membuka akses penuh — jadi aku bisa makin pintar untukmu.',
  tr: 'Tam erişimi açtığın için sağ ol — böylece senin için daha akıllı olabilirim.',
  pl: 'Dzięki, że otworzyłeś pełny dostęp — dzięki temu stanę się dla ciebie mądrzejszy.',
};

/** Роль Компаса (всем): что он будет делать каждый день. Честно, без давления. */
export const COMPASS_ROLE: CompassText = {
  ru: 'Каждый день я буду смотреть, как у тебя идут дела, и подсказывать, что лучше сделать дальше.',
  uk: 'Щодня я дивитимусь, як у тебе справи, і підказуватиму, що краще зробити далі.',
  es: 'Cada día miraré cómo te va y te sugeriré qué conviene hacer después.',
  'pt-BR': 'Todo dia vou ver como você está indo e sugerir o que é melhor fazer depois.',
  vi: 'Mỗi ngày mình sẽ xem bạn ra sao và gợi ý điều nên làm tiếp theo.',
  id: 'Tiap hari aku akan melihat perkembanganmu dan menyarankan langkah berikutnya.',
  tr: 'Her gün nasıl gittiğine bakıp sonra ne yapman iyi olur diye öneririm.',
  pl: 'Każdego dnia będę patrzeć, jak ci idzie, i podpowiadać, co warto zrobić dalej.',
};

/** Куда ведём — цель ученика, сказанная по-человечески (НЕ слоган). */
export const COMPASS_GOAL_LINE = {
  series: {
    ru: 'А раз ты хочешь смотреть фильмы без субтитров — туда и будем держать курс.',
    uk: 'А раз ти хочеш дивитися фільми без субтитрів — туди й триматимемо курс.',
    es: 'Y como quieres ver pelis sin subtítulos, hacia allí pondremos rumbo.',
    'pt-BR': 'E como você quer ver filmes sem legenda, é pra lá que vamos.',
    vi: 'Và vì bạn muốn xem phim không phụ đề — mình sẽ hướng về đó.',
    id: 'Karena kamu ingin nonton film tanpa subtitel, ke sanalah kita menuju.',
    tr: 'Madem filmleri altyazısız izlemek istiyorsun, rotayı oraya kıralım.',
    pl: 'A skoro chcesz oglądać filmy bez napisów — tam właśnie wytyczymy kurs.',
  },
  everyday: {
    ru: 'А раз ты хочешь свободно говорить в жизни — будем держать курс туда.',
    uk: 'А раз ти хочеш вільно говорити в житті — триматимемо курс туди.',
    es: 'Y como quieres hablar con soltura en el día a día, hacia allí vamos.',
    'pt-BR': 'E como você quer falar à vontade no dia a dia, é pra lá que vamos.',
    vi: 'Và vì bạn muốn nói tự nhiên trong đời sống — mình hướng về đó.',
    id: 'Karena kamu ingin bicara lancar sehari-hari, ke sanalah kita menuju.',
    tr: 'Madem günlük hayatta rahat konuşmak istiyorsun, rotamız orası.',
    pl: 'A skoro chcesz swobodnie mówić na co dzień — tam trzymamy kurs.',
  },
  travel: {
    ru: 'А раз тебе нужен английский для дороги — туда и будем держать курс.',
    uk: 'А раз тобі потрібна англійська для дороги — туди й триматимемо курс.',
    es: 'Y como necesitas inglés para viajar, hacia allí pondremos rumbo.',
    'pt-BR': 'E como você precisa de inglês pra viajar, é pra lá que vamos.',
    vi: 'Và vì bạn cần tiếng Anh cho chuyến đi — mình sẽ hướng về đó.',
    id: 'Karena kamu butuh Inggris untuk perjalanan, ke sanalah kita menuju.',
    tr: 'Madem yolculuk için İngilizce istiyorsun, rotayı oraya kıralım.',
    pl: 'A skoro angielski jest ci potrzebny w podróży — tam wytyczymy kurs.',
  },
  words: {
    ru: 'А раз тебе нужны живые, нужные фразы — за ними и пойдём.',
    uk: 'А раз тобі потрібні живі, потрібні фрази — за ними й підемо.',
    es: 'Y como buscas frases vivas y útiles, a por ellas vamos.',
    'pt-BR': 'E como você quer frases vivas e úteis, é atrás delas que vamos.',
    vi: 'Và vì bạn cần những câu sống động, hữu ích — mình sẽ đi tìm chúng.',
    id: 'Karena kamu mau frasa yang hidup dan berguna, itu yang kita kejar.',
    tr: 'Madem canlı, işe yarar ifadeler istiyorsun, peşlerine düşeriz.',
    pl: 'A skoro chcesz żywych, przydatnych fraz — po nie właśnie idziemy.',
  },
  mind: {
    ru: 'А раз ты учишь для себя — спешить некуда, пойдём в своём ритме.',
    uk: 'А раз ти вчиш для себе — поспішати нікуди, підемо у своєму ритмі.',
    es: 'Y como estudias para ti, sin prisa: iremos a tu ritmo.',
    'pt-BR': 'E como você estuda pra si, sem pressa: vamos no seu ritmo.',
    vi: 'Và vì bạn học cho chính mình — không vội, mình đi theo nhịp của bạn.',
    id: 'Karena kamu belajar untuk dirimu, santai saja: kita ikut iramamu.',
    tr: 'Madem kendin için öğreniyorsun, acele yok: senin ritminde gideriz.',
    pl: 'A skoro uczysz się dla siebie — bez pośpiechu, pójdziemy w twoim rytmie.',
  },
} satisfies Record<string, CompassText>;

/** Снятие давления — Компас только советует. */
export const COMPASS_NO_PRESSURE: CompassText = {
  ru: 'Ничего не навязываю — всё, что скажу, это просто совет. Решаешь всегда ты.',
  uk: 'Нічого не нав’язую — усе, що скажу, це лише порада. Вирішуєш завжди ти.',
  es: 'No te obligo a nada: lo que diga es solo un consejo. Tú decides siempre.',
  'pt-BR': 'Não imponho nada — o que eu disser é só um conselho. Quem decide é você.',
  vi: 'Mình không ép gì cả — mọi điều mình nói chỉ là gợi ý. Bạn luôn là người quyết.',
  id: 'Aku tak memaksa apa pun — semua yang kukatakan hanya saran. Kamu yang menentukan.',
  tr: 'Hiçbir şey dayatmam — söylediklerim sadece öneri. Kararı hep sen verirsin.',
  pl: 'Niczego nie narzucam — wszystko, co powiem, to tylko rada. Zawsze decydujesz ty.',
};

/** Кнопка-завершение приветствия (на welcome-днях вместо «Начать день»). */
export const COMPASS_LETS_GO: CompassText = {
  ru: 'Поехали',
  uk: 'Поїхали',
  es: 'Vamos',
  'pt-BR': 'Vamos lá',
  vi: 'Bắt đầu thôi',
  id: 'Ayo mulai',
  tr: 'Hadi başlayalım',
  pl: 'Ruszamy',
};

/** Вопрос-приглашение в конце (над кнопками-фичами). */
export const COMPASS_WHERE_START: CompassText = {
  ru: 'С чего хочешь начать знакомство?',
  uk: 'З чого хочеш почати знайомство?',
  es: '¿Por dónde quieres empezar?',
  'pt-BR': 'Por onde você quer começar?',
  vi: 'Bạn muốn bắt đầu làm quen từ đâu?',
  id: 'Mau mulai kenalan dari mana?',
  tr: 'Tanışmaya nereden başlamak istersin?',
  pl: 'Od czego chcesz zacząć poznawanie?',
};

// ── Возврат после паузы: тёплое «я тебя помню» (тот же живой голос) ──

export const COMPASS_BACK_NAMED: CompassText = {
  ru: '{name}, ты вернулся — а я и не уходил. Всё твоё на месте: фразы, прогресс, путь.',
  uk: '{name}, ти повернувся — а я й не йшов. Усе твоє на місці: фрази, прогрес, шлях.',
  es: '{name}, has vuelto, y yo no me fui. Todo lo tuyo sigue aquí: frases, avance, camino.',
  'pt-BR': '{name}, você voltou — e eu nem saí. Tudo seu está aqui: frases, avanço, caminho.',
  vi: '{name}, bạn đã quay lại — mà mình có đi đâu. Mọi thứ của bạn vẫn còn: câu chữ, tiến độ, hành trình.',
  id: '{name}, kamu kembali — aku pun tak pergi. Semua milikmu masih ada: frasa, kemajuan, jalanmu.',
  tr: '{name}, geri döndün — ben zaten gitmemiştim. Her şeyin yerinde: ifadeler, ilerleme, yol.',
  pl: '{name}, wróciłeś — a ja nigdzie nie zniknąłem. Wszystko twoje czeka: frazy, postęp, droga.',
};

export const COMPASS_BACK: CompassText = {
  ru: 'Ты вернулся — а я и не уходил. Всё твоё на месте: фразы, прогресс, путь.',
  uk: 'Ти повернувся — а я й не йшов. Усе твоє на місці: фрази, прогрес, шлях.',
  es: 'Has vuelto, y yo no me fui. Todo lo tuyo sigue aquí: frases, avance, camino.',
  'pt-BR': 'Você voltou — e eu nem saí. Tudo seu está aqui: frases, avanço, caminho.',
  vi: 'Bạn đã quay lại — mà mình có đi đâu. Mọi thứ của bạn vẫn còn: câu chữ, tiến độ, hành trình.',
  id: 'Kamu kembali — aku pun tak pergi. Semua milikmu masih ada: frasa, kemajuan, jalanmu.',
  tr: 'Geri döndün — ben zaten gitmemiştim. Her şeyin yerinde: ifadeler, ilerleme, yol.',
  pl: 'Wróciłeś — a ja nigdzie nie zniknąłem. Wszystko twoje czeka: frazy, postęp, droga.',
};

/** Возврат: тёплое приглашение продолжить. Без темы вины/паузы/упрёков. */
export const COMPASS_BACK_INVITE: CompassText = {
  ru: 'Продолжим с того же места?',
  uk: 'Продовжимо з того ж місця?',
  es: '¿Seguimos donde lo dejaste?',
  'pt-BR': 'Continuamos de onde parou?',
  vi: 'Tiếp tục từ chỗ cũ nhé?',
  id: 'Lanjut dari tempat tadi?',
  tr: 'Kaldığın yerden devam edelim mi?',
  pl: 'Ruszamy z tego samego miejsca?',
};

// ── Индакшн: «что классного попробовать первым» (зов в одну фичу) ──

/** Подпись индакшн-блока (заголовок над подсказкой). */
export const COMPASS_INDUCTION_LABEL: CompassText = {
  ru: 'С чего здорово начать',
  uk: 'З чого добре почати',
  es: 'Por dónde empezar',
  'pt-BR': 'Por onde começar',
  vi: 'Nên bắt đầu từ đâu',
  id: 'Mulai dari mana',
  tr: 'Nereden başlamalı',
  pl: 'Od czego zacząć',
};

/** Текст подсказки по фиче (CompassInductionFeature). Тёплый зов, ≤10 слов. */
export const COMPASS_INDUCTION_TEXT = {
  level_test: {
    ru: 'Пройди короткий тест — узнаем твой уровень.',
    uk: 'Пройди короткий тест — дізнаємось твій рівень.',
    es: 'Haz una prueba corta: sabremos tu nivel.',
    'pt-BR': 'Faça um teste curto: vamos saber seu nível.',
    vi: 'Làm bài kiểm tra ngắn — biết trình độ của bạn.',
    id: 'Ikuti tes singkat — ketahui levelmu.',
    tr: 'Kısa bir test çöz — seviyeni öğrenelim.',
    pl: 'Zrób krótki test — poznamy twój poziom.',
  },
  dialogs: {
    ru: 'Диалоги — попрактикуй разговор по теме.',
    uk: 'Діалоги — попрактикуй розмову за темою.',
    es: 'Diálogos: practica una conversación del tema.',
    'pt-BR': 'Diálogos: pratique uma conversa do tema.',
    vi: 'Hội thoại — luyện nói theo chủ đề.',
    id: 'Dialog — latih percakapan sesuai topik.',
    tr: 'Diyaloglar — konu üzerine konuşma pratiği yap.',
    pl: 'Dialogi — poćwicz rozmowę na temat.',
  },
  flashcards: {
    ru: 'Пролистай карточки — фразы цепляются быстро.',
    uk: 'Погортай картки — фрази чіпляються швидко.',
    es: 'Pasa las tarjetas: las frases se pegan rápido.',
    'pt-BR': 'Passe os cartões: as frases grudam rápido.',
    vi: 'Lướt thẻ — câu chữ bám nhanh.',
    id: 'Geser kartu — frasa nempel cepat.',
    tr: 'Kartları kaydır — ifadeler hızlı yapışır.',
    pl: 'Przeglądaj fiszki — frazy szybko wchodzą.',
  },
  lessons: {
    ru: 'Открой первую сессию — пойдём по шагам.',
    uk: 'Відкрий першу сесію — підемо по кроках.',
    es: 'Abre la primera sesión: vamos por pasos.',
    'pt-BR': 'Abra a primeira sessão: vamos por etapas.',
    vi: 'Mở buổi đầu — đi theo từng bước.',
    id: 'Buka sesi pertama — kita jalan bertahap.',
    tr: 'İlk oturumu aç — adım adım gidelim.',
    pl: 'Otwórz pierwszą sesję — pójdziemy po krokach.',
  },
  daily_tasks: {
    ru: 'Загляни в задания дня — лёгкий тёплый старт.',
    uk: 'Зазирни в завдання дня — легкий теплий старт.',
    es: 'Mira las misiones del día: un arranque suave.',
    'pt-BR': 'Veja as missões do dia: um começo leve.',
    vi: 'Xem nhiệm vụ hôm nay — khởi đầu nhẹ nhàng.',
    id: 'Lihat misi harian — awal yang ringan.',
    tr: 'Günün görevlerine bak — yumuşak bir başlangıç.',
    pl: 'Zajrzyj w zadania dnia — łagodny start.',
  },
} satisfies Record<string, CompassText>;

/** Кнопка открытия индакшн-фичи (глагол + объект). */
export const COMPASS_INDUCTION_CTA = {
  level_test: {
    ru: 'Пройти тест', uk: 'Пройти тест', es: 'Hacer la prueba', 'pt-BR': 'Fazer o teste',
    vi: 'Làm bài test', id: 'Ikuti tes', tr: 'Testi çöz', pl: 'Zrób test',
  },
  dialogs: {
    ru: 'Открыть Диалоги', uk: 'Відкрити Діалоги', es: 'Abrir Diálogos', 'pt-BR': 'Abrir Diálogos',
    vi: 'Mở Hội thoại', id: 'Buka Dialog', tr: 'Diyaloglar’ı aç', pl: 'Otwórz Dialogi',
  },
  flashcards: {
    ru: 'Открыть карточки', uk: 'Відкрити картки', es: 'Abrir tarjetas', 'pt-BR': 'Abrir cartões',
    vi: 'Mở thẻ', id: 'Buka kartu', tr: 'Kartları aç', pl: 'Otwórz fiszki',
  },
  lessons: {
    ru: 'Открыть сессию', uk: 'Відкрити сесію', es: 'Abrir sesión', 'pt-BR': 'Abrir sessão',
    vi: 'Mở buổi học', id: 'Buka sesi', tr: 'Oturumu aç', pl: 'Otwórz sesję',
  },
  daily_tasks: {
    ru: 'Открыть задания', uk: 'Відкрити завдання', es: 'Abrir misiones', 'pt-BR': 'Abrir missões',
    vi: 'Mở nhiệm vụ', id: 'Buka misi', tr: 'Görevleri aç', pl: 'Otwórz zadania',
  },
} satisfies Record<string, CompassText>;

/** Человеческие подписи грамматических тем (POS) по Библии. Ключ = WordCategory. */
export const COMPASS_TOPIC_LABEL: Record<string, CompassText> = {
  verb: { ru: 'Глаголы', uk: 'Дієслова', es: 'Verbos', 'pt-BR': 'Verbos', vi: 'Động từ', id: 'Kata kerja', tr: 'Fiiller', pl: 'Czasowniki' },
  noun: { ru: 'Существительные', uk: 'Іменники', es: 'Sustantivos', 'pt-BR': 'Substantivos', vi: 'Danh từ', id: 'Kata benda', tr: 'İsimler', pl: 'Rzeczowniki' },
  pronoun: { ru: 'Местоимения', uk: 'Займенники', es: 'Pronombres', 'pt-BR': 'Pronomes', vi: 'Đại từ', id: 'Kata ganti', tr: 'Zamirler', pl: 'Zaimki' },
  adjective: { ru: 'Прилагательные', uk: 'Прикметники', es: 'Adjetivos', 'pt-BR': 'Adjetivos', vi: 'Tính từ', id: 'Kata sifat', tr: 'Sıfatlar', pl: 'Przymiotniki' },
  adverb: { ru: 'Наречия', uk: 'Прислівники', es: 'Adverbios', 'pt-BR': 'Advérbios', vi: 'Trạng từ', id: 'Kata keterangan', tr: 'Zarflar', pl: 'Przysłówki' },
  preposition: { ru: 'Предлоги', uk: 'Прийменники', es: 'Preposiciones', 'pt-BR': 'Preposições', vi: 'Giới từ', id: 'Kata depan', tr: 'Edatlar', pl: 'Przyimki' },
  article: { ru: 'Артикли a/the', uk: 'Артиклі a/the', es: 'Artículos a/the', 'pt-BR': 'Artigos a/the', vi: 'Mạo từ a/the', id: 'Artikel a/the', tr: 'Artikeller a/the', pl: 'Przedimki a/the' },
  modal: { ru: 'Модальные', uk: 'Модальні', es: 'Modales', 'pt-BR': 'Modais', vi: 'Động từ khuyết thiếu', id: 'Modal', tr: 'Kipler', pl: 'Modalne' },
  conjunction: { ru: 'Союзы', uk: 'Сполучники', es: 'Conjunciones', 'pt-BR': 'Conjunções', vi: 'Liên từ', id: 'Konjungsi', tr: 'Bağlaçlar', pl: 'Spójniki' },
  syntax: { ru: 'Порядок слов', uk: 'Порядок слів', es: 'Orden de palabras', 'pt-BR': 'Ordem das palavras', vi: 'Trật tự từ', id: 'Urutan kata', tr: 'Kelime sırası', pl: 'Szyk zdania' },
};

// ── Билдеры: собирают финальные строки приветствия/индакшна по дню + языку ──

/** Подставить имя в шаблон с «{name}» (имя уже очищено ридером онбординга). */
function withName(template: string, name: string): string {
  return template.replace('{name}', name);
}

/**
 * Собрать живое приветствие-обращение Компаса (АБЗАЦ из коротких предложений,
 * каждое — отдельная строка массива для красивого переноса в модале).
 *
 * Первый день:
 *   1) знакомство (с именем / без);
 *   2) если купил доступ — благодарность + чем помогает; иначе — роль Компаса;
 *      (роль показываем всегда, после благодарности тоже);
 *   3) куда держим курс — цель ученика своими словами (если известна);
 *   4) «ничего не навязываю»;
 *   5) «с чего хочешь начать знакомство?».
 *
 * Возврат: тёплое «я тебя помню» + мягкое приглашение продолжить.
 *
 * Обычные дни (easy/deep_dive/repair) → [] (комментарий берётся из COMPASS_DAY_COMMENT).
 */
export function buildCompassGreeting(day: CompassDay, lang: Lang): string[] {
  const name = (day.greetingName ?? '').trim();
  const lines: string[] = [];

  if (day.type === 'first_day') {
    const hello = triLang(lang, name ? COMPASS_HELLO_NAMED : COMPASS_HELLO);
    lines.push(name ? withName(hello, name) : hello);

    // Купил на онбординге — сначала благодарим (честно, чем покупка помогает).
    if (day.hasPremium) lines.push(triLang(lang, COMPASS_THANKS_PREMIUM));
    // Роль Компаса — всем.
    lines.push(triLang(lang, COMPASS_ROLE));

    // Куда держим курс — цель ученика по-человечески (если выбрана в онбординге).
    const goal = day.goal as CompassGoal | null | undefined;
    if (goal && COMPASS_GOAL_LINE[goal]) lines.push(triLang(lang, COMPASS_GOAL_LINE[goal]));

    lines.push(triLang(lang, COMPASS_NO_PRESSURE));
    lines.push(triLang(lang, COMPASS_WHERE_START));
    return lines;
  }

  if (day.type === 'comeback') {
    const back = triLang(lang, name ? COMPASS_BACK_NAMED : COMPASS_BACK);
    lines.push(name ? withName(back, name) : back);
    lines.push(triLang(lang, COMPASS_BACK_INVITE));
    return lines;
  }

  return [];
}

/** Тексты индакшн-блока (заголовок, подсказка, кнопка) или null, если фичи нет. */
export function buildCompassInduction(
  feature: CompassInductionFeature | undefined,
  lang: Lang,
): { label: string; text: string; cta: string } | null {
  if (!feature) return null;
  return {
    label: triLang(lang, COMPASS_INDUCTION_LABEL),
    text: triLang(lang, COMPASS_INDUCTION_TEXT[feature]),
    cta: triLang(lang, COMPASS_INDUCTION_CTA[feature]),
  };
}
