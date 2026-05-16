import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';

export type ArenaFeatureFlags = {
  rankedWagerEnabled: boolean;
  updatedAt?: number;
};

function getFirestore(): any | null {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
}

function normalizeArenaFeatureFlags(raw: any): ArenaFeatureFlags {
  return {
    rankedWagerEnabled: raw?.rankedWagerEnabled === true,
    updatedAt: typeof raw?.updatedAt === 'number' ? raw.updatedAt : undefined,
  };
}

export function subscribeArenaFeatureFlags(
  cb: (flags: ArenaFeatureFlags) => void,
): () => void {
  const db = getFirestore();
  if (!db) {
    cb({ rankedWagerEnabled: false });
    return () => {};
  }
  return db.collection('app_meta').doc('arena_feature_flags').onSnapshot(
    (snap: any) => cb(snap?.exists ? normalizeArenaFeatureFlags(snap.data()) : { rankedWagerEnabled: false }),
    () => cb({ rankedWagerEnabled: false }),
  );
}

export async function getArenaFeatureFlagsOnce(): Promise<ArenaFeatureFlags> {
  const db = getFirestore();
  if (!db) return { rankedWagerEnabled: false };
  try {
    const snap = await db.collection('app_meta').doc('arena_feature_flags').get();
    return snap?.exists ? normalizeArenaFeatureFlags(snap.data()) : { rankedWagerEnabled: false };
  } catch {
    return { rankedWagerEnabled: false };
  }
}
