# Fast Reliable Mistake Explanations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and cache the full mistake breakdown and its simple explanation together, while silently retrying validator-rejected model output without ever publishing it.

**Architecture:** Add two pure server helpers: one owns strict bundle formatting/parsing and one owns bounded output-validation retries with token aggregation. Integrate them into the existing `explainMistake` callable without changing consent, transport retry, locks, quota reservation, or old-client behavior. Extend the callable response so the client can prime both local caches and prepare the ELI5 modal immediately.

**Tech Stack:** TypeScript, Firebase Functions v2 callable, Firestore, React Native Firebase, AsyncStorage, Jest/ts-jest.

---

## File map

- Create `functions/src/explain/mistake_output_retry.ts`: pure bounded validator-retry and usage aggregation.
- Create `functions/src/explain/mistake_output_retry.test.ts`: RED/GREEN tests for retry classification and exhaustion.
- Create `functions/src/explain/mistake_explain_bundle.ts`: strict output markers, bundle prompt augmentation, parser.
- Create `functions/src/explain/mistake_explain_bundle.test.ts`: parser and prompt contract tests.
- Modify `functions/src/explain/mistake_explain_cache.ts`: atomic ready write for `full + eli5`.
- Modify `functions/src/mistake_explain.ts`: bundle cold path, internal validator retry, response fields, safe telemetry.
- Modify `functions/src/mistake_explain.test.ts`: callable integration, cache compatibility, validator-retry and billing tests.
- Modify `app/ai_mistake_explain_client.ts`: accept bundle response and prime both local cache variants.
- Create `tests/ai_mistake_explain_bundle_client.test.ts`: behavioral client cache test with mocked callable.
- Modify `app/use_mistake_explain.ts`: prepare ELI5 state from the full response.
- Modify `tests/lesson_ai_mistake_offline_fallback.test.ts`: contract for ready ELI5 priming without weakening existing silent retry.

### Task 1: Pure output-validation retry

**Files:**
- Create: `functions/src/explain/mistake_output_retry.ts`
- Test: `functions/src/explain/mistake_output_retry.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import {
  OutputValidationRetriesExhausted,
  generateWithOutputValidationRetry,
} from './mistake_output_retry';

describe('generateWithOutputValidationRetry', () => {
  it('retries only validator failures and aggregates paid usage', async () => {
    const answers = ['bad-1', 'bad-2', 'good'];
    const generate = jest.fn(async () => ({
      answer: answers.shift()!,
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
  });

  it('does not retry provider or auth failures', async () => {
    const generate = jest.fn(async () => { throw new Error('provider_failed'); });
    await expect(generateWithOutputValidationRetry({
      maxAttempts: 3,
      generate,
      validate: (answer) => answer,
      isValidationError: () => false,
    })).rejects.toThrow('provider_failed');
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('exposes aggregate usage after all validator attempts are exhausted', async () => {
    const generate = jest.fn(async () => ({
      answer: 'bad',
      usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 },
    }));
    const promise = generateWithOutputValidationRetry({
      maxAttempts: 3,
      generate,
      validate: () => { throw new Error('validator_rejected'); },
      isValidationError: () => true,
    });
    await expect(promise).rejects.toMatchObject<Partial<OutputValidationRetriesExhausted>>({
      attempts: 3,
      usage: { prompt_tokens: 21, completion_tokens: 9, total_tokens: 30 },
    });
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `cd functions && npx jest src/explain/mistake_output_retry.test.ts --runInBand`

Expected: FAIL because `mistake_output_retry.ts` does not exist.

- [ ] **Step 3: Implement the pure helper**

```ts
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
  let usage: MistakeOpenAiUsage = {};
  let validatorRejects = 0;
  for (let attempt = 1; attempt <= params.maxAttempts; attempt += 1) {
    const generated = await params.generate();
    usage = addUsage(usage, generated.usage);
    try {
      return { value: params.validate(generated.answer), usage, attempts: attempt, validatorRejects };
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
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `cd functions && npx jest src/explain/mistake_output_retry.test.ts --runInBand`

Expected: 3 tests PASS.

- [ ] **Step 5: Commit only the two new files**

Run: `git add functions/src/explain/mistake_output_retry.ts functions/src/explain/mistake_output_retry.test.ts && git commit -m "feat(ai): add bounded output validation retry"`

### Task 2: Strict two-part bundle format

**Files:**
- Create: `functions/src/explain/mistake_explain_bundle.ts`
- Test: `functions/src/explain/mistake_explain_bundle.test.ts`

- [ ] **Step 1: Write parser and prompt RED tests**

```ts
import {
  buildMistakeBundleMessages,
  parseMistakeExplanationBundle,
} from './mistake_explain_bundle';

describe('mistake explanation bundle', () => {
  it('parses exactly one full and one ELI5 section', () => {
    expect(parseMistakeExplanationBundle(
      '<PHRASEMAN_FULL_V1>\nПолный текст\n</PHRASEMAN_FULL_V1>\n' +
      '<PHRASEMAN_ELI5_V1>\nПростой текст\n</PHRASEMAN_ELI5_V1>',
    )).toEqual({ full: 'Полный текст', eli5: 'Простой текст' });
  });

  it.each([
    'Полный текст без маркеров',
    '<PHRASEMAN_FULL_V1>\n\n</PHRASEMAN_FULL_V1>\n<PHRASEMAN_ELI5_V1>ok</PHRASEMAN_ELI5_V1>',
    '<PHRASEMAN_FULL_V1>ok</PHRASEMAN_FULL_V1>',
  ])('rejects malformed output without returning partial text', (raw) => {
    expect(() => parseMistakeExplanationBundle(raw)).toThrow('mistake_explain_invalid_bundle');
  });

  it('adds strict bundle instructions without changing the original inputs', () => {
    const base = [
      { role: 'system' as const, content: 'full-system' },
      { role: 'user' as const, content: 'full-user' },
    ];
    const result = buildMistakeBundleMessages(base);
    expect(result[0].content).toContain('full-system');
    expect(result[0].content).toContain('<PHRASEMAN_FULL_V1>');
    expect(result[0].content).toContain('<PHRASEMAN_ELI5_V1>');
    expect(result[0].content).toContain('under 55 words');
    expect(base[0].content).toBe('full-system');
  });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `cd functions && npx jest src/explain/mistake_explain_bundle.test.ts --runInBand`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement strict marker parsing and prompt augmentation**

Implement `buildMistakeBundleMessages(baseMessages)` as an immutable copy that appends requirements for two sections, keeps the full section under the existing full prompt, and asks the ELI5 section for 2–4 very short sentences under 55 words in the same interface language using only words from the answer pair. Implement `parseMistakeExplanationBundle(raw)` with ordered `indexOf` checks for the four exact markers, reject non-whitespace outside the two sections, and throw `new Error('mistake_explain_invalid_bundle')` for any missing, duplicated, empty, or out-of-order section.

- [ ] **Step 4: Run and verify GREEN**

Run: `cd functions && npx jest src/explain/mistake_explain_bundle.test.ts --runInBand`

Expected: all bundle tests PASS.

- [ ] **Step 5: Commit only the two new files**

Run: `git add functions/src/explain/mistake_explain_bundle.ts functions/src/explain/mistake_explain_bundle.test.ts && git commit -m "feat(ai): define mistake explanation bundle format"`

### Task 3: Callable bundle integration and atomic cache write

**Files:**
- Modify: `functions/src/explain/mistake_explain_cache.ts`
- Modify: `functions/src/mistake_explain.ts`
- Modify: `functions/src/mistake_explain.test.ts`

- [ ] **Step 1: Add failing callable tests**

Add tests that mock a marked bundle and assert:

```ts
expect(first).toMatchObject({
  text: full,
  fullText: full,
  eli5Text: simple,
  variant: 'full',
  fromCache: false,
});
expect(global.fetch).toHaveBeenCalledTimes(1);
expect(cacheDocs()[0]).toMatchObject({ status: 'ready', full, eli5: simple });

const simpleAgain = await callExplain({ ...validPayload, variant: 'eli5' }, 'auth-2');
expect(simpleAgain).toMatchObject({ text: simple, fromCache: true, variant: 'eli5' });
expect(global.fetch).toHaveBeenCalledTimes(1);
```

Add a queued provider test where two malformed/wrong-language bundles precede one valid bundle. Assert three fetches, one ready write, aggregate billing of all three attempts, and no rejected text in the cache. Add a provider-error test asserting one fetch only. Add an all-three-rejected test asserting no ready cache and one rejected cache record.

- [ ] **Step 2: Run and verify RED**

Run: `cd functions && npx jest src/mistake_explain.test.ts --runInBand`

Expected: new bundle response and retry assertions FAIL while pre-existing tests keep their current baseline behavior.

- [ ] **Step 3: Add atomic bundle cache API**

Add `writeReadyMistakeExplanationBundle(mistakeHash, { full, eli5 }, meta)` to `mistake_explain_cache.ts`. It performs one merge write containing `status: 'ready'`, the current schema, both texts, metadata, `reason: null`, `eli5PendingAtMs: null`, and `updatedAtMs`.

- [ ] **Step 4: Integrate one-call bundle generation**

In `mistake_explain.ts`:

- extend `ExplainMistakeResponse` with `fullText?: string` and `eli5Text?: string`;
- parameterize `generate()` output limits so bundle generation uses 520/760 while legacy single-variant generation keeps 340/520;
- use `buildMistakeBundleMessages(buildFullMessages(payload))` and `parseMistakeExplanationBundle` on a cold full miss;
- validate both parsed sections with `assertMistakeGeneratedText`;
- wrap bundle validation in `generateWithOutputValidationRetry(...maxAttempts: 3)`;
- aggregate usage into one billing record on eventual success;
- if `OutputValidationRetriesExhausted` is caught, record its aggregate usage, mark the cache rejected only after all three failures, release/refund through the existing paths, and rethrow its original validation error;
- include both optional response fields on generated and cached full returns;
- use the same retry helper for legacy ELI5-only generation;
- log only `{ variant, generationAttempts, validatorRejects, bundleGenerated, durationMs }`, never prompt or answer text.

- [ ] **Step 5: Run and verify GREEN**

Run: `cd functions && npx jest src/explain/mistake_output_retry.test.ts src/explain/mistake_explain_bundle.test.ts src/mistake_explain.test.ts --runInBand`

Expected: all targeted Functions tests PASS.

- [ ] **Step 6: Do not commit shared dirty files yet**

Because these three files already contain another task's uncommitted retry/quota changes, keep the integrated diff unstaged until that work stabilizes. Record exact owned hunks with `git diff -- functions/src/explain/mistake_explain_cache.ts functions/src/mistake_explain.ts functions/src/mistake_explain.test.ts` and do not stage unrelated hunks.

### Task 4: Client primes the simple explanation cache

**Files:**
- Modify: `app/ai_mistake_explain_client.ts`
- Create: `tests/ai_mistake_explain_bundle_client.test.ts`

- [ ] **Step 1: Write the failing behavioral client test**

Mock the Firebase callable to return `{ text: full, fullText: full, eli5Text: simple }`. Call `callExplainMistake(fullRequest)`, then call it again with the same request and `variant: 'eli5'`. Assert the second result is `model: 'local-cache'`, contains `simple`, and the Firebase callable was invoked exactly once.

- [ ] **Step 2: Run and verify RED**

Run: `npx jest --runTestsByPath tests/ai_mistake_explain_bundle_client.test.ts --no-cache --runInBand`

Expected: second call reaches the mocked callable because no ELI5 local entry is primed.

- [ ] **Step 3: Extend the client response and cache both variants**

Add optional `fullText` and `eli5Text` fields to `ExplainMistakeResponse`. After a successful full response, keep the existing full cache write and additionally write `eli5Text` using `explainMistakeRequestKey({ ...req, variant: 'eli5' })`. Trim and require non-empty text before each write. Do not change App Check, callable timeout, in-flight de-duplication, or transport retry.

- [ ] **Step 4: Run and verify GREEN**

Run: `npx jest --runTestsByPath tests/ai_mistake_explain_bundle_client.test.ts tests/ai_explain_local_cache.test.ts tests/openai_runtime_cost_contract.test.ts --no-cache --runInBand`

Expected: all selected client/cache tests PASS.

### Task 5: Prepare ELI5 UI state from the full response

**Files:**
- Modify: `app/use_mistake_explain.ts`
- Modify: `tests/lesson_ai_mistake_offline_fallback.test.ts`

- [ ] **Step 1: Add a failing contract assertion**

In the full-success slice, require `res.eli5Text`, `setEli5Text(res.eli5Text)`, `setEli5State('ready')`, and reset of `eli5RetryAttemptRef`. Preserve all existing assertions proving catch paths remain loading and schedule silent retries.

- [ ] **Step 2: Run and verify RED**

Run: `npx jest --runTestsByPath tests/lesson_ai_mistake_offline_fallback.test.ts --no-cache --runInBand`

Expected: the new ELI5 priming assertion FAILS.

- [ ] **Step 3: Prime state without opening the modal**

Immediately after the full response is accepted for the current phrase, if `res.eli5Text?.trim()` is non-empty, set ELI5 text and state to ready and reset its retry counter. Do not change `eli5Open`; the modal opens only after the existing button tap. Older server responses without the optional field retain the current lazy request path.

- [ ] **Step 4: Run and verify GREEN**

Run: `npx jest --runTestsByPath tests/lesson_ai_mistake_offline_fallback.test.ts tests/explain_background_retry_contract.test.ts tests/lesson_ai_mistake_card_contract.test.ts --no-cache --runInBand`

Expected: all selected UI/retry contracts PASS.

### Task 6: Verification and handoff

**Files:** all files above.

- [ ] **Step 1: Run Functions target suite**

Run: `cd functions && npx jest src/explain/mistake_output_retry.test.ts src/explain/mistake_explain_bundle.test.ts src/mistake_explain.test.ts --runInBand`

Expected: PASS with zero failed tests.

- [ ] **Step 2: Build Functions TypeScript**

Run: `cd functions && npm run build`

Expected: exit 0.

- [ ] **Step 3: Run client target suite**

Run: `npx jest --runTestsByPath tests/ai_mistake_explain_bundle_client.test.ts tests/ai_explain_local_cache.test.ts tests/lesson_ai_mistake_offline_fallback.test.ts tests/explain_background_retry_contract.test.ts tests/lesson_ai_mistake_card_contract.test.ts tests/openai_runtime_cost_contract.test.ts --no-cache --runInBand`

Expected: PASS with zero failed tests.

- [ ] **Step 4: Run whitespace and secret gates**

Run: `git diff --check`

Run: `npm run scan:secrets`

Expected: both exit 0. If the repository-wide secret scanner reports pre-existing unrelated findings, save the exact output and distinguish them from the touched files; never suppress a finding in a touched file.

- [ ] **Step 5: Review only owned diffs**

Run: `git diff -- functions/src/explain/mistake_output_retry.ts functions/src/explain/mistake_output_retry.test.ts functions/src/explain/mistake_explain_bundle.ts functions/src/explain/mistake_explain_bundle.test.ts functions/src/explain/mistake_explain_cache.ts functions/src/mistake_explain.ts functions/src/mistake_explain.test.ts app/ai_mistake_explain_client.ts app/use_mistake_explain.ts tests/ai_mistake_explain_bundle_client.test.ts tests/lesson_ai_mistake_offline_fallback.test.ts`

Expected: no consent, transport retry, region, `minInstances`, model-selection, or unrelated quota behavior changes.
