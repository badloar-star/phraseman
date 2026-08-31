export const HOME_MISTAKES_READY_THRESHOLD = 10;

export type HomeLearningPriority = 'last_lesson' | 'mistakes';

export function resolveHomeLearningPriority(readyCount: number): HomeLearningPriority {
  const normalized = Number.isFinite(readyCount)
    ? Math.max(0, Math.floor(readyCount))
    : 0;
  return normalized >= HOME_MISTAKES_READY_THRESHOLD ? 'mistakes' : 'last_lesson';
}

/* expo-router route shim: keeps this app utility from being treated as a route */
export default function __RouteShim() {
  return null;
}
