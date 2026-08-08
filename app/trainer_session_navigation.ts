import type { TrainerSessionRoute } from './trainer_session';
import type { RuntimeStudyTarget } from './target_storage_keys';

type TrainerSessionRouter = {
  push: (route: any) => void;
};

interface ReservedTrainerSessionInput {
  route: TrainerSessionRoute;
  router: Pick<TrainerSessionRouter, 'push'>;
  studyTarget?: RuntimeStudyTarget;
  premiumAccess: boolean | (() => Promise<boolean>);
  lock: { current: boolean };
}

export async function startReservedTrainerSession({
  route,
  router,
  studyTarget,
  premiumAccess,
  lock,
}: ReservedTrainerSessionInput): Promise<'started' | 'limit' | 'busy'> {
  if (lock.current) return 'busy';
  lock.current = true;
  try {
    let hasPremium = false;
    try {
      hasPremium = typeof premiumAccess === 'function'
        ? await premiumAccess()
        : premiumAccess;
    } catch {
      // Entitlement verification is fail-closed. The learner still gets the
      // actionable paywall instead of an unhandled rejection or free access.
      hasPremium = false;
    }
    if (hasPremium) {
      router.push(route);
      return 'started';
    }
    // Practice is a full Plus section. Historical free reservations and the
    // remote trainer_modes override cannot create an entitlement bypass.
    void studyTarget;
    router.push({ pathname: '/premium_modal', params: { context: 'trainer_limit' } });
    return 'limit';
  } finally {
    lock.current = false;
  }
}
