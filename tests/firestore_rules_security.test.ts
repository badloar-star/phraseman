import { readFileSync } from 'fs';
import path from 'path';

const rulesPath = path.join(process.cwd(), 'firestore.rules');

describe('firestore.rules security baseline', () => {
  const rules = readFileSync(rulesPath, 'utf8');

  // См. комментарий в firestore.rules: любой request.auth != null для /users/{userId}
  // из‑за статической админки и того же клиентского auth в приложении.
  test('users collection allows authenticated read/write (documented tradeoff)', () => {
    expect(rules).toContain('match /users/{userId} {');
    expect(rules).toContain('allow read, write: if request.auth != null;');
  });

  test('users shard_log allows authenticated read and create only', () => {
    expect(rules).toContain('match /shard_log/{logId} {');
    expect(rules).toContain('allow read, create: if request.auth != null;');
    expect(rules).toContain('allow update, delete: if false;');
  });

  test('catch-all rule is deny-all', () => {
    expect(rules).toContain('match /{document=**} {');
    expect(rules).toContain('allow read, write: if false;');
  });

  test('arena_rooms updates are field-restricted', () => {
    expect(rules).toContain('match /arena_rooms/{roomId} {');
    expect(rules).toContain(".hasOnly(['guestId', 'guestName', 'status', 'sessionId']);");
  });

  test('arena_invites allows only status updates from participants', () => {
    expect(rules).toContain('match /arena_invites/{inviteId} {');
    expect(rules).toContain(".hasOnly(['status']);");
  });
});

describe('firestore.rules friend system (Phase 1)', () => {
  const rules = readFileSync(rulesPath, 'utf8');

  test('friend_code_index rule allows authenticated read', () => {
    expect(rules).toContain('match /friend_code_index/{code} {');
    expect(rules).toMatch(/match \/friend_code_index\/\{code\} \{[\s\S]*?allow read: if request\.auth != null;/);
  });

  test('friend_code_index rule restricts create to non-empty uid', () => {
    expect(rules).toMatch(/match \/friend_code_index\/\{code\} \{[\s\S]*?allow create: if request\.auth != null[\s\S]*?request\.resource\.data\.uid is string[\s\S]*?request\.resource\.data\.uid\.size\(\) > 0/);
  });

  test('friend_code_index rule forbids update and delete', () => {
    expect(rules).toMatch(/match \/friend_code_index\/\{code\} \{[\s\S]*?allow update: if false;[\s\S]*?allow delete: if false;/);
  });

  test('friend_requests create requires senderUid == request.auth.uid (anti-impersonation)', () => {
    expect(rules).toContain('match /users/{targetUid}/friend_requests/{senderUid} {');
    expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?senderUid == request\.auth\.uid/);
  });

  test('friend_requests create checks banned_users (SEC-05)', () => {
    expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?!exists\(\/databases\/\$\(database\)\/documents\/banned_users\/\$\(request\.auth\.uid\)\)/);
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
    expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?allow delete: if request\.auth != null && request\.auth\.uid == targetUid;/);
  });

  test('friends subcollection rule exists with owner-only create', () => {
    expect(rules).toContain('match /users/{ownerUid}/friends/{friendUid} {');
    expect(rules).toMatch(/friends\/\{friendUid\}[\s\S]*?allow create: if request\.auth != null[\s\S]*?request\.auth\.uid == ownerUid/);
  });

  test('friends subcollection forbids self-friending', () => {
    expect(rules).toMatch(/friends\/\{friendUid\}[\s\S]*?ownerUid != friendUid/);
  });

  test('friends subcollection forbids updates', () => {
    expect(rules).toMatch(/friends\/\{friendUid\}[\s\S]*?allow update: if false;/);
  });

  test('friends subcollection delete restricted to owner', () => {
    expect(rules).toMatch(/friends\/\{friendUid\}[\s\S]*?allow delete: if request\.auth != null && request\.auth\.uid == ownerUid;/);
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
