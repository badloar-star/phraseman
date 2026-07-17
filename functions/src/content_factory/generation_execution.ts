import { HttpsError } from 'firebase-functions/v2/https';

export interface GenerationExecutionLease {
  readonly attempt: number;
  readonly leaseToken: string;
}

export interface GenerationExecutionDocument {
  readonly state?: unknown;
  readonly attempts?: unknown;
  readonly leaseToken?: unknown;
  readonly failureCounted?: unknown;
}

export function canCommitGenerationExecution(
  current: GenerationExecutionDocument,
  lease: GenerationExecutionLease,
  allowedStates: readonly string[],
): boolean {
  return allowedStates.includes(String(current.state ?? ''))
    && Number(current.attempts) === lease.attempt
    && current.leaseToken === lease.leaseToken;
}

export class GenerationPersistenceError extends HttpsError {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super('internal', 'generation_terminal_persistence_failed');
    this.cause = cause;
  }
}

export function generationPersistenceError(cause: unknown): GenerationPersistenceError {
  return new GenerationPersistenceError(cause);
}

export async function runGuardedGenerationTransaction<TTransaction = never, TContext = undefined>(input: {
  readonly lease: GenerationExecutionLease;
  readonly allowedStates: readonly string[];
  readonly runTransaction: (handler: (transaction: TTransaction) => Promise<boolean>) => Promise<boolean>;
  readonly read: (transaction: TTransaction) => Promise<{
    readonly current: GenerationExecutionDocument | null;
    readonly context: TContext;
  }>;
  readonly commit: (
    transaction: TTransaction,
    current: GenerationExecutionDocument,
    context: TContext,
  ) => Promise<void> | void;
}): Promise<boolean> {
  try {
    return await input.runTransaction(async (transaction) => {
      const loaded = await input.read(transaction);
      if (!loaded.current || !canCommitGenerationExecution(loaded.current, input.lease, input.allowedStates)) return false;
      await input.commit(transaction, loaded.current, loaded.context);
      return true;
    });
  } catch (cause) {
    throw generationPersistenceError(cause);
  }
}
