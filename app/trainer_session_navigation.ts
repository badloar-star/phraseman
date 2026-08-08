import { reserveTrainerSessionEntry, type TrainerSessionRoute } from './trainer_session';
import type { RuntimeStudyTarget } from './target_storage_keys';
import { isFeatureFreeForEveryone } from './feature_gates';

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
    if (isFeatureFreeForEveryone('trainer_modes')) {
      router.push(route);
      return 'started';
    }
    const hasPremium = typeof premiumAccess === 'function'
      ? await premiumAccess()
      : premiumAccess;
    if (hasPremium) {
      router.push(route);
      return 'started';
    }
    const reserved = await reserveTrainerSessionEntry(route, false, studyTarget);
    if (!reserved) {
      router.push({ pathname: '/premium_modal', params: { context: 'trainer_limit' } });
      return 'limit';
    }
    router.push(route);
    return 'started';
  } finally {
    lock.current = false;
  }
}
