---
phase: 03-friends-hall-of-fame-arena-integration
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - app/arena_lobby.tsx
autonomous: true
requirements: [ARENA-01, ARENA-02, ARENA-03, ARENA-04]

must_haves:
  truths:
    - "Scrollable friends list appears in arena_lobby.tsx BELOW the 'Пригласить друга' section and ABOVE the dailyLimitRow"
    - "Each friend item shows nick + avatar (computed) + level; NO online status"
    - "Tapping a friend calls handleFriendShare() — reuses existing arena invite flow (ARENA-03)"
    - "Friends loaded via subscribeToFriends; profile fetched from users/{uid} for name + totalXp"
    - "Avatar computed via getBestAvatarForLevel(getLevelFromXP(totalXp)) — NEVER from Firestore"
    - "Empty state shown when no friends: 'Добавьте друзей по коду в настройках'"
    - "Existing arena flow (daily limit, energy, matchmaking, handleFriendShare, ArenaLimitModal) UNCHANGED"
  artifacts:
    - path: "app/arena_lobby.tsx"
      provides: "Updated: friends list section below invite button, reusing handleFriendShare"
  key_links:
    - from: "app/arena_lobby.tsx"
      to: "app/firestore_friend_requests.ts:subscribeToFriends"
      via: "real-time listener for friends, cleaned up in useEffect return"
      pattern: "subscribeToFriends"
---

<objective>
Добавить в `app/arena_lobby.tsx` список друзей под кнопкой "Пригласить друга".

Нажатие на любого друга → вызов существующего `handleFriendShare()` (шарит arena invite link).
Список реал-тайм через `subscribeToFriends`.

Только один файл изменяется. Никакой новой логики приглашений — reuse всего, что уже есть.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@CLAUDE.md
@app/arena_lobby.tsx
@app/firestore_friend_requests.ts

<interfaces>
From app/firestore_friend_requests.ts (Phase 2 Plan 01):
```typescript
export interface FriendEntry { uid: string; createdAt: number; }
export function subscribeToFriends(
  callback: (friends: FriendEntry[]) => void,
  onError?: (err: Error) => void,
): () => void
```

Arena lobby existing state (app/arena_lobby.tsx):
- `handleFriendShare: async () => void` — already defined, shares invite link (line ~645)
- `friendRoomId: string | null` — set when "Играть с другом" is tapped
- Insert point: AFTER `</> {/* closing friendRoomId conditional */}` (line ~1239) BEFORE `</> {/* closing outer block */}` (line ~1241)

Avatar computation:
```typescript
import { getBestAvatarForLevel } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
const avatarId = getBestAvatarForLevel(getLevelFromXP(totalXp));
```

Profile fetch (same getDb pattern as other files — arena_lobby already uses Firestore):
```typescript
// For each friend uid, fetch users/{uid}.displayName + users/{uid}.progress.user_total_xp
```
</interfaces>

<locked_decisions>
- ARENA-03: Reuse existing invite logic — NO new arena invite mechanic
- DO NOT touch handleFindMatch, handlePlayWithFriend, ArenaLimitModal, daily limit logic
- Avatar from computation ONLY — never from Firestore
- No online status / presence (deferred to v1.1)
- No console.log
</locked_decisions>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Add friends list to arena_lobby.tsx (ARENA-01..04)</name>
  <files>app/arena_lobby.tsx</files>

  <read_first>
    - app/arena_lobby.tsx (READ THE FULL FILE — understand ALL existing imports, state, and the exact insertion point)
    - app/firestore_friend_requests.ts (verify subscribeToFriends export + FriendEntry interface)
    - CLAUDE.md (avatar computation rule — CRITICAL; arena daily limit rules — DO NOT BREAK)
  </read_first>

  <behavior>
    - Friends list section appears below "Пригласить друга" / invite section, above dailyLimitRow
    - Shows horizontal ScrollView of friend avatars (compact, not full-screen list)
    - Each item: AvatarView, name (truncated to ~8 chars), level
    - Tapping any friend when friendRoomId IS set: calls handleFriendShare() immediately
    - Tapping any friend when friendRoomId IS NULL: calls handlePlayWithFriend() to create a room; after room creation the "Поделиться ссылкой" button appears so user can share manually — a toast-style text "Нажмите «Поделиться ссылкой» выше" is shown for 2s to guide the user (no silent no-op)
    - Empty state: one-line text "Добавьте друзей по коду в настройках" when friends list is empty
    - Loading: show nothing (friends load async after mount — avoid flicker)
    - Section only visible when NOT inSearchFlow (hide during matchmaking)
  </behavior>

  <action>
    ADD to imports at the top of `app/arena_lobby.tsx` (find existing import block — add after last import):
    ```typescript
    import { subscribeToFriends, type FriendEntry } from './firestore_friend_requests';
    import { getBestAvatarForLevel } from '../constants/avatars';
    import AvatarView from '../components/AvatarView';
    ```
    ALSO add `ScrollView` to the existing react-native import destructuring — arena_lobby.tsx does NOT currently import ScrollView, so add it explicitly:
    Change: `import { View, Text, TouchableOpacity, ... } from 'react-native';`
    To:     `import { View, Text, TouchableOpacity, ..., ScrollView } from 'react-native';`
    (getLevelFromXP — check if already imported in arena_lobby.tsx; if not, add import from '../constants/theme')

    ADD state declarations (inside ArenaLobby component, with other state):
    ```typescript
    const [arenaFriends, setArenaFriends] = useState<FriendEntry[]>([]);
    const [arenaFriendProfiles, setArenaFriendProfiles] = useState<
      Record<string, { name: string; totalXp: number }>
    >({});
    const [arenaFriendHint, setArenaFriendHint] = useState(false);
    ```

    ADD useEffect for subscription (near other useEffects):
    ```typescript
    useEffect(() => {
      const unsub = subscribeToFriends(setArenaFriends, () => setArenaFriends([]));
      return () => unsub();
    }, []);
    ```

    ADD useEffect for profile loading (depends on arenaFriends):
    ```typescript
    useEffect(() => {
      if (arenaFriends.length === 0) return;
      // lazy getDb — arena_lobby already requires firestore, use same pattern
      const db = (() => {
        if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
        try { return require('@react-native-firebase/firestore').default(); } catch { return null; }
      })();
      if (!db) return;
      let cancelled = false;
      void Promise.all(
        arenaFriends.map(async f => {
          try {
            const snap = await db.collection('users').doc(f.uid).get();
            if (!snap.exists) return null;
            const data = snap.data() ?? {};
            return {
              uid: f.uid,
              name: (data.displayName as string) || (data.progress?.displayName as string) || 'Игрок',
              totalXp: parseInt((data.progress?.user_total_xp as string) ?? '0') || 0,
            };
          } catch { return null; }
        })
      ).then(results => {
        if (cancelled) return;
        const map: Record<string, { name: string; totalXp: number }> = {};
        for (const r of results) if (r) map[r.uid] = r;
        setArenaFriendProfiles(map);
      });
      return () => { cancelled = true; };
    }, [arenaFriends]);
    ```

    ADD friends section JSX (insert AFTER the closing `</>` of the `{friendRoomId && ...}` block at ~line 1239, BEFORE the outer closing `</>` at ~line 1241):

    ```tsx
    {/* Arena friends list — ARENA-01..04 */}
    {!inSearchFlow && (
      <View style={{ marginTop: 12 }}>
        <Text style={{ color: screenMuted, fontSize: f.sub, marginBottom: 8, textAlign: 'center' }}>
          {triLang(lang, { ru: 'Пригласить друга', uk: 'Запросити друга', es: 'Invitar amigo' })}
        </Text>
        {arenaFriends.length === 0 ? (
          <Text style={{ color: screenMuted, fontSize: f.sub, textAlign: 'center', opacity: 0.6 }}>
            {triLang(lang, {
              ru: 'Добавьте друзей по коду в настройках',
              uk: 'Додайте друзів за кодом у налаштуваннях',
              es: 'Añade amigos por código en ajustes',
            })}
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            {arenaFriends.map(f => {
              const profile = arenaFriendProfiles[f.uid];
              const totalXp = profile?.totalXp ?? 0;
              const level = getLevelFromXP(totalXp);
              const avatarId = String(getBestAvatarForLevel(level));
              const name = profile?.name ?? '…';
              return (
                <TouchableOpacity
                  key={f.uid}
                  onPress={() => {
                    hapticTap();
                    if (friendRoomId) {
                      void handleFriendShare();
                    } else {
                      // Create room first (ARENA-02: must produce visible outcome, not silent no-op)
                      void handlePlayWithFriend();
                      // User sees "Поделиться ссылкой" button appear above; brief hint toast
                      setArenaFriendHint(true);
                      setTimeout(() => setArenaFriendHint(false), 2500);
                    }
                  }}
                  activeOpacity={0.7}
                  style={{ alignItems: 'center', gap: 4, minWidth: 56 }}
                >
                  <AvatarView avatarId={avatarId} size={44} />
                  <Text
                    numberOfLines={1}
                    style={{ color: screenPrimary, fontSize: f.sub, maxWidth: 60 }}
                  >
                    {name}
                  </Text>
                  <Text style={{ color: screenMuted, fontSize: f.sub }}>
                    Lv {level}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    )}
    ```

    ADD hint text ABOVE the ScrollView (so user knows to tap "Поделиться" button):
    ```tsx
    {arenaFriendHint && (
      <Text style={{ color: screenMuted, fontSize: f.sub, textAlign: 'center', marginBottom: 6 }}>
        {triLang(lang, {
          ru: 'Нажмите «Поделиться ссылкой» выше',
          uk: 'Натисніть «Поділитися посиланням» вище',
          es: 'Pulsa «Compartir enlace» arriba',
        })}
      </Text>
    )}
    ```
    Place this text ABOVE the `<ScrollView horizontal ...>` block.

    SAFETY CHECKS:
    - `hapticTap` is already imported in arena_lobby.tsx (confirm before adding duplicate import)
    - `triLang` is already imported (confirm)
    - `ScrollView` — add to react-native import (NOT already there — see action above)
    - `getLevelFromXP` — check if imported; if not, add `import { getLevelFromXP } from '../constants/theme';`
    - `IS_EXPO_GO`, `CLOUD_SYNC_ENABLED` — already imported from './config' (confirm)

    DO NOT modify:
    - `handleFindMatch`, `handlePlayWithFriend`, `handleFriendShare` functions
    - `ArenaLimitModal`, `NoEnergyModal` components
    - Arena daily limit logic
    - Any existing state or effects
  </action>

  <verify>
    `npx tsc --noEmit` — no new TypeScript errors in arena_lobby.tsx
    `grep "subscribeToFriends" app/arena_lobby.tsx` — 1 match
    `grep "arenaFriends" app/arena_lobby.tsx` — >= 3 matches
  </verify>

  <acceptance_criteria>
    - `grep "subscribeToFriends" app/arena_lobby.tsx` returns >= 1 match
    - `grep "arenaFriends" app/arena_lobby.tsx` returns >= 3 matches (state + setter + JSX)
    - `grep "getBestAvatarForLevel" app/arena_lobby.tsx` returns >= 1 match (avatar computed)
    - `grep "\.avatar" app/arena_lobby.tsx` — check that NO new Firestore .avatar reads were added (any existing ones may remain)
    - `grep "handleFindMatch\|handlePlayWithFriend\|ArenaLimitModal\|dailyMax" app/arena_lobby.tsx` — all still present (no deletion)
    - `npx tsc --noEmit` exits 0 — no new TypeScript errors
    - `git diff app/arena_lobby.tsx` shows: only additions (new imports, new state, new useEffect, new JSX block) — no deletions of existing logic
    - No `console.log` added (grep for any NEW console.log lines in diff: 0)
  </acceptance_criteria>

  <done>
    Arena friends list added. Friends appear below invite button. Tapping any friend shares existing invite link. Existing arena flow unmodified.
  </done>
</task>

</tasks>

<verification>
Plan-level checks:
1. `grep "subscribeToFriends" app/arena_lobby.tsx` returns >= 1 match
2. `grep "getBestAvatarForLevel" app/arena_lobby.tsx` returns >= 1 match
3. `npx tsc --noEmit` — no TypeScript errors in arena_lobby.tsx
4. `git diff --name-only HEAD` — only `app/arena_lobby.tsx` modified in this plan
5. Existing arena logic untouched: `grep "handleFindMatch\|handlePlayWithFriend\|ARENA_DAILY_MAX" app/arena_lobby.tsx` all present
</verification>

<success_criteria>
- ARENA-01: Scrollable friends list appears in arena lobby. VERIFIED via JSX grep.
- ARENA-02: Tapping friend calls handleFriendShare. VERIFIED via onPress grep.
- ARENA-03: Existing invite logic reused — no new mechanic. VERIFIED by diff (no handleFriendShare modification).
- ARENA-04: Only nick + avatar + level shown (no online status). VERIFIED by JSX review (no presence/online fields).
</success_criteria>

<output>
After completion, create `.planning/phases/03-friends-hall-of-fame-arena-integration/03-friends-hall-of-fame-arena-integration-02-SUMMARY.md`
</output>
