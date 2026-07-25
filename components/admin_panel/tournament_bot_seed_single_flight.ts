export interface BooleanRef {
  current: boolean;
}

export type SingleFlightResult<T> =
  | { started: true; value: T }
  | { started: false };

/**
 * Runs at most one tournament bot seed operation at a time.
 * The ref is set synchronously, before the operation can reach its first await.
 */
export async function runTournamentBotSeedSingleFlight<T>(
  lock: BooleanRef,
  operation: () => Promise<T>,
): Promise<SingleFlightResult<T>> {
  if (lock.current) return { started: false };
  lock.current = true;
  try {
    return { started: true, value: await operation() };
  } finally {
    lock.current = false;
  }
}
