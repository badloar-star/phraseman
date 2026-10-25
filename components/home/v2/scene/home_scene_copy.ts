// ═══════════════════════════════════════════════════════════════════════════
// home_scene_copy.ts — тексты «Сцены» Главной для каждого состояния героя.
//
// зачем (эталон home-new-concepts.html, раздел A + home-scene-states.html): сцена говорит одно главное — что дальше.
// Тексты — из утверждённых макетов; где макет показывал данные, которых Главная не знает (номер задания внутри эпизода),
// стоит то, что она знает честно (пройдено из выпущенного в уроке, как у нынешней карточки «Продолжить»).
// Переводы кроме RU — предложение, носителем не проверены (передать 10 · ПЕРЕВОДЧИК).
// ═══════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../../../constants/i18n';
import type { HomeSceneState } from './home_scene_state';

export type HomeSceneChipKind = 'words' | 'theory' | 'cards' | 'phrase' | 'video' | 'review';

export type HomeSceneCopyInput = Readonly<{
  lang: Lang;
  state: HomeSceneState;
  zeroEnergyNote: boolean;
  /** Подпись места, как у нынешней карточки: «Урок 1», «Диалог», «Карточки». null — нет. */
  badge: string | null;
  /** Номер эпизода курса (sessionOrdinal), если продолжаем курс V2. */
  episode: number | null;
  /** Название следующего шага (эпизод, урок, диалог, набор). */
  title: string;
  /** Пройдено из выпущенного в уроке. */
  progress: Readonly<{ done: number; total: number }> | null;
  streakDays: number;
  minutesToMidnight: number;
  daysAway: number | null;
  /** Минут до следующей энергии; null — неизвестно. */
  energyMinutes: number | null;
  /** Есть ли экран теории для урока (чип «Теория»). */
  theoryAvailable: boolean;
  /** Словарь урока подключён к «Урокам» (чип «Слова»); до этого — false (координатор 22.10). */
  wordsAvailable: boolean;
  /** Сколько дней была серия до разрыва (для «серия прервалась»); null — не показываем число. */
  lostStreakDays: number | null;
  /** Куда ведёт кнопка (homeSceneCtaTarget). Нет — прежнее поведение (надпись V2). */
  ctaTarget?: HomeSceneCtaTarget;
  /** Номер урока цели (для «Продолжить урок N» старого курса); null — не знаем. */
  lessonNo?: number | null;
}>;

/**
 * Куда ведёт кнопка «Сцены». Главная выбирает по ЭТОЙ цели и обработчик тапа, и надпись — в одном рендере.
 * зачем (жалоба владельца 25.10 «Ещё эпизод → открывается классическое меню»; Сверка [HOME-CONTINUE]: на холодном старте
 * выбор none → v2 → legacy, а надпись «день засчитан» всегда была «Ещё эпизод»): надпись и переход больше не расходятся.
 */
export type HomeSceneCtaTarget = 'section' | 'place' | 'start' | 'v2' | 'legacy' | 'unknown';

export function homeSceneCtaTarget(i: Readonly<{
  /** Сцена — место первого доступного раздела (продолжать нечего, «Уроков» для языка нет). */
  section: boolean;
  /** Продолжаем диалог или карточки. */
  place: boolean;
  /** Меток нет — «Начать урок 1». */
  start: boolean;
  /** Продолжаем занятие курса V2. */
  v2: boolean;
  /** Есть последний урок старого курса. */
  legacy: boolean;
}>): HomeSceneCtaTarget {
  if (i.section) return 'section';
  if (i.place) return 'place';
  if (i.start) return 'start';
  if (i.v2) return 'v2';
  if (i.legacy) return 'legacy';
  return 'unknown';
}

export type HomeSceneCopy = Readonly<{
  kicker: string;
  title: string;
  /** Строка под заголовком (прогресс или пояснение). */
  line: string | null;
  /** Полоса прогресса рядом со строкой (0..1); null — без полосы. */
  bar: number | null;
  /** Тёплая строка вечера (огонь). */
  warm: string | null;
  cta: string | null;
  note: string | null;
  chips: readonly HomeSceneChipKind[];
}>;

const ruDays = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'день' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'дня' : 'дней');
const ukDays = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'день' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'дні' : 'днів');
const plDays = (n: number) => (n === 1 ? 'dzień' : 'dni');
const en1 = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Неразрывный пробел: держит вместе слова одного куска заголовка (см. untilMidnight). */
const NBSP = ' ';

const T = {
  episode: (lang: Lang) => triLang(lang, { ru: 'Эпизод', uk: 'Епізод', en: 'Episode', es: 'Episodio', 'pt-BR': 'Episódio', vi: 'Tập', id: 'Episode', tr: 'Bölüm', pl: 'Odcinek' }),
  start: (lang: Lang) => triLang(lang, { ru: 'Начать', uk: 'Почати', en: 'Start', es: 'Empezar', 'pt-BR': 'Começar', vi: 'Bắt đầu', id: 'Mulai', tr: 'Başla', pl: 'Zacznij' }),
  cont: (lang: Lang) => triLang(lang, { ru: 'Продолжить', uk: 'Продовжити', en: 'Continue', es: 'Continuar', 'pt-BR': 'Continuar', vi: 'Tiếp tục', id: 'Lanjutkan', tr: 'Devam et', pl: 'Kontynuuj' }),
  contEp: (lang: Lang, n: number) => triLang(lang, { ru: `Продолжить эпизод ${n}`, uk: `Продовжити епізод ${n}`, en: `Continue episode ${n}`, es: `Continuar episodio ${n}`, 'pt-BR': `Continuar episódio ${n}`, vi: `Tiếp tục tập ${n}`, id: `Lanjutkan episode ${n}`, tr: `${n}. bölüme devam et`, pl: `Kontynuuj odcinek ${n}` }),
  // зачем (жалоба владельца 25.10): кнопка ведёт в урок старого курса — надпись про урок, а не «Ещё эпизод»; переводы — черновик для 10 · ПЕРЕВОДЧИКА
  contLesson: (lang: Lang, n: number) => triLang(lang, { ru: `Продолжить урок ${n}`, uk: `Продовжити урок ${n}`, en: `Continue lesson ${n}`, es: `Continuar la lección ${n}`, 'pt-BR': `Continuar a lição ${n}`, vi: `Tiếp tục bài ${n}`, id: `Lanjutkan pelajaran ${n}`, tr: `${n}. derse devam et`, pl: `Kontynuuj lekcję ${n}` }),
  moreEp: (lang: Lang) => triLang(lang, { ru: 'Ещё эпизод', uk: 'Ще епізод', en: 'One more episode', es: 'Otro episodio', 'pt-BR': 'Mais um episódio', vi: 'Thêm một tập', id: 'Satu episode lagi', tr: 'Bir bölüm daha', pl: 'Jeszcze jeden odcinek' }),
  of: (lang: Lang, d: number, t: number) => triLang(lang, { ru: `${d} из ${t}`, uk: `${d} з ${t}`, en: `${d} of ${t}`, es: `${d} de ${t}`, 'pt-BR': `${d} de ${t}`, vi: `${d}/${t}`, id: `${d} dari ${t}`, tr: `${d}/${t}`, pl: `${d} z ${t}` }),
  streak: (lang: Lang, n: number) => triLang(lang, { ru: `Серия ${n} ${ruDays(n)}`, uk: `Серія ${n} ${ukDays(n)}`, en: `${n}-day streak`, es: `Racha de ${n} ${en1(n, 'día', 'días')}`, 'pt-BR': `Sequência de ${n} ${en1(n, 'dia', 'dias')}`, vi: `Chuỗi ${n} ngày`, id: `Rangkaian ${n} hari`, tr: `${n} günlük seri`, pl: `Seria ${n} ${plDays(n)}` }),
  untilMidnight: (lang: Lang, mins: number) => {
    const h = Math.floor(mins / 60); const m = mins % 60;
    const t = (hs: string, ms: string): string => (h === 0 ? `${m} ${ms}` : `${h} ${hs} ${m} ${ms}`);
    // два куска: фраза и время; внутри куска пробелы неразрывные, между кусками — обычный (там и рвётся строка)
    const pair = triLang(lang, {
      ru: ['До полуночи', t('ч', 'мин')],
      uk: ['До півночі', t('год', 'хв')],
      en: [t('h', 'min'), 'until midnight'],
      es: [t('h', 'min'), 'hasta medianoche'],
      'pt-BR': [t('h', 'min'), 'até a meia-noite'],
      vi: [`Còn ${t('giờ', 'phút')}`, 'đến nửa đêm'],
      id: [t('jam', 'menit'), 'sebelum tengah malam'],
      tr: ['Gece yarısına', t('sa', 'dk')],
      pl: ['Do północy', t('godz.', 'min')],
    });
    return (pair as readonly string[]).map((chunk) => chunk.replace(/ /g, NBSP)).join(' ');
  },
  // зачем (голос PhraseMan, VOICE.md, владелец 25.10): живо и лично, без канцелярита
  keeps: (lang: Lang) => triLang(lang, { ru: 'Одно занятие — и серия спасена', uk: 'Одне заняття — і серію врятовано', en: 'One session and your streak is saved', es: 'Una sesión y tu racha está a salvo', 'pt-BR': 'Uma sessão e sua sequência está salva', vi: 'Một buổi học là chuỗi được cứu', id: 'Satu sesi dan rangkaianmu selamat', tr: 'Bir oturum ve serin kurtuldu', pl: 'Jedne zajęcia i seria uratowana' }),
  energyBeforeMidnight: (lang: Lang, n: number) => triLang(lang, { ru: `Энергия +1 через ${n} мин — успеешь до полуночи`, uk: `Енергія +1 через ${n} хв — встигнеш до півночі`, en: `+1 energy in ${n} min — you'll make it before midnight`, es: `+1 de energía en ${n} min: llegas antes de medianoche`, 'pt-BR': `+1 de energia em ${n} min — dá tempo antes da meia-noite`, vi: `+1 năng lượng sau ${n} phút — kịp trước nửa đêm`, id: `+1 energi dalam ${n} menit — masih sempat sebelum tengah malam`, tr: `${n} dk sonra +1 enerji — gece yarısından önce yetişirsin`, pl: `+1 energii za ${n} min — zdążysz przed północą` }),
  dayCounted: (lang: Lang) => triLang(lang, { ru: 'День засчитан', uk: 'День зараховано', en: 'Day counted', es: 'Día contado', 'pt-BR': 'Dia contado', vi: 'Đã tính ngày hôm nay', id: 'Hari ini terhitung', tr: 'Gün sayıldı', pl: 'Dzień zaliczony' }),
  next: (lang: Lang, title: string) => triLang(lang, { ru: `Дальше: ${title}`, uk: `Далі: ${title}`, en: `Next: ${title}`, es: `Siguiente: ${title}`, 'pt-BR': `A seguir: ${title}`, vi: `Tiếp theo: ${title}`, id: `Berikutnya: ${title}`, tr: `Sıradaki: ${title}`, pl: `Dalej: ${title}` }),
  energyIn: (lang: Lang, n: number | null) => (n === null
    ? triLang(lang, { ru: 'Энергия скоро вернётся', uk: 'Енергія скоро повернеться', en: 'Energy is coming back soon', es: 'La energía vuelve pronto', 'pt-BR': 'A energia volta logo', vi: 'Năng lượng sắp hồi lại', id: 'Energi segera kembali', tr: 'Enerji birazdan dolar', pl: 'Energia zaraz wróci' })
    : triLang(lang, { ru: `Энергия вернётся через ${n} мин`, uk: `Енергія повернеться через ${n} хв`, en: `Energy back in ${n} min`, es: `La energía vuelve en ${n} min`, 'pt-BR': `A energia volta em ${n} min`, vi: `Năng lượng hồi sau ${n} phút`, id: `Energi kembali dalam ${n} menit`, tr: `Enerji ${n} dk sonra dolar`, pl: `Energia wróci za ${n} min` })),
  noEnergyLine: (lang: Lang) => triLang(lang, { ru: 'Пока можно заниматься без энергии', uk: 'Поки можна займатися без енергії', en: 'Meanwhile, practice without energy', es: 'Mientras tanto, practica sin energía', 'pt-BR': 'Enquanto isso, pratique sem energia', vi: 'Trong lúc chờ, hãy học không cần năng lượng', id: 'Sementara itu, belajar tanpa energi', tr: 'Bu arada enerjisiz çalış', pl: 'W międzyczasie ucz się bez energii' }),
  plusNoEnergy: (lang: Lang) => triLang(lang, { ru: 'С Plus без энергии', uk: 'З Plus без енергії', en: 'With Plus, no energy needed', es: 'Con Plus, sin energía', 'pt-BR': 'Com Plus, sem energia', vi: 'Với Plus, không cần năng lượng', id: 'Dengan Plus, tanpa energi', tr: 'Plus ile enerji gerekmez', pl: 'Z Plus bez energii' }),
  // зачем (координатор 22.10: приветствие без рода): es «Bienvenido» и pt-BR «Bem-vindo» мужского рода — короткие безродные «Hola de nuevo» / «Olá de novo»
  welcome: (lang: Lang) => triLang(lang, { ru: 'С возвращением!', uk: 'З поверненням!', en: 'Welcome back!', es: '¡Hola de nuevo!', 'pt-BR': 'Olá de novo!', vi: 'Chào mừng trở lại!', id: 'Selamat datang kembali!', tr: 'Tekrar hoş geldin!', pl: 'Witaj z powrotem!' }),
  // зачем (VOICE.md): «где остановились» — без рода («где ты его оставил» угадывал бы род)
  resumeAt: (lang: Lang, n: number) => triLang(lang, { ru: `Эпизод ${n} ждёт там, где остановились`, uk: `Епізод ${n} чекає там, де зупинилися`, en: `Episode ${n} is right where we left off`, es: `El episodio ${n} te espera donde lo dejamos`, 'pt-BR': `O episódio ${n} está bem onde paramos`, vi: `Tập ${n} đang chờ ngay chỗ mình dừng`, id: `Episode ${n} menunggu di tempat kita berhenti`, tr: `${n}. bölüm kaldığımız yerde seni bekliyor`, pl: `Odcinek ${n} czeka tam, gdzie przerwaliśmy` }),
  // зачем (владелец 22.10 через координатора: дни считаются без ЗАХОДА в приложение): id «absen» = неявка на занятия, поэтому «tidak mampir» — «не заглядывал»
  away: (lang: Lang, n: number) => triLang(lang, { ru: `Тебя не было ${n} ${ruDays(n)}. Начни с короткого повтора`, uk: `Тебе не було ${n} ${ukDays(n)}. Почни з короткого повторення`, en: `You've been away ${n} ${en1(n, 'day', 'days')}. Start with a quick review`, es: `Estuviste fuera ${n} ${en1(n, 'día', 'días')}. Empieza con un repaso corto`, 'pt-BR': `Você ficou ${n} ${en1(n, 'dia', 'dias')} fora. Comece com uma revisão rápida`, vi: `Bạn đã vắng ${n} ngày. Hãy bắt đầu bằng ôn tập ngắn`, id: `Sudah ${n} hari kamu tidak mampir. Mulai dengan ulasan singkat`, tr: `${n} gündür yoktun. Kısa bir tekrarla başla`, pl: `Nie było cię ${n} ${plDays(n)}. Zacznij od krótkiej powtórki` }),
  lost: (lang: Lang) => triLang(lang, { ru: 'Серия прервалась', uk: 'Серія перервалася', en: 'Your streak ended', es: 'Tu racha se cortó', 'pt-BR': 'Sua sequência acabou', vi: 'Chuỗi đã bị ngắt', id: 'Rangkaianmu terputus', tr: 'Serin bozuldu', pl: 'Seria przerwana' }),
  newStreak: (lang: Lang) => triLang(lang, { ru: 'Начнём новую серию', uk: 'Почнімо нову серію', en: "Let's start a new streak", es: 'Empecemos una nueva racha', 'pt-BR': 'Vamos começar uma nova sequência', vi: 'Bắt đầu chuỗi mới nào', id: 'Ayo mulai rangkaian baru', tr: 'Yeni bir seri başlatalım', pl: 'Zacznijmy nową serię' }),
  // зачем (VOICE.md): без метафоры «огонь снова загорится» — что делать и что будет
  flameBack: (lang: Lang) => triLang(lang, { ru: 'Не беда — одно занятие, и начинаем новую', uk: 'Не біда — одне заняття, і починаємо нову', en: 'No biggie — one session and we start a new one', es: 'No pasa nada: una sesión y empezamos otra', 'pt-BR': 'Sem problema — uma sessão e começamos outra', vi: 'Không sao — một buổi học là bắt đầu chuỗi mới', id: 'Tidak apa — satu sesi dan kita mulai yang baru', tr: 'Dert değil — bir oturum ve yenisine başlıyoruz', pl: 'Nic straconego — jedne zajęcia i zaczynamy nową' }),
  wasDays: (lang: Lang, n: number) => triLang(lang, { ru: `Было ${n} ${ruDays(n)}.`, uk: `Було ${n} ${ukDays(n)}.`, en: `It was ${n} ${en1(n, 'day', 'days')}.`, es: `Eran ${n} ${en1(n, 'día', 'días')}.`, 'pt-BR': `Eram ${n} ${en1(n, 'dia', 'dias')}.`, vi: `Đã có ${n} ngày.`, id: `Sebelumnya ${n} hari.`, tr: `${n} gündü.`, pl: `Było ${n} ${plDays(n)}.` }),
  exam: (lang: Lang) => triLang(lang, { ru: 'Экзамен главы на старте', uk: 'Іспит розділу на старті', en: 'Chapter exam is ready to go', es: 'El examen del capítulo está listo', 'pt-BR': 'O exame do capítulo está pronto', vi: 'Bài thi chương đã sẵn sàng', id: 'Ujian bab siap dimulai', tr: 'Ünite sınavı hazır', pl: 'Egzamin rozdziału czeka na start' }),
  // зачем (VOICE.md + эталон e481d8723): без «сдать от 10» — только «12 вопросов», живо
  examLine: (lang: Lang) => triLang(lang, { ru: '12 вопросов. Проверим, что осело в голове?', uk: '12 питань. Перевіримо, що осіло в голові?', en: "12 questions. Let's see what stuck", es: '12 preguntas. ¿Vemos qué se te quedó?', 'pt-BR': '12 perguntas. Vamos ver o que ficou na cabeça?', vi: '12 câu hỏi. Xem điều gì đã đọng lại nhé?', id: '12 soal. Yuk cek apa yang nyangkut', tr: '12 soru. Bakalım aklında ne kalmış?', pl: '12 pytań. Sprawdzimy, co zostało w głowie?' }),
  examCta: (lang: Lang) => triLang(lang, { ru: 'Сдать экзамен', uk: 'Скласти іспит', en: 'Take the exam', es: 'Hacer el examen', 'pt-BR': 'Fazer o exame', vi: 'Làm bài thi', id: 'Ikuti ujian', tr: 'Sınava gir', pl: 'Podejdź do egzaminu' }),
  soon: (lang: Lang) => triLang(lang, { ru: 'Новые эпизоды уже в пути', uk: 'Нові епізоди вже в дорозі', en: 'New episodes are on the way', es: 'Los nuevos episodios ya vienen en camino', 'pt-BR': 'Novos episódios já estão a caminho', vi: 'Tập mới đang trên đường tới', id: 'Episode baru sedang dalam perjalanan', tr: 'Yeni bölümler yolda', pl: 'Nowe odcinki są już w drodze' }),
  reviewLine: (lang: Lang) => triLang(lang, { ru: 'А пока — освежим пройденное?', uk: 'А поки — освіжимо пройдене?', en: 'Meanwhile, shall we refresh what you know?', es: 'Mientras tanto, ¿repasamos lo aprendido?', 'pt-BR': 'Enquanto isso, que tal revisar o que já aprendeu?', vi: 'Trong lúc chờ, ôn lại bài cũ nhé?', id: 'Sambil menunggu, segarkan lagi yang sudah dipelajari?', tr: 'Bu arada öğrendiklerini tazeleyelim mi?', pl: 'A tymczasem odświeżymy to, co już znasz?' }),
};

/** Подписи чипов сцены. */
export function homeSceneChipLabel(lang: Lang, kind: HomeSceneChipKind): string {
  switch (kind) {
    case 'words': return triLang(lang, { ru: 'Слова', uk: 'Слова', en: 'Words', es: 'Palabras', 'pt-BR': 'Palavras', vi: 'Từ vựng', id: 'Kata', tr: 'Kelimeler', pl: 'Słowa' });
    case 'theory': return triLang(lang, { ru: 'Теория', uk: 'Теорія', en: 'Theory', es: 'Teoría', 'pt-BR': 'Teoria', vi: 'Lý thuyết', id: 'Teori', tr: 'Teori', pl: 'Teoria' });
    case 'cards': return triLang(lang, { ru: 'Карточки', uk: 'Картки', en: 'Cards', es: 'Tarjetas', 'pt-BR': 'Cartões', vi: 'Thẻ học', id: 'Kartu', tr: 'Kartlar', pl: 'Karty' });
    case 'phrase': return triLang(lang, { ru: 'Фраза дня', uk: 'Вислів дня', en: 'Phrase of the day', es: 'Frase del día', 'pt-BR': 'Frase do dia', vi: 'Cụm từ hôm nay', id: 'Frasa hari ini', tr: 'Günün ifadesi', pl: 'Fraza dnia' });
    case 'video': return triLang(lang, { ru: 'Видео', uk: 'Відео', en: 'Video', es: 'Vídeo', 'pt-BR': 'Vídeo', vi: 'Video', id: 'Video', tr: 'Video', pl: 'Wideo' });
    case 'review': return triLang(lang, { ru: 'Повторить карточки', uk: 'Повторити картки', en: 'Review cards', es: 'Repasa tarjetas', 'pt-BR': 'Revise cartões', vi: 'Ôn thẻ', id: 'Ulas kartu', tr: 'Kartları tekrar et', pl: 'Powtórz fiszki' });
    default: { const never: never = kind; return String(never); }
  }
}

/** Строка «Нет сети» под шапкой (эталон, состояние «Нет сети»). */
export function homeSceneOfflineLine(lang: Lang): Readonly<{ bold: string; rest: string }> {
  return {
    // зачем (VOICE.md): «остальное догонит» было непонятно — шутка + что работает
    bold: triLang(lang, { ru: 'Интернет ушёл погулять.', uk: 'Інтернет пішов погуляти.', en: 'The internet stepped out.', es: 'Internet se fue de paseo.', 'pt-BR': 'A internet saiu para passear.', vi: 'Mạng đi dạo mất rồi.', id: 'Internetnya lagi jalan-jalan.', tr: 'İnternet biraz gezmeye çıktı.', pl: 'Internet wyszedł na spacer.' }),
    rest: triLang(lang, { ru: 'Занятия и карточки работают и без него.', uk: 'Заняття й картки працюють і без нього.', en: 'Lessons and cards work without it.', es: 'Las sesiones y las tarjetas funcionan sin él.', 'pt-BR': 'Aulas e cartões funcionam sem ela.', vi: 'Bài học và thẻ vẫn chạy khi không có mạng.', id: 'Pelajaran dan kartu tetap jalan tanpanya.', tr: 'Dersler ve kartlar onsuz da çalışır.', pl: 'Lekcje i karty działają i bez niego.' }),
  };
}

/** «День засчитан»: «Ещё эпизод» — только когда кнопка ведёт в курс V2; старый урок — «Продолжить урок N»; прочее — по цели. */
function dayDoneCta(i: HomeSceneCopyInput): string {
  switch (i.ctaTarget ?? 'v2') {
    case 'v2': return T.moreEp(i.lang);
    case 'legacy': return i.lessonNo != null ? T.contLesson(i.lang, i.lessonNo) : T.cont(i.lang);
    case 'start': return T.start(i.lang);
    case 'section':
    case 'place':
    case 'unknown':
    default: return T.cont(i.lang);
  }
}

export function buildHomeSceneCopy(i: HomeSceneCopyInput): HomeSceneCopy {
  const { lang } = i;
  const place = i.badge ? (i.episode !== null ? `${i.badge} · ${T.episode(lang)} ${i.episode}` : i.badge) : '';
  const progressLine = i.progress && i.progress.total > 0 ? T.of(lang, Math.min(i.progress.done, i.progress.total), i.progress.total) : null;
  const bar = i.progress && i.progress.total > 0 ? Math.max(0, Math.min(1, i.progress.done / i.progress.total)) : null;
  // зачем (эталон: «Слова · Теория»; координатор 22.10: «Слова» — только когда словарь подключён к «Урокам»)
  // зачем (владелец 22.10, скрин героя): у героя Главной нет вторичных чипов («Повторить карточки», «Теория», «Слова») — в макете scenes-compact в.2 только главная кнопка; карточки — строка в «Сегодня»
  const base = { warm: null, note: null, chips: [] as readonly HomeSceneChipKind[] };
  switch (i.state) {
    case 'newbie':
      return { ...base, kicker: place, title: i.title, line: null, bar: null, cta: T.start(lang) };
    case 'continue':
    case 'offline':
      return { ...base, kicker: place, title: i.title, line: progressLine, bar, cta: T.cont(lang) };
    case 'streak_risk':
      return { ...base, kicker: T.streak(lang, i.streakDays), title: T.untilMidnight(lang, i.minutesToMidnight), line: null, bar: null,
        warm: i.zeroEnergyNote && i.energyMinutes !== null ? T.energyBeforeMidnight(lang, i.energyMinutes) : T.keeps(lang),
        cta: i.episode !== null ? T.contEp(lang, i.episode) : T.cont(lang) };
    case 'day_done':
      return { ...base, kicker: T.streak(lang, i.streakDays), title: T.dayCounted(lang), line: i.title ? T.next(lang, i.title) : null, bar: null, cta: dayDoneCta(i) };
    case 'no_energy':
      return { ...base, kicker: place, title: T.energyIn(lang, i.energyMinutes), line: T.noEnergyLine(lang), bar: null, cta: null, note: T.plusNoEnergy(lang) };
    case 'welcome_back':
      return { ...base, kicker: T.welcome(lang), title: i.episode !== null ? T.resumeAt(lang, i.episode) : i.title, line: i.daysAway !== null ? T.away(lang, i.daysAway) : null, bar: null, cta: T.cont(lang) };
    case 'streak_lost':
      return { ...base, kicker: T.lost(lang), title: T.newStreak(lang), line: i.lostStreakDays !== null && i.lostStreakDays >= 2 ? `${T.wasDays(lang, i.lostStreakDays)} ${T.flameBack(lang)}` : T.flameBack(lang), bar: null, cta: i.episode !== null ? T.contEp(lang, i.episode) : T.cont(lang) };
    case 'exam_ready':
      return { ...base, kicker: place, title: T.exam(lang), line: T.examLine(lang), bar: null, cta: T.examCta(lang) };
    case 'all_done':
      return { ...base, kicker: place, title: T.soon(lang), line: T.reviewLine(lang), bar: null, cta: null };
    default: {
      const never: never = i.state;
      return { ...base, kicker: '', title: String(never), line: null, bar: null, cta: null };
    }
  }
}
