// ═══════════════════════════════════════════════════════════════════════════
// today_tasks_view.ts — состояние дня → контракт TodayTask для Главной (D49).
//
// зачем: Главная (зона сессии «Дизайн») получает уже готовые строки
// {id, kind, title, subtitle?, progress, target, done, rewardCoins, route}
// (контракт components/home/v2/home_v2_types.ts) и не знает, как задачи считаются.
// Маршруты — куда ведёт тап; проверку переходов делает «Дизайн».
// ═══════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../constants/i18n';
import type { TodayTask } from '../../components/home/v2/home_v2_types';
import {
  TODAY_TASK_RULES,
  todayTaskProgress,
  type TodayTaskKindCore,
  type TodayTasksDayState,
  type TodayTaskState,
} from './today_tasks_core';

/** Куда ведёт тап по задаче. Источник правды для «Дизайна» (см. evidence-таблицу). */
export const TODAY_TASK_ROUTES: Readonly<Record<TodayTaskKindCore, string>> = Object.freeze({
  lesson: '/lessons_list',
  dialog: '/ai_dialog_home',
  cards: '/flashcards',
  video: '/(tabs)/video',
  mistakes: '/mistakes_hub',
  // зачем (01.10): без раздела вкладка «Сообщество» открывает «Друзей» — ведём прямо в Шпиль.
  spire_steps: '/(tabs)/community?section=spire',
});

function copyFor(kind: TodayTaskKindCore, lang: Lang): { title: string; subtitle?: string } {
  switch (kind) {
    case 'lesson':
      return { title: triLang(lang, { ru: 'Пройти урок', uk: 'Пройти урок', en: 'Complete a lesson', es: 'Completa una lección', 'pt-BR': 'Conclua uma lição', vi: 'Hoàn thành một bài học', id: 'Selesaikan pelajaran', tr: 'Bir ders bitir', pl: 'Ukończ lekcję' }) };
    case 'dialog':
      return { title: triLang(lang, { ru: 'Потренировать диалог', uk: 'Потренувати діалог', en: 'Practice a dialogue', es: 'Practica un diálogo', 'pt-BR': 'Pratique um diálogo', vi: 'Luyện một đoạn hội thoại', id: 'Latih dialog', tr: 'Bir diyalog çalış', pl: 'Przećwicz dialog' }) };
    case 'cards':
      return {
        title: triLang(lang, { ru: 'Повторить карточки', uk: 'Повторити картки', en: 'Review cards', es: 'Repasa tarjetas', 'pt-BR': 'Revise cartões', vi: 'Ôn thẻ', id: 'Ulangi kartu', tr: 'Kartları tekrar et', pl: 'Powtórz karty' }),
        subtitle: triLang(lang, { ru: 'Не менее 10 слов', uk: 'Не менше 10 слів', en: 'At least 10 words', es: 'Al menos 10 palabras', 'pt-BR': 'Pelo menos 10 palavras', vi: 'Ít nhất 10 từ', id: 'Minimal 10 kata', tr: 'En az 10 kelime', pl: 'Co najmniej 10 słów' }),
      };
    case 'video':
      // зачем: владелец 17.10 — «не надо писать „хотя бы минуту“»; подписи под заданием нет.
      return {
        title: triLang(lang, { ru: 'Посмотреть видео', uk: 'Переглянути відео', en: 'Watch a video', es: 'Mira un vídeo', 'pt-BR': 'Assista a um vídeo', vi: 'Xem một video', id: 'Tonton video', tr: 'Bir video izle', pl: 'Obejrzyj wideo' }),
      };
    case 'mistakes':
      return { title: triLang(lang, { ru: 'Исправить ошибки', uk: 'Виправити помилки', en: 'Fix your mistakes', es: 'Corrige tus errores', 'pt-BR': 'Corrija seus erros', vi: 'Sửa lỗi của bạn', id: 'Perbaiki kesalahan', tr: 'Hatalarını düzelt', pl: 'Popraw błędy' }) };
    case 'spire_steps':
      return { title: triLang(lang, { ru: 'Пройти ступени Пика', uk: 'Пройти сходинки Піка', en: 'Climb steps in Peak', es: 'Sube escalones del Pico', 'pt-BR': 'Suba degraus do Pico', vi: 'Leo bậc Đỉnh', id: 'Naiki anak tangga Puncak', tr: 'Zirve basamaklarını çık', pl: 'Pokonaj stopnie Szczytu' }) };
    default: {
      const exhaustive: never = kind;
      return { title: String(exhaustive) };
    }
  }
}

/** Минут в задании «Посмотреть видео» (600 с / 60). */
const VIDEO_VIEW_MINUTES = (TODAY_TASK_RULES.video.unitsPerStep * TODAY_TASK_RULES.video.target) / 60;

/**
 * Счётчик для показа. Видео: минуты из 10, а не «0/1» —
 * зачем (координатор 17.10, слово владельца «не менее 10 минут»): кольцо и счётчик растут по минуте, отметки store раз в 60 с.
 */
export function todayTaskViewCounter(task: TodayTaskState): Readonly<{ progress: number; target: number }> {
  if (task.kind === 'video') {
    return { progress: task.done ? VIDEO_VIEW_MINUTES : Math.min(VIDEO_VIEW_MINUTES, Math.floor(task.units / 60)), target: VIDEO_VIEW_MINUTES };
  }
  return { progress: todayTaskProgress(task), target: TODAY_TASK_RULES[task.kind].target };
}

export function todayTasksToView(state: TodayTasksDayState, lang: Lang): TodayTask[] {
  return state.tasks.map((task) => {
    const copy = copyFor(task.kind, lang);
    return Object.freeze({
      id: `today-${state.dayKey}-${task.kind}`,
      kind: task.kind,
      title: copy.title,
      ...(copy.subtitle ? { subtitle: copy.subtitle } : {}),
      ...todayTaskViewCounter(task),
      done: task.done,
      rewardCoins: task.rewardCoins,
      route: TODAY_TASK_ROUTES[task.kind],
    });
  });
}
