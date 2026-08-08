import {
  OutputValidationRetriesExhausted,
  generateWithOutputValidationRetry,
} from './mistake_output_retry';

describe('generateWithOutputValidationRetry', () => {
  it('retries only validator failures and aggregates paid usage', async () => {
    const answers = ['bad-1', 'bad-2', 'good'];
    const generate = jest.fn(async () => ({
      answer: answers.shift() ?? '',
      usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
    }));

    const result = await generateWithOutputValidationRetry({
      maxAttempts: 3,
      generate,
      validate: (answer) => {
        if (answer.startsWith('bad')) throw new Error('validator_rejected');
        return answer.toUpperCase();
      },
      isValidationError: (error) => String((error as Error).message) === 'validator_rejected',
    });

    expect(result).toEqual({
      value: 'GOOD',
      attempts: 3,
      validatorRejects: 2,
      usage: { prompt_tokens: 30, completion_tokens: 12, total_tokens: 42 },
    });
    expect(generate).toHaveBeenCalledTimes(3);
  });

  it('does not retry provider failures', async () => {
    const generate = jest.fn(async (): Promise<never> => {
      throw new Error('provider_failed');
    });

    await expect(generateWithOutputValidationRetry({
      maxAttempts: 3,
      generate,
      validate: (answer) => answer,
      isValidationError: () => false,
    })).rejects.toThrow('provider_failed');

    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('does not retry validation errors excluded by the caller', async () => {
    const generate = jest.fn(async () => ({ answer: 'bad', usage: { total_tokens: 5 } }));

    await expect(generateWithOutputValidationRetry({
      maxAttempts: 3,
      generate,
      validate: () => { throw new Error('auth_required'); },
      isValidationError: () => false,
    })).rejects.toThrow('auth_required');

    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('exposes aggregate usage after all validator attempts are exhausted', async () => {
    const generate = jest.fn(async () => ({
      answer: 'bad',
      usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 },
    }));

    try {
      await generateWithOutputValidationRetry({
        maxAttempts: 3,
        generate,
        validate: () => { throw new Error('validator_rejected'); },
        isValidationError: () => true,
      });
      throw new Error('expected output validation exhaustion');
    } catch (error) {
      expect(error).toBeInstanceOf(OutputValidationRetriesExhausted);
      expect(error).toMatchObject({
        attempts: 3,
        usage: { prompt_tokens: 21, completion_tokens: 9, total_tokens: 30 },
      });
      expect((error as OutputValidationRetriesExhausted).validationError).toMatchObject({
        message: 'validator_rejected',
      });
    }

    expect(generate).toHaveBeenCalledTimes(3);
  });

  it('rejects an invalid retry budget before generating', async () => {
    const generate = jest.fn(async () => ({ answer: 'unused', usage: {} }));

    await expect(generateWithOutputValidationRetry({
      maxAttempts: 0,
      generate,
      validate: (answer) => answer,
      isValidationError: () => true,
    })).rejects.toThrow('mistake_output_retry_invalid_max_attempts');

    expect(generate).not.toHaveBeenCalled();
  });
});
