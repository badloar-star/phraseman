import { rnfbInstance } from './rnfb_modular';
type AuthUserLike = {
  uid: string;
  isAnonymous: boolean;
  reload: () => Promise<void>;
};

type Unsubscribe = () => void;

// зачем (координатор 17.10, «Аккаунт удалён на другом устройстве»): каждая ветка монитора пишет причину — раньше
// загрузчики, ошибка слушателя и сбои повтора глохли молча. Без uid целиком: 8 знаков.
function logAccountGone(step: string, payload: Record<string, unknown> = {}): void {
  console.log('[ACCOUNT-GONE]', JSON.stringify({ step, ...payload })); // guard-ok: без идентификаторов
}

function authModuleFactory(): (() => any) | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-firebase/auth');
    // зачем (координатор §67): модульный getAuth() — без «use getApp()» на вызов.
    const factory = mod?.default ?? mod;
    return typeof mod?.getAuth === 'function' || typeof factory === 'function' ? () => rnfbInstance(mod, 'getAuth') : null;
  } catch (e) {
    logAccountGone('auth_module_unavailable', { kind: e instanceof Error ? e.name : typeof e });
    return null;
  }
}

function firestoreModuleFactory(): (() => any) | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-firebase/firestore');
    const factory = mod?.default ?? mod;
    return typeof mod?.getFirestore === 'function' || typeof factory === 'function' ? () => rnfbInstance(mod, 'getFirestore') : null;
  } catch (e) {
    logAccountGone('firestore_module_unavailable', { kind: e instanceof Error ? e.name : typeof e });
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
  if (!authFactory || !firestoreFactory) {
    logAccountGone('monitor_off', { auth: Boolean(authFactory), firestore: Boolean(firestoreFactory) });
    return () => {};
  }

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
    ) {
      logAccountGone('report_skipped', { uid: uid.slice(0, 8), stopped, ownerChanged: activeUid !== uid, alreadyReported: reportedUids.has(uid), inFlight: inFlightUids.has(uid) });
      return;
    }
    inFlightUids.add(uid);
    logAccountGone('handle_start', { uid: uid.slice(0, 8), attempt: (retryAttempts.get(uid) ?? 0) + 1 });
    void onDeleted()
      .then((handled) => {
        if (handled && !stopped && activeUid === uid) {
          logAccountGone('handled', { uid: uid.slice(0, 8), result: 'wiped_to_onboarding' });
          reportedUids.add(uid);
          retryAttempts.delete(uid);
          return;
        }
        const attempts = (retryAttempts.get(uid) ?? 0) + 1;
        retryAttempts.set(uid, attempts);
        logAccountGone('handle_not_done', { uid: uid.slice(0, 8), handled, stopped, ownerChanged: activeUid !== uid, attempts, willRetry: !(attempts > 5 || stopped || activeUid !== uid) });
        if (attempts > 5 || stopped || activeUid !== uid) return;
        const timer = setTimeout(() => {
          retryTimers.delete(timer);
          reportDeleted(uid);
        }, Math.min(5_000, 500 * attempts));
        retryTimers.add(timer);
      })
      .catch((e: unknown) => {
        const attempts = (retryAttempts.get(uid) ?? 0) + 1;
        retryAttempts.set(uid, attempts);
        logAccountGone('handle_failed', { uid: uid.slice(0, 8), attempts, kind: e instanceof Error ? e.name : typeof e });
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
    logAccountGone('marker_attach', { uid: uid.slice(0, 8) });
    markerUnsubscribe = db
      .collection('account_deletion_auth_markers')
      .doc(uid)
      .onSnapshot(
        (snapshot: { exists: boolean }) => {
          logAccountGone('marker_snapshot', { uid: uid.slice(0, 8), exists: snapshot.exists });
          if (snapshot.exists) reportDeleted(uid);
        },
        (error: unknown) => {
          logAccountGone('marker_error', { uid: uid.slice(0, 8), code: errorCode(error) || 'unknown' });
          if (!errorCode(error).includes('permission-denied')) return;
          // зачем: user-not-found = Firebase больше не знает этот аккаунт — это
          // единственная надёжная улика удаления. user-disabled раньше тоже
          // триггерил полный локальный wipe + смена identity, но disabled это
          // бан/модерация, а не удаление — банили живого платящего юзера и его
          // же за это стирали. Убрано по итогам аудита 2026-08-28.
          void user!.reload().then(
            () => logAccountGone('reload_ok_not_deleted', { uid: uid.slice(0, 8) }),
            (reloadError: unknown) => {
              const code = errorCode(reloadError);
              logAccountGone('reload_failed', { uid: uid.slice(0, 8), code: code || 'unknown', deleted: code.includes('user-not-found') });
              if (code.includes('user-not-found')) reportDeleted(uid);
            },
          );
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
