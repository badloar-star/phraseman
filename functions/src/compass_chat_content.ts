// ═══════════════════════════════════════════════════════════════════════════
// compass_chat_content.ts — контент дневных постов Компаса в чате лиги.
//
// Принцип стоимости: Компас пишет ОДИН пост в день на группу. Пост — это
// системное сообщение (kind:'system'), которое читается тем же realtime-
// слушателем, что и обычные сообщения → НИКАКИХ дополнительных reads на юзера.
//
// Локализация: пост несёт карту i18n со всеми 8 языками интерфейса
// (ru/uk/es/pt-BR/vi/id/tr/pl). Клиент рендерит строку своего языка, поэтому
// серверу НЕ нужно знать язык группы и не нужен перевод в рантайме.
//
// Тон Компаса (КАНОН): от первого лица, по-человечески, БЕЗ слоганов/пафоса/
// вранья о юзере/вины. Короткий хвост-вопрос, чтобы был лёгкий повод ответить.
//
// Контент детерминирован по дате (seed = номер дня), поэтому одна и та же дата
// даёт один и тот же пост во всех группах — без AI-вызовов и без рандома.
// ═══════════════════════════════════════════════════════════════════════════

export type CompassChatLang = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

export const COMPASS_CHAT_LANGS: readonly CompassChatLang[] = [
  'ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl',
];

/** Полностью локализованная строка (все 8 языков обязательны — без fallback на чужой язык). */
export type CompassI18n = Record<CompassChatLang, string>;

/** Категория дневного поста — управляет иконкой системного сообщения в UI. */
export type CompassPostKind = 'word_of_day' | 'fact' | 'question' | 'poll';

export interface CompassPollOption {
  /** Стабильный ключ варианта (для счётчиков голосов: votes[key]). */
  key: string;
  /** Локализованная подпись кнопки. */
  label: CompassI18n;
  /** true — правильный вариант (для квизов; для опросов-мнений можно не ставить). */
  correct?: boolean;
}

export interface CompassPost {
  kind: CompassPostKind;
  /** Тип системного сообщения для иконки (см. LeagueChatSystemType). */
  systemType: 'generic';
  /** Основной текст поста (локализованный). */
  i18n: CompassI18n;
  /** Варианты для опроса/квиза (только при kind:'poll'). */
  poll?: CompassPollOption[];
}

// ── Слова дня ───────────────────────────────────────────────────────────────
const WORDS_OF_DAY: CompassI18n[] = [
  {
    ru: 'Сегодня принёс вам слово overwhelmed — это когда всего навалилось и голова кругом. «I felt overwhelmed at work today». Узнаёте состояние? Расскажите, когда последний раз так было.',
    uk: 'Сьогодні приніс вам слово overwhelmed — це коли всього навалилося й голова обертом. «I felt overwhelmed at work today». Упізнаєте стан? Розкажіть, коли востаннє так було.',
    es: 'Hoy os traigo la palabra overwhelmed — es cuando todo se te junta y la cabeza da vueltas. «I felt overwhelmed at work today». ¿Os suena? Contadme cuándo fue la última vez.',
    'pt-BR': 'Hoje trouxe a palavra overwhelmed — é quando tudo se acumula e a cabeça roda. «I felt overwhelmed at work today». Reconhecem? Contem quando foi a última vez.',
    vi: 'Hôm nay tôi mang đến từ overwhelmed — là khi mọi thứ dồn đến và đầu óc quay cuồng. «I felt overwhelmed at work today». Bạn thấy quen không? Kể xem lần gần nhất là khi nào.',
    id: 'Hari ini saya bawa kata overwhelmed — saat semua menumpuk dan kepala pening. «I felt overwhelmed at work today». Kenal rasanya? Cerita dong kapan terakhir kali.',
    tr: 'Bugün size overwhelmed kelimesini getirdim — her şeyin üst üste binip kafanın dönmesi. «I felt overwhelmed at work today». Tanıdık geldi mi? En son ne zaman böyle oldu, anlatın.',
    pl: 'Dziś przynoszę wam słowo overwhelmed — to gdy wszystko się nawarstwia i głowa pęka. «I felt overwhelmed at work today». Znacie to? Napiszcie, kiedy ostatnio tak było.',
  },
  {
    ru: 'Слово дня — cozy. Тёплое, уютное, когда хочется завернуться в плед. «A cozy little café». Где для вас самое cozy место? Назовите по-английски, как сможете.',
    uk: 'Слово дня — cozy. Тепле, затишне, коли хочеться загорнутись у плед. «A cozy little café». Де для вас найзатишніше місце? Назвіть англійською, як зможете.',
    es: 'Palabra del día — cozy. Cálido, acogedor, de envolverse en una manta. «A cozy little café». ¿Cuál es vuestro sitio más cozy? Decidlo en inglés, como podáis.',
    'pt-BR': 'Palavra do dia — cozy. Quentinho, aconchegante, de se enrolar numa manta. «A cozy little café». Qual é o lugar mais cozy pra vocês? Digam em inglês, como der.',
    vi: 'Từ của ngày — cozy. Ấm áp, dễ chịu, kiểu muốn cuộn trong chăn. «A cozy little café». Nơi cozy nhất với bạn là đâu? Nói bằng tiếng Anh, sao cũng được.',
    id: 'Kata hari ini — cozy. Hangat, nyaman, ingin berselimut. «A cozy little café». Tempat paling cozy buat kamu di mana? Sebut pakai bahasa Inggris, semampunya.',
    tr: 'Günün kelimesi — cozy. Sıcak, rahat, battaniyeye sarılasın gibi. «A cozy little café». Sizin için en cozy yer neresi? İngilizce söyleyin, nasıl olursa.',
    pl: 'Słowo dnia — cozy. Ciepłe, przytulne, jak otulić się kocem. «A cozy little café». Jakie jest wasze najbardziej cozy miejsce? Powiedzcie po angielsku, jak umiecie.',
  },
  {
    ru: 'Слово дня — to nail it, «сделать идеально, попасть в точку». «You nailed that presentation». Что у вас недавно получилось на отлично? Похвалитесь — это полезно.',
    uk: 'Слово дня — to nail it, «зробити ідеально, влучити в ціль». «You nailed that presentation». Що вам нещодавно вдалося на відмінно? Похваліться — це корисно.',
    es: 'Frase del día — to nail it, «clavarlo, hacerlo perfecto». «You nailed that presentation». ¿Qué os ha salido genial últimamente? Presumid un poco, viene bien.',
    'pt-BR': 'Expressão do dia — to nail it, «mandar bem, acertar em cheio». «You nailed that presentation». O que deu certo pra vocês há pouco? Contem, faz bem.',
    vi: 'Cụm của ngày — to nail it, «làm hoàn hảo, trúng phóc». «You nailed that presentation». Gần đây bạn làm tốt việc gì? Khoe đi, có ích lắm.',
    id: 'Frasa hari ini — to nail it, «berhasil sempurna, tepat sasaran». «You nailed that presentation». Apa yang baru-baru ini kamu kerjakan dengan bagus? Pamer dikit, bagus kok.',
    tr: 'Günün kalıbı — to nail it, «tam isabet, kusursuz yapmak». «You nailed that presentation». Son zamanlarda neyi çok iyi yaptınız? Övünün biraz, faydası var.',
    pl: 'Zwrot dnia — to nail it, «zrobić idealnie, trafić w punkt». «You nailed that presentation». Co wam ostatnio wyszło świetnie? Pochwalcie się, to pomaga.',
  },
];

// ── Факты про английский ──────────────────────────────────────────────────────
const FACTS: CompassI18n[] = [
  {
    ru: 'Забавное: у слова set больше 400 значений — больше любого другого английского слова. Так что если вы в нём путаетесь — вы не одни. Какое слово бесит вас больше всего?',
    uk: 'Цікаве: у слова set понад 400 значень — більше за будь-яке інше англійське слово. Тож якщо ви в ньому плутаєтесь — ви не самі. Яке слово дратує вас найбільше?',
    es: 'Curioso: la palabra set tiene más de 400 significados — más que cualquier otra en inglés. Si os lía, no sois los únicos. ¿Qué palabra os saca de quicio?',
    'pt-BR': 'Curioso: a palavra set tem mais de 400 significados — mais que qualquer outra em inglês. Se confunde vocês, não estão sozinhos. Que palavra mais irrita vocês?',
    vi: 'Thú vị: từ set có hơn 400 nghĩa — nhiều hơn bất kỳ từ tiếng Anh nào. Nên nếu bạn rối với nó, bạn không cô đơn đâu. Từ nào làm bạn bực nhất?',
    id: 'Menarik: kata set punya lebih dari 400 arti — terbanyak dari semua kata Inggris. Jadi kalau kamu bingung, kamu tidak sendiri. Kata apa yang paling bikin kesal?',
    tr: 'İlginç: set kelimesinin 400’den fazla anlamı var — başka hiçbir İngilizce kelimede yok. Kafanız karışıyorsa yalnız değilsiniz. Sizi en çok hangi kelime çıldırtıyor?',
    pl: 'Ciekawostka: słowo set ma ponad 400 znaczeń — więcej niż jakiekolwiek inne angielskie słowo. Jeśli was myli, nie jesteście sami. Które słowo wkurza was najbardziej?',
  },
  {
    ru: 'Любопытно: самое длинное английское слово без повторов букв — uncopyrightable (15 букв). Я сам не сразу его выговорил. А какое английское слово вам труднее всего произнести?',
    uk: 'Цікаво: найдовше англійське слово без повторів літер — uncopyrightable (15 літер). Я сам не одразу його вимовив. А яке англійське слово вам найважче вимовити?',
    es: 'Curiosidad: la palabra inglesa más larga sin letras repetidas es uncopyrightable (15 letras). A mí tampoco me salió a la primera. ¿Cuál os cuesta más pronunciar?',
    'pt-BR': 'Curiosidade: a palavra inglesa mais longa sem letras repetidas é uncopyrightable (15 letras). Nem eu falei de primeira. Qual é mais difícil de pronunciar pra vocês?',
    vi: 'Thú vị: từ tiếng Anh dài nhất không lặp chữ cái là uncopyrightable (15 chữ). Tôi cũng đâu nói trôi ngay. Còn bạn, từ nào khó phát âm nhất?',
    id: 'Menarik: kata Inggris terpanjang tanpa huruf berulang adalah uncopyrightable (15 huruf). Saya juga tak langsung bisa. Kata mana yang paling sulit kamu ucapkan?',
    tr: 'İlginç: harfleri tekrarsız en uzun İngilizce kelime uncopyrightable (15 harf). Ben de ilk seferde diyemedim. Sizin telaffuzu en zor kelimeniz hangisi?',
    pl: 'Ciekawostka: najdłuższe angielskie słowo bez powtórzeń liter to uncopyrightable (15 liter). Mnie też nie wyszło od razu. Które słowo najtrudniej wam wymówić?',
  },
];

// ── Открытые вопросы (icebreaker) ─────────────────────────────────────────────
const QUESTIONS: CompassI18n[] = [
  {
    ru: 'Простой вопрос на сегодня: на каком фильме или сериале вы реально подтянули английский? Мне правда интересно — поделитесь.',
    uk: 'Просте питання на сьогодні: на якому фільмі чи серіалі ви справді підтягнули англійську? Мені дійсно цікаво — поділіться.',
    es: 'Pregunta sencilla de hoy: ¿con qué película o serie mejorasteis de verdad el inglés? Me interesa de verdad — contadme.',
    'pt-BR': 'Pergunta simples de hoje: com qual filme ou série vocês realmente melhoraram o inglês? Tenho curiosidade de verdade — contem.',
    vi: 'Câu hỏi đơn giản hôm nay: bạn giỏi tiếng Anh lên nhờ phim hay series nào? Tôi tò mò thật đấy — chia sẻ nhé.',
    id: 'Pertanyaan sederhana hari ini: lewat film atau serial apa kamu benar-benar jago bahasa Inggris? Saya penasaran beneran — cerita ya.',
    tr: 'Bugünün basit sorusu: İngilizcenizi gerçekten hangi film ya da diziyle ilerlettiniz? Cidden merak ediyorum — anlatın.',
    pl: 'Proste pytanie na dziś: przy jakim filmie albo serialu naprawdę podciągnęliście angielski? Serio mnie to ciekawi — napiszcie.',
  },
  {
    ru: 'Скажите честно: что было самым трудным в английском лично для вас? У каждого своё больное место — может, вместе и легче.',
    uk: 'Скажіть чесно: що було найважчим в англійській саме для вас? У кожного своє болюче місце — може, разом і легше.',
    es: 'Decidme con sinceridad: ¿qué fue lo más difícil del inglés para vosotros? Cada uno tiene su punto débil — juntos quizá pesa menos.',
    'pt-BR': 'Digam com sinceridade: o que foi mais difícil no inglês pra vocês? Cada um tem seu ponto fraco — juntos talvez pese menos.',
    vi: 'Nói thật nhé: với riêng bạn, điều khó nhất trong tiếng Anh là gì? Ai cũng có điểm yếu — cùng nhau có lẽ nhẹ hơn.',
    id: 'Jujur ya: apa yang paling sulit dari bahasa Inggris buat kamu? Tiap orang punya titik lemah — bareng-bareng mungkin lebih ringan.',
    tr: 'Açıkça söyleyin: İngilizcede sizin için en zor olan neydi? Herkesin bir zayıf noktası var — birlikte belki daha kolaydır.',
    pl: 'Powiedzcie szczerze: co było dla was najtrudniejsze w angielskim? Każdy ma swój słaby punkt — razem może lżej.',
  },
];

// ── Квизы с кнопками (poll) ───────────────────────────────────────────────────
const POLLS: CompassPost[] = [
  {
    kind: 'poll',
    systemType: 'generic',
    i18n: {
      ru: 'Маленькая проверка, без подвоха. Как сказать «Я живу здесь с понедельника»? Жмите вариант — вечером посмотрим, кто как ответил.',
      uk: 'Маленька перевірка, без підступу. Як сказати «Я живу тут з понеділка»? Тисніть варіант — увечері подивимось, хто як відповів.',
      es: 'Una pequeña prueba, sin trampa. ¿Cómo se dice «Vivo aquí desde el lunes»? Pulsad una opción — por la tarde vemos quién respondió qué.',
      'pt-BR': 'Um testezinho, sem pegadinha. Como dizer «Moro aqui desde segunda»? Toquem numa opção — à noite vemos quem respondeu o quê.',
      vi: 'Một bài kiểm tra nhỏ, không bẫy đâu. Nói «Tôi sống ở đây từ thứ Hai» thế nào? Bấm một đáp án — tối xem ai chọn gì nhé.',
      id: 'Tes kecil, tanpa jebakan. Bagaimana mengatakan «Saya tinggal di sini sejak Senin»? Tekan satu pilihan — nanti malam kita lihat siapa jawab apa.',
      tr: 'Küçük bir test, tuzak yok. «Pazartesiden beri burada yaşıyorum» nasıl denir? Bir şık seçin — akşam kimin ne dediğine bakarız.',
      pl: 'Mały sprawdzian, bez podchwytliwości. Jak powiedzieć «Mieszkam tu od poniedziałku»? Kliknijcie opcję — wieczorem zobaczymy, kto co wybrał.',
    },
    poll: [
      {
        key: 'a',
        label: { ru: 'I live here since Monday', uk: 'I live here since Monday', es: 'I live here since Monday', 'pt-BR': 'I live here since Monday', vi: 'I live here since Monday', id: 'I live here since Monday', tr: 'I live here since Monday', pl: 'I live here since Monday' },
      },
      {
        key: 'b',
        label: { ru: "I've lived here since Monday", uk: "I've lived here since Monday", es: "I've lived here since Monday", 'pt-BR': "I've lived here since Monday", vi: "I've lived here since Monday", id: "I've lived here since Monday", tr: "I've lived here since Monday", pl: "I've lived here since Monday" },
        correct: true,
      },
    ],
  },
  {
    kind: 'poll',
    systemType: 'generic',
    i18n: {
      ru: 'Решайте сами: про что сделать слова на следующей неделе? Жмите вариант — выберу тему по большинству.',
      uk: 'Вирішуйте самі: про що зробити слова наступного тижня? Тисніть варіант — оберу тему за більшістю.',
      es: 'Decidid vosotros: ¿de qué tema hago las palabras la próxima semana? Pulsad una opción — elijo por mayoría.',
      'pt-BR': 'Decidam vocês: sobre qual tema faço as palavras na próxima semana? Toquem numa opção — escolho pela maioria.',
      vi: 'Bạn quyết định: tuần sau làm từ vựng theo chủ đề nào? Bấm một đáp án — tôi chọn theo số đông.',
      id: 'Kalian yang putuskan: minggu depan kata-katanya bertema apa? Tekan satu pilihan — saya ikut suara terbanyak.',
      tr: 'Karar sizin: gelecek hafta kelimeleri hangi konuda yapayım? Bir şık seçin — çoğunluğa göre seçerim.',
      pl: 'Wy decydujcie: o czym zrobić słówka w przyszłym tygodniu? Kliknijcie opcję — wybiorę większością.',
    },
    poll: [
      { key: 'travel', label: { ru: '✈️ Путешествия', uk: '✈️ Подорожі', es: '✈️ Viajes', 'pt-BR': '✈️ Viagens', vi: '✈️ Du lịch', id: '✈️ Travel', tr: '✈️ Seyahat', pl: '✈️ Podróże' } },
      { key: 'work', label: { ru: '💼 Работа', uk: '💼 Робота', es: '💼 Trabajo', 'pt-BR': '💼 Trabalho', vi: '💼 Công việc', id: '💼 Kerja', tr: '💼 İş', pl: '💼 Praca' } },
      { key: 'series', label: { ru: '🎬 Сериалы', uk: '🎬 Серіали', es: '🎬 Series', 'pt-BR': '🎬 Séries', vi: '🎬 Phim bộ', id: '🎬 Serial', tr: '🎬 Diziler', pl: '🎬 Seriale' } },
    ],
  },
];

// ── Ротация по дню ────────────────────────────────────────────────────────────

/** Номер дня от эпохи (UTC) — детерминированный seed без Math.random(). */
export function getDaySeed(now: Date = new Date()): number {
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
}

/**
 * Выбор поста дня. Чередуем форматы по дню недели цикла, чтобы Компас не был
 * однообразным: слово → факт → вопрос → опрос → слово → факт → вопрос (7 дней).
 */
export function pickCompassPostForDay(seed: number): CompassPost {
  const rotation: CompassPostKind[] = ['word_of_day', 'fact', 'question', 'poll', 'word_of_day', 'question', 'fact'];
  const kind = rotation[((seed % rotation.length) + rotation.length) % rotation.length];

  const at = <T>(arr: T[]): T => arr[((seed % arr.length) + arr.length) % arr.length];

  switch (kind) {
    case 'word_of_day':
      return { kind, systemType: 'generic', i18n: at(WORDS_OF_DAY) };
    case 'fact':
      return { kind, systemType: 'generic', i18n: at(FACTS) };
    case 'question':
      return { kind, systemType: 'generic', i18n: at(QUESTIONS) };
    case 'poll':
      return at(POLLS);
    default:
      return { kind: 'question', systemType: 'generic', i18n: at(QUESTIONS) };
  }
}
