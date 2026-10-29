import { contestMonth } from '../../shared/community_month_contest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestContext, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, writeBatch, increment, serverTimestamp } from 'firebase/firestore';

describe('community hearts and private rewards — real Firestore Rules', () => {
  let env: RulesTestEnvironment;
  let db: ReturnType<RulesTestContext['firestore']>;
  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: 'demo-community-contest', firestore: { rules: readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8') } });
  }, 30000);
  afterAll(async () => env?.cleanup());
  beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
      const seed = ctx.firestore();
      await setDoc(doc(seed, 'community_contest_config/current'), { enabled: true, firstFullMonth: '2026-11' });
      await setDoc(doc(seed, 'auth_links/auth-a'), { stable_id: 'a' });
      await setDoc(doc(seed, 'users/a'), { firebaseAuthUid: 'auth-a', progress: {} });
      await setDoc(doc(seed, 'community_packs/p'), { authorStableId: 'author', listingStatus: 'published', likesCount: 0, addedCount: 1, publishedAt: Date.now() - 1000 });
      await setDoc(doc(seed, 'community_packs/p/pack_adds/a'), { userId: 'a', packId: 'p' });
    });
    db = env.authenticatedContext('auth-a').firestore();
  });
  const monthId = contestMonth(Date.now()).id;
  function vote(liked: boolean, uid = 'a', includeSnapshot = true) {
    const batch = writeBatch(db);
    const ref = doc(db, `community_packs/p/pack_likes/${uid}`);
    if (liked) batch.set(ref, { userId: uid, packId: 'p', createdAt: serverTimestamp() });
    else batch.delete(ref);
    batch.update(doc(db, 'community_packs/p'), { likesCount: increment(liked ? 1 : -1) });
    if (includeSnapshot) batch.set(doc(db, `community_packs/p/contest_votes/${monthId}_${uid}`), { monthId, userId: uid, liked, updatedAt: serverTimestamp() });
    return batch.commit();
  }
  it('accepts one atomic heart and removal, with exact counts', async () => {
    await assertSucceeds(vote(true));
    expect((await getDoc(doc(db, 'community_packs/p'))).data()?.likesCount).toBe(1);
    await assertFails(vote(true));
    await assertSucceeds(vote(false));
    expect((await getDoc(doc(db, 'community_packs/p'))).data()?.likesCount).toBe(0);
    await assertFails(vote(false));
  });
  it('rejects counter inflation and unpaired membership', async () => {
    await assertFails(updateDoc(doc(db, 'community_packs/p'), { likesCount: increment(1) }));
    await assertFails(setDoc(doc(db, 'community_packs/p/pack_likes/a'), { userId: 'a', packId: 'p', createdAt: serverTimestamp() }));
    await assertFails(vote(true, 'a', false));
  });
  it('rejects another identity and own-pack hearts but allows hearts before adding', async () => {
    await assertFails(vote(true, 'other'));
    await env.withSecurityRulesDisabled(async ctx => { await updateDoc(doc(ctx.firestore(), 'community_packs/p'), { authorStableId: 'a' }); });
    await assertFails(vote(true));
    await env.withSecurityRulesDisabled(async ctx => { await updateDoc(doc(ctx.firestore(), 'community_packs/p'), { authorStableId: 'author' }); });
    db = env.authenticatedContext('auth-b').firestore();
    await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), 'auth_links/auth-b'), { stable_id: 'b' }); });
    await assertSucceeds(vote(true, 'b'));
    expect((await getDoc(doc(db, 'community_packs/p'))).data()?.likesCount).toBe(1);
  });
  it('accepts older packs but cannot turn a pre-existing heart into a new monthly vote', async () => {
    await env.withSecurityRulesDisabled(async ctx => { await updateDoc(doc(ctx.firestore(), 'community_packs/p'), { publishedAt: Date.UTC(2020, 0, 1) }); });
    await assertSucceeds(vote(true));
    await assertFails(setDoc(doc(db, `community_packs/p/contest_votes/${monthId}_a`), { monthId, userId: 'a', liked: true, updatedAt: serverTimestamp() }));
    await assertSucceeds(vote(false));
    await assertSucceeds(vote(true));
    expect((await getDoc(doc(db, 'community_packs/p'))).data()?.likesCount).toBe(1);
  });
  it('cannot rewrite previous months or fabricate eligibility', async () => {
    const oldMonth = '2020-01';
    await assertFails(setDoc(doc(db, `community_packs/p/contest_votes/${oldMonth}_a`), { monthId: oldMonth, userId: 'a', liked: true, updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(db, 'community_contest_winners/p'), { monthId, place: 3 }));
  });
  it('prevents client Plus, reward or result fabrication', async () => {
    await assertFails(updateDoc(doc(db, 'users/a'), { 'progress.community_plus_until_ms': String(Date.now() + 1e10) }));
    await assertFails(setDoc(doc(db, 'users/a/community_month_rewards/fake'), { claimed: false, place: 1 }));
    await assertFails(setDoc(doc(db, 'community_month_results/2026-10'), { winners: ['a'] }));
    await assertFails(setDoc(doc(db, 'community_contest_config/current'), { enabled: false }));
  });
  it('preserves ordinary likes before the protected contest is activated', async () => {
    await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), 'community_contest_config/current'), { enabled: false }); });
    await assertSucceeds(vote(true, 'a', false));
    await assertSucceeds(vote(false, 'a', false));
  });
});
