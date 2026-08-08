export interface MistakeOpenAiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface GeneratedOutput {
  answer: string;
  usage: MistakeOpenAiUsage;
}

export interface OutputValidationRetryResult<T> {
  value: T;
  usage: MistakeOpenAiUsage;
  attempts: number;
  validatorRejects: number;
}

export class OutputValidationRetriesExhausted extends Error {
  constructor(
    readonly validationError: unknown,
    readonly usage: MistakeOpenAiUsage,
    readonly attempts: number,
  ) {
    super('mistake_output_validation_retries_exhausted');
    this.name = 'OutputValidationRetriesExhausted';
  }
}

/** A provider returned a paid response that is already known to be invalid (for example, truncated). */
export class GeneratedOutputRejected extends Error {
  constructor(
    readonly validationError: unknown,
    readonly usage: MistakeOpenAiUsage,
  ) {
    super('mistake_generated_output_rejected');
    this.name = 'GeneratedOutputRejected';
  }
}

/** A non-retryable generation/validation failure occurred after at least one paid output. */
export class OutputValidationRetryAborted extends Error {
  constructor(
    readonly generationError: unknown,
    readonly usage: MistakeOpenAiUsage,
    readonly attempts: number,
    readonly validatorRejects: number,
  ) {
    super(String((generationError as { message?: unknown })?.message ?? 'mistake_output_validation_retry_aborted'));
    this.name = 'OutputValidationRetryAborted';
  }
}

function addUsage(total: MistakeOpenAiUsage, next: MistakeOpenAiUsage): MistakeOpenAiUsage {
  return {
    prompt_tokens: Number(total.prompt_tokens ?? 0) + Number(next.prompt_tokens ?? 0),
    completion_tokens: Number(total.completion_tokens ?? 0) + Number(next.completion_tokens ?? 0),
    total_tokens: Number(total.total_tokens ?? 0) + Number(next.total_tokens ?? 0),
  };
}

export async function generateWithOutputValidationRetry<T>(params: {
  maxAttempts: number;
  generate: (attempt: number) => Promise<GeneratedOutput>;
  validate: (answer: string) => T;
  isValidationError: (error: unknown) => boolean;
  onValidationReject?: (attempt: number) => void;
}): Promise<OutputValidationRetryResult<T>> {
  if (!Number.isInteger(params.maxAttempts) || params.maxAttempts < 1) {
    throw new Error('mistake_output_retry_invalid_max_attempts');
  }

  let usage: MistakeOpenAiUsage = {};
  let validatorRejects = 0;

  for (let attempt = 1; attempt <= params.maxAttempts; attempt += 1) {
    let generated: GeneratedOutput;
    try {
      generated = await params.generate(attempt);
    } catch (error) {
      if (error instanceof GeneratedOutputRejected) {
        usage = addUsage(usage, error.usage);
        if (!params.isValidationError(error.validationError)) {
          throw new OutputValidationRetryAborted(
            error.validationError,
            usage,
            attempt,
            validatorRejects,
          );
        }
        validatorRejects += 1;
        params.onValidationReject?.(attempt);
        if (attempt === params.maxAttempts) {
          throw new OutputValidationRetriesExhausted(error.validationError, usage, attempt);
        }
        continue;
      }
      if (attempt > 1) {
        throw new OutputValidationRetryAborted(error, usage, attempt, validatorRejects);
      }
      throw error;
    }
    usage = addUsage(usage, generated.usage);
    try {
      return {
        value: params.validate(generated.answer),
        usage,
        attempts: attempt,
        validatorRejects,
      };
    } catch (error) {
      if (!params.isValidationError(error)) {
        throw new OutputValidationRetryAborted(error, usage, attempt, validatorRejects);
      }
      validatorRejects += 1;
      params.onValidationReject?.(attempt);
      if (attempt === params.maxAttempts) {
        throw new OutputValidationRetriesExhausted(error, usage, attempt);
      }
    }
  }

  throw new Error('mistake_output_retry_unreachable');
}
