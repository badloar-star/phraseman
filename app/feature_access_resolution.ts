export type FeatureAccessDecision = 'wait' | 'allow' | 'paywall';

export function resolveFeatureAccessDecision(input: {
  accessResolved: boolean;
  granted: boolean;
}): FeatureAccessDecision {
  if (!input.accessResolved) return 'wait';
  return input.granted ? 'allow' : 'paywall';
}

// Expo Router treats every module under app/ as a route. Keep the pure helper
// importable without exposing any UI or side effects when that route is scanned.
export default function __RouteShim() {
  return null;
}
