import {
  createAuthRecoveryCompletion,
  createAuthOperationGate,
  createRecoveryDisposeBarrier,
  getAuthRecoveryCopy,
  getAuthRecoveryEntryMode,
  getAuthRecoveryErrorMessage,
  getCleanInstallRecoveryCopy,
  getCleanInstallRecoveryScreen,
  getRecoveryCountdownSeconds,
  isRecoveryEmailValid,
  isRecoveryDismissible,
  isRecoveryFlowLeaseCurrent,
  normalizeRecoveryEmailInput,
  normalizeRecoveryCodeInput,
} from '../components/auth_recovery_modal_model';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('auth recovery modal model', () => {
  it('routes an authorized Google/Gmail hint through instructions first', () => {
    expect(getAuthRecoveryEntryMode({ linked: true, provider: 'google', maskedEmail: 'm***@example.com' }))
      .toBe('google_instruction');
    expect(getAuthRecoveryEntryMode({ linked: true, provider: 'apple', maskedEmail: 'm***@gmail.com' }))
      .toBe('google_instruction');
    expect(getAuthRecoveryCopy('ru').googleInstruction).toContain('Настройки устройства → Аккаунты');
  });

  it('routes Apple/non-Gmail to code first and an absent hint to opaque provider choice', () => {
    expect(getAuthRecoveryEntryMode({ linked: true, provider: 'apple', maskedEmail: 'm***@icloud.com' }))
      .toBe('code_primary');
    expect(getAuthRecoveryEntryMode({ linked: true, provider: 'google', maskedEmail: 'm***@company.test' }))
      .toBe('google_instruction');
    expect(getAuthRecoveryEntryMode(null)).toBe('provider_choice');
    expect(getAuthRecoveryEntryMode({ linked: false })).toBe('provider_choice');
  });

  it.each(LOCALES)('ships complete, human recovery copy for %s', (locale) => {
    const copy = getAuthRecoveryCopy(locale);
    for (const value of Object.values(copy)) {
      expect(typeof value).toBe('string');
      expect(value.trim().length).toBeGreaterThan(2);
      expect(value).not.toMatch(/auth_recovery_|functions\/|customToken|recoveryEventId/i);
    }
    expect(getAuthRecoveryErrorMessage(locale, { code: 'functions/resource-exhausted', message: 'recovery_rate_limited' }))
      .toBe(copy.errorRateLimited);
    expect(getAuthRecoveryErrorMessage(locale, new Error('auth_recovery_code_invalid')))
      .toBe(copy.errorInvalidCode);
    expect(getAuthRecoveryErrorMessage(locale, new Error('secret-token-123')))
      .toBe(copy.errorSupport);
  });

  it.each(LOCALES)('ships complete, non-enumerating clean-install copy for %s', (locale) => {
    const copy = getCleanInstallRecoveryCopy(locale);
    for (const value of Object.values(copy)) {
      expect(typeof value).toBe('string');
      expect(value.trim().length).toBeGreaterThan(2);
      expect(value).not.toMatch(/customToken|recoveryEventId|challengeId/i);
    }
    expect(copy.sentBody).not.toMatch(/masked|част|скрыт|exist|существ|found|найден/i);
  });

  it('maps dedicated coordinator stages to stable clean-install screens', () => {
    expect(getCleanInstallRecoveryScreen('idle')).toBe('provider');
    expect(getCleanInstallRecoveryScreen('starting')).toBe('provider');
    expect(getCleanInstallRecoveryScreen('ready')).toBe('email');
    expect(getCleanInstallRecoveryScreen('requesting')).toBe('email');
    expect(getCleanInstallRecoveryScreen('code_sent')).toBe('code');
    expect(getCleanInstallRecoveryScreen('confirming')).toBe('code');
    expect(getCleanInstallRecoveryScreen('confirmed')).toBe('resume');
    expect(getCleanInstallRecoveryScreen('issuing')).toBe('resume');
    expect(getCleanInstallRecoveryScreen('adopting')).toBe('resume');
    expect(getCleanInstallRecoveryScreen('failed')).toBe('support');
    expect(getCleanInstallRecoveryScreen('quarantined')).toBe('support');
  });

  it('normalizes email like the dedicated coordinator and rejects malformed input', () => {
    expect(normalizeRecoveryEmailInput(' Owner@Example.COM ')).toBe('owner@example.com');
    expect(isRecoveryEmailValid('owner@example.com')).toBe(true);
    expect(isRecoveryEmailValid('owner example.com')).toBe(false);
    expect(isRecoveryEmailValid('owner@')).toBe(false);
    expect(isRecoveryEmailValid(`${'a'.repeat(315)}@x.test`)).toBe(false);
  });

  it('accepts exactly six ASCII digits and derives countdown from absolute deadlines', () => {
    expect(normalizeRecoveryCodeInput(' 12a34-56 ')).toBe('123456');
    expect(normalizeRecoveryCodeInput('１２３４５６')).toBe('');
    expect(normalizeRecoveryCodeInput('1234567')).toBe('123456');
    expect(getRecoveryCountdownSeconds(160_001, 100_000)).toBe(61);
    expect(getRecoveryCountdownSeconds(99_999, 100_000)).toBe(0);
  });

  it('keeps adopting non-dismissible and allows terminal support states to close', () => {
    expect(isRecoveryDismissible('adopting')).toBe(false);
    expect(isRecoveryDismissible('confirming')).toBe(true);
    expect(isRecoveryDismissible('quarantined')).toBe(true);
    expect(isRecoveryDismissible('failed')).toBe(true);
  });

  it('mutually excludes main provider sign-in and the named recovery session', () => {
    const gate = createAuthOperationGate();
    expect(gate.tryBegin('provider')).toBe(true);
    expect(gate.tryBegin('recovery')).toBe(false);
    gate.release('provider');
    expect(gate.tryBegin('recovery')).toBe(true);
    expect(gate.tryBegin('provider')).toBe(false);
    gate.release('provider');
    expect(gate.owner()).toBe('recovery');
    gate.reset();
    expect(gate.owner()).toBeNull();
    expect(gate.tryBegin('clean_recovery')).toBe(true);
    expect(gate.tryBegin('provider')).toBe(false);
    gate.release('clean_recovery');
    expect(gate.owner()).toBeNull();
  });

  it('executes mocked start, request, confirm and disposes the active flow on hide', async () => {
    const flow = {
      start: jest.fn(async () => ({ stage: 'ready' as const, provider: 'google' as const })),
      requestCode: jest.fn(async () => ({
        stage: 'code_sent' as const,
        provider: 'google' as const,
        maskedEmail: 'm***@gmail.com',
        expiresAt: 200_000,
        resendAvailableAt: 160_000,
      })),
      confirmCode: jest.fn(async () => ({ result: 'completed' as const })),
      dispose: jest.fn(async () => undefined),
    };
    const gate = createAuthOperationGate();
    expect(gate.tryBegin('recovery')).toBe(true);
    await flow.start();
    await flow.requestCode();
    await expect(flow.confirmCode()).resolves.toEqual({ result: 'completed' });
    gate.reset();
    await flow.dispose();
    expect(flow.start).toHaveBeenCalledTimes(1);
    expect(flow.requestCode).toHaveBeenCalledTimes(1);
    expect(flow.confirmCode).toHaveBeenCalledTimes(1);
    expect(flow.dispose).toHaveBeenCalledTimes(1);
  });

  it('rejects a stale flow A lease after close and reopen attaches flow B', () => {
    const flowA = { name: 'A' };
    const flowB = { name: 'B' };
    let current: typeof flowA | null = flowA;
    let generation = 1;
    const generationA = generation;

    current = null;
    generation += 1;
    current = flowB;
    generation += 1;
    const generationB = generation;

    expect(isRecoveryFlowLeaseCurrent(current, generation, flowA, generationA)).toBe(false);
    expect(isRecoveryFlowLeaseCurrent(current, generation, flowB, generationB)).toBe(true);
  });

  it('keeps reopen operations blocked until asynchronous flow disposal settles', async () => {
    let finishDispose!: () => void;
    const dispose = jest.fn(() => new Promise<void>((resolve) => { finishDispose = resolve; }));
    const barrier = createRecoveryDisposeBarrier();

    const pending = barrier.begin(dispose);
    await Promise.resolve();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(barrier.isPending()).toBe(true);
    expect(barrier.begin(dispose)).toBe(pending);
    expect(dispose).toHaveBeenCalledTimes(1);

    finishDispose();
    await pending;
    await Promise.resolve();
    expect(barrier.isPending()).toBe(false);
  });

  it('emits and restores once only after authoritative completion', async () => {
    const emit = jest.fn();
    const close = jest.fn();
    const restore = jest.fn(async () => 'restored' as const);
    const complete = createAuthRecoveryCompletion({ emit, close, restore });

    expect(complete('completed')).toBe(true);
    expect(complete('completed')).toBe(false);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('auth_provider_linked');
    expect(close).toHaveBeenCalledTimes(1);
    expect(restore).toHaveBeenCalledTimes(1);
    await Promise.resolve();
  });

  it('closes ack_pending silently without emitting or restoring before authoritative ACK', () => {
    const emit = jest.fn();
    const close = jest.fn();
    const restore = jest.fn(async () => 'restored' as const);
    const complete = createAuthRecoveryCompletion({ emit, close, restore });

    expect(complete('ack_pending')).toBe(true);
    expect(complete('ack_pending')).toBe(false);
    expect(close).toHaveBeenCalledTimes(1);
    expect(emit).not.toHaveBeenCalled();
    expect(restore).not.toHaveBeenCalled();
  });
});
