import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('community ideas public contract', () => {
  test('submission publishes immediately and initializes server-owned likes', () => {
    const source = read('functions/src/user_ideas.ts');
    expect(source).toContain("status: 'published'");
    expect(source).toContain('likeCount: 0');
    expect(source).toContain('authorName');
  });

  test('public callables expose only public idea projections', () => {
    const source = read('functions/src/user_ideas.ts');
    expect(source).toContain('export const listPublicUserIdeas');
    expect(source).toContain('export const getPublicUserIdea');
    expect(source).toContain('function publicIdea');
    expect(source).toContain('return { ok: true, id: ideaRef.id, idea: publicIdea');
    expect(source).toContain("status', 'in'");
    expect(source).toContain('benefit: text(data.benefit, 1000)');
    expect(source).toContain('lang: nullableText(data.lang, 16)');
  });

  // зачем: PM-171 — app/ideas_client.ts и app/ideas_catalog.tsx удалены вместе с
  // разделом «Идеи» (client-only, экран скрыт); контракт на клиентскую пагинацию снят.

  test('idea likes use deterministic receipts and existing received-like surfaces', () => {
    const source = read('functions/src/user_idea_likes.ts');
    expect(source).toContain('idea_likes_sent');
    expect(source).toContain('activity_likes_received');
    expect(source).toContain('activity_like_stats');
    expect(source).toContain('idempotentReplay');
    expect(source).toContain('buildUserNotification');
    expect(source).toContain("'in_progress', 'implemented'");
  });

  test('account deletion covers idea projections and sent-like references', () => {
    const source = read('functions/src/account_delete.ts');
    expect(source).toContain("collectionGroup: 'idea_likes_sent'");
    expect(source).toContain("collectionGroup: 'user_ideas'");
  });

  // зачем: PM-171 — то же самое: клиентский кэш идей удалён вместе с app/ideas_client.ts.
});
