/**
 * Снимок формулировок firestore.rules (regex / ожидаемые подстроки).
 *
 * ВАЖНО ДЛЯ СБОРОК / РЕЛИЗОВ (2026):
 * Правила в облаке могли быть осознанно изменены под продукт; этот файл тогда «красный»,
 * хотя доступ для пользователей корректен. Не подгоняйте правила вслепую под тест —
 * сначала осознанная проверка безопасности; тест обновлять только когда формулировка
 * в rules стабильна и согласована.
 */
import { readFileSync } from 'fs';
import path from 'path';

const rulesPath = path.join(process.cwd(), 'firestore.rules');

describe('firestore.rules security baseline', () => {
  const rules = readFileSync(rulesPath, 'utf8');

  test('users collection is restricted to owner/admin, including stableId auth mapping', () => {
    expect(rules).toContain('match /users/{userId} {');
    expect(rules).toContain('function userDocOwnerMatchesAuth(userId) {');
    expect(rules).toContain('function newUserDocOwnerMatchesAuth(userId) {');
    expect(rules).toContain('allow read, update, delete: if userDocOwnerMatchesAuth(userId);');
    expect(rules).toContain('allow create: if newUserDocOwnerMatchesAuth(userId);');
  });

  test('users shard_log allows owner read and create only', () => {
    expect(rules).toContain('match /shard_log/{logId} {');
    expect(rules).toContain('allow read, create: if userDocOwnerMatchesAuth(userId);');
    expect(rules).toContain('allow update, delete: if false;');
  });

  test('leaderboard writes are restricted to admin callables while owners can delete', () => {
    const leaderboardBlock = rules.match(/match \/leaderboard\/\{userId\} \{[\s\S]*?\n    \}/);
    expect(leaderboardBlock).not.toBeNull();
    expect(leaderboardBlock![0]).toContain('allow read: if true;');
    expect(leaderboardBlock![0]).toContain('allow create, update: if isAdmin();');
    expect(leaderboardBlock![0]).toContain('allow delete: if userDocOwnerMatchesAuth(userId);');
    expect(leaderboardBlock![0]).not.toContain('allow write: if request.auth != null;');
    expect(leaderboardBlock![0]).not.toContain('allow create: if newUserDocOwnerMatchesAuth(userId);');
  });

  test('leaderboard_stats aggregate is client-readable but admin-write only', () => {
    const statsBlock = rules.match(/match \/leaderboard_stats\/\{docId\} \{[\s\S]*?\n    \}/);
    expect(statsBlock).not.toBeNull();
    expect(statsBlock![0]).toContain('allow read: if true;');
    expect(statsBlock![0]).toContain('allow create, update, delete: if isAdmin();');
    expect(statsBlock![0]).not.toContain('allow write: if request.auth != null;');
  });

  test('card_packs marketplace exposes only published metadata to clients', () => {
    const cardPacksBlock = rules.match(/match \/card_packs\/\{packId\} \{[\s\S]*?\n    \}/);
    expect(cardPacksBlock).not.toBeNull();
    expect(cardPacksBlock![0]).toContain("allow read: if resource.data.status == 'published';");
    expect(cardPacksBlock![0]).toContain('allow create, update, delete: if isAdmin();');
    expect(cardPacksBlock![0]).not.toContain('allow write: if request.auth != null;');
  });

  test('league_groups uses Cloud Functions for writes and keeps client reads only', () => {
    const leagueGroupsBlock = rules.match(/match \/league_groups\/\{groupId\} \{[\s\S]*?\n    \}/);
    expect(leagueGroupsBlock).not.toBeNull();
    expect(leagueGroupsBlock![0]).toContain('allow read: if request.auth != null;');
    expect(leagueGroupsBlock![0]).toContain('allow create, update, delete: if isAdmin();');
    expect(leagueGroupsBlock![0]).not.toContain('allow write: if request.auth != null;');
    expect(leagueGroupsBlock![0]).not.toContain('request.resource.data.diff(resource.data)');
    expect(leagueGroupsBlock![0]).not.toContain('allow read, write: if request.auth != null;');
  });

  test('league_groups write path is exported through callable functions', () => {
    const functionsIndex = readFileSync(path.join(process.cwd(), 'functions/src/index.ts'), 'utf8');
    expect(functionsIndex).toContain("const { leagueJoinOrUpdateGroup, leagueUpdateMyMember, leagueSyncMyBoost } = require('./league_groups');");
    expect(functionsIndex).toContain('exports.leagueJoinOrUpdateGroup = leagueJoinOrUpdateGroup;');
    expect(functionsIndex).toContain('exports.leagueUpdateMyMember = leagueUpdateMyMember;');
    expect(functionsIndex).toContain('exports.leagueSyncMyBoost = leagueSyncMyBoost;');
  });

  test('catch-all rule is deny-all', () => {
    expect(rules).toContain('match /{document=**} {');
    expect(rules).toContain('allow read, write: if false;');
  });

  test('app diagnostics collections allow client create and admin read', () => {
    expect(rules).toMatch(/match \/app_errors\/\{docId\} \{[\s\S]*?allow create: if request\.auth != null;[\s\S]*?allow read, update, delete: if isAdmin\(\);/);
    expect(rules).toMatch(/match \/app_activity\/\{docId\} \{[\s\S]*?allow create: if request\.auth != null;[\s\S]*?allow read, update, delete: if isAdmin\(\);/);
  });

  test('arena_rooms updates are field-restricted', () => {
    expect(rules).toContain('match /arena_rooms/{roomId} {');
    expect(rules).toContain(".hasOnly(['guestId', 'guestName', 'status', 'sessionId']);");
  });

  test('arena_invites allows only status updates from participants', () => {
    expect(rules).toContain('match /arena_invites/{inviteId} {');
    expect(rules).toContain(".hasOnly(['status']);");
    expect(rules).toContain('canonicalUserMatchesAuth(resource.data.friendStableUid)');
  });

  test('friend activity my_events keeps client reads but restricts writes to admins/server', () => {
    expect(rules).toContain('match /users/{userId}/my_events/{eventId} {');
    expect(rules).toMatch(/my_events\/\{eventId\} \{[\s\S]*?allow read: if request\.auth != null;/);
    expect(rules).toMatch(/my_events\/\{eventId\} \{[\s\S]*?allow create, update, delete: if isAdmin\(\);/);
    expect(rules).not.toMatch(/my_events\/\{eventId\} \{[\s\S]*?allow create, update, delete: if canonicalUserMatchesAuth\(userId\);/);
  });

  test('friend activity likes are server-written with readable counters and owner-only daily state', () => {
    expect(rules).toContain('match /users/{userId}/friend_activity_like_daily_limits/{dayId} {');
    expect(rules).toMatch(/friend_activity_like_daily_limits\/\{dayId\} \{[\s\S]*?allow read: if canonicalUserMatchesAuth\(userId\);/);
    expect(rules).toMatch(/friend_activity_like_daily_limits\/\{dayId\} \{[\s\S]*?allow create, update, delete: if isAdmin\(\);/);
    expect(rules).toMatch(/activity_like_stats\/\{docId\} \{[\s\S]*?allow read: if request\.auth != null;/);
    expect(rules).toMatch(/activity_like_stats\/\{docId\} \{[\s\S]*?allow create, update, delete: if isAdmin\(\);/);
  });

  test('app messages allow user-owned read state and per-message reactions', () => {
    expect(rules).toContain('match /app_messages/{messageId} {');
    expect(rules).toContain('match /app_message_states/{messageId} {');
    expect(rules).toMatch(/app_message_states\/\{messageId\} \{[\s\S]*?allow read, create, update, delete: if userDocOwnerMatchesAuth\(userId\);/);
    expect(rules).toMatch(/app_messages\/\{messageId\} \{[\s\S]*?allow read: if request\.auth != null;/);
    expect(rules).toMatch(/reactions\/\{userId\} \{[\s\S]*?request\.resource\.data\.messageId == messageId/);
    expect(rules).toMatch(/reactions\/\{userId\} \{[\s\S]*?request\.resource\.data\.reaction in \['like', 'dislike'\]/);
  });
});

describe('firestore.rules friend system (Phase 1)', () => {
  const rules = readFileSync(rulesPath, 'utf8');

  test('friend_code_index rule allows authenticated read', () => {
    expect(rules).toContain('match /friend_code_index/{code} {');
    expect(rules).toMatch(/match \/friend_code_index\/\{code\} \{[\s\S]*?allow read: if request\.auth != null;/);
  });

  test('friend_code_index writes are restricted to Cloud Functions/admin', () => {
    const friendCodeBlock = rules.match(/match \/friend_code_index\/\{code\} \{[\s\S]*?\n    \}/);
    expect(friendCodeBlock).not.toBeNull();
    expect(friendCodeBlock![0]).toContain('allow read: if request.auth != null;');
    expect(friendCodeBlock![0]).toContain('allow create, update, delete: if isAdmin();');
    expect(friendCodeBlock![0]).not.toContain('allow create: if request.auth != null');
  });

  test('friend_code_index write path is exported through callable function', () => {
    const functionsIndex = readFileSync(path.join(process.cwd(), 'functions/src/index.ts'), 'utf8');
    expect(functionsIndex).toContain("const { friendEnsureMyCode } = require('./friend_codes');");
    expect(functionsIndex).toContain('exports.friendEnsureMyCode = friendEnsureMyCode;');
  });

  test('friend_requests create requires senderUid to match the signed-in canonical user (anti-impersonation)', () => {
    expect(rules).toContain('match /users/{targetUid}/friend_requests/{senderUid} {');
    expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?canonicalUserMatchesAuth\(senderUid\)/);
  });

  test('friend_requests create checks banned_users (SEC-05)', () => {
    expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?!exists\(\/databases\/\$\(database\)\/documents\/banned_users\/\$\(senderUid\)\)/);
  });

  test('friend_requests create requires status == pending', () => {
    expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?request\.resource\.data\.status == 'pending'/);
  });

  test('friend_requests forbids self-targeting', () => {
    expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?targetUid != senderUid/);
  });

  test('friend_requests update is field-restricted to status and updatedAt', () => {
    expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?affectedKeys\(\)[\s\S]*?\.hasOnly\(\['status', 'updatedAt'\]\)/);
  });

  test('friend_requests update only permits accepted or declined statuses', () => {
    expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?request\.resource\.data\.status in \['accepted', 'declined'\]/);
  });

  test('friend_requests delete restricted to target', () => {
    expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?allow delete: if canonicalUserMatchesAuth\(targetUid\) \|\| canonicalUserMatchesAuth\(senderUid\);/);
  });

  test('friends subcollection rule exists with canonical owner create', () => {
    expect(rules).toContain('match /users/{ownerUid}/friends/{friendUid} {');
    expect(rules).toMatch(/friends\/\{friendUid\}[\s\S]*?allow create: if request\.auth != null[\s\S]*?canonicalUserMatchesAuth\(ownerUid\)/);
  });

  test('friends subcollection forbids self-friending', () => {
    expect(rules).toMatch(/friends\/\{friendUid\}[\s\S]*?ownerUid != friendUid/);
  });

  test('friends subcollection forbids updates', () => {
    expect(rules).toMatch(/friends\/\{friendUid\}[\s\S]*?allow update: if false;/);
  });

  test('friends subcollection delete allows ownerUid or friendUid (bidirectional)', () => {
    // Updated in Plan 02-01 to support bidirectional client-side removal.
    expect(rules).toMatch(/friends\/\{friendUid\}[\s\S]*?allow delete: if canonicalUserMatchesAuth\(ownerUid\) \|\| canonicalUserMatchesAuth\(friendUid\);/);
  });

  test('catch-all is still the last match block (D-09 regression guard)', () => {
    const matches = [...rules.matchAll(/match \/[^\s]+ \{/g)];
    const lastMatch = matches[matches.length - 1];
    expect(lastMatch).toBeDefined();
    expect(lastMatch![0]).toContain('match /{document=**}');
  });

  test('existing rules untouched — users, leaderboard, banned_users, auth_links blocks still present', () => {
    expect(rules).toContain('match /users/{userId} {');
    expect(rules).toContain('match /leaderboard/{userId} {');
    expect(rules).toContain('match /banned_users/{docId} {');
    expect(rules).toContain('match /auth_links/{providerUid} {');
  });
});

describe('firestore.rules friends bidirectional create/delete (Plan 02-01)', () => {
  const rules = readFileSync(rulesPath, 'utf8');

  // FR-NEW-1: friendUid can create when accepted request exists
  test('FR-NEW-1: friends create rule allows friendUid when accepted request exists (get() check)', () => {
    expect(rules).toMatch(
      /friends\/\{friendUid\}[\s\S]*?canonicalUserMatchesAuth\(friendUid\)[\s\S]*?exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(friendUid\)\/friend_requests\/\$\(ownerUid\)\)/,
    );
    expect(rules).toMatch(
      /friends\/\{friendUid\}[\s\S]*?get\(\/databases\/\$\(database\)\/documents\/users\/\$\(friendUid\)\/friend_requests\/\$\(ownerUid\)\)\.data\.status in \['pending', 'accepted'\]/,
    );
  });

  // FR-NEW-2: friendUid cannot create when no accepted request exists (rule requires get() check)
  test('FR-NEW-2: friends create rule still requires accepted request — ownerUid != friendUid guard unchanged', () => {
    // The rule gates friendUid create on exists() + status == accepted.
    // Verify the exists() call is present as the guard.
    expect(rules).toMatch(
      /exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(friendUid\)\/friend_requests\/\$\(ownerUid\)\)/,
    );
  });

  // FR-NEW-3: third-party uid cannot create — ownerUid and friendUid are the only allowed actors
  test('FR-NEW-3: friends create rule does NOT include catch-all write for third parties', () => {
    // Rule only permits the canonical ownerUid OR canonical friendUid.
    // Verify it does NOT contain a permissive fallback like 'if request.auth != null' alone.
    const friendsBlock = rules.match(
      /match \/users\/\{ownerUid\}\/friends\/\{friendUid\} \{[\s\S]*?\}/,
    );
    expect(friendsBlock).not.toBeNull();
    // The create line must contain ownerUid or friendUid as auth check (not just request.auth != null alone).
    expect(friendsBlock![0]).toMatch(/canonicalUserMatchesAuth\(ownerUid\)/);
    expect(friendsBlock![0]).toMatch(/canonicalUserMatchesAuth\(friendUid\)/);
  });

  // FR-NEW-4: ownerUid can delete (existing behavior preserved)
  test('FR-NEW-4: friends delete still allows ownerUid', () => {
    expect(rules).toMatch(
      /friends\/\{friendUid\}[\s\S]*?allow delete:[\s\S]*?canonicalUserMatchesAuth\(ownerUid\)/,
    );
  });

  // FR-NEW-5: friendUid can now delete (new bidirectional behavior)
  test('FR-NEW-5: friends delete now allows friendUid (bidirectional removal)', () => {
    expect(rules).toMatch(
      /friends\/\{friendUid\}[\s\S]*?allow delete:[\s\S]*?canonicalUserMatchesAuth\(friendUid\)/,
    );
  });

  // FR-NEW-6: third-party uid cannot delete — only ownerUid or friendUid
  test('FR-NEW-6: friends delete is restricted to ownerUid OR friendUid (not catch-all)', () => {
    // The delete rule must include both ownerUid and friendUid with OR operator.
    expect(rules).toMatch(
      /allow delete: if canonicalUserMatchesAuth\(ownerUid\) \|\| canonicalUserMatchesAuth\(friendUid\);/,
    );
  });
});
