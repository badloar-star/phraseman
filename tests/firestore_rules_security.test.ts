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
