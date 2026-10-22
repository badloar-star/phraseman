// ═══════════════════════════════════════════════════════════════════════════
// lesson_exit_strings.ts — тексты продолжения эпизода Learning V2, 9 языков.
//
// зачем (владелец 22.10 через координатора: «УБРАТЬ ОКНО СОВСЕМ»): шторка «Выйти из урока?» (момент m15) снята целиком —
// она пугала зря: каждый ответ и место уже на телефоне, урок и эпизод продолжаются с того же места. Её тексты
// удалены вместе с ней; осталась карточка продолжения эпизода (№22б) — строка сверена Переводчиком 21.10.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };

const S = {
  // Карточка продолжения эпизода (№22б), строки Переводчика 21.10: {n} — номер задания, {m} — всего.
  resumeFrom: ['Продолжить с задания {n} из {m}', 'Продовжити із завдання {n} з {m}', 'Continue from task {n} of {m}', 'Seguir desde la tarea {n} de {m}', 'Continuar da tarefa {n} de {m}', 'Tiếp tục từ bài {n}/{m}', 'Lanjutkan tugas {n} dari {m}', 'Görevlere devam et: {n}/{m}', 'Kontynuuj od zadania {n} z {m}'],
} as const satisfies Readonly<Record<string, Nine>>;

export type LessonExitStringKey = keyof typeof S;
export const LESSON_EXIT_STRING_KEYS = Object.keys(S) as readonly LessonExitStringKey[];
export const LESSON_EXIT_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

/** Текст на языке интерфейса; `{ключ}` заменяется значением из vars. Неизвестный язык — английский. */
export function lessonExitText(lang: Lang, key: LessonExitStringKey, vars?: Readonly<Record<string, string | number>>): string {
  const raw = (S[key] as Nine)[LANG_INDEX[lang] ?? LANG_INDEX.en];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}
