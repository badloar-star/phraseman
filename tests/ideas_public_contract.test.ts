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

  test('feed keeps pagination and detail metadata available to the client', () => {
    const client = read('app/ideas_client.ts');
    const catalog = read('app/ideas_catalog.tsx');
    expect(client).toContain('options: { force?: boolean; limit?: number; cursor?: string | null }');
    expect(catalog).toContain('listPublicUserIdeas(expectedTab, { cursor })');
    expect(catalog).toContain('Показать ещё идеи');
    expect(catalog).toContain('IdeasDetailSkeleton');
  });

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

  test('successful submit and edit can refresh the catalog from the local cache', () => {
    const client = read('app/ideas_client.ts');
    expect(client).toContain('function mergeCachedPublicIdea');
    expect(client).toContain('if (res.data.idea) mergeCachedPublicIdea(res.data.idea);');
    expect(client).toContain('if (res.data.idea) mergeCachedPublicIdea(res.data.idea);\n    else invalidatePublicIdeasCache();');
  });
});
