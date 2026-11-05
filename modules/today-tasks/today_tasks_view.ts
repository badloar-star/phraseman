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

// зачем (Сверка 24.10, flags/ht_l.png; координатор): при включённом Сезоне «Пройти урок» ведёт в хаб Сезона — вкладку «Уроки»
// (как «Видео» и Пик, dismissTo), а не в старый классический список «Обучение · A1»; Сезон выключен или курс V2 скрыт — прежний список
// зачем (владелец 04.11, заморозка V2): «Пройди урок» и любые входы из «Сегодня» ВСЕГДА открывают обычный курс текущего языка изучения.
export const TODAY_LESSON_ROUTE: string = '/lessons_list';

/** Куда ведёт тап по задаче. Источник правды для «Дизайна» (см. evidence-таблицу). */
export const TODAY_TASK_ROUTES: Readonly<Record<TodayTaskKindCore, string>> = Object.freeze({
  lesson: TODAY_LESSON_ROUTE,
  dialog: '/ai_dialog_home',
  cards: '/flashcards',
  video: '/(tabs)/video',
  mistakes: '/mistakes_hub',
  // зачем (01.10): без раздела вкладка «Сообщество» открывает «Друзей» — ведём прямо в Шпиль.
  spire_steps: '/(tabs)/community?section=spire',
});

function copyFor(kind: TodayTaskKindCore, lang: Lang): { title: string; subtitle?: string } {
  // зачем (слово владельца 05.11 «экраны не 1:1 с одобренными макетами»; эталоны rev6-home-free-0 / rev6-home-plus-3 / rev7-home-unlock-video): строки «Сегодня» —
  // «Пройди урок / Повтори карточки / Заверши диалог / Посмотри видео», у каждой короткая подпись («Один шаг в обычном курсе», «Твои сохранённые фразы»,
  // «Практика живого разговора», «10 минут на изучаемом языке»). Прежние подписи («Не менее 10 слов»; у видео подписи не было, решение 17.10) макет заменил.
  switch (kind) {
    case 'lesson':
      return { title: triLang(lang, { ru: 'Пройди урок', uk: 'Пройди урок', en: 'Complete a lesson', es: 'Completa una lección', 'pt-BR': 'Conclua uma lição', vi: 'Hoàn thành một bài học', id: 'Selesaikan pelajaran', tr: 'Bir ders bitir', pl: 'Ukończ lekcję' }), subtitle: triLang(lang, { ru: 'Один шаг в обычном курсе', uk: 'Один крок у звичайному курсі', en: 'A lesson in the regular course', es: 'Una lección del curso normal', 'pt-BR': 'Um passo no curso normal', vi: 'Một bước trong khóa học thường', id: 'Satu pelajaran di kursus reguler', tr: 'Normal kursta bir ders', pl: 'Jedna lekcja w zwykłym kursie' }) };
    case 'dialog':
      return { title: triLang(lang, { ru: 'Заверши диалог', uk: 'Заверши діалог', en: 'Practice a dialogue', es: 'Practica un diálogo', 'pt-BR': 'Pratique um diálogo', vi: 'Luyện một đoạn hội thoại', id: 'Latih dialog', tr: 'Bir diyalog çalış', pl: 'Przećwicz dialog' }), subtitle: triLang(lang, { ru: 'Практика живого разговора', uk: 'Практика живого спілкування', en: 'Live conversation practice', es: 'Práctica de conversación real', 'pt-BR': 'Prática de conversa real', vi: 'Luyện hội thoại thực tế', id: 'Latihan percakapan nyata', tr: 'Gerçek konuşma pratiği', pl: 'Praktyka rozmowy na żywo' }) };
    case 'cards':
      return { title: triLang(lang, { ru: 'Повтори карточки', uk: 'Повтори картки', en: 'Review cards', es: 'Repasa tarjetas', 'pt-BR': 'Revise cartões', vi: 'Ôn thẻ', id: 'Ulangi kartu', tr: 'Kartları tekrar et', pl: 'Powtórz karty' }), subtitle: triLang(lang, { ru: 'Твои сохранённые фразы', uk: 'Твої збережені фрази', en: 'Your saved phrases', es: 'Tus frases guardadas', 'pt-BR': 'Suas frases salvas', vi: 'Cụm từ đã lưu của bạn', id: 'Frasa tersimpanmu', tr: 'Kayıtlı ifadelerin', pl: 'Twoje zapisane frazy' }) };
    case 'video':
      return { title: triLang(lang, { ru: 'Посмотри видео', uk: 'Подивись відео', en: 'Watch a video', es: 'Mira un vídeo', 'pt-BR': 'Assista a um vídeo', vi: 'Xem một video', id: 'Tonton video', tr: 'Bir video izle', pl: 'Obejrzyj wideo' }), subtitle: triLang(lang, { ru: '10 минут на изучаемом языке', uk: '10 хвилин на мові, що вивчаєш', en: '10 minutes in the language you learn', es: '10 minutos en el idioma que aprendes', 'pt-BR': '10 minutos no idioma que você aprende', vi: '10 phút bằng ngôn ngữ bạn học', id: '10 menit dalam bahasa yang kamu pelajari', tr: 'Öğrendiğin dilde 10 dakika', pl: '10 minut w uczonym języku' }) };
    case 'mistakes':
      return { title: triLang(lang, { ru: 'Исправить ошибки', uk: 'Виправити помилки', en: 'Fix your mistakes', es: 'Corrige tus errores', 'pt-BR': 'Corrija seus erros', vi: 'Sửa lỗi của bạn', id: 'Perbaiki kesalahan', tr: 'Hatalarını düzelt', pl: 'Popraw błędy' }) };
    case 'spire_steps':
      return { title: triLang(lang, { ru: 'Пройти этапы Пика', uk: 'Пройти етапи Піку', en: 'Clear stages in Peak', es: 'Supera etapas del Pico', 'pt-BR': 'Conclua etapas do Pico', vi: 'Vượt giai đoạn Đỉnh', id: 'Selesaikan tahap Puncak', tr: 'Zirve aşamalarını geç', pl: 'Pokonaj etapy Szczytu' }) };
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
