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

function addUsage(total: MistakeOpenAiUsage, next: MistakeOpenAiUsage): MistakeOpenAiUsage {
  return {
    prompt_tokens: Number(total.prompt_tokens ?? 0) + Number(next.prompt_tokens ?? 0),
    completion_tokens: Number(total.completion_tokens ?? 0) + Number(next.completion_tokens ?? 0),
    total_tokens: Number(total.total_tokens ?? 0) + Number(next.total_tokens ?? 0),
  };
}

export async function generateWithOutputValidationRetry<T>(params: {
  maxAttempts: number;
  generate: () => Promise<GeneratedOutput>;
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
    const generated = await params.generate();
    usage = addUsage(usage, generated.usage);
    try {
      return {
        value: params.validate(generated.answer),
        usage,
        attempts: attempt,
        validatorRejects,
      };
    } catch (error) {
      if (!params.isValidationError(error)) throw error;
      validatorRejects += 1;
      params.onValidationReject?.(attempt);
      if (attempt === params.maxAttempts) {
        throw new OutputValidationRetriesExhausted(error, usage, attempt);
      }
    }
  }

  throw new Error('mistake_output_retry_unreachable');
}
