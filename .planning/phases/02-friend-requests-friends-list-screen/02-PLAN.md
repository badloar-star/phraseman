---
phase: 02-friend-requests-friends-list-screen
plan: 02
type: execute
wave: 2
depends_on: [01]
files_modified:
  - app/friends_screen.tsx
  - app/(tabs)/settings.tsx
autonomous: true
requirements: [FRIEND-01, FRIEND-02, FRIEND-03, FRIEND-06, FRIEND-07, FRIEND-08, LIST-01, LIST-02, LIST-03, LIST-04, LIST-05, LIST-06, LIST-07, LIST-08, LIST-09]

must_haves:
  truths:
    - "Friends screen is a full-screen route at app/friends_screen.tsx, pushed via router.push('/friends_screen') from Settings"
    - "On mount, ensureMyFriendCode() is called to auto-generate code if missing (FRIEND-08)"
    - "My code displayed with Copy button (Clipboard.setString) and Share button (Share.share) — FRIEND-01, FRIEND-02"
    - "TextInput for entering another user's code; pressing Add: lookupUserByFriendCode → sendFriendRequest (FRIEND-03, REQ-01)"
    - "Real-time friends list via subscribeToFriends; each item shows avatar (computed via getBestAvatarForLevel(getLevelFromXP(xp))), display name, total XP"
    - "Real-time incoming requests list via subscribeToIncomingRequests; each request has Accept + Decline buttons"
    - "Settings screen gets a new Row entry 'Друзья' → router.push('/friends_screen') (FRIEND-06)"
    - "All send/accept/decline/delete result states have visible feedback (toast or inline text)"
    - "Empty states for both lists; loading state on initial fetch; delete confirmation for friends"
  artifacts:
    - path: "app/friends_screen.tsx"
      provides: "Friends full-screen route: my code + share, add by code, friends list, incoming requests"
    - path: "app/(tabs)/settings.tsx"
      provides: "Updated: new Row for Friends screen entry point"
  key_links:
    - from: "app/friends_screen.tsx"
      to: "app/firestore_friends.ts:ensureMyFriendCode"
      via: "called in useEffect on mount to ensure friend code exists"
      pattern: "ensureMyFriendCode"
    - from: "app/friends_screen.tsx"
      to: "app/firestore_friend_requests.ts:subscribeToFriends"
      via: "real-time listener, unsubscribed in useEffect cleanup"
      pattern: "subscribeToFriends"
    - from: "app/friends_screen.tsx"
      to: "app/firestore_friend_requests.ts:subscribeToIncomingRequests"
      via: "real-time listener, unsubscribed in useEffect cleanup"
      pattern: "subscribeToIncomingRequests"
    - from: "app/(tabs)/settings.tsx"
      to: "app/friends_screen.tsx"
      via: "router.push('/friends_screen')"
      pattern: "friends_screen"
---

<objective>
Создать экран "Друзья" (`app/friends_screen.tsx`) как полноэкранный маршрут и добавить точку входа в Settings.

Экран содержит 4 секции:
1. **Мой код** — отображение 6-char friend code + Copy + Share
2. **Добавить друга** — TextInput для ввода кода + кнопка "Добавить"
3. **Входящие запросы** — список pending requests с Accept/Decline
4. **Мои друзья** — список друзей с аватаром, именем, XP + кнопка удаления

Данные: real-time onSnapshot через subscribeToFriends / subscribeToIncomingRequests из Phase 2 Plan 01.
Для каждого друга / заявителя: подтягивать `users/{uid}` → progress.displayName + progress.user_total_xp.

Output:
- `app/friends_screen.tsx` — новый файл (~400-600 строк)
- `app/(tabs)/settings.tsx` — добавить 1 Row
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
@app/firestore_friends.ts
@app/firestore_friend_requests.ts
@app/(tabs)/settings.tsx
@app/(tabs)/_layout.tsx
@app/achievements_screen.tsx
@components/AvatarView.tsx

<interfaces>
<!-- Existing functions to call -->

From app/firestore_friends.ts:
```typescript
export async function ensureMyFriendCode(): Promise<string | null>
export async function lookupUserByFriendCode(code: string): Promise<{ uid: string } | null>
```

From app/firestore_friend_requests.ts (created in Plan 01):
```typescript
export type SendRequestResult = 'sent' | 'already_sent' | 'already_friends' | 'self' | 'not_found' | 'error';
export interface FriendEntry { uid: string; createdAt: number; }
export interface FriendRequestEntry { fromUid: string; status: 'pending' | 'accepted'; createdAt: number; }
export async function sendFriendRequest(toUid: string): Promise<SendRequestResult>
export async function acceptFriendRequest(fromUid: string): Promise<void>
export async function declineFriendRequest(fromUid: string): Promise<void>
export async function deleteFriend(friendUid: string): Promise<void>
export function subscribeToFriends(callback: (friends: FriendEntry[]) => void, onError?: (err: Error) => void): () => void
export function subscribeToIncomingRequests(callback: (requests: FriendRequestEntry[]) => void, onError?: (err: Error) => void): () => void
```

Avatar computation (from CLAUDE.md, leaderboard rules):
```typescript
// ALWAYS compute avatar — never read from Firestore
import { getBestAvatarForLevel } from '../components/AvatarView';
import { getLevelFromXP } from '../app/levels'; // or wherever this is exported
const avatarId = String(getBestAvatarForLevel(getLevelFromXP(totalXp)));
```

Screen structure (from app/achievements_screen.tsx pattern):
```typescript
// Full-screen route structure:
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { useTheme } from '../components/ThemeContext';

export default function FriendsScreen() {
  const router = useRouter();
  const { theme: t } = useTheme();
  // ... state, effects ...
  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        {/* back button + title */}
        <ScrollView>
          <ContentWrap>
            {/* screen content */}
          </ContentWrap>
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
```

Settings Row pattern (from app/(tabs)/settings.tsx ~line 570-590):
```typescript
<Row
  icon="people-outline"
  label={L('Друзья', 'Друзі', 'Amigos')}
  sub={L('Коды, заявки, список друзей', 'Коди, заявки, список друзів', 'Códigos, solicitudes, amigos')}
  onPress={() => { doHaptic(); router.push('/friends_screen' as any); }}
/>
```

Route registration (expo-router file-based routing):
The file `app/friends_screen.tsx` is automatically registered as route `/friends_screen`.
No changes needed to _layout.tsx.
</interfaces>

<locked_decisions>
- Avatar MUST be computed: getBestAvatarForLevel(getLevelFromXP(xp)) — NOT read from Firestore (CLAUDE.md leaderboard rules)
- All TTS via useAudio only — but this screen has no TTS, so this rule is N/A
- No nickname search (stalking risk) — search is by code only, never by name
- banned users silently filtered — lookupUserByFriendCode already returns null for banned users (FRIEND-07 — no special UI needed beyond generic "not found")
- D-03: Do NOT touch xp_manager.ts or firestore_leaderboard.ts
</locked_decisions>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create app/friends_screen.tsx — full friends screen</name>
  <files>app/friends_screen.tsx</files>

  <read_first>
    - app/achievements_screen.tsx (full-screen route structure, back button, ScreenGradient, SafeAreaView, ScrollView, useTheme, useLang patterns)
    - app/(tabs)/settings.tsx lines 1-40 (imports pattern for this codebase)
    - components/AvatarView.tsx (getBestAvatarForLevel export + AvatarView props)
    - app/levels.ts OR grep for getLevelFromXP in the codebase (to find the correct import path)
    - app/firestore_friend_requests.ts (read the actual file created in Plan 01 — verify exports)
    - app/firestore_friends.ts (read to verify ensureMyFriendCode + lookupUserByFriendCode)
    - CLAUDE.md (avatar computation rule — CRITICAL)
  </read_first>

  <behavior>
    Screen sections and expected behavior:

    SECTION 1 — "Мой код" (LIST-01, FRIEND-01, FRIEND-02, FRIEND-08):
    - On mount: call ensureMyFriendCode() async, store in state `myCode`
    - Display myCode in a large monospace-style Text with letter-spacing for readability
    - "Copy" button → Clipboard.setString(myCode) + brief feedback ("Скопировано!")
    - "Share" button → Share.share({ message: `Мой код в PhraseMan: ${myCode}` })
    - Loading state while myCode resolves (ActivityIndicator or placeholder)

    SECTION 2 — "Добавить друга по коду" (LIST-02, FRIEND-03, REQ-01..07):
    - TextInput: placeholder "Введите код друга (например, ABC234)"
    - Auto-uppercase: `onChangeText={v => setCodeInput(v.toUpperCase().replace(/[^A-Z2-9]/g, ''))}`
    - maxLength={6}
    - "Добавить" button: disabled while `isAdding` or `codeInput.length !== 6`
    - On press:
      1. `setIsAdding(true)`
      2. `const result = await lookupUserByFriendCode(codeInput)` — if null: show "Пользователь не найден"
      3. If found: `const sendResult = await sendFriendRequest(result.uid)`
      4. Show feedback based on sendResult:
         - 'sent': "Заявка отправлена!"
         - 'already_sent': "Заявка уже отправлена"
         - 'already_friends': "Вы уже друзья"
         - 'self': "Это ваш код"
         - 'not_found' | 'error': "Пользователь не найден"
      5. On success ('sent'): clear codeInput
      6. `setIsAdding(false)`

    SECTION 3 — "Входящие заявки" (LIST-04, LIST-07, REQ-04, REQ-05):
    - useEffect: `const unsub = subscribeToIncomingRequests(setRequests); return () => unsub();`
    - For each request in `requests` state: fetch `users/{fromUid}` to get displayName + total_xp
      (use separate state: `requestProfiles: Record<string, {name: string; xp: number}>`)
    - Request item shows: AvatarView (computed), display name, XP, Accept button, Decline button
    - Accept: `await acceptFriendRequest(fromUid)` — request disappears from list (real-time)
    - Decline: `await declineFriendRequest(fromUid)` — request disappears
    - Empty state: "Нет входящих заявок" (LIST-07)

    SECTION 4 — "Мои друзья" (LIST-03, LIST-05, LIST-06, LIST-09, REQ-06):
    - useEffect: `const unsub = subscribeToFriends(setFriends); return () => unsub();`
    - Same profile-fetch pattern for each friend (name, xp)
    - Friend item: AvatarView, name, XP, "Удалить" button (shows confirmation Alert before calling deleteFriend)
    - Empty state: "У вас пока нет друзей. Добавьте по коду!" (LIST-06)
    - Sort friends by XP descending (optional but nice UX)

    GLOBAL states:
    - `isLoading: boolean` — true while initial subscriptions attach (show full-screen spinner)
    - `addFeedback: string | null` — shown for 2s after add attempt, then cleared via setTimeout

    BACK navigation: TouchableOpacity with Ionicons "arrow-back" at top-left, onPress={() => router.back()}

    PROFILE FETCHING PATTERN:
    When subscriptions deliver uid arrays (friends/requests), fetch missing profiles:
    ```typescript
    // In useEffect watching friends/requests changes:
    const uidsToFetch = friends.map(f => f.uid).filter(uid => !profileCache[uid]);
    if (uidsToFetch.length === 0) return;
    Promise.all(uidsToFetch.map(uid => fetchUserProfile(uid))).then(profiles => {
      setProfileCache(prev => ({ ...prev, ...Object.fromEntries(profiles.filter(Boolean).map(p => [p!.uid, p!])) }));
    });
    ```
    `fetchUserProfile(uid)` reads `users/{uid}` from Firestore and returns `{ uid, name: data.displayName || 'Игрок', xp: parseInt(data.progress?.user_total_xp ?? '0') || 0 }`.
  </behavior>

  <action>
    Create `app/friends_screen.tsx`. Follow this structure precisely:

    ```typescript
    import React, { useState, useEffect, useCallback, useRef } from 'react';
    import {
      View, Text, TouchableOpacity, TextInput, ScrollView,
      ActivityIndicator, Alert, Clipboard, Share, StyleSheet,
    } from 'react-native';
    import { SafeAreaView } from 'react-native-safe-area-context';
    import { useRouter } from 'expo-router';
    import { Ionicons } from '@expo/vector-icons';
    import { useTheme } from '../components/ThemeContext';
    import { useLang } from '../components/LangContext';
    import ScreenGradient from '../components/ScreenGradient';
    import ContentWrap from '../components/ContentWrap';
    import AvatarView from '../components/AvatarView';
    import { getBestAvatarForLevel } from '../components/AvatarView';
    import { getLevelFromXP } from './levels'; // adjust if path differs
    import { ensureMyFriendCode, lookupUserByFriendCode } from './firestore_friends';
    import {
      sendFriendRequest, acceptFriendRequest, declineFriendRequest, deleteFriend,
      subscribeToFriends, subscribeToIncomingRequests,
      type FriendEntry, type FriendRequestEntry,
    } from './firestore_friend_requests';
    import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
    import { triLang } from '../constants/i18n';
    import { hapticTap as doHaptic } from '../hooks/use-haptics';
    ```

    KEY INVARIANTS in implementation:
    1. Avatar computation: `const avatarId = String(getBestAvatarForLevel(getLevelFromXP(profile.xp)));`
       — NEVER read avatar from Firestore (CLAUDE.md)
    2. Both subscriptions started in separate useEffects with cleanup
    3. Profile cache (`profileCache: Record<string, {uid:string;name:string;xp:number}>`) avoids re-fetching
    4. `codeInput` auto-uppercase + non-alphabet char strip in onChangeText
    5. Copy uses `Clipboard.setString` from react-native (not @react-native-clipboard/clipboard — not in project)
    6. isLoading set to false after BOTH subscriptions fire at least once (use counter ref or two booleans)
    7. No console.log anywhere
    8. File must be < 800 lines (split helpers if needed)

    LOCALIZATION:
    ```typescript
    const L = (ru: string, uk: string, es: string) => triLang(lang, { ru, uk, es });
    ```
    Use L() for all visible strings. Minimum required:
    - Screen title: L('Друзья', 'Друзі', 'Amigos')
    - Section headers: 'Мой код'/'Мій код'/'Mi código', 'Добавить друга'/'Додати друга'/'Añadir amigo', 'Входящие заявки'/'Вхідні заявки'/'Solicitudes', 'Мои друзья'/'Мої друзі'/'Mis amigos'
    - Copy button: 'Копировать'/'Копіювати'/'Copiar'
    - Share button: 'Поделиться'/'Поділитись'/'Compartir'
    - Empty friends: 'Ещё нет друзей — добавьте по коду'/'Ще немає друзів'/'Sin amigos aún'
    - Empty requests: 'Нет входящих заявок'/'Немає вхідних заявок'/'Sin solicitudes'
    - Add button: 'Добавить'/'Додати'/'Añadir'
    - Accept/Decline: 'Принять'/'Прийняти'/'Aceptar', 'Отклонить'/'Відхилити'/'Rechazar'
    - Delete confirm title: 'Удалить друга?'/'Видалити друга?'/'¿Eliminar amigo?'

    getFirestore for profile fetch:
    ```typescript
    const getDb = () => {
      if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
      try { return require('@react-native-firebase/firestore').default(); } catch { return null; }
    };
    ```
  </action>

  <verify>
    Manual check only — UI screen cannot be unit-tested without heavy native mocking.
    Executor must verify:
    - File compiles without TypeScript errors (tsc --noEmit or expo start --no-dev)
    - No console.log
    - All imports resolve (no missing modules)
    - getLevelFromXP import path correct (grep codebase for its export location)
    - getBestAvatarForLevel import from ../components/AvatarView
  </verify>

  <acceptance_criteria>
    - File `app/friends_screen.tsx` exists and is non-empty
    - File contains `export default function FriendsScreen` (grep)
    - File imports `ensureMyFriendCode` from `./firestore_friends` (grep)
    - File imports `subscribeToFriends` and `subscribeToIncomingRequests` from `./firestore_friend_requests` (grep)
    - File contains `getBestAvatarForLevel` and `getLevelFromXP` usage for avatar (grep — CRITICAL per CLAUDE.md)
    - File does NOT read `.avatar` from Firestore (grep for `\.avatar` in file — must be 0 matches for Firestore data reads)
    - File contains `Clipboard.setString` (grep — copy button)
    - File contains `Share.share` (grep — share button)
    - File contains `codeInput.toUpperCase()` or `toUpperCase()` in onChangeText (grep)
    - File contains `ensureMyFriendCode` call in useEffect (grep)
    - File contains `router.back()` for back navigation (grep)
    - File has NO `console.log` (grep: 0 matches)
    - File is < 800 lines (wc -l)
    - TypeScript check: run `npx tsc --noEmit` and verify no new errors introduced by this file
  </acceptance_criteria>

  <done>
    Friends screen created with all 4 sections (my code, add by code, incoming requests, friends list). Real-time subscriptions, avatar computation correct, localized. TypeScript clean.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Add Friends entry point to settings.tsx</name>
  <files>app/(tabs)/settings.tsx</files>

  <read_first>
    - app/(tabs)/settings.tsx (read lines 560-610 to find the correct insertion point near invite_friend / social rows)
    - Verify that the Row helper is defined in this file (grep: `const Row = `)
  </read_first>

  <behavior>
    - A new Row "Друзья" appears in settings, in the social/community section near the existing "Пригласить друга" or account rows
    - onPress navigates to '/friends_screen'
    - Row has icon "people-outline"
  </behavior>

  <action>
    In `app/(tabs)/settings.tsx`, find the existing "Пригласить друга" row (search for `settings_invite_friend`).
    Insert the new Friends row BEFORE the invite_friend row:

    ```typescript
    <Row
      icon="people-outline"
      label={L('Друзья', 'Друзі', 'Amigos')}
      sub={L('Коды, заявки, список друзей', 'Коди, заявки, список друзів', 'Códigos, solicitudes, amigos')}
      onPress={() => { doHaptic(); router.push('/friends_screen' as any); }}
    />
    ```

    No other changes to settings.tsx.
  </action>

  <verify>
    Manual: open settings → "Друзья" row visible → tap → Friends screen opens.
    TypeScript: `npx tsc --noEmit` — no new errors.
  </verify>

  <acceptance_criteria>
    - `grep "friends_screen" app/(tabs)/settings.tsx` returns at least 1 match
    - `grep "people-outline" app/(tabs)/settings.tsx` returns at least 1 match
    - `npx tsc --noEmit` exits 0 (no TypeScript errors from this change)
    - Git diff of settings.tsx shows only 5-8 lines added (no unrelated changes)
  </acceptance_criteria>

  <done>
    Settings screen has a discoverable Friends entry that navigates to the Friends screen.
  </done>
</task>

</tasks>

<verification>
Plan-level checks:
1. `app/friends_screen.tsx` exists; grep confirms: ensureMyFriendCode, subscribeToFriends, subscribeToIncomingRequests, getBestAvatarForLevel, getLevelFromXP, Clipboard.setString, Share.share all present.
2. Avatar invariant: `grep "\.avatar" app/friends_screen.tsx` returns 0 matches (no Firestore avatar read).
3. `grep "friends_screen" app/(tabs)/settings.tsx` returns 1 match.
4. `npx tsc --noEmit` exits 0 — no TypeScript errors.
5. `git diff --name-only HEAD` shows only `app/friends_screen.tsx` and `app/(tabs)/settings.tsx`.
6. File is under 800 lines: `wc -l app/friends_screen.tsx` < 800.
</verification>

<success_criteria>
- FRIEND-01: myCode displayed with copy button. VERIFIED via Clipboard.setString grep.
- FRIEND-02: Share.share called with friend code. VERIFIED via Share.share grep.
- FRIEND-03: TextInput for code entry + Add button flow. VERIFIED via codeInput/lookupUserByFriendCode grep.
- FRIEND-06: Settings Row navigates to /friends_screen. VERIFIED via settings.tsx grep.
- FRIEND-07: lookupUserByFriendCode returns null for banned users (Phase 1 invariant) — UI shows "Пользователь не найден" for null result. VERIFIED by code path.
- FRIEND-08: ensureMyFriendCode() called on mount. VERIFIED via useEffect/ensureMyFriendCode grep.
- LIST-01..09: All sections (my code, add input, requests, friends, empty states, loading) present. VERIFIED by code review.
- REQ-01..07: All send/accept/decline/delete paths covered via firestore_friend_requests.ts calls. VERIFIED by grep.
</success_criteria>

<output>
After completion, create `.planning/phases/02-friend-requests-friends-list-screen/02-friend-requests-friends-list-screen-02-SUMMARY.md` capturing: actual file paths, component structure, any deviations, TypeScript error count (must be 0).
</output>
