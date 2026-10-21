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

export type HomeSceneChipKind = 'theory' | 'cards' | 'phrase' | 'video' | 'review';

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
}>;

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

const T = {
  episode: (lang: Lang) => triLang(lang, { ru: 'Эпизод', uk: 'Епізод', en: 'Episode', es: 'Episodio', 'pt-BR': 'Episódio', vi: 'Tập', id: 'Episode', tr: 'Bölüm', pl: 'Odcinek' }),
  start: (lang: Lang) => triLang(lang, { ru: 'Начать', uk: 'Почати', en: 'Start', es: 'Empezar', 'pt-BR': 'Começar', vi: 'Bắt đầu', id: 'Mulai', tr: 'Başla', pl: 'Zacznij' }),
  cont: (lang: Lang) => triLang(lang, { ru: 'Продолжить', uk: 'Продовжити', en: 'Continue', es: 'Continuar', 'pt-BR': 'Continuar', vi: 'Tiếp tục', id: 'Lanjutkan', tr: 'Devam et', pl: 'Kontynuuj' }),
  contEp: (lang: Lang, n: number) => triLang(lang, { ru: `Продолжить эпизод ${n}`, uk: `Продовжити епізод ${n}`, en: `Continue episode ${n}`, es: `Continuar episodio ${n}`, 'pt-BR': `Continuar episódio ${n}`, vi: `Tiếp tục tập ${n}`, id: `Lanjutkan episode ${n}`, tr: `${n}. bölüme devam et`, pl: `Kontynuuj odcinek ${n}` }),
  moreEp: (lang: Lang) => triLang(lang, { ru: 'Ещё эпизод', uk: 'Ще епізод', en: 'One more episode', es: 'Otro episodio', 'pt-BR': 'Mais um episódio', vi: 'Thêm một tập', id: 'Satu episode lagi', tr: 'Bir bölüm daha', pl: 'Jeszcze jeden odcinek' }),
  of: (lang: Lang, d: number, t: number) => triLang(lang, { ru: `${d} из ${t}`, uk: `${d} з ${t}`, en: `${d} of ${t}`, es: `${d} de ${t}`, 'pt-BR': `${d} de ${t}`, vi: `${d}/${t}`, id: `${d} dari ${t}`, tr: `${d}/${t}`, pl: `${d} z ${t}` }),
  streak: (lang: Lang, n: number) => triLang(lang, { ru: `Серия ${n} ${ruDays(n)}`, uk: `Серія ${n} ${ukDays(n)}`, en: `${n}-day streak`, es: `Racha de ${n} ${en1(n, 'día', 'días')}`, 'pt-BR': `Sequência de ${n} ${en1(n, 'dia', 'dias')}`, vi: `Chuỗi ${n} ngày`, id: `Runtunan ${n} hari`, tr: `${n} günlük seri`, pl: `Seria ${n} ${plDays(n)}` }),
  untilMidnight: (lang: Lang, mins: number) => {
    const h = Math.floor(mins / 60); const m = mins % 60;
    if (h === 0) return triLang(lang, { ru: `До полуночи ${m} мин`, uk: `До півночі ${m} хв`, en: `${m} min until midnight`, es: `${m} min hasta medianoche`, 'pt-BR': `${m} min até a meia-noite`, vi: `Còn ${m} phút đến nửa đêm`, id: `${m} menit sebelum tengah malam`, tr: `Gece yarısına ${m} dk`, pl: `Do północy ${m} min` });
    return triLang(lang, { ru: `До полуночи ${h} ч ${m} мин`, uk: `До півночі ${h} год ${m} хв`, en: `${h} h ${m} min until midnight`, es: `${h} h ${m} min hasta medianoche`, 'pt-BR': `${h} h ${m} min até a meia-noite`, vi: `Còn ${h} giờ ${m} phút đến nửa đêm`, id: `${h} jam ${m} menit sebelum tengah malam`, tr: `Gece yarısına ${h} sa ${m} dk`, pl: `Do północy ${h} godz. ${m} min` });
  },
  keeps: (lang: Lang) => triLang(lang, { ru: 'Одно занятие сохранит серию', uk: 'Одне заняття збереже серію', en: 'One session keeps your streak', es: 'Una sesión mantiene tu racha', 'pt-BR': 'Uma sessão mantém sua sequência', vi: 'Một buổi học giữ chuỗi của bạn', id: 'Satu sesi menjaga runtunanmu', tr: 'Bir oturum serini korur', pl: 'Jedne zajęcia utrzymają serię' }),
  energyBeforeMidnight: (lang: Lang, n: number) => triLang(lang, { ru: `Энергия +1 через ${n} мин — успеешь до полуночи`, uk: `Енергія +1 через ${n} хв — встигнеш до півночі`, en: `+1 energy in ${n} min — you'll make it before midnight`, es: `+1 de energía en ${n} min: llegas antes de medianoche`, 'pt-BR': `+1 de energia em ${n} min — dá tempo antes da meia-noite`, vi: `+1 năng lượng sau ${n} phút — kịp trước nửa đêm`, id: `+1 energi dalam ${n} menit — masih sempat sebelum tengah malam`, tr: `${n} dk sonra +1 enerji — gece yarısından önce yetişirsin`, pl: `+1 energii za ${n} min — zdążysz przed północą` }),
  dayCounted: (lang: Lang) => triLang(lang, { ru: 'День засчитан', uk: 'День зараховано', en: 'Day counted', es: 'Día contado', 'pt-BR': 'Dia contado', vi: 'Đã tính ngày hôm nay', id: 'Hari ini terhitung', tr: 'Gün sayıldı', pl: 'Dzień zaliczony' }),
  next: (lang: Lang, title: string) => triLang(lang, { ru: `Дальше: ${title}`, uk: `Далі: ${title}`, en: `Next: ${title}`, es: `Siguiente: ${title}`, 'pt-BR': `A seguir: ${title}`, vi: `Tiếp theo: ${title}`, id: `Berikutnya: ${title}`, tr: `Sıradaki: ${title}`, pl: `Dalej: ${title}` }),
  energyIn: (lang: Lang, n: number | null) => (n === null
    ? triLang(lang, { ru: 'Энергия скоро вернётся', uk: 'Енергія скоро повернеться', en: 'Energy is coming back soon', es: 'La energía vuelve pronto', 'pt-BR': 'A energia volta logo', vi: 'Năng lượng sắp hồi lại', id: 'Energi segera kembali', tr: 'Enerji birazdan dolar', pl: 'Energia zaraz wróci' })
    : triLang(lang, { ru: `Энергия вернётся через ${n} мин`, uk: `Енергія повернеться через ${n} хв`, en: `Energy back in ${n} min`, es: `La energía vuelve en ${n} min`, 'pt-BR': `A energia volta em ${n} min`, vi: `Năng lượng hồi sau ${n} phút`, id: `Energi kembali dalam ${n} menit`, tr: `Enerji ${n} dk sonra dolar`, pl: `Energia wróci za ${n} min` })),
  noEnergyLine: (lang: Lang) => triLang(lang, { ru: 'Пока можно заниматься без энергии', uk: 'Поки можна займатися без енергії', en: 'Meanwhile, practice without energy', es: 'Mientras tanto, practica sin energía', 'pt-BR': 'Enquanto isso, pratique sem energia', vi: 'Trong lúc chờ, hãy học không cần năng lượng', id: 'Sementara itu, belajar tanpa energi', tr: 'Bu arada enerjisiz çalış', pl: 'W międzyczasie ucz się bez energii' }),
  plusNoEnergy: (lang: Lang) => triLang(lang, { ru: 'С Plus без энергии', uk: 'З Plus без енергії', en: 'With Plus, no energy needed', es: 'Con Plus, sin energía', 'pt-BR': 'Com Plus, sem energia', vi: 'Với Plus, không cần năng lượng', id: 'Dengan Plus, tanpa energi', tr: 'Plus ile enerji gerekmez', pl: 'Z Plus bez energii' }),
  welcome: (lang: Lang) => triLang(lang, { ru: 'С возвращением', uk: 'З поверненням', en: 'Welcome back', es: 'Bienvenido de nuevo', 'pt-BR': 'Bem-vindo de volta', vi: 'Chào mừng trở lại', id: 'Selamat datang kembali', tr: 'Tekrar hoş geldin', pl: 'Witaj z powrotem' }),
  resumeAt: (lang: Lang, n: number) => triLang(lang, { ru: `Продолжим с эпизода ${n}`, uk: `Продовжимо з епізоду ${n}`, en: `Let's pick up at episode ${n}`, es: `Sigamos en el episodio ${n}`, 'pt-BR': `Vamos continuar no episódio ${n}`, vi: `Tiếp tục từ tập ${n}`, id: `Lanjut dari episode ${n}`, tr: `${n}. bölümden devam edelim`, pl: `Wracamy do odcinka ${n}` }),
  away: (lang: Lang, n: number) => triLang(lang, { ru: `Тебя не было ${n} ${ruDays(n)}. Начни с короткого повтора`, uk: `Тебе не було ${n} ${ukDays(n)}. Почни з короткого повторення`, en: `You've been away ${n} ${en1(n, 'day', 'days')}. Start with a quick review`, es: `Estuviste fuera ${n} ${en1(n, 'día', 'días')}. Empieza con un repaso corto`, 'pt-BR': `Você ficou ${n} ${en1(n, 'dia', 'dias')} fora. Comece com uma revisão rápida`, vi: `Bạn đã vắng ${n} ngày. Hãy bắt đầu bằng ôn tập ngắn`, id: `Kamu absen ${n} hari. Mulai dengan ulasan singkat`, tr: `${n} gündür yoktun. Kısa bir tekrarla başla`, pl: `Nie było cię ${n} ${plDays(n)}. Zacznij od krótkiej powtórki` }),
  lost: (lang: Lang) => triLang(lang, { ru: 'Серия прервалась', uk: 'Серія перервалася', en: 'Your streak ended', es: 'Tu racha se cortó', 'pt-BR': 'Sua sequência acabou', vi: 'Chuỗi đã bị ngắt', id: 'Runtunanmu terputus', tr: 'Serin bozuldu', pl: 'Seria przerwana' }),
  newStreak: (lang: Lang) => triLang(lang, { ru: 'Начнём новую серию', uk: 'Почнімо нову серію', en: "Let's start a new streak", es: 'Empecemos una nueva racha', 'pt-BR': 'Vamos começar uma nova sequência', vi: 'Bắt đầu chuỗi mới nào', id: 'Ayo mulai runtunan baru', tr: 'Yeni bir seri başlatalım', pl: 'Zacznijmy nową serię' }),
  flameBack: (lang: Lang) => triLang(lang, { ru: 'Одно занятие, и огонь снова загорится', uk: 'Одне заняття — і вогонь знову спалахне', en: 'One session and the flame is back', es: 'Una sesión y la llama vuelve', 'pt-BR': 'Uma sessão e a chama volta', vi: 'Một buổi học là ngọn lửa trở lại', id: 'Satu sesi dan apinya menyala lagi', tr: 'Bir oturum ve alev geri gelir', pl: 'Jedne zajęcia i płomień wraca' }),
  exam: (lang: Lang) => triLang(lang, { ru: 'Экзамен главы ждёт', uk: 'Іспит розділу чекає', en: 'Chapter exam is ready', es: 'El examen del capítulo te espera', 'pt-BR': 'A prova do capítulo te espera', vi: 'Bài kiểm tra chương đang chờ', id: 'Ujian bab menunggu', tr: 'Bölüm sınavı seni bekliyor', pl: 'Egzamin z rozdziału czeka' }),
  examLine: (lang: Lang) => triLang(lang, { ru: '12 вопросов, сдать от 10', uk: '12 питань, скласти від 10', en: '12 questions, pass with 10', es: '12 preguntas, aprueba con 10', 'pt-BR': '12 perguntas, passe com 10', vi: '12 câu hỏi, đạt từ 10', id: '12 soal, lulus dengan 10', tr: '12 soru, 10 ile geçersin', pl: '12 pytań, zdasz od 10' }),
  examCta: (lang: Lang) => triLang(lang, { ru: 'Сдать экзамен', uk: 'Скласти іспит', en: 'Take the exam', es: 'Hacer el examen', 'pt-BR': 'Fazer a prova', vi: 'Làm bài kiểm tra', id: 'Ikuti ujian', tr: 'Sınava gir', pl: 'Podejdź do egzaminu' }),
  soon: (lang: Lang) => triLang(lang, { ru: 'Скоро новые эпизоды', uk: 'Скоро нові епізоди', en: 'New episodes are coming', es: 'Pronto habrá nuevos episodios', 'pt-BR': 'Novos episódios em breve', vi: 'Sắp có tập mới', id: 'Episode baru segera hadir', tr: 'Yeni bölümler yakında', pl: 'Wkrótce nowe odcinki' }),
  reviewLine: (lang: Lang) => triLang(lang, { ru: 'Пока можно повторить пройденное', uk: 'Поки можна повторити пройдене', en: "Meanwhile, review what you've learned", es: 'Mientras tanto, repasa lo aprendido', 'pt-BR': 'Enquanto isso, revise o que aprendeu', vi: 'Trong lúc chờ, hãy ôn lại bài đã học', id: 'Sementara itu, ulas yang sudah dipelajari', tr: 'Bu arada öğrendiklerini tekrar et', pl: 'W międzyczasie powtórz to, co już znasz' }),
};

/** Подписи чипов сцены. */
export function homeSceneChipLabel(lang: Lang, kind: HomeSceneChipKind): string {
  switch (kind) {
    case 'theory': return triLang(lang, { ru: 'Теория', uk: 'Теорія', en: 'Theory', es: 'Teoría', 'pt-BR': 'Teoria', vi: 'Lý thuyết', id: 'Teori', tr: 'Teori', pl: 'Teoria' });
    case 'cards': return triLang(lang, { ru: 'Карточки', uk: 'Картки', en: 'Cards', es: 'Tarjetas', 'pt-BR': 'Cartões', vi: 'Thẻ', id: 'Kartu', tr: 'Kartlar', pl: 'Fiszki' });
    case 'phrase': return triLang(lang, { ru: 'Фраза дня', uk: 'Фраза дня', en: 'Phrase of the day', es: 'Frase del día', 'pt-BR': 'Frase do dia', vi: 'Câu của ngày', id: 'Frasa hari ini', tr: 'Günün ifadesi', pl: 'Zwrot dnia' });
    case 'video': return triLang(lang, { ru: 'Видео', uk: 'Відео', en: 'Video', es: 'Vídeo', 'pt-BR': 'Vídeo', vi: 'Video', id: 'Video', tr: 'Video', pl: 'Wideo' });
    case 'review': return triLang(lang, { ru: 'Повторить карточки', uk: 'Повторити картки', en: 'Review cards', es: 'Repasa tarjetas', 'pt-BR': 'Revise cartões', vi: 'Ôn thẻ', id: 'Ulas kartu', tr: 'Kartları tekrar et', pl: 'Powtórz fiszki' });
    default: { const never: never = kind; return String(never); }
  }
}

/** Строка «Нет сети» под шапкой (эталон, состояние «Нет сети»). */
export function homeSceneOfflineLine(lang: Lang): Readonly<{ bold: string; rest: string }> {
  return {
    bold: triLang(lang, { ru: 'Нет сети.', uk: 'Немає мережі.', en: 'No connection.', es: 'Sin conexión.', 'pt-BR': 'Sem conexão.', vi: 'Không có mạng.', id: 'Tidak ada koneksi.', tr: 'Bağlantı yok.', pl: 'Brak sieci.' }),
    rest: triLang(lang, { ru: 'Занятия и карточки работают, остальное догонит.', uk: 'Заняття й картки працюють, решта наздожене.', en: 'Lessons and cards still work; the rest will catch up.', es: 'Las sesiones y tarjetas funcionan; lo demás se pondrá al día.', 'pt-BR': 'Aulas e cartões funcionam; o resto sincroniza depois.', vi: 'Bài học và thẻ vẫn chạy, phần còn lại sẽ cập nhật sau.', id: 'Pelajaran dan kartu tetap jalan, sisanya menyusul.', tr: 'Dersler ve kartlar çalışır, gerisi sonra eşitlenir.', pl: 'Lekcje i fiszki działają, reszta nadrobi później.' }),
  };
}

export function buildHomeSceneCopy(i: HomeSceneCopyInput): HomeSceneCopy {
  const { lang } = i;
  const place = i.badge ? (i.episode !== null ? `${i.badge} · ${T.episode(lang)} ${i.episode}` : i.badge) : '';
  const progressLine = i.progress && i.progress.total > 0 ? T.of(lang, Math.min(i.progress.done, i.progress.total), i.progress.total) : null;
  const bar = i.progress && i.progress.total > 0 ? Math.max(0, Math.min(1, i.progress.done / i.progress.total)) : null;
  const lessonChips: readonly HomeSceneChipKind[] = i.theoryAvailable ? ['theory'] : [];
  const base = { warm: null, note: null, chips: [] as readonly HomeSceneChipKind[] };
  switch (i.state) {
    case 'new':
      return { ...base, kicker: place, title: i.title, line: null, bar: null, cta: T.start(lang) };
    case 'continue':
    case 'offline':
      return { ...base, kicker: place, title: i.title, line: progressLine, bar, cta: T.cont(lang), chips: lessonChips };
    case 'streak_risk':
      return { ...base, kicker: T.streak(lang, i.streakDays), title: T.untilMidnight(lang, i.minutesToMidnight), line: null, bar: null,
        warm: i.zeroEnergyNote && i.energyMinutes !== null ? T.energyBeforeMidnight(lang, i.energyMinutes) : T.keeps(lang),
        cta: i.episode !== null ? T.contEp(lang, i.episode) : T.cont(lang) };
    case 'day_done':
      return { ...base, kicker: T.streak(lang, i.streakDays), title: T.dayCounted(lang), line: i.title ? T.next(lang, i.title) : null, bar: null, cta: T.moreEp(lang), chips: lessonChips };
    case 'no_energy':
      return { ...base, kicker: place, title: T.energyIn(lang, i.energyMinutes), line: T.noEnergyLine(lang), bar: null, cta: null, note: T.plusNoEnergy(lang), chips: ['cards', 'phrase', 'video'] };
    case 'welcome_back':
      return { ...base, kicker: T.welcome(lang), title: i.episode !== null ? T.resumeAt(lang, i.episode) : i.title, line: i.daysAway !== null ? T.away(lang, i.daysAway) : null, bar: null, cta: T.cont(lang), chips: ['review', ...lessonChips] };
    case 'streak_lost':
      return { ...base, kicker: T.lost(lang), title: T.newStreak(lang), line: T.flameBack(lang), bar: null, cta: i.episode !== null ? T.contEp(lang, i.episode) : T.cont(lang) };
    case 'exam_ready':
      return { ...base, kicker: place, title: T.exam(lang), line: T.examLine(lang), bar: null, cta: T.examCta(lang), chips: lessonChips };
    case 'all_done':
      return { ...base, kicker: place, title: T.soon(lang), line: T.reviewLine(lang), bar: null, cta: null, chips: ['cards', 'phrase', 'video'] };
    default: {
      const never: never = i.state;
      return { ...base, kicker: '', title: String(never), line: null, bar: null, cta: null };
    }
  }
}
