# PhraseMan Critical Paths

Auto-generated high-signal chains for quick impact analysis.

## How to use
- If your change touches any node below, inspect the whole chain.
- Use `atlas.full.json` for deep graph details.

## Paths
### XP -> Leaderboard -> Hall
- `app/xp_manager.ts`
- `app/firestore_leaderboard.ts`
- `app/(tabs)/hall_of_fame.tsx`
Observed edges:
- `app/xp_manager.ts` -> `app/firestore_leaderboard.ts` (observed)
- `app/firestore_leaderboard.ts` -> `app/(tabs)/hall_of_fame.tsx` (heuristic)

### Premium -> Energy -> Gates
- `app/revenuecat_init.ts`
- `app/premium_guard.ts`
- `components/PremiumContext.tsx`
- `components/EnergyContext.tsx`
- `app/premium_modal.tsx`
Observed edges:
- `app/revenuecat_init.ts` -> `app/premium_guard.ts` (heuristic)
- `app/premium_guard.ts` -> `components/PremiumContext.tsx` (heuristic)
- `components/PremiumContext.tsx` -> `components/EnergyContext.tsx` (heuristic)
- `components/EnergyContext.tsx` -> `app/premium_modal.tsx` (heuristic)

### Arena full game flow
- `app/arena_lobby.tsx`
- `contexts/MatchmakingContext.tsx`
- `app/services/arena_db.ts`
- `hooks/use-arena-session.ts`
- `app/arena_game.tsx`
- `app/arena_results.tsx`
- `app/arena_rating.tsx`
Observed edges:
- `app/arena_lobby.tsx` -> `contexts/MatchmakingContext.tsx` (observed)
- `contexts/MatchmakingContext.tsx` -> `app/services/arena_db.ts` (observed)
- `app/services/arena_db.ts` -> `hooks/use-arena-session.ts` (heuristic)
- `hooks/use-arena-session.ts` -> `app/arena_game.tsx` (heuristic)
- `app/arena_game.tsx` -> `app/arena_results.tsx` (observed)
- `app/arena_results.tsx` -> `app/arena_rating.tsx` (heuristic)

### Cloud sync user/progress
- `app/cloud_sync.ts`
- `app/stable_id.ts`
- `app/firestore_leaderboard.ts`
- `functions/src/sync_leaderboard.ts`
Observed edges:
- `app/cloud_sync.ts` -> `app/stable_id.ts` (heuristic)
- `app/stable_id.ts` -> `app/firestore_leaderboard.ts` (heuristic)
- `app/firestore_leaderboard.ts` -> `functions/src/sync_leaderboard.ts` (heuristic)

### Root bootstrap and routing
- `app/_layout.tsx`
- `app/(tabs)/_layout.tsx`
- `app/(tabs)/home.tsx`
- `app/(tabs)/settings.tsx`
Observed edges:
- `app/_layout.tsx` -> `app/(tabs)/_layout.tsx` (heuristic)
- `app/(tabs)/_layout.tsx` -> `app/(tabs)/home.tsx` (heuristic)
- `app/(tabs)/home.tsx` -> `app/(tabs)/settings.tsx` (heuristic)
