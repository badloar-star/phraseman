// ─── Витрина движения · шард «Экраны · арена и социальное» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
import type { ShowcaseSection } from '../types';

export const SECTION: ShowcaseSection = {
  id: 'screens_arena_social',
  order: 65,
  title: 'Экраны · арена и социальное',
  items: [
    { id: 'arena-hub', title: 'Арена · хаб', kind: 'route', route: '/arena', detail: 'реальный экран' },
    { id: 'arena-ranks', title: 'Арена · ранги', kind: 'route', route: '/arena_ranks', detail: 'реальный экран' },
  ],
};
