// ════════════════════════════════════════════════════════════════════════════
// season_copy.ts — тексты экрана «Обучение» («Сезон и карусель карт») на 9 языках.
//
// зачем (владелец 21.10, эталон course-hybrid-1-4.html): русский — дословно из макета. «Эпизод» — слова «Переводчика», которые Learning V2 уже вписал
// в learning_v2_session_copy.ts и LearningV2ChaptersCourse.tsx (ru Эпизод, uk Епізод, en Episode, es Episodio, pt-BR Episódio, vi Tập, id Episode,
// tr Bölüm, pl Odcinek); «глава» в турецком — «Ünite» (решение Переводчика). Остальные строки — предложение, ревью — «Переводчик».
// Порядок кортежа: ru, uk, en, es, pt-BR, vi, id, tr, pl. Подстановки: {n}, {m}, {k}.
// ════════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];

export const SEASON_COPY = {
  lesson: ['Урок {n}', 'Урок {n}', 'Lesson {n}', 'Lección {n}', 'Lição {n}', 'Bài {n}', 'Pelajaran {n}', 'Ders {n}', 'Lekcja {n}'],
  episode: ['Эпизод', 'Епізод', 'Episode', 'Episodio', 'Episódio', 'Tập', 'Episode', 'Bölüm', 'Odcinek'],
  continueEpisode: ['Продолжить эпизод {n}', 'Продовжити епізод {n}', 'Continue episode {n}', 'Continuar el episodio {n}', 'Continuar o episódio {n}', 'Tiếp tục tập {n}', 'Lanjutkan episode {n}', '{n}. bölümle devam et', 'Kontynuuj odcinek {n}'],
  startEpisode: ['Начать с эпизода {n}', 'Почати з епізоду {n}', 'Start with episode {n}', 'Empezar por el episodio {n}', 'Começar pelo episódio {n}', 'Bắt đầu từ tập {n}', 'Mulai dari episode {n}', '{n}. bölümden başla', 'Zacznij od odcinka {n}'],
  notFromStart: ['Не хочу с начала', 'Не хочу з початку', 'Not from the start', 'No quiero desde el principio', 'Não quero do início', 'Không muốn học từ đầu', 'Tidak mau dari awal', 'Baştan başlamak istemiyorum', 'Nie chcę od początku'],
  chapterOf: ['Глава {n} из {m}', 'Розділ {n} з {m}', 'Chapter {n} of {m}', 'Capítulo {n} de {m}', 'Capítulo {n} de {m}', 'Chương {n}/{m}', 'Bab {n} dari {m}', 'Ünite {n}/{m}', 'Rozdział {n} z {m}'],
  doneOf: ['{k} из {n}', '{k} з {n}', '{k} of {n}', '{k} de {n}', '{k} de {n}', '{k}/{n}', '{k} dari {n}', '{k}/{n}', '{k} z {n}'],
  taskOf: ['задание {k} из {n}', 'завдання {k} з {n}', 'task {k} of {n}', 'tarea {k} de {n}', 'tarefa {k} de {n}', 'bài {k}/{n}', 'tugas {k} dari {n}', 'görev {k}/{n}', 'zadanie {k} z {n}'],
  exam: ['Экзамен главы', 'Іспит розділу', 'Chapter exam', 'Examen del capítulo', 'Exame do capítulo', 'Bài thi chương', 'Ujian bab', 'Ünite sınavı', 'Egzamin rozdziału'],
  wholeChapter: ['Вся глава', 'Увесь розділ', 'Whole chapter', 'Todo el capítulo', 'Capítulo inteiro', 'Cả chương', 'Seluruh bab', 'Tüm ünite', 'Cały rozdział'],
  words: ['Слова', 'Слова', 'Words', 'Palabras', 'Palavras', 'Từ vựng', 'Kata', 'Kelimeler', 'Słowa'],
  theory: ['Теория', 'Теорія', 'Theory', 'Teoría', 'Teoria', 'Lý thuyết', 'Teori', 'Teori', 'Teoria'],
  locked: ['Откроется после эпизода {n}', 'Відкриється після епізоду {n}', 'Opens after episode {n}', 'Se abre tras el episodio {n}', 'Abre depois do episódio {n}', 'Mở sau tập {n}', 'Terbuka setelah episode {n}', '{n}. bölümden sonra açılır', 'Otworzy się po odcinku {n}'],
} as const satisfies Record<string, Nine>;

export type SeasonCopyKey = keyof typeof SEASON_COPY;

export function seasonText(lang: Lang, key: SeasonCopyKey, vars?: Readonly<Record<string, string | number>>): string {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = SEASON_COPY[key];
  const raw = triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
  if (!vars) return raw;
  return raw.replace(/\{([a-z]+)\}/giu, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/** «Эпизод 12» — слово + номер (формы слова — «Переводчика»). */
export function seasonEpisodeLabel(lang: Lang, ordinal: number): string {
  return `${seasonText(lang, 'episode')} ${ordinal}`;
}
