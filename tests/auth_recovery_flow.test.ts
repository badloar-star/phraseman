const mockAcquireCredential = jest.fn(async (provider: 'google' | 'apple') => ({
  idToken: `${provider}-token`, email: null, displayName: null,
}));
jest.mock('../app/auth_provider', () => ({
  acquireAuthRecoveryNativeCredential: (provider: 'google' | 'apple') => mockAcquireCredential(provider),
}));

let mockStableId: string | null = 'stable-1';
const mockGetStableId = jest.fn(async () => mockStableId);
jest.mock('../app/stable_id', () => ({ getStableId: () => mockGetStableId() }));

const events: string[] = [];
const mockRequestCode = jest.fn<Promise<any>, any[]>(async () => ({
  maskedEmail: 'u***@example.com', expiresInSec: 60, provider: 'google' as const,
}));
const mockConfirmCode = jest.fn<Promise<any>, any[]>(async () => ({
  stableId: 'stable-1', recoveryEventId: 'event-1', handoffEligibleUntil: 1_500_000,
}));
const CUSTOM_TOKEN = `${'a'.repeat(40)}.${'b'.repeat(40)}.${'c'.repeat(40)}`;
const mockIssueToken = jest.fn<Promise<any>, any[]>(async () => {
  events.push('issue');
  return {
    customToken: CUSTOM_TOKEN,
    stableId: 'stable-1',
    handoffAcknowledgeUntil: 4_500_000,
  };
});
const mockCleanup = jest.fn(async () => { events.push('cleanup'); });
const session = {
  authUid: 'provider-uid',
  provider: 'google' as const,
  functions: {},
  requestCode: mockRequestCode,
  confirmCode: mockConfirmCode,
  issueHandoffToken: mockIssueToken,
  cleanup: mockCleanup,
};
const mockStartSecondary = jest.fn<Promise<any>, [
  'google' | 'apple',
  (provider: 'google' | 'apple') => Promise<unknown>,
]>(async (
  provider: 'google' | 'apple',
  acquire: (provider: 'google' | 'apple') => Promise<unknown>,
) => {
  await acquire(provider);
  return { result: 'ready' as const, session: { ...session, provider } };
});
jest.mock('../app/auth_recovery_secondary', () => ({
  startSecondaryAuthRecoverySession: (
    provider: 'google' | 'apple',
    acquire: (provider: 'google' | 'apple') => Promise<unknown>,
  ) => mockStartSecondary(provider, acquire),
}));

const mockAdopt = jest.fn<Promise<any>, [unknown]>(async () => {
  events.push('adopt');
  return { result: 'completed' as const };
});
jest.mock('../app/auth_recovery_adoption', () => ({
  adoptAuthRecoveryHandoffOnDefaultAuth: (input: unknown) => mockAdopt(input),
}));

describe('existing-device auth recovery flow controller', () => {
  let now: number;

  beforeEach(() => {
    jest.resetModules();
    now = 1_000_000;
    events.length = 0;
    mockStableId = 'stable-1';
    mockGetStableId.mockClear();
    mockAcquireCredential.mockClear();
    mockStartSecondary.mockClear();
    mockRequestCode.mockReset();
    mockRequestCode.mockResolvedValue({
      maskedEmail: 'u***@example.com', expiresInSec: 60, provider: 'google',
    });
    mockConfirmCode.mockReset();
    mockConfirmCode.mockResolvedValue({
      stableId: 'stable-1', recoveryEventId: 'event-1', handoffEligibleUntil: 1_500_000,
    });
    mockIssueToken.mockReset();
    mockIssueToken.mockImplementation(async () => {
      events.push('issue');
      return {
        customToken: CUSTOM_TOKEN,
        stableId: 'stable-1',
        handoffAcknowledgeUntil: 4_500_000,
      };
    });
    mockCleanup.mockReset();
    mockCleanup.mockImplementation(async () => { events.push('cleanup'); });
    mockAdopt.mockReset();
    mockAdopt.mockImplementation(async () => {
      events.push('adopt');
      return { result: 'completed' };
    });
  });

  function flow(createRequestId: () => string = () => 'request-opaque-1') {
    const { createAuthRecoveryFlow } = require('../app/auth_recovery_flow') as {
      createAuthRecoveryFlow: (options: {
        now: () => number;
        createRequestId: () => string;
      }) => any;
    };
    return createAuthRecoveryFlow({ now: () => now, createRequestId });
  }

  async function sentFlow() {
    const controller = flow();
    await controller.start('google');
    await controller.requestCode();
    return controller;
  }

  it('holds the named session and orders issue → cleanup → default adoption without exposing token', async () => {
    const controller = await sentFlow();
    await expect(controller.confirmCode('123456')).resolves.toEqual({ result: 'completed' });

    expect(mockStartSecondary).toHaveBeenCalledWith('google', expect.any(Function));
    expect(mockAcquireCredential).toHaveBeenCalledTimes(1);
    expect(mockIssueToken).toHaveBeenCalledWith('event-1', 'request-opaque-1');
    expect(events).toEqual(['issue', 'cleanup', 'adopt']);
    expect(mockAdopt).toHaveBeenCalledWith({
      customToken: CUSTOM_TOKEN,
      recoveryEventId: 'event-1',
      stableId: 'stable-1',
      expectedUid: 'provider-uid',
      handoffAcknowledgeUntil: 4_500_000,
    });
    expect(JSON.stringify(controller.getState())).not.toContain(CUSTOM_TOKEN);
    expect(JSON.stringify(controller)).not.toContain(CUSTOM_TOKEN);
  });

  it.each(['adoption', 'secondary cleanup'] as const)(
    'redacts the custom token from state and thrown errors when %s rejects after issuance',
    async boundary => {
      if (boundary === 'adoption') {
        mockAdopt.mockRejectedValueOnce(new Error(CUSTOM_TOKEN));
      } else {
        mockCleanup.mockRejectedValueOnce(new Error(CUSTOM_TOKEN));
      }
      const controller = await sentFlow();

      let thrown: unknown;
      try {
        await controller.confirmCode('123456');
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(Error);
      expect(String(thrown)).not.toContain(CUSTOM_TOKEN);
      expect(JSON.stringify(thrown)).not.toContain(CUSTOM_TOKEN);
      expect((thrown as Error & { cause?: unknown }).cause).toBeUndefined();
      expect(JSON.stringify(controller.getState())).not.toContain(CUSTOM_TOKEN);
      expect(controller.getState()).toMatchObject({
        stage: 'failed',
        reason: boundary === 'adoption'
          ? 'auth_recovery_adoption_failed'
          : 'auth_recovery_secondary_cleanup_failed',
      });
    },
  );

  it('stores an absolute expiry and permits resend only after its deadline', async () => {
    mockRequestCode.mockResolvedValueOnce({
      maskedEmail: 'u***@example.com', expiresInSec: 600, provider: 'google',
    });
    const controller = await sentFlow();
    expect(controller.getState()).toMatchObject({
      stage: 'code_sent', expiresAt: 1_600_000, resendAvailableAt: 1_060_000,
    });
    await expect(controller.resendCode()).rejects.toThrow('auth_recovery_resend_not_due');
    now = 1_060_000;
    mockRequestCode.mockResolvedValueOnce({
      maskedEmail: 'u***@example.com', expiresInSec: 120, provider: 'google',
    });
    await controller.resendCode();
    expect(controller.getState()).toMatchObject({
      stage: 'code_sent', expiresAt: 1_180_000, resendAvailableAt: 1_120_000,
    });
  });

  it('rejects duplicate clicks while preserving one native/callable operation', async () => {
    let release!: () => void;
    mockRequestCode.mockImplementationOnce(() => new Promise(resolve => {
      release = () => resolve({
        maskedEmail: 'u***@example.com', expiresInSec: 60, provider: 'google',
      });
    }));
    const controller = flow();
    await controller.start('google');
    const first = controller.requestCode();
    await Promise.resolve();
    await expect(controller.requestCode()).rejects.toThrow('auth_recovery_flow_in_progress');
    expect(mockRequestCode).toHaveBeenCalledTimes(1);
    release();
    await first;
  });

  it('keeps transient request and confirm failures retryable', async () => {
    const controller = flow();
    await controller.start('google');
    mockRequestCode.mockRejectedValueOnce(new Error('functions/unavailable'));
    await expect(controller.requestCode()).rejects.toThrow('functions/unavailable');
    expect(controller.getState()).toMatchObject({ stage: 'ready' });
    await controller.requestCode();

    mockConfirmCode.mockRejectedValueOnce(new Error('functions/unavailable'));
    await expect(controller.confirmCode('123456')).rejects.toThrow('functions/unavailable');
    expect(controller.getState()).toMatchObject({ stage: 'code_sent' });
    await expect(controller.confirmCode('123456')).resolves.toEqual({ result: 'completed' });
  });

  it('normalizes prefixed wrong-code HttpsError as confirm-only retryable', async () => {
    const wrongCode = Object.assign(
      new Error('[functions/permission-denied] recovery_code_invalid'),
      { code: 'functions/permission-denied' },
    );
    mockConfirmCode.mockRejectedValueOnce(wrongCode);
    const controller = await sentFlow();
    await expect(controller.confirmCode('123456')).rejects.toBe(wrongCode);
    expect(controller.getState()).toMatchObject({ stage: 'code_sent' });
    expect(mockCleanup).not.toHaveBeenCalled();
  });

  it('requires resend after local code expiry without calling confirm', async () => {
    const controller = await sentFlow();
    now = 1_060_001;
    await expect(controller.confirmCode('123456')).rejects.toThrow('auth_recovery_code_expired');
    expect(mockConfirmCode).not.toHaveBeenCalled();
    expect(controller.getState()).toMatchObject({ stage: 'code_sent' });
  });

  it('fails closed and cleans secondary state when stable identity races', async () => {
    mockRequestCode.mockImplementationOnce(async () => {
      mockStableId = 'other-stable';
      return { maskedEmail: 'u***@example.com', expiresInSec: 60, provider: 'google' };
    });
    const controller = flow();
    await controller.start('google');
    await expect(controller.requestCode()).rejects.toThrow('auth_recovery_stable_id_changed');
    expect(mockCleanup).toHaveBeenCalledTimes(1);
    expect(controller.getState()).toMatchObject({ stage: 'failed' });
  });

  it('validates six digits before confirm and exact stable response before issue', async () => {
    const controller = await sentFlow();
    await expect(controller.confirmCode('１２３４５６')).rejects.toThrow('auth_recovery_code_invalid');
    expect(mockConfirmCode).not.toHaveBeenCalled();

    mockConfirmCode.mockResolvedValueOnce({
      stableId: 'other-stable', recoveryEventId: 'event-1', handoffEligibleUntil: 1_500_000,
    });
    await expect(controller.confirmCode('123456')).rejects.toThrow('auth_recovery_handoff_stable_mismatch');
    expect(mockIssueToken).not.toHaveBeenCalled();
    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });

  it('never adopts when secondary cleanup fails', async () => {
    mockCleanup.mockRejectedValueOnce(new Error('cleanup-failed'));
    const controller = await sentFlow();
    await expect(controller.confirmCode('123456')).rejects.toThrow('auth_recovery_secondary_cleanup_failed');
    expect(events).toEqual(['issue']);
    expect(mockAdopt).not.toHaveBeenCalled();
  });

  it('treats issue invalid-argument as terminal and never retries it', async () => {
    const hard = Object.assign(new Error('bad issue payload'), { code: 'functions/invalid-argument' });
    mockIssueToken.mockRejectedValueOnce(hard);
    const controller = await sentFlow();
    await expect(controller.confirmCode('123456')).rejects.toBe(hard);
    expect(mockCleanup).toHaveBeenCalledTimes(1);
    expect(controller.getState()).toMatchObject({ stage: 'failed' });
  });

  it('cancel and unmount cleanup are idempotent, including provider cancellation', async () => {
    const controller = await sentFlow();
    await Promise.all([controller.cancel(), controller.dispose(), controller.cancel()]);
    expect(mockCleanup).toHaveBeenCalledTimes(1);
    expect(controller.getState()).toMatchObject({ stage: 'cancelled' });

    mockStartSecondary.mockResolvedValueOnce({ result: 'cancelled' });
    const cancelled = flow();
    await expect(cancelled.start('apple')).resolves.toMatchObject({ stage: 'cancelled' });
    expect(cancelled.getState()).toMatchObject({ stage: 'cancelled' });
  });

  it('surfaces quarantine while completed and ack_pending remain terminal results', async () => {
    for (const result of [
      { result: 'ack_pending' as const },
      { result: 'quarantined' as const, reason: 'auth_uid_mismatch' },
    ]) {
      mockAdopt.mockResolvedValueOnce(result);
      const controller = await sentFlow();
      await expect(controller.confirmCode('123456')).resolves.toEqual(result);
      expect(controller.getState()).toMatchObject({
        stage: result.result === 'quarantined' ? 'quarantined' : 'ack_pending',
      });
    }
  });

  it('cannot cancel over a terminal adoption result once default mutation has begun', async () => {
    let releaseAdopt!: () => void;
    let signalAdoptStarted!: () => void;
    const adoptStarted = new Promise<void>(resolve => { signalAdoptStarted = resolve; });
    mockAdopt.mockImplementationOnce(() => new Promise(resolve => {
      events.push('adopt');
      signalAdoptStarted();
      releaseAdopt = () => resolve({ result: 'completed' });
    }));
    const controller = await sentFlow();
    const confirmation = controller.confirmCode('123456');
    await adoptStarted;
    const cancel = controller.cancel();
    releaseAdopt();
    await expect(confirmation).resolves.toEqual({ result: 'completed' });
    await cancel;
    expect(controller.getState()).toMatchObject({ stage: 'completed' });
  });

  it('honors cancellation during the final stable check before adoption', async () => {
    let stableReads = 0;
    let releaseFinalStable!: () => void;
    mockGetStableId.mockImplementation(async () => {
      stableReads += 1;
      if (stableReads === 8) {
        await new Promise<void>(resolve => { releaseFinalStable = resolve; });
      }
      return mockStableId;
    });
    const controller = await sentFlow();
    const confirmation = controller.confirmCode('123456');
    for (let i = 0; i < 20 && stableReads < 8; i += 1) await Promise.resolve();
    const cancel = controller.cancel();
    releaseFinalStable();
    await expect(confirmation).rejects.toThrow('auth_recovery_flow_cancelled');
    await cancel;
    expect(mockAdopt).not.toHaveBeenCalled();
    expect(controller.getState()).toMatchObject({ stage: 'cancelled' });
  });

  it('does not cross the final adoption boundary when cancellation is already queued', async () => {
    let stableReads = 0;
    let releaseFinalStable!: () => void;
    mockGetStableId.mockImplementation(async () => {
      stableReads += 1;
      if (stableReads === 8) {
        await new Promise<void>(resolve => { releaseFinalStable = resolve; });
      }
      return mockStableId;
    });
    mockAdopt.mockRejectedValueOnce(new Error(CUSTOM_TOKEN));
    const controller = await sentFlow();
    const confirmation = controller.confirmCode('123456');
    for (let i = 0; i < 20 && stableReads < 8; i += 1) await Promise.resolve();
    let cancel: Promise<void> | undefined;
    queueMicrotask(() => { cancel = controller.cancel(); });
    releaseFinalStable();

    await expect(confirmation).rejects.toThrow('auth_recovery_flow_cancelled');
    await cancel;
    expect(mockAdopt).not.toHaveBeenCalled();
    expect(String(controller.getState().reason ?? '')).not.toContain(CUSTOM_TOKEN);
    expect(controller.getState()).toMatchObject({ stage: 'cancelled' });
  });

  it('redacts an adoption rejection even if cancellation is requested at the adoption boundary', async () => {
    let rejectAdoption!: (error: Error) => void;
    let signalAdoptionStarted!: () => void;
    const adoptionStarted = new Promise<void>(resolve => { signalAdoptionStarted = resolve; });
    mockAdopt.mockImplementationOnce(() => new Promise((_resolve, reject) => {
      events.push('adopt');
      signalAdoptionStarted();
      rejectAdoption = reject;
    }));
    const controller = await sentFlow();
    const confirmation = controller.confirmCode('123456');
    await adoptionStarted;
    const cancel = controller.cancel();
    rejectAdoption(new Error(CUSTOM_TOKEN));

    await expect(confirmation).rejects.toThrow('auth_recovery_adoption_failed');
    await cancel;
    expect(JSON.stringify(controller.getState())).not.toContain(CUSTOM_TOKEN);
    expect(controller.getState()).toMatchObject({
      stage: 'failed',
      reason: 'auth_recovery_adoption_failed',
    });
  });

  it.each([
    ['start initial stable read', 1, 'start'],
    ['start final stable read', 2, 'start'],
    ['request initial stable read', 3, 'request'],
    ['request final stable read', 4, 'request'],
    ['confirm initial stable read', 5, 'confirm'],
    ['confirm post-code stable read', 6, 'confirm'],
    ['confirm post-issue stable read', 7, 'confirm'],
  ] as const)('stops at %s when cancelled during that await', async (_label, targetRead, phase) => {
    let stableReads = 0;
    let releaseStable!: () => void;
    let signalBlocked!: () => void;
    const blocked = new Promise<void>(resolve => { signalBlocked = resolve; });
    mockGetStableId.mockImplementation(async () => {
      stableReads += 1;
      if (stableReads === targetRead) {
        signalBlocked();
        await new Promise<void>(resolve => { releaseStable = resolve; });
      }
      return mockStableId;
    });
    const controller = flow();
    let active: Promise<unknown>;
    if (phase === 'start') {
      active = controller.start('google');
    } else {
      await controller.start('google');
      if (phase === 'request') {
        active = controller.requestCode();
      } else {
        await controller.requestCode();
        active = controller.confirmCode('123456');
      }
    }
    await blocked;

    const cancel = controller.cancel();
    releaseStable();

    await expect(active).rejects.toThrow('auth_recovery_flow_cancelled');
    await cancel;
    expect(mockAdopt).not.toHaveBeenCalled();
    expect(controller.getState()).toMatchObject({ stage: 'cancelled' });
    expect(mockCleanup.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it('cancels idempotently while secondary cleanup is still pending', async () => {
    let releaseCleanup!: () => void;
    let signalCleanupStarted!: () => void;
    const cleanupStarted = new Promise<void>(resolve => { signalCleanupStarted = resolve; });
    mockCleanup.mockImplementationOnce(async () => {
      events.push('cleanup');
      signalCleanupStarted();
      await new Promise<void>(resolve => { releaseCleanup = resolve; });
    });
    const controller = await sentFlow();
    const confirmation = controller.confirmCode('123456');
    await cleanupStarted;

    const cancelA = controller.cancel();
    const cancelB = controller.dispose();
    releaseCleanup();

    await expect(confirmation).rejects.toThrow('auth_recovery_flow_cancelled');
    await Promise.all([cancelA, cancelB]);
    expect(mockCleanup).toHaveBeenCalledTimes(1);
    expect(mockAdopt).not.toHaveBeenCalled();
    expect(controller.getState()).toMatchObject({ stage: 'cancelled' });
  });

  it.each(['start', 'request', 'confirm', 'issue'] as const)(
    'cancels and cleans idempotently while awaiting %s',
    async phase => {
      let signalStarted!: () => void;
      const started = new Promise<void>(resolve => { signalStarted = resolve; });
      let release!: () => void;
      if (phase === 'start') {
        mockStartSecondary.mockImplementationOnce(async (selectedProvider, acquire) => {
          await acquire(selectedProvider);
          signalStarted();
          await new Promise<void>(resolve => { release = resolve; });
          return { result: 'ready', session: { ...session, provider: selectedProvider } };
        });
      } else if (phase === 'request') {
        mockRequestCode.mockImplementationOnce(async () => {
          signalStarted();
          await new Promise<void>(resolve => { release = resolve; });
          return { maskedEmail: 'u***@example.com', expiresInSec: 60, provider: 'google' };
        });
      } else if (phase === 'confirm') {
        mockConfirmCode.mockImplementationOnce(async () => {
          signalStarted();
          await new Promise<void>(resolve => { release = resolve; });
          return { stableId: 'stable-1', recoveryEventId: 'event-1', handoffEligibleUntil: 1_500_000 };
        });
      } else {
        mockIssueToken.mockImplementationOnce(async () => {
          signalStarted();
          await new Promise<void>(resolve => { release = resolve; });
          return { customToken: CUSTOM_TOKEN, stableId: 'stable-1', handoffAcknowledgeUntil: 4_500_000 };
        });
      }

      const controller = flow();
      let active: Promise<unknown>;
      if (phase === 'start') {
        active = controller.start('google');
      } else {
        await controller.start('google');
        if (phase !== 'request') await controller.requestCode();
        active = phase === 'request'
          ? controller.requestCode()
          : controller.confirmCode('123456');
      }
      await started;
      const cancelA = controller.cancel();
      const cancelB = controller.dispose();
      release();
      await expect(active).rejects.toThrow('auth_recovery_flow_cancelled');
      await Promise.all([cancelA, cancelB]);
      expect(mockCleanup).toHaveBeenCalledTimes(1);
      expect(mockAdopt).not.toHaveBeenCalled();
      expect(controller.getState()).toMatchObject({ stage: 'cancelled' });
    },
  );

  it('rejects blank local stable id before native provider acquisition', async () => {
    mockStableId = null;
    const controller = flow();
    await expect(controller.start('google')).rejects.toThrow('auth_recovery_local_stable_required');
    expect(mockStartSecondary).not.toHaveBeenCalled();
    expect(mockAcquireCredential).not.toHaveBeenCalled();
  });

  it.each(['start', 'confirm', 'issue', 'cleanup'] as const)(
    'fails closed on stable-id race at %s boundary',
    async boundary => {
      if (boundary === 'start') {
        mockStartSecondary.mockImplementationOnce(async (provider, acquire) => {
          await acquire(provider);
          mockStableId = 'other-stable';
          return { result: 'ready', session: { ...session, provider } };
        });
      } else if (boundary === 'confirm') {
        mockConfirmCode.mockImplementationOnce(async () => {
          mockStableId = 'other-stable';
          return { stableId: 'stable-1', recoveryEventId: 'event-1', handoffEligibleUntil: 1_500_000 };
        });
      } else if (boundary === 'issue') {
        mockIssueToken.mockImplementationOnce(async () => {
          events.push('issue');
          mockStableId = 'other-stable';
          return { customToken: CUSTOM_TOKEN, stableId: 'stable-1', handoffAcknowledgeUntil: 4_500_000 };
        });
      } else {
        mockCleanup.mockImplementationOnce(async () => {
          events.push('cleanup');
          mockStableId = 'other-stable';
        });
      }
      const controller = flow();
      if (boundary === 'start') {
        await expect(controller.start('google')).rejects.toThrow('auth_recovery_stable_id_changed');
      } else {
        await controller.start('google');
        await controller.requestCode();
        await expect(controller.confirmCode('123456')).rejects.toThrow('auth_recovery_stable_id_changed');
      }
      expect(mockCleanup).toHaveBeenCalledTimes(1);
      expect(mockAdopt).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['provider mismatch', { ...session, provider: 'apple' }],
    ['blank auth uid', { ...session, authUid: '' }],
  ])('rejects malformed secondary session binding: %s', async (_label, badSession) => {
    mockStartSecondary.mockResolvedValueOnce({ result: 'ready', session: badSession });
    const controller = flow();
    await expect(controller.start('google')).rejects.toThrow('auth_recovery_secondary_session_invalid');
    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['stable', { customToken: CUSTOM_TOKEN, stableId: 'other-stable', handoffAcknowledgeUntil: 4_500_000 }],
    ['expired deadline', { customToken: CUSTOM_TOKEN, stableId: 'stable-1', handoffAcknowledgeUntil: 999_999 }],
    ['overlong deadline', { customToken: CUSTOM_TOKEN, stableId: 'stable-1', handoffAcknowledgeUntil: 1_000_000 + 65 * 60 * 1000 + 1 }],
  ])('rejects issue response %s before adoption', async (_label, response) => {
    mockIssueToken.mockResolvedValueOnce(response);
    const controller = await sentFlow();
    await expect(controller.confirmCode('123456')).rejects.toThrow(/auth_recovery_handoff_/);
    expect(mockCleanup).toHaveBeenCalledTimes(1);
    expect(mockAdopt).not.toHaveBeenCalled();
  });

  it('reuses the same opaque requestId after a lost issue response', async () => {
    const createRequestId = jest.fn()
      .mockReturnValueOnce('request-same-1')
      .mockReturnValueOnce('request-wrong-2');
    mockIssueToken
      .mockRejectedValueOnce(Object.assign(new Error('unavailable'), { code: 'functions/unavailable' }))
      .mockResolvedValueOnce({
        customToken: CUSTOM_TOKEN, stableId: 'stable-1', handoffAcknowledgeUntil: 4_500_000,
      });
    const controller = flow(createRequestId);
    await controller.start('google');
    await controller.requestCode();
    await expect(controller.confirmCode('123456')).rejects.toMatchObject({ code: 'functions/unavailable' });
    await expect(controller.confirmCode(' 123456 ')).resolves.toEqual({ result: 'completed' });
    expect(mockIssueToken).toHaveBeenNthCalledWith(1, 'event-1', 'request-same-1');
    expect(mockIssueToken).toHaveBeenNthCalledWith(2, 'event-1', 'request-same-1');
    expect(createRequestId).toHaveBeenCalledTimes(1);
  });

  it('retries only exact issue busy but fails closed on expired handoff', async () => {
    const busy = Object.assign(
      new Error('[functions/aborted] recovery_handoff_busy'),
      { code: 'functions/aborted' },
    );
    mockIssueToken.mockRejectedValueOnce(busy);
    const controller = await sentFlow();
    await expect(controller.confirmCode('123456')).rejects.toBe(busy);
    expect(controller.getState()).toMatchObject({ stage: 'code_sent' });
    expect(mockCleanup).not.toHaveBeenCalled();

    const expired = Object.assign(
      new Error('[functions/deadline-exceeded] recovery_handoff_expired'),
      { code: 'functions/deadline-exceeded' },
    );
    mockIssueToken.mockRejectedValueOnce(expired);
    await expect(controller.confirmCode('123456')).rejects.toBe(expired);
    expect(mockCleanup).toHaveBeenCalledTimes(1);
    expect(controller.getState()).toMatchObject({ stage: 'failed' });
  });

  it.each([0, 86_401])('fails closed for out-of-range code expiry %s', async expiresInSec => {
    mockRequestCode.mockResolvedValueOnce({
      maskedEmail: 'u***@example.com', expiresInSec, provider: 'google',
    });
    const controller = flow();
    await controller.start('google');
    await expect(controller.requestCode()).rejects.toThrow('auth_recovery_code_expiry_invalid');
    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });

  it('supports Apple acquisition and trims the exact six-digit confirm code', async () => {
    mockRequestCode.mockResolvedValueOnce({
      maskedEmail: 'u***@example.com', expiresInSec: 60, provider: 'apple',
    });
    mockStartSecondary.mockImplementationOnce(async (provider, acquire) => {
      await acquire(provider);
      return { result: 'ready', session: { ...session, provider } };
    });
    const controller = flow();
    await controller.start('apple');
    await controller.requestCode();
    await controller.confirmCode(' 123456 ');
    expect(mockAcquireCredential).toHaveBeenCalledWith('apple');
    expect(mockConfirmCode).toHaveBeenCalledWith('stable-1', '123456');
  });

  it('enforces global ownership and illegal transition guards', async () => {
    const first = flow();
    const second = flow();
    await expect(first.requestCode()).rejects.toThrow('auth_recovery_flow_invalid_state');
    await expect(first.confirmCode('123456')).rejects.toThrow('auth_recovery_flow_invalid_state');
    await first.start('google');
    await expect(second.start('apple')).rejects.toThrow('auth_recovery_flow_global_in_progress');
    await first.cancel();
    await expect(second.start('apple')).resolves.toMatchObject({ stage: 'ready' });
    await second.cancel();
  });

  it('contains no default Auth, normal sign-in, legacy recovery wrappers, persistence, or logging', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    const path = require('node:path') as typeof import('node:path');
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'auth_recovery_flow.ts'), 'utf8');
    for (const forbidden of [
      'signInWithProvider',
      'requestAuthRecoveryCode',
      'confirmAuthRecoveryCode',
      "@react-native-firebase/auth",
      'AsyncStorage',
      'SecureStore',
      'console.',
    ]) expect(source).not.toContain(forbidden);
  });
});
