/** Resolve server-owned account merges without accepting client-supplied aliases. */
export async function contestCanonicalOwner(
  db: FirebaseFirestore.Firestore,
  uid: string,
  tx?: FirebaseFirestore.Transaction,
): Promise<string | null> {
  const seen = new Set<string>();
  for (let depth = 0; depth < 20; depth++) {
    if (!uid || uid.includes('/') || seen.has(uid)) return null;
    seen.add(uid);
    const ref = db.collection('users').doc(uid);
    const snap = tx ? await tx.get(ref) : await ref.get();
    if (!snap.exists) return null;
    const data = snap.data() ?? {};
    if (data.levelSpinMergePending) throw new Error('Account merge pending; retry contest operation');
    if (data.identityHidden !== true) return uid;
    uid = typeof data.canonicalStableId === 'string' ? data.canonicalStableId : '';
  }
  throw new Error('Account alias chain exceeds limit');
}

/** Private receipts stay at their original path, preserving claim idempotency through merges. */
export async function contestRewardOwners(db: FirebaseFirestore.Firestore, uid: string): Promise<string[]> {
  const owners = new Set([uid]);
  const queue = [uid];
  for (let i = 0; i < queue.length; i++) {
    const aliases = await db.collection('users').where('canonicalStableId', '==', queue[i]).limit(101).get();
    if (aliases.size > 100) throw new Error('Too many aliases to safely read contest rewards');
    for (const alias of aliases.docs) {
      if (alias.data().identityHidden !== true || owners.has(alias.id)) continue;
      owners.add(alias.id); queue.push(alias.id);
      if (owners.size > 100) throw new Error('Too many contest reward owners');
    }
  }
  return [...owners];
}
