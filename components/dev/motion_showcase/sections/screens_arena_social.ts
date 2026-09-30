// ─── Витрина движения · шард «Экраны · арена и социальное» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
// Полный список маршрутов подраздела: все arena_*.tsx, лига/клубы (club_screen),
// турниры (tournament_*), друзья (referrals) — взяты из app/ (grep +
// export default), ничего не выборочно.
import type { ShowcaseSection } from '../types';
import { cs } from '../showcase_copy';

export const SECTION: ShowcaseSection = {
  id: 'screens_arena_social',
  order: 65,
  title: cs('screens_arena_social_section_title'),
  items: [
    // зачем: D83 — клиентская Арена удалена, её экраны сняты из витрины.

    // — Турниры —
    { id: 'tournament-lobby', title: cs('tournament_lobby_title'), kind: 'route', route: '/tournament_lobby', detail: cs('real_screen') },
    { id: 'tournament-season', title: cs('tournament_season_title'), kind: 'route', route: '/tournament_season', detail: cs('real_screen') },
    { id: 'tournament-table', title: cs('tournament_table_title'), kind: 'route', route: '/tournament_table', detail: cs('tournament_table_detail') },
    { id: 'tournament-round', title: cs('tournament_round_title'), kind: 'route', route: '/tournament_round', detail: cs('tournament_round_detail') },
    { id: 'tournament-review', title: cs('tournament_review_title'), kind: 'route', route: '/tournament_review', detail: cs('tournament_review_detail') },
    { id: 'tournament-results', title: cs('tournament_results_title'), kind: 'route', route: '/tournament_results', detail: cs('tournament_results_detail') },

    // — Друзья / рефералы / помощники —
    { id: 'referrals', title: cs('referrals_title'), kind: 'route', route: '/referrals', detail: cs('real_screen') },
  ],
};
