import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';

const FEATURE_FLAGS_POLL_MS = 30 * 60 * 1000;

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
  let active = true;
  const readFlags = async () => {
    try {
      const snap = await db.collection('app_meta').doc('arena_feature_flags').get();
      if (active) cb(snap?.exists ? normalizeArenaFeatureFlags(snap.data()) : { rankedWagerEnabled: false });
    } catch {
      if (active) cb({ rankedWagerEnabled: false });
    }
  };
  void readFlags();
  const id = setInterval(readFlags, FEATURE_FLAGS_POLL_MS);
  return () => {
    active = false;
    clearInterval(id);
  };
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
