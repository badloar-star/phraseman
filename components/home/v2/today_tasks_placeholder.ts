import { triLang, type Lang } from '../../../constants/i18n';
import type { TodayTask } from './home_v2_types';

/**
 * ВРЕМЕННАЯ модель блока «Сегодня» до хука useTodayTasks() (PM-259, программа 2.0).
 * зачем: блок обязан стоять на Главной уже сейчас (референс владельца 24.09), а
 * настоящий счёт задач и награды монетами делает логика 2.0. Счётчики нулевые и
 * ничего не начисляют — здесь только вид и переходы. Заменить вызов на хук, когда
 * он появится; контракт TodayTask совпадает.
 */
export function buildTodayTasksPlaceholder(lang: Lang, lessonTitle: string | null): TodayTask[] {
  return [
    {
      id: 'placeholder-lesson',
      kind: 'lesson',
      title: triLang(lang, { ru: 'Пройти урок', uk: 'Пройти урок', en: 'Complete a lesson', es: 'Completa una lección', 'pt-BR': 'Conclua uma lição', vi: 'Hoàn thành một bài học', id: 'Selesaikan pelajaran', tr: 'Bir ders bitir', pl: 'Ukończ lekcję' }),
      subtitle: lessonTitle ?? undefined,
      progress: 0,
      target: 1,
      done: false,
      rewardCoins: 0,
      route: '/lessons_list',
    },
    {
      id: 'placeholder-dialog',
      kind: 'dialog',
      title: triLang(lang, { ru: 'Потренировать диалог', uk: 'Потренувати діалог', en: 'Practise a dialogue', es: 'Practica un diálogo', 'pt-BR': 'Pratique um diálogo', vi: 'Luyện một đoạn hội thoại', id: 'Latih dialog', tr: 'Bir diyalog çalış', pl: 'Przećwicz dialog' }),
      subtitle: triLang(lang, { ru: '5 новых фраз', uk: '5 нових фраз', en: '5 new phrases', es: '5 frases nuevas', 'pt-BR': '5 frases novas', vi: '5 cụm từ mới', id: '5 frasa baru', tr: '5 yeni ifade', pl: '5 nowych zwrotów' }),
      progress: 0,
      target: 1,
      done: false,
      rewardCoins: 0,
      route: '/ai_dialog_home',
    },
    {
      id: 'placeholder-cards',
      kind: 'cards',
      title: triLang(lang, { ru: 'Повторить карточки', uk: 'Повторити картки', en: 'Review cards', es: 'Repasa tarjetas', 'pt-BR': 'Revise cartões', vi: 'Ôn thẻ', id: 'Ulangi kartu', tr: 'Kartları tekrar et', pl: 'Powtórz fiszki' }),
      subtitle: triLang(lang, { ru: 'Не менее 10 слов', uk: 'Не менше 10 слів', en: 'At least 10 words', es: 'Al menos 10 palabras', 'pt-BR': 'Pelo menos 10 palavras', vi: 'Ít nhất 10 từ', id: 'Minimal 10 kata', tr: 'En az 10 kelime', pl: 'Co najmniej 10 słów' }),
      progress: 0,
      target: 10,
      done: false,
      rewardCoins: 0,
      route: '/flashcards',
    },
  ];
}
