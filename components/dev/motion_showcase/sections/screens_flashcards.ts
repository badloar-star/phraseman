// ─── Витрина движения · шард «Экраны · карточки» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
import type { ShowcaseSection } from '../types';

export const SECTION: ShowcaseSection = {
  id: 'screens_flashcards',
  order: 70,
  title: 'Экраны · карточки',
  items: [
    { id: 'fc-packs', title: 'Карточки · наборы', kind: 'route', route: '/flashcards_packs', detail: 'реальный экран' },
  ],
};
