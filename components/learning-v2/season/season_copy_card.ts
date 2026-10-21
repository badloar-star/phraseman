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
  openByExam: ['Открыть экзаменом главы', 'Відкрити іспитом розділу', 'Unlock with the chapter exam', 'Abrir con el examen del capítulo', 'Abrir com o exame do capítulo', 'Mở bằng bài thi chương', 'Buka dengan ujian bab', 'Ünite sınavıyla aç', 'Otwórz egzaminem rozdziału'],
  startExam: ['Сдать экзамен', 'Скласти іспит', 'Take the exam', 'Hacer el examen', 'Fazer o exame', 'Làm bài thi', 'Ikuti ujian', 'Sınava gir', 'Przystąp do egzaminu'],
  chapterShort: ['Глава {n}', 'Розділ {n}', 'Chapter {n}', 'Capítulo {n}', 'Capítulo {n}', 'Chương {n}', 'Bab {n}', 'Ünite {n}', 'Rozdział {n}'],
  preview: ['просмотр', 'перегляд', 'preview', 'vista previa', 'prévia', 'xem trước', 'pratinjau', 'önizleme', 'podgląd'],
  closeCard: ['Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij'],
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
