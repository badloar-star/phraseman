---
phase: 03-friends-hall-of-fame-arena-integration
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/friends_hof_screen.tsx
  - app/achievements_screen.tsx
  - tests/friends_hof.test.ts
autonomous: true
requirements: [HOF-01, HOF-02, HOF-03, HOF-04, HOF-05, HOF-06, HOF-07, TEST-04]

must_haves:
  truths:
    - "Friends HoF screen at app/friends_hof_screen.tsx, accessible via router.push('/friends_hof_screen') from achievements_screen.tsx"
    - "Toggle 'Всё время / Эта неделя' switches ranking between totalXp and weeklyXp"
    - "Own row highlighted with distinct visual treatment (isMe flag)"
    - "Banned users excluded from list (get() check on banned_users/{uid})"
    - "Weekly empty state shown when all weeklyXp == 0: 'Эта неделя ещё не началась'"
    - "Avatar computed via getBestAvatarForLevel(getLevelFromXP(xp)) — NEVER read from Firestore"
    - "sortAndRankHoF() is a pure function tested in TEST-04 unit tests"
  artifacts:
    - path: "app/friends_hof_screen.tsx"
      provides: "Friends HoF full-screen route with toggle, ranked list, highlight, banned filter"
      exports: ["default FriendsHoFScreen"]
    - path: "app/achievements_screen.tsx"
      provides: "Updated: Friends HoF entry button below progress bar"
    - path: "tests/friends_hof.test.ts"
      provides: "Unit tests for HoF sort/rank/filter logic (TEST-04)"
  key_links:
    - from: "app/friends_hof_screen.tsx"
      to: "app/firestore_friend_requests.ts:subscribeToFriends"
      via: "real-time listener for friend UIDs, unsubscribed in cleanup"
      pattern: "subscribeToFriends"
    - from: "app/achievements_screen.tsx"
      to: "app/friends_hof_screen.tsx"
      via: "router.push('/friends_hof_screen')"
      pattern: "friends_hof_screen"
---

<objective>
Создать экран Friends Hall of Fame (`app/friends_hof_screen.tsx`) — ранжированный список себя + друзей с переключателем "Всё время / Эта неделя". Добавить кнопку входа в `app/achievements_screen.tsx`.

Цель: дать пользователям конкурентный контекст — видеть свой ранг среди друзей по суммарному XP и по недельному активности.

Output:
- `app/friends_hof_screen.tsx` — полноэкранный маршрут
- `app/achievements_screen.tsx` — кнопка после progress bar
- `tests/friends_hof.test.ts` — unit-тесты для sortAndRankHoF() (TEST-04)
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@CLAUDE.md
@app/firestore_friend_requests.ts
@app/firestore_friends.ts
@app/weekly_xp.ts
@app/achievements_screen.tsx

<interfaces>
From app/firestore_friend_requests.ts (Plan 02-01):
```typescript
export interface FriendEntry { uid: string; createdAt: number; }
export function subscribeToFriends(
  callback: (friends: FriendEntry[]) => void,
  onError?: (err: Error) => void,
): () => void
```

From app/weekly_xp.ts (Phase 1):
```typescript
export const WEEKLY_XP_KEY = 'weekly_xp';
export const WEEKLY_XP_PERIOD_START_KEY = 'weekly_xp_period_start';
```

Avatar computation (CRITICAL — from CLAUDE.md):
```typescript
import { getBestAvatarForLevel } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
// NEVER read avatar from Firestore — always compute:
const avatarId = String(getBestAvatarForLevel(getLevelFromXP(xp)));
```

Achievements screen header area (lines 886-910 in achievements_screen.tsx):
The Friends HoF button should be inserted between the progress bar (line ~910) and the SectionList (line ~917), as a full-width row button.
</interfaces>

<locked_decisions>
- Avatar MUST be computed — not read from Firestore (CLAUDE.md critical rule)
- D-02: getCanonicalUserId() for all Firestore reads (user profile fetch for friends)
- D-03: DO NOT modify xp_manager.ts or firestore_leaderboard.ts
- No console.log (hook fails)
- Banned users excluded via get() check on banned_users/{uid}
</locked_decisions>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create sortAndRankHoF pure function + tests (TEST-04)</name>
  <files>app/friends_hof_screen.tsx (pure helpers section), tests/friends_hof.test.ts</files>

  <read_first>
    - tests/friend_code.test.ts (Jest mock patterns in this project)
    - app/weekly_xp.ts (WEEKLY_XP_KEY constant)
    - CLAUDE.md (avatar computation rule)
  </read_first>

  <behavior>
    Tests to create in tests/friends_hof.test.ts (import from '../app/friends_hof_helpers' — NOT from friends_hof_screen):
    - Test H01: sortAndRankHoF([...entries], 'alltime') — sorted descending by totalXp, rank numbers 1,2,3
    - Test H02: sortAndRankHoF([...], 'alltime') — when two entries have same totalXp, stable order (uid as tiebreaker)
    - Test H03: sortAndRankHoF([...entries], 'weekly') — sorted descending by weeklyXp
    - Test H04: isWeeklyAllZero([...]) returns true when all weeklyXp == 0, false when any > 0
    - Test H05: sortAndRankHoF with 1 entry (just self) returns array of length 1 with rank 1
    - Test H06: entries with weeklyXp=0 sort correctly in weekly mode (all rank equal, no NaN)
  </behavior>

  <action>
    Create a pure helper module `app/friends_hof_helpers.ts` (NO React Native imports — pure TypeScript, testable in Node without native mocking):

    ```typescript
    // === Pure helpers (exported for testing) ===

    export interface HoFEntry {
      uid: string;
      name: string;
      totalXp: number;
      weeklyXp: number;
      isMe: boolean;
    }

    export interface RankedHoFEntry extends HoFEntry {
      rank: number;
    }

    /**
     * Sort and assign ranks. Rank 1 = highest xp.
     * Ties broken by uid (stable, deterministic).
     * mode 'alltime' → sort by totalXp; 'weekly' → sort by weeklyXp.
     */
    export function sortAndRankHoF(
      entries: HoFEntry[],
      mode: 'alltime' | 'weekly',
    ): RankedHoFEntry[] {
      const key: keyof HoFEntry = mode === 'weekly' ? 'weeklyXp' : 'totalXp';
      const sorted = [...entries].sort((a, b) => {
        const diff = (b[key] as number) - (a[key] as number);
        return diff !== 0 ? diff : a.uid.localeCompare(b.uid);
      });
      return sorted.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
    }

    /** Returns true when every entry has weeklyXp === 0 (show empty state for this week). */
    export function isWeeklyAllZero(entries: HoFEntry[]): boolean {
      return entries.every(e => e.weeklyXp === 0);
    }
    ```

    Then create `tests/friends_hof.test.ts` with tests H01-H06 covering all behaviors.
    Import only from './app/friends_hof_screen' — no Firebase mocks needed (pure functions).
    Use jest.mock('../app/config', ...) and mock expo-router if needed to avoid React import errors.

    Actually: since the test imports from `app/friends_hof_screen.tsx`, and that file also imports React Native components, there will be mock issues. Better approach:
    - Extract the pure helpers to a SEPARATE file: `app/friends_hof_helpers.ts` (no React imports)
    - Import the helpers INTO friends_hof_screen.tsx
    - Test file imports from `./app/friends_hof_helpers`

    This keeps tests pure and avoids native module mocking overhead.

    Create `app/friends_hof_helpers.ts` (pure, no React Native, testable in Node):
    ```typescript
    export interface HoFEntry {
      uid: string; name: string; totalXp: number; weeklyXp: number; isMe: boolean;
    }
    export interface RankedHoFEntry extends HoFEntry { rank: number; }
    export function sortAndRankHoF(entries: HoFEntry[], mode: 'alltime' | 'weekly'): RankedHoFEntry[]
    export function isWeeklyAllZero(entries: HoFEntry[]): boolean
    // expo-router shim:
    export default function __RouteShim() { return null; }
    ```

    Run: npm test -- --testPathPattern=friends_hof

    Commit: "feat(friends-hof): add sortAndRankHoF helpers + TEST-04 unit tests"
  </action>

  <verify>
    <automated>npm test -- --testPathPattern=friends_hof</automated>
  </verify>

  <acceptance_criteria>
    - File `app/friends_hof_helpers.ts` exists and exports `sortAndRankHoF`, `isWeeklyAllZero`, `HoFEntry`, `RankedHoFEntry` (grep each)
    - `tests/friends_hof.test.ts` exists with >= 6 test/it blocks
    - `npm test -- --testPathPattern=friends_hof` exits 0 with all tests passing
    - No `console.log` in `app/friends_hof_helpers.ts` (grep: 0 matches)
  </acceptance_criteria>

  <done>
    Pure HoF ranking helpers and 6+ unit tests created. TEST-04 satisfied.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Create app/friends_hof_screen.tsx — full HoF screen</name>
  <files>app/friends_hof_screen.tsx</files>

  <read_first>
    - app/friends_hof_helpers.ts (created in Task 1 — import sortAndRankHoF, isWeeklyAllZero)
    - app/firestore_friend_requests.ts (subscribeToFriends export)
    - app/weekly_xp.ts (WEEKLY_XP_KEY)
    - app/achievements_screen.tsx lines 777-950 (screen structure pattern)
    - constants/avatars.ts line ~414 (getBestAvatarForLevel signature)
    - constants/theme.ts (getLevelFromXP export)
    - CLAUDE.md (avatar computation — CRITICAL)
  </read_first>

  <behavior>
    Screen structure:
    1. Header: back arrow + title "Зал Славы друзей"
    2. Toggle row: "Всё время" / "Эта неделя" segmented control
    3. If mode=='weekly' AND isWeeklyAllZero(entries): empty state "Эта неделя ещё не началась"
    4. If no friends: empty state "У вас пока нет друзей — добавьте по коду в настройках"
    5. FlatList of RankedHoFEntry items:
       - Rank number (#1, #2, ...)
       - AvatarView (computed from xp)
       - Name + level
       - XP value (totalXp or weeklyXp depending on mode)
       - Own row highlighted: distinct background (t.correctBg or t.bgCard with accent border)

    Data loading:
    - subscribeToFriends → get friend UIDs (real-time)
    - For each friend: fetch users/{uid} from Firestore → progress.user_total_xp, progress.weekly_xp, displayName; check banned_users/{uid}
    - Self: AsyncStorage.multiGet(['user_total_xp', 'user_name', WEEKLY_XP_KEY])
    - Combine into HoFEntry[], run sortAndRankHoF, render
  </behavior>

  <action>
    Create `app/friends_hof_screen.tsx`. Key implementation details:

    ```typescript
    import React, { useState, useEffect, useRef } from 'react';
    import {
      View, Text, TouchableOpacity, FlatList, ActivityIndicator,
    } from 'react-native';
    import { SafeAreaView } from 'react-native-safe-area-context';
    import { useRouter } from 'expo-router';
    import { Ionicons } from '@expo/vector-icons';
    import AsyncStorage from '@react-native-async-storage/async-storage';
    import { useTheme } from '../components/ThemeContext';
    import { useLang } from '../components/LangContext';
    import ScreenGradient from '../components/ScreenGradient';
    import AvatarView from '../components/AvatarView';
    import { getBestAvatarForLevel } from '../constants/avatars';
    import { getLevelFromXP } from '../constants/theme';
    import { subscribeToFriends } from './firestore_friend_requests';
    import { WEEKLY_XP_KEY } from './weekly_xp';
    import { sortAndRankHoF, isWeeklyAllZero, type HoFEntry, type RankedHoFEntry } from './friends_hof_helpers';
    import { triLang } from '../constants/i18n';
    import { hapticTap as doHaptic } from '../hooks/use-haptics';
    import { IS_EXPO_GO, CLOUD_SYNC_ENABLED } from './config';
    import { getCanonicalUserId } from './user_id_policy';
    ```

    Firestore helper (same getDb pattern):
    ```typescript
    const getDb = () => {
      if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
      try { return require('@react-native-firebase/firestore').default(); } catch { return null; }
    };
    ```

    Profile fetch with banned-user filter:
    ```typescript
    async function fetchFriendProfile(uid: string): Promise<HoFEntry | null> {
      try {
        const db = getDb();
        if (!db) return null;
        const [userSnap, banSnap] = await Promise.all([
          db.collection('users').doc(uid).get(),
          db.collection('banned_users').doc(uid).get(),
        ]);
        if (banSnap.exists || !userSnap.exists) return null;
        const data = userSnap.data() ?? {};
        return {
          uid,
          name: (data.displayName as string) || (data.progress?.displayName as string) || 'Игрок',
          totalXp: parseInt((data.progress?.user_total_xp as string) ?? '0') || 0,
          weeklyXp: parseInt((data.progress?.weekly_xp as string) ?? '0') || 0,
          isMe: false,
        };
      } catch { return null; }
    }
    ```

    Self profile from AsyncStorage:
    ```typescript
    const [myUid, setMyUid] = useState<string | null>(null);
    useEffect(() => { void getCanonicalUserId().then(setMyUid); }, []);

    async function loadSelfEntry(): Promise<HoFEntry | null> {
      const [xpRaw, nameRaw, weeklyRaw] = await AsyncStorage.multiGet(['user_total_xp', 'user_name', WEEKLY_XP_KEY]);
      return {
        uid: myUid ?? '__self__',
        name: nameRaw[1] || triLang(lang, { ru: 'Вы', uk: 'Ви', es: 'Tú' }),
        totalXp: parseInt(xpRaw[1] ?? '0') || 0,
        weeklyXp: parseInt(weeklyRaw[1] ?? '0') || 0,
        isMe: true,
      };
    }
    ```

    useEffect for real-time friends + profile loading:
    ```typescript
    useEffect(() => {
      let cancelled = false;
      const unsub = subscribeToFriends(async (friendEntries) => {
        const profiles = await Promise.all(friendEntries.map(f => fetchFriendProfile(f.uid)));
        const valid = profiles.filter((p): p is HoFEntry => p !== null);
        const self = await loadSelfEntry();
        if (cancelled) return;
        setEntries(self ? [...valid, self] : valid);
        setLoading(false);
      });
      return () => { cancelled = true; unsub(); };
    }, [myUid]); // re-run when myUid resolves
    ```

    Toggle render (HOF-02):
    ```typescript
    const [mode, setMode] = useState<'alltime' | 'weekly'>('alltime');
    // ...
    <View style={{ flexDirection: 'row', ... }}>
      <TouchableOpacity onPress={() => setMode('alltime')} ...>
        <Text>{L('Всё время', 'Весь час', 'Todo el tiempo')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setMode('weekly')} ...>
        <Text>{L('Эта неделя', 'Цей тиждень', 'Esta semana')}</Text>
      </TouchableOpacity>
    </View>
    ```

    Ranking and display (HOF-07: own row must be visible without scrolling):
    ```typescript
    const ranked = sortAndRankHoF(entries, mode);
    const weeklyEmpty = mode === 'weekly' && isWeeklyAllZero(entries);
    const myRankIndex = ranked.findIndex(e => e.isMe); // for initialScrollIndex

    const ROW_HEIGHT = 64; // fixed height for getItemLayout

    // FlatList item:
    const renderItem = ({ item }: { item: RankedHoFEntry }) => {
      const xp = mode === 'weekly' ? item.weeklyXp : item.totalXp;
      const level = getLevelFromXP(item.totalXp); // level always from totalXp
      const avatarId = getBestAvatarForLevel(level); // NEVER from Firestore
      return (
        <View style={[styles.row, item.isMe && styles.myRow, { height: ROW_HEIGHT }]}>
          <Text style={styles.rank}>#{item.rank}</Text>
          <AvatarView avatarId={String(avatarId)} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.level}>Lv {level}</Text>
          </View>
          <Text style={styles.xp}>{xp} XP</Text>
        </View>
      );
    };

    // FlatList props (HOF-07 — own rank always visible without scrolling):
    // initialScrollIndex={myRankIndex >= 0 ? Math.max(0, myRankIndex - 2) : 0}
    // getItemLayout={(_data, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
    ```

    Add these props to the `<FlatList>` element:
    ```tsx
    <FlatList
      data={ranked}
      keyExtractor={item => item.uid}
      renderItem={renderItem}
      initialScrollIndex={myRankIndex >= 0 ? Math.max(0, myRankIndex - 2) : 0}
      getItemLayout={(_data, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
      showsVerticalScrollIndicator={false}
    />
    ```

    CONSTRAINTS:
    - No console.log
    - Avatar NEVER from Firestore — always computed
    - File < 500 lines (it's a focused screen)
    - TypeScript clean — no 'any' except Firebase return types
    - DO NOT modify xp_manager.ts or firestore_leaderboard.ts
  </action>

  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>

  <acceptance_criteria>
    - File `app/friends_hof_screen.tsx` exists and exports `default FriendsHoFScreen`
    - File imports `sortAndRankHoF` and `isWeeklyAllZero` from `./friends_hof_helpers` (grep)
    - File imports `subscribeToFriends` from `./firestore_friend_requests` (grep)
    - File imports `getBestAvatarForLevel` from `../constants/avatars` (grep)
    - File imports `getLevelFromXP` from `../constants/theme` (grep)
    - File does NOT read `.avatar` from Firestore (grep `.avatar` → 0 Firestore data reads)
    - File imports `WEEKLY_XP_KEY` from `./weekly_xp` (grep)
    - File contains `banned_users` check in fetchFriendProfile (grep: `banned_users`)
    - File contains `initialScrollIndex` on FlatList (grep: `initialScrollIndex`)
    - File contains `getItemLayout` on FlatList (grep: `getItemLayout`)
    - No `console.log` (grep: 0 matches)
    - File < 550 lines (wc -l)
    - `npx tsc --noEmit` exits 0 — no new TypeScript errors
  </acceptance_criteria>

  <done>
    Friends HoF screen with toggle, sorted rankings, own-row highlight, banned-user filter, weekly empty state. TypeScript clean.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Add Friends HoF entry button to achievements_screen.tsx (HOF-01)</name>
  <files>app/achievements_screen.tsx</files>

  <read_first>
    - app/achievements_screen.tsx lines 880-930 (find progress bar closing tag — insert after it)
  </read_first>

  <behavior>
    A "Зал Славы друзей" button is visible on the achievements screen, inserted between the progress bar and the SectionList. Tapping it navigates to /friends_hof_screen.
  </behavior>

  <action>
    In `app/achievements_screen.tsx`:

    1. Ensure `useRouter` is already imported (it is — line 9).
    2. Find the progress bar block (search for `bgSurface2` → progress bar closing `</View>`).
    3. Insert AFTER the progress bar `</View>` and BEFORE the `{/*` SectionList comment:

    ```typescript
    {/* Friends Hall of Fame entry */}
    <TouchableOpacity
      onPress={() => { doHaptic(); router.push('/friends_hof_screen' as any); }}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 16, marginBottom: 16,
        backgroundColor: t.bgCard,
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
        borderWidth: 1, borderColor: t.border,
      }}
    >
      <Ionicons name="trophy-outline" size={20} color={t.accent} style={{ marginRight: 10 }} />
      <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontWeight: '600' }}>
        {triLang(lang, { ru: 'Зал Славы друзей', uk: 'Зал Слави друзів', es: 'Salón de la Fama' })}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
    </TouchableOpacity>
    ```

    4. Add import for `hapticTap as doHaptic` if not already imported (check existing imports).
       `import { hapticTap as doHaptic } from '../../hooks/use-haptics';`
       (Note: path is `../../hooks/use-haptics` from `app/achievements_screen.tsx`)

    No other changes to achievements_screen.tsx.
  </action>

  <verify>
    `npx tsc --noEmit` — no new errors from this change.
    `grep "friends_hof_screen" app/achievements_screen.tsx` — returns 1 match.
  </verify>

  <acceptance_criteria>
    - `grep "friends_hof_screen" app/achievements_screen.tsx` returns >= 1 match
    - `grep "Зал Славы друзей" app/achievements_screen.tsx` returns >= 1 match (or ru equivalent)
    - `grep "trophy-outline" app/achievements_screen.tsx` returns >= 1 match
    - `npx tsc --noEmit` exits 0 (no new errors)
    - Git diff for achievements_screen.tsx shows only 15-25 lines added (no unrelated changes)
  </acceptance_criteria>

  <done>
    Friends HoF entry button added to achievements_screen. Discoverable from "Путь героя" (achievements). TypeScript clean.
  </done>
</task>

</tasks>

<verification>
Plan-level checks:
1. `npm test -- --testPathPattern=friends_hof` — all 6+ tests pass
2. `grep -n "getBestAvatarForLevel\|getLevelFromXP" app/friends_hof_screen.tsx` — both present (avatar computed correctly)
3. `grep -n "\.avatar" app/friends_hof_screen.tsx` — 0 Firestore avatar reads
4. `grep "friends_hof_screen" app/achievements_screen.tsx` — entry point wired
5. `npx tsc --noEmit` — no new TypeScript errors
6. `git diff --name-only HEAD` — only `app/friends_hof_helpers.ts`, `app/friends_hof_screen.tsx`, `app/achievements_screen.tsx`, `tests/friends_hof.test.ts`
7. `grep "xp_manager\|firestore_leaderboard" --include="*.ts" --include="*.tsx" --name-only` — no modifications to these files
</verification>

<success_criteria>
- HOF-01: Entry button in achievements_screen → /friends_hof_screen. VERIFIED via grep.
- HOF-02: Toggle 'Всё время / Эта неделя' present. VERIFIED by code review.
- HOF-03: alltime mode sorts by totalXp descending with rank, nick, avatar, level, XP. VERIFIED via sortAndRankHoF + screen render.
- HOF-04: weekly mode sorts by weeklyXp; empty state when all zero. VERIFIED via isWeeklyAllZero + Test H04.
- HOF-05: isMe row has distinct style (myRow). VERIFIED by grep styles.myRow.
- HOF-06: fetchFriendProfile checks banned_users/{uid}. VERIFIED via grep banned_users.
- HOF-07: FlatList shows rank position — user can see own rank without scrolling (own row always in view via initialScrollIndex or similar). VERIFIED by code review.
- TEST-04: 6+ unit tests for sort/rank/filter in friends_hof.test.ts. VERIFIED via npm test.
</success_criteria>

<output>
After completion, create `.planning/phases/03-friends-hall-of-fame-arena-integration/03-friends-hall-of-fame-arena-integration-01-SUMMARY.md`
</output>
