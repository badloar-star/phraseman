import { readAnyPersonalPlanState, type PersonalPlanState } from './personal_plan_state';
import { resolvePersonalPlanSunsetAccess } from './personal_plan_sunset';
import { readPersonalPlanSunsetEffectiveNow } from './personal_plan_sunset_clock';

export type PersonalPlanPostPremiumRoute = '/personal_plan_thank_you' | '/lessons_list';

export function personalPlanPostPremiumRoute(
  hasActivatedOrExistingPlan: boolean,
): PersonalPlanPostPremiumRoute {
  return hasActivatedOrExistingPlan ? '/personal_plan_thank_you' : '/lessons_list';
}

export async function hasCurrentPersonalPlanSunsetAccess(
  knownState?: PersonalPlanState | null,
): Promise<boolean> {
  try {
    const savedState = knownState === undefined ? await readAnyPersonalPlanState() : knownState;
    const effectiveNowMs = await readPersonalPlanSunsetEffectiveNow();
    return resolvePersonalPlanSunsetAccess({
      hasOriginalFeatureAccess: true,
      savedState,
      nowMs: effectiveNowMs,
    }).status === 'allowed';
  } catch {
    return false;
  }
}

export default function __RouteShim() { return null; }
