// ─── Витрина движения · шард «Экраны · профиль и прочее» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
import type { ShowcaseSection } from '../types';

export const SECTION: ShowcaseSection = {
  id: 'screens_profile',
  order: 75,
  title: 'Экраны · профиль и прочее',
  items: [
    { id: 'streak-stats', title: 'Статистика серии', kind: 'route', route: '/streak_stats', detail: 'реальный экран' },
    { id: 'themes', title: 'Темы оформления (примерочная)', kind: 'route', route: '/settings_themes', detail: 'реальный экран' },
  ],
};
