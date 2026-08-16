// ─── Витрина движения · шард «Экраны · обучение» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
import type { ShowcaseSection } from '../types';

export const SECTION: ShowcaseSection = {
  id: 'screens_learn',
  order: 60,
  title: 'Экраны · обучение',
  items: [
    { id: 'lessons-tab', title: 'Вкладка «Обучение» (уроки, V2, диалоги)', kind: 'route', route: '/(tabs)/lessons', detail: 'реальный экран' },
    { id: 'review', title: 'Повторение (сжигание карточек)', kind: 'route', route: '/review', detail: 'реальный экран' },
  ],
};
