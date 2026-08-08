import {
  buildOpenAiImageRequest,
  claimAssetRun,
  canClaimAssetRun,
  missingAssetSlots,
  normalizeAssetJobInput,
  projectAssetJob,
  reserveImageBudget,
  sanitizeProviderError,
} from './admin_asset_studio';

function fakeDoc(data: Record<string, unknown> = {}) {
  return {
    id: 'fake-doc',
    data,
    async get() { return { exists: true, id: this.id, data: () => this.data }; },
    set(next: Record<string, unknown>, options?: { merge?: boolean }) {
      const applied = { ...next };
      for (const [key, value] of Object.entries(applied)) {
        if (value && typeof value === 'object' && 'operand' in value) applied[key] = Number(this.data[key] || 0) + Number((value as { operand: number }).operand || 0);
      }
      this.data = options?.merge ? { ...this.data, ...applied } : applied;
    },
  };
}

function fakeDb() {
  const docs = new Map<string, ReturnType<typeof fakeDoc>>();
  const getDoc = (path: string) => {
    if (!docs.has(path)) docs.set(path, fakeDoc());
    return docs.get(path)!;
  };
  return {
    docs,
    collection: (name: string) => ({ doc: (id: string) => getDoc(`${name}/${id}`) }),
    runTransaction: async (fn: (tx: { get: (ref: ReturnType<typeof fakeDoc>) => Promise<unknown>; set: (ref: ReturnType<typeof fakeDoc>, data: Record<string, unknown>, options?: { merge?: boolean }) => void }) => Promise<unknown>) => fn({
      get: async (ref) => ref.get(),
      set: (ref, data, options) => ref.set(data, options),
    }),
  } as never;
}

describe('admin asset studio contract', () => {
  test('normalizes a safe DALL-E asset job draft with bounded fields and count', () => {
    expect(normalizeAssetJobInput({
      kind: 'generic',
      title: '  Cinema lesson card  ',
      prompt: `Premium Phraseman lesson card, no text, app quality. ${'x'.repeat(5000)}`,
      targetPath: 'assets/images/lessons/lesson-card-cinema.webp',
      slotKey: 'lesson-card-cinema',
      count: 99,
      size: '1024x1024',
      quality: 'medium',
    })).toMatchObject({
      kind: 'generic',
      title: 'Cinema lesson card',
      prompt: expect.stringContaining('Premium Phraseman lesson card'),
      targetPath: 'assets/images/lessons/lesson-card-cinema.webp',
      slotKey: 'lesson-card-cinema',
      count: 4,
      size: '1024x1024',
      quality: 'medium',
    });
  });

  test('rejects unsafe target paths and empty prompts before spending on image generation', () => {
    expect(() => normalizeAssetJobInput({ prompt: '', targetPath: 'assets/images/x.webp' })).toThrow('prompt_required');
    expect(() => normalizeAssetJobInput({ prompt: 'valid prompt', targetPath: '../secrets.txt' })).toThrow('target_path_invalid');
    expect(() => normalizeAssetJobInput({ prompt: 'valid prompt', targetPath: 'functions/.env' })).toThrow('target_path_invalid');
  });

  test('builds a server-side OpenAI image request without exposing browser secrets', () => {
    const job = normalizeAssetJobInput({
      prompt: 'Generate a small app icon, no text',
      size: '1024x1024',
      quality: 'low',
      count: 2,
    });

    expect(buildOpenAiImageRequest(job)).toEqual({
      model: 'gpt-image-1',
      prompt: 'Generate a small app icon, no text',
      size: '1024x1024',
      quality: 'low',
      output_format: 'png',
    });
  });

  test('uses the real image model in generated OpenAI requests', () => {
    const job = normalizeAssetJobInput({ prompt: 'Generate an app asset' });
    expect(buildOpenAiImageRequest(job).model).toBe('gpt-image-1');
  });

  test('allows a stale running lease to be reclaimed but blocks a fresh running lease', () => {
    expect(canClaimAssetRun({ status: 'draft' }, 1000)).toBe(true);
    expect(canClaimAssetRun({ status: 'failed' }, 1000)).toBe(true);
    expect(canClaimAssetRun({ status: 'running', runLeaseExpiresAtMs: 900 }, 1000)).toBe(true);
    expect(canClaimAssetRun({ status: 'running', runLeaseExpiresAtMs: 1200 }, 1000)).toBe(false);
    expect(canClaimAssetRun({ status: 'generated' }, 1000)).toBe(false);
  });

  test('transactional claim allows exactly one fresh runner', async () => {
    const db = fakeDb();
    const ref = (db as unknown as { collection: (name: string) => { doc: (id: string) => ReturnType<typeof fakeDoc> } }).collection('admin_asset_jobs').doc('job-1');
    ref.data = { status: 'draft', prompt: 'Generate an app icon' };

    await claimAssetRun(db, ref as never, 'attempt-1', { email: 'owner@example.com', actorUid: 'owner' }, 1000);
    await expect(claimAssetRun(db, ref as never, 'attempt-2', { email: 'owner@example.com', actorUid: 'owner' }, 1100)).rejects.toThrow('asset_job_not_runnable');
    expect(ref.data.runAttemptId).toBe('attempt-1');
  });

  test('transactional image budget reservation cannot exceed the configured daily cap', async () => {
    const db = fakeDb();
    await reserveImageBudget(db, 2, 2, Date.parse('2033-05-18T12:00:00Z'));
    await expect(reserveImageBudget(db, 1, 2, Date.parse('2033-05-18T12:01:00Z'))).rejects.toThrow('image_assets_daily_cap_exceeded');
  });

  test('resumes only missing image slots after partial progress', () => {
    expect(missingAssetSlots(4, [{ slot: 1, gsPath: 'a' }, { slot: 3, gsPath: 'c' }])).toEqual([2, 4]);
  });

  test('sanitizes provider errors before storage or browser return', () => {
    const sanitized = sanitizeProviderError(new Error('image_api_400: {"error":{"message":"secret provider body"}}'));
    expect(sanitized.publicMessage).toBe('image_provider_failed');
    expect(sanitized.diagnostic).toContain('image_api_400');
    expect(sanitized.diagnostic).not.toContain('secret provider body');
  });

  test('projects job documents without leaking raw OpenAI payloads', () => {
    const projected = projectAssetJob('job-1', {
      title: 'Card',
      prompt: 'Prompt',
      rawResponse: { secret: 'hidden' },
      results: [{ gsPath: 'admin-asset-studio/job-1/generated-1.png' }],
      createdBy: 'owner@example.com',
    });

    expect(projected).toMatchObject({
      id: 'job-1',
      title: 'Card',
      prompt: 'Prompt',
      results: [{ gsPath: 'admin-asset-studio/job-1/generated-1.png', previewUrl: '' }],
      createdBy: 'owner@example.com',
    });
    expect(JSON.stringify(projected)).not.toContain('rawResponse');
    expect(JSON.stringify(projected)).not.toContain('hidden');
  });
});
