// ════════════════════════════════════════════════════════════════════════════
// season_copy_card.ts — тексты раскрытой карты и веера «Вся глава» (фаза 3 экрана «Обучение»), 9 языков.
//
// зачем (владелец 21.10): отдельный файл от season_copy.ts, чтобы фазы коммитились независимо. Русский — дословно из эталонов course-hybrid-1-4.html и
// chapter-exam-season.html; «Повторить эпизод», «просмотр» и склонение «заданий» — предложение для «Переводчика». Порядок кортежа: ru, uk, en, es, pt-BR, vi, id, tr, pl.
// ════════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];

export const SEASON_CARD_COPY = {
  toEpisode: ['К эпизоду {n}', 'До епізоду {n}', 'Go to episode {n}', 'Ir al episodio {n}', 'Ir ao episódio {n}', 'Đến tập {n}', 'Ke episode {n}', '{n}. bölüme git', 'Do odcinka {n}'],
  repeatEpisode: ['Повторить эпизод {n}', 'Повторити епізод {n}', 'Repeat episode {n}', 'Repetir el episodio {n}', 'Repetir o episódio {n}', 'Ôn lại tập {n}', 'Ulangi episode {n}', '{n}. bölümü tekrarla', 'Powtórz odcinek {n}'],
  // зачем (владелец 25.10): эпизод открыт экзаменом/тестом, но не пройден — «Начать», не «Повторить». Кроме ru — предложение для «Переводчика».
  beginEpisode: ['Начать эпизод {n}', 'Почати епізод {n}', 'Start episode {n}', 'Empezar el episodio {n}', 'Começar o episódio {n}', 'Bắt đầu tập {n}', 'Mulai episode {n}', '{n}. bölümü başlat', 'Zacznij odcinek {n}'],
  openByExam: ['Открыть экзаменом главы', 'Відкрити іспитом розділу', 'Unlock with the chapter exam', 'Abrir con el examen del capítulo', 'Abrir com o exame do capítulo', 'Mở bằng bài thi chương', 'Buka dengan ujian bab', 'Ünite sınavıyla aç', 'Otwórz egzaminem rozdziału'],
  // зачем (эталон chapter-exam-season.html, правка владельца 22.10 №10): строка под «Сдать экзамен» в подписи под каруселью;
  // склеиваются через « · ». Кроме ru — предложение для «Переводчика».
  examOpens: ['Сдашь — откроется глава {n}', 'Складеш — відкриється розділ {n}', 'Pass to unlock chapter {n}', 'Si apruebas, se abre el capítulo {n}', 'Se passar, abre o capítulo {n}', 'Đạt để mở chương {n}', 'Lulus untuk membuka bab {n}', 'Geçersen {n}. ünite açılır', 'Zdasz — otworzy się rozdział {n}'],
  examFacts: ['{q} вопросов, сдать от {p}', '{q} питань, скласти від {p}', '{q} questions, {p} to pass', '{q} preguntas, apruebas con {p}', '{q} perguntas, passa com {p}', '{q} câu hỏi, cần đúng {p}', '{q} soal, minimal {p} benar', '{q} soru, {p} doğruyla geçersin', '{q} pytań, zaliczasz od {p}'],
  // зачем (координатор 24.10; эталон chapter-exam-season.html, capX avail / pause / pass): подпись под каруселью по состоянию экзамена.
  // ru — дословно эталон; остальные — предложение для «Переводчика».
  examKickerEarly: ['Финал главы {n}, можно сдать заранее', 'Фінал розділу {n}, можна скласти заздалегідь', 'End of chapter {n}, you can take it early', 'Final del capítulo {n}, puedes hacerlo antes', 'Final do capítulo {n}, dá para fazer antes', 'Cuối chương {n}, có thể thi sớm', 'Akhir bab {n}, bisa ujian lebih awal', '{n}. ünitenin sonu, erken girebilirsin', 'Koniec rozdziału {n}, możesz zdawać wcześniej'],
  examAttempt: ['Попытка: {c} из {q}, нужно {p}', 'Спроба: {c} з {q}, потрібно {p}', 'Attempt: {c} of {q}, need {p}', 'Intento: {c} de {q}, necesitas {p}', 'Tentativa: {c} de {q}, precisa de {p}', 'Lần thi: {c}/{q}, cần {p}', 'Percobaan: {c} dari {q}, perlu {p}', 'Deneme: {q} soruda {c}, gereken {p}', 'Próba: {c} z {q}, potrzeba {p}'],
  examRetakeIn: ['Пересдать через {m} мин', 'Перескласти через {m} хв', 'Retake in {m} min', 'Repetir en {m} min', 'Refazer em {m} min', 'Thi lại sau {m} phút', 'Ulang dalam {m} mnt', '{m} dk sonra tekrar', 'Poprawka za {m} min'],
  examRetakeNote: ['Пересдать можно через час после попытки', 'Перескласти можна через годину після спроби', 'You can retake it an hour after the attempt', 'Puedes repetirlo una hora después del intento', 'Dá para refazer uma hora depois da tentativa', 'Có thể thi lại sau một giờ', 'Bisa diulang satu jam setelah percobaan', 'Denemeden bir saat sonra tekrar girebilirsin', 'Poprawka możliwa godzinę po próbie'],
  examPassed: ['Экзамен сдан, {c} из {q}', 'Іспит складено, {c} з {q}', 'Exam passed, {c} of {q}', 'Examen aprobado, {c} de {q}', 'Exame aprovado, {c} de {q}', 'Đã đạt, {c}/{q}', 'Lulus ujian, {c} dari {q}', 'Sınavı geçtin, {q} soruda {c}', 'Egzamin zdany, {c} z {q}'],
  examChapterOpen: ['Глава {n} открыта', 'Розділ {n} відкрито', 'Chapter {n} is open', 'Capítulo {n} abierto', 'Capítulo {n} aberto', 'Chương {n} đã mở', 'Bab {n} terbuka', '{n}. ünite açıldı', 'Rozdział {n} otwarty'],
  examToChapter: ['К главе {n}', 'До розділу {n}', 'Go to chapter {n}', 'Ir al capítulo {n}', 'Ir ao capítulo {n}', 'Đến chương {n}', 'Ke bab {n}', '{n}. üniteye git', 'Do rozdziału {n}'],
  examPassedNote: ['Эпизоды {a}–{b} открыты, их можно пройти позже', 'Епізоди {a}–{b} відкрито, їх можна пройти пізніше', 'Episodes {a}–{b} are open, you can do them later', 'Los episodios {a}–{b} están abiertos, puedes hacerlos luego', 'Os episódios {a}–{b} estão abertos, dá para fazer depois', 'Tập {a}–{b} đã mở, có thể học sau', 'Episode {a}–{b} terbuka, bisa dikerjakan nanti', '{a}–{b}. bölümler açık, sonra yapabilirsin', 'Odcinki {a}–{b} otwarte, możesz je przejść później'],
  startExam: ['Сдать экзамен', 'Скласти іспит', 'Take the exam', 'Hacer el examen', 'Fazer o exame', 'Làm bài thi', 'Ikuti ujian', 'Sınava gir', 'Przystąp do egzaminu'],
  chapterShort: ['Глава {n}', 'Розділ {n}', 'Chapter {n}', 'Capítulo {n}', 'Capítulo {n}', 'Chương {n}', 'Bab {n}', 'Ünite {n}', 'Rozdział {n}'],
  preview: ['просмотр', 'перегляд', 'preview', 'vista previa', 'prévia', 'xem trước', 'pratinjau', 'önizleme', 'podgląd'],
  closeCard: ['Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij'],
  // зачем (владелец 22.10, макет lesson-hub-final.html): три явные кнопки под обложкой и подписи списков; русский — слова макета, остальные языки — предложение, ⚠ ЖДУТ РЕВЬЮ «Переводчика» (10)
  allChapters: ['Все главы', 'Усі розділи', 'All chapters', 'Todos los capítulos', 'Todos os capítulos', 'Tất cả chương', 'Semua bab', 'Tüm üniteler', 'Wszystkie rozdziały'],
  allLessons: ['Все уроки', 'Усі уроки', 'All lessons', 'Todas las lecciones', 'Todas as lições', 'Tất cả bài học', 'Semua pelajaran', 'Tüm dersler', 'Wszystkie lekcje'],
  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «старый курс назвать» — подпись третьей плитки хаба урока; строки Переводчика (d16d294c5). Ключ остался classicCourse, чтобы не плодить второй.
  classicCourse: ['Старый курс', 'Старий курс', 'Old course', 'Curso anterior', 'Curso antigo', 'Khóa học cũ', 'Kursus lama', 'Eski kurs', 'Stary kurs'],
  // зачем (Переводчик 22.10): метка на строке эпизода узкая — id «Lanjut» короче «Berikutnya» и совпадает с «Дальше» экзамена.
  nextTag: ['Дальше', 'Далі', 'Next', 'Siguiente', 'Próximo', 'Tiếp theo', 'Lanjut', 'Sıradaki', 'Dalej'],
} as const satisfies Record<string, Nine>;

export type SeasonCardCopyKey = keyof typeof SEASON_CARD_COPY;

export function seasonCardText(lang: Lang, key: SeasonCardCopyKey, vars?: Readonly<Record<string, string | number>>): string {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = SEASON_CARD_COPY[key];
  const raw = triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
  if (!vars) return raw;
  return raw.replace(/\{([a-z]+)\}/giu, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/** «20 заданий»: русский и украинский склоняют по числу; остальные языки — одна форма. Формы — предложение для «Переводчика». */
export function seasonTasksLabel(lang: Lang, n: number): string {
  const a = n % 10;
  const b = n % 100;
  const slavic = (one: string, few: string, many: string): string => (a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many);
  if (lang === 'ru') return `${n} ${slavic('задание', 'задания', 'заданий')}`;
  if (lang === 'uk') return `${n} ${slavic('завдання', 'завдання', 'завдань')}`;
  if (lang === 'pl') return `${n} ${n === 1 ? 'zadanie' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'zadania' : 'zadań'}`;
  const word = triLang(lang, { ru: '', uk: '', en: n === 1 ? 'task' : 'tasks', es: n === 1 ? 'tarea' : 'tareas', 'pt-BR': n === 1 ? 'tarefa' : 'tarefas', vi: 'bài', id: 'tugas', tr: 'görev', pl: '' });
  return `${n} ${word}`;
}

/** «8 эпизодов»: русский, украинский и польский склоняют по числу; остальные языки — одна форма. Формы — предложение для «Переводчика» (10). */
export function seasonEpisodesCountLabel(lang: Lang, n: number): string {
  const a = n % 10;
  const b = n % 100;
  const few = a >= 2 && a <= 4 && (b < 12 || b > 14);
  const one = a === 1 && b !== 11;
  if (lang === 'ru') return `${n} ${one ? 'эпизод' : few ? 'эпизода' : 'эпизодов'}`;
  if (lang === 'uk') return `${n} ${one ? 'епізод' : few ? 'епізоди' : 'епізодів'}`;
  if (lang === 'pl') return `${n} ${n === 1 ? 'odcinek' : few ? 'odcinki' : 'odcinków'}`;
  const word = triLang(lang, { ru: '', uk: '', en: n === 1 ? 'episode' : 'episodes', es: n === 1 ? 'episodio' : 'episodios', 'pt-BR': n === 1 ? 'episódio' : 'episódios', vi: 'tập', id: 'episode', tr: 'bölüm', pl: '' });
  return `${n} ${word}`;
}
