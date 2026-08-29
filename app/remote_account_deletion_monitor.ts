type AuthUserLike = {
  uid: string;
  isAnonymous: boolean;
  reload: () => Promise<void>;
};

type Unsubscribe = () => void;

function authModuleFactory(): (() => any) | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-firebase/auth');
    const factory = mod?.default ?? mod;
    return typeof factory === 'function' ? factory : null;
  } catch {
    return null;
  }
}

function firestoreModuleFactory(): (() => any) | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-firebase/firestore');
    const factory = mod?.default ?? mod;
    return typeof factory === 'function' ? factory : null;
  } catch {
    return null;
  }
}

function errorCode(error: unknown): string {
  return String((error as { code?: unknown })?.code ?? '').toLowerCase();
}

/**
 * Watches a server-owned marker tied to the current provider Firebase UID.
 * The marker is created in the same transaction as the durable deletion job,
 * so every other signed-in device can exit before the background cleanup ends.
 */
export function startRemoteAccountDeletionMonitor(
  onDeleted: () => Promise<boolean>,
): Unsubscribe {
  const authFactory = authModuleFactory();
  const firestoreFactory = firestoreModuleFactory();
  if (!authFactory || !firestoreFactory) return () => {};

  const auth = authFactory();
  const db = firestoreFactory();
  const reportedUids = new Set<string>();
  const inFlightUids = new Set<string>();
  const retryAttempts = new Map<string, number>();
  const retryTimers = new Set<ReturnType<typeof setTimeout>>();
  let activeUid: string | null = null;
  let markerUnsubscribe: Unsubscribe | null = null;
  let stopped = false;

  const detachMarker = () => {
    markerUnsubscribe?.();
    markerUnsubscribe = null;
    activeUid = null;
  };

  const reportDeleted = (uid: string) => {
    if (
      stopped
      || activeUid !== uid
      || reportedUids.has(uid)
      || inFlightUids.has(uid)
    ) return;
    inFlightUids.add(uid);
    void onDeleted()
      .then((handled) => {
        if (handled && !stopped && activeUid === uid) {
          reportedUids.add(uid);
          retryAttempts.delete(uid);
          return;
        }
        const attempts = (retryAttempts.get(uid) ?? 0) + 1;
        retryAttempts.set(uid, attempts);
        if (attempts > 5 || stopped || activeUid !== uid) return;
        const timer = setTimeout(() => {
          retryTimers.delete(timer);
          reportDeleted(uid);
        }, Math.min(5_000, 500 * attempts));
        retryTimers.add(timer);
      })
      .catch(() => {
        const attempts = (retryAttempts.get(uid) ?? 0) + 1;
        retryAttempts.set(uid, attempts);
        if (attempts > 5 || stopped || activeUid !== uid) return;
        const timer = setTimeout(() => {
          retryTimers.delete(timer);
          reportDeleted(uid);
        }, Math.min(5_000, 500 * attempts));
        retryTimers.add(timer);
      })
      .finally(() => {
        inFlightUids.delete(uid);
      });
  };

  const attach = (user: AuthUserLike | null) => {
    const uid = !user?.isAnonymous ? String(user?.uid ?? '').trim() : '';
    if (!uid || uid === activeUid) {
      if (!uid) detachMarker();
      return;
    }

    detachMarker();
    activeUid = uid;
    markerUnsubscribe = db
      .collection('account_deletion_auth_markers')
      .doc(uid)
      .onSnapshot(
        (snapshot: { exists: boolean }) => {
          if (snapshot.exists) reportDeleted(uid);
        },
        (error: unknown) => {
          if (!errorCode(error).includes('permission-denied')) return;
          // зачем: user-not-found = Firebase больше не знает этот аккаунт — это
          // единственная надёжная улика удаления. user-disabled раньше тоже
          // триггерил полный локальный wipe + смена identity, но disabled это
          // бан/модерация, а не удаление — банили живого платящего юзера и его
          // же за это стирали. Убрано по итогам аудита 2026-08-28.
          void user!.reload().catch((reloadError: unknown) => {
            const code = errorCode(reloadError);
            if (code.includes('user-not-found')) reportDeleted(uid);
          });
        },
      );
  };

  const authUnsubscribe = auth.onAuthStateChanged(attach);
  return () => {
    stopped = true;
    retryTimers.forEach((timer) => clearTimeout(timer));
    retryTimers.clear();
    detachMarker();
    authUnsubscribe?.();
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
