/**
 * Read-only Firebase diagnostic for the reported "Vitalii" account reset.
 *
 * Safety guarantees:
 * - never writes to Firestore/Auth;
 * - never prints email, phone, provider tokens, full stable IDs or full Auth UIDs;
 * - IDs are represented as a one-way SHA-256 fingerprint + six-character suffix.
 *
 * Runtime requirement: GOOGLE_APPLICATION_CREDENTIALS must point to a
 * phraseman-ea0b3 service-account credential.
 */

const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || 'phraseman-ea0b3',
});

const db = admin.firestore();
const auth = admin.auth();
const NEEDLES = ['vitalii', 'vitaliy', 'vitali', 'виталий', 'virchyk', 'вирчик'];

function normalize(value) {
  return String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('en-US');
}

function matches(value) {
  const normalized = normalize(value);
  return normalized.length > 0 && NEEDLES.some((needle) => normalized.includes(needle));
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(String(value ?? '')).digest('hex').slice(0, 12);
}

function shortSuffix(value) {
  return String(value ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toLowerCase() || 'none';
}

function safeId(value) {
  return `${fingerprint(value)}#${shortSuffix(value)}`;
}

function asIso(value) {
  if (!value) return null;
  try {
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
  } catch {}
  return String(value);
}

function collectStrings(value, path = '', depth = 0, output = []) {
  if (depth > 4 || value == null) return output;
  if (typeof value === 'string') {
    output.push({ path, value });
    return output;
  }
  if (Array.isArray(value)) {
    value.slice(0, 20).forEach((child, index) => {
      collectStrings(child, `${path}[${index}]`, depth + 1, output);
    });
    return output;
  }
  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => {
      // Never traverse or print sensitive identity/contact values.
      if (/email|phone|token|address/i.test(key)) return;
      collectStrings(child, path ? `${path}.${key}` : key, depth + 1, output);
    });
  }
  return output;
}

function candidateNames(data) {
  const progress = data.progress && typeof data.progress === 'object' ? data.progress : {};
  const direct = [
    progress.user_name,
    progress.displayName,
    progress.name,
    data.user_name,
    data.displayName,
    data.name,
    data.username,
  ];
  const discovered = collectStrings(data)
    .filter(({ path }) => /(^|\.)(user_name|username|displayName|name)$/i.test(path))
    .map(({ value }) => value);
  return [...new Set([...direct, ...discovered].filter((value) => typeof value === 'string' && value.trim()))];
}

function topCounters(progress) {
  if (!progress || typeof progress !== 'object') return [];
  return Object.entries(progress)
    .map(([key, value]) => [key, asNumber(value)])
    .filter(([key, value]) => value > 0 && !/at$|time|timestamp|date|expires|ends|period_start/i.test(key))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([key, value]) => `${key}=${value}`);
}

async function getAuthSummary(uid) {
  if (!uid) return { exists: false };
  try {
    const user = await auth.getUser(uid);
    return {
      exists: true,
      disabled: Boolean(user.disabled),
      anonymous: (user.providerData || []).length === 0,
      providerIds: [...new Set((user.providerData || []).map((entry) => entry.providerId))],
      createdAt: user.metadata?.creationTime || null,
      lastSignInAt: user.metadata?.lastSignInTime || null,
    };
  } catch (error) {
    return { exists: false, code: error?.code || String(error) };
  }
}

function summarizeCandidate(id, data) {
  const progress = data.progress && typeof data.progress === 'object' ? data.progress : {};
  const firebaseAuthUid = typeof data.firebaseAuthUid === 'string' ? data.firebaseAuthUid : null;
  return {
    id,
    stableToken: safeId(id),
    matchedNames: candidateNames(data).filter(matches),
    xp: Math.max(
      asNumber(progress.user_total_xp),
      asNumber(progress.total_xp),
      asNumber(data.totalXP),
      asNumber(data.xp),
    ),
    storedLevel: Math.max(asNumber(progress.level), asNumber(data.level)),
    streak: Math.max(
      asNumber(progress.streak_count),
      asNumber(progress.current_streak),
      asNumber(progress.streak),
      asNumber(data.streak),
    ),
    shards: Math.max(asNumber(data.shards), asNumber(progress.shards), asNumber(progress.shards_balance)),
    firebaseAuthUid,
    firebaseAuthToken: firebaseAuthUid ? safeId(firebaseAuthUid) : null,
    linkedProviders: data.linkedAuth && typeof data.linkedAuth === 'object'
      ? Object.keys(data.linkedAuth)
      : [],
    identityHidden: data.identityHidden === true,
    canonicalStableToken: data.canonicalStableId ? safeId(data.canonicalStableId) : null,
    createdAt: asIso(data.created_at || data.createdAt),
    updatedAt: asIso(data.updatedAt || progress.updatedAt || data.lastActivityAt || progress.last_activity_at),
    progressKeyCount: Object.keys(progress).length,
    topCounters: topCounters(progress),
  };
}

async function main() {
  console.log('=== READ-ONLY VITALII ACCOUNT DIAGNOSTIC ===');
  console.log(`project=${process.env.FIREBASE_PROJECT_ID || 'phraseman-ea0b3'}`);
  console.log(`generatedAt=${new Date().toISOString()}`);
  console.log('Privacy: IDs are one-way fingerprints + six-character suffixes; emails and secrets are not printed.');

  const usersSnapshot = await db.collection('users').get();
  console.log(`usersScanned=${usersSnapshot.size}`);

  const candidates = [];
  for (const document of usersSnapshot.docs) {
    const data = document.data() || {};
    const hasNameMatch = candidateNames(data).some(matches);
    const hasOtherStringMatch = collectStrings(data).some(({ value }) => matches(value));
    if (hasNameMatch || hasOtherStringMatch) {
      candidates.push(summarizeCandidate(document.id, data));
    }
  }

  candidates.sort((a, b) => b.xp - a.xp || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  console.log(`matchingUserDocuments=${candidates.length}`);

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const authLinks = await db.collection('auth_links')
      .where('stable_id', '==', candidate.id)
      .limit(20)
      .get();

    let sameAuthDocuments = [];
    if (candidate.firebaseAuthUid) {
      const sameAuthSnapshot = await db.collection('users')
        .where('firebaseAuthUid', '==', candidate.firebaseAuthUid)
        .limit(20)
        .get();
      sameAuthDocuments = sameAuthSnapshot.docs.map((document) => {
        const progress = document.data()?.progress || {};
        return {
          stableToken: safeId(document.id),
          xp: Math.max(asNumber(progress.user_total_xp), asNumber(progress.total_xp)),
          sameDocument: document.id === candidate.id,
        };
      });
    }

    console.log(`\n[CANDIDATE ${index + 1}]`);
    console.log(JSON.stringify({
      stableToken: candidate.stableToken,
      matchedNames: candidate.matchedNames,
      xp: candidate.xp,
      storedLevel: candidate.storedLevel,
      streak: candidate.streak,
      shards: candidate.shards,
      firebaseAuthToken: candidate.firebaseAuthToken,
      firebaseAuth: await getAuthSummary(candidate.firebaseAuthUid),
      linkedProviders: candidate.linkedProviders,
      authLinks: authLinks.docs.map((document) => {
        const data = document.data() || {};
        return {
          linkToken: safeId(document.id),
          provider: data.provider || null,
          linkedAt: asIso(data.linkedAt),
          lastSignInAt: asIso(data.lastSignInAt),
        };
      }),
      userDocumentsWithSameFirebaseAuthUid: sameAuthDocuments,
      identityHidden: candidate.identityHidden,
      canonicalStableToken: candidate.canonicalStableToken,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
      progressKeyCount: candidate.progressKeyCount,
      topCounters: candidate.topCounters,
    }, null, 2));
  }

  console.log('\n[NAME INDEX]');
  for (const key of ['vitalii', 'vitaliy', 'vitali', 'vitalii virchyk', 'виталий']) {
    const snapshot = await db.collection('name_index').doc(key).get();
    if (!snapshot.exists) continue;
    const data = snapshot.data() || {};
    console.log(JSON.stringify({
      key,
      ownerToken: safeId(data.stable_id || data.ownerId || data.uid || data.userId || ''),
      fields: Object.keys(data).sort(),
      updatedAt: asIso(data.updatedAt || data.reservedAt || data.createdAt),
    }));
  }

  const highProgress = candidates.filter((candidate) => candidate.xp >= 10_000);
  const nearEmpty = candidates.filter((candidate) => candidate.xp < 1_000);
  console.log('\n[SUMMARY]');
  console.log(`highProgressCandidates=${highProgress.length}; nearEmptyCandidates=${nearEmpty.length}`);
  if (highProgress.length === 1 && highProgress[0].firebaseAuthUid) {
    const candidate = highProgress[0];
    console.log(
      `Strongest candidate ${candidate.stableToken} has xp=${candidate.xp} and is pinned to auth ${candidate.firebaseAuthToken}. ` +
      'If the current phone now has another anonymous Auth UID, this stale pin blocks restore like the known OlgaZ incident.',
    );
  }
  if (highProgress.length > 0 && nearEmpty.length > 0) {
    console.log('A high-progress and a near-empty matching document coexist: likely account split/new identity.');
  }
  if (candidates.length === 0) {
    console.log('No nickname match. The in-app bug-report code/UID is required for exact identification.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('FATAL_DIAGNOSTIC_ERROR', error?.stack || error);
    process.exit(1);
  });
