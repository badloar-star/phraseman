// ─── Витрина движения · шард «Экраны · арена и социальное» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
// Полный список маршрутов подраздела: все arena_*.tsx, лига/клубы (club_screen),
// турниры (tournament_*), друзья (referrals), top_helpers — взяты из app/ (grep +
// export default), ничего не выборочно.
import type { ShowcaseSection } from '../types';
import { cs } from '../showcase_copy';

export const SECTION: ShowcaseSection = {
  id: 'screens_arena_social',
  order: 65,
  title: cs('screens_arena_social_section_title'),
  items: [
    // — Арена: хаб, ранги, повседневное —
    { id: 'arena-hub', title: cs('arena_hub_title'), kind: 'route', route: '/arena', detail: cs('real_screen') },
    { id: 'arena-today', title: cs('arena_today_title'), kind: 'route', route: '/arena_today', detail: cs('real_screen') },
    { id: 'arena-ranks', title: cs('arena_ranks_title'), kind: 'route', route: '/arena_ranks', detail: cs('real_screen') },
    { id: 'arena-tops', title: cs('arena_tops_title'), kind: 'route', route: '/arena_tops', detail: cs('real_screen') },
    { id: 'arena-history', title: cs('arena_history_title'), kind: 'route', route: '/arena_history', detail: cs('real_screen') },
    { id: 'arena-rivalries', title: cs('arena_rivalries_title'), kind: 'route', route: '/arena_rivalries', detail: cs('real_screen') },
    { id: 'arena-star-wallet', title: cs('arena_star_wallet_title'), kind: 'route', route: '/arena_star_wallet', detail: cs('real_screen') },
    { id: 'arena-season-pass', title: cs('arena_season_pass_title'), kind: 'route', route: '/arena_season_pass', detail: cs('real_screen') },
    { id: 'arena-mastery-map', title: cs('arena_mastery_map_title'), kind: 'route', route: '/arena_mastery_map', detail: cs('real_screen') },

    // — Арена: матчи и режимы —
    { id: 'arena-matchmaking', title: cs('arena_matchmaking_title'), kind: 'route', route: '/arena_matchmaking', detail: cs('arena_matchmaking_detail') },
    { id: 'arena-match', title: cs('arena_match_title'), kind: 'route', route: '/arena_match', detail: cs('arena_match_detail') },
    { id: 'arena-match-lab', title: cs('arena_match_lab_title'), kind: 'route', route: '/arena_match_lab', detail: cs('arena_match_lab_detail') },
    { id: 'arena-results', title: cs('arena_results_title'), kind: 'route', route: '/arena_results', detail: cs('arena_results_detail') },
    { id: 'arena-review', title: cs('arena_review_title'), kind: 'route', route: '/arena_review', detail: cs('arena_review_detail') },
    { id: 'arena-friend-duel', title: cs('arena_friend_duel_title'), kind: 'route', route: '/arena_friend_duel', detail: cs('real_screen') },
    { id: 'arena-ghost-duel', title: cs('arena_ghost_duel_title'), kind: 'route', route: '/arena_ghost_duel', detail: cs('arena_ghost_duel_detail') },
    { id: 'arena-invite', title: cs('arena_invite_title'), kind: 'route', route: '/arena_invite', detail: cs('real_screen') },
    { id: 'arena-partner', title: cs('arena_partner_title'), kind: 'route', route: '/arena_partner', detail: cs('real_screen') },

    // — Лига / клубы —
    { id: 'club-screen', title: cs('club_screen_title'), kind: 'route', route: '/club_screen', detail: cs('real_screen') },

    // — Турниры —
    { id: 'tournament-lobby', title: cs('tournament_lobby_title'), kind: 'route', route: '/tournament_lobby', detail: cs('real_screen') },
    { id: 'tournament-season', title: cs('tournament_season_title'), kind: 'route', route: '/tournament_season', detail: cs('real_screen') },
    { id: 'tournament-table', title: cs('tournament_table_title'), kind: 'route', route: '/tournament_table', detail: cs('tournament_table_detail') },
    { id: 'tournament-round', title: cs('tournament_round_title'), kind: 'route', route: '/tournament_round', detail: cs('tournament_round_detail') },
    { id: 'tournament-review', title: cs('tournament_review_title'), kind: 'route', route: '/tournament_review', detail: cs('tournament_review_detail') },
    { id: 'tournament-results', title: cs('tournament_results_title'), kind: 'route', route: '/tournament_results', detail: cs('tournament_results_detail') },
    { id: 'tournament-tickets', title: cs('tournament_tickets_title'), kind: 'route', route: '/tournament_tickets', detail: cs('real_screen') },

    // — Друзья / рефералы / помощники —
    { id: 'referrals', title: cs('referrals_title'), kind: 'route', route: '/referrals', detail: cs('real_screen') },
    { id: 'top-helpers', title: cs('top_helpers_title'), kind: 'route', route: '/top_helpers', detail: cs('real_screen') },
  ],
};
