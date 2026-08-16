// ─── Витрина движения · шард «Экраны · карточки» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
// Полный список — все flashcards*.tsx маршруты app/ (по export default function) + pack_opening.
// coin_exchange.tsx НЕ про карточки (обмен монет/звёзд) — не включён.
// flashcards_swipe_session.ts и flashcards_target_gate.ts — не экраны (логика/мёртвый шим
// __FlashcardsTargetGateRouteShim возвращает null) — не включены.
import type { ShowcaseSection } from '../types';
import { cs } from '../showcase_copy';

export const SECTION: ShowcaseSection = {
  id: 'screens_flashcards',
  order: 70,
  title: cs('screens_flashcards_section_title'),
  items: [
    { id: 'fc-section', title: cs('fc_section_title'), kind: 'route', route: '/flashcards', detail: cs('real_screen') },
    { id: 'fc-packs', title: cs('fc_packs_title'), kind: 'route', route: '/flashcards_packs', detail: cs('real_screen') },
    { id: 'fc-my-packs', title: cs('fc_my_packs_title'), kind: 'route', route: '/flashcards_my_packs', detail: cs('real_screen') },
    { id: 'fc-market-dev', title: cs('fc_market_dev_title'), kind: 'route', route: '/flashcards_market_dev', detail: cs('real_screen') },
    { id: 'fc-collection', title: cs('fc_collection_title'), kind: 'route', route: '/flashcards_collection', detail: cs('real_screen') },
    { id: 'fc-swipe', title: cs('fc_swipe_title'), kind: 'route', route: '/flashcards_swipe', detail: cs('real_screen') },
    { id: 'fc-blitz', title: cs('fc_blitz_title'), kind: 'route', route: '/flashcards_blitz_session', detail: cs('real_screen') },
    { id: 'fc-listening', title: cs('fc_listening_title'), kind: 'route', route: '/flashcards_listening_session', detail: cs('real_screen') },
    { id: 'fc-audio', title: cs('fc_audio_title'), kind: 'route', route: '/flashcards_audio', detail: cs('real_screen') },
    { id: 'fc-card-editor', title: cs('fc_card_editor_title'), kind: 'route', route: '/flashcards_card_editor', detail: cs('real_screen') },
    { id: 'fc-voice-picker', title: cs('fc_voice_picker_title'), kind: 'route', route: '/flashcards_voice_picker', detail: cs('real_screen') },
    { id: 'pack-opening', title: cs('pack_opening_title'), kind: 'route', route: '/pack_opening', detail: cs('real_screen') },
  ],
};
