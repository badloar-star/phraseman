const {
  buildDryRunProposal,
  exchangePairing,
  pollAndExecuteOnce,
  redactForSubmission,
  selectApprovedCodePrepareJob,
  runCodexRunner,
} = require('../scripts/agent_manager_codex_runner_core.cjs');
const { parseArgs, safeEnv } = require('../scripts/agent_manager_codex_runner.cjs');

const approved = Object.freeze({
  taskId: 'task-001',
  taskRevision: 3,
  taskStatus: 'queued',
  jobState: 'queued',
  allowedScope: 'code_prepare',
  title: 'Repair a narrow local contract',
  brief: 'Prepare a small, reviewable code change without external effects.',
});

describe('local Agent Manager Codex runner', () => {
  test('selects only an explicitly approved queued code_prepare job', () => {
    expect(selectApprovedCodePrepareJob([approved])).toEqual(approved);
    expect(selectApprovedCodePrepareJob([{ ...approved, allowedScope: 'analysis_only' }])).toBeNull();
    expect(selectApprovedCodePrepareJob([{ ...approved, taskStatus: 'awaiting_approval' }])).toBeNull();
    expect(selectApprovedCodePrepareJob([{ ...approved, jobState: 'leased' }])).toBeNull();
  });

  test('rejects shell-injection-shaped task identifiers before preparing a worktree', () => {
    expect(() => buildDryRunProposal({ ...approved, taskId: 'task-001;git push' }, 'C:/repo')).toThrow('taskId is invalid');
  });

  test('reports an unavailable Codex CLI without creating a worktree or invoking a shell', () => {
    const calls: unknown[][] = [];
    const result = runCodexRunner({
      jobs: [approved], workspaceRoot: 'C:/repo', dryRun: false,
      commandExists: () => false,
      run: (...args: unknown[]) => calls.push(args),
    });
    expect(result).toMatchObject({ status: 'blocked', reason: 'codex_cli_unavailable' });
    expect(calls).toEqual([]);
  });

  test('dry run produces an approval-needed proposal and performs no external effect', () => {
    const calls: unknown[][] = [];
    const result = runCodexRunner({
      jobs: [approved], workspaceRoot: 'C:/repo', dryRun: true,
      commandExists: () => true,
      run: (...args: unknown[]) => calls.push(args),
    });
    expect(result).toMatchObject({ status: 'approval_needed', dryRun: true, proposal: {
      taskId: 'task-001', taskRevision: 3, outcome: 'needs_review',
    } });
    expect(result.proposal.worktreePath).toMatch(/agent-manager-worktrees/);
    expect(result.proposal.branchName).toBe('codex/agent-manager-task-001-r3');
    expect(calls).toEqual([]);
    expect(JSON.stringify(result)).not.toMatch(/OPENAI_API_KEY|authorization|access[_-]?token|private[_-]?key/i);
  });

  test('exchanges a one-time pairing code for a local runner capability without exposing the code', async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const config = await exchangePairing({
      exchangeUrl: 'https://example.test/exchange',
      pairingId: 'pair-123',
      pairingCode: '482913',
      claimUrl: 'https://example.test/claim',
      submitUrl: 'https://example.test/submit',
      fetch: async (url: string, init: RequestInit) => {
        requests.push({ url, init });
        return new Response(JSON.stringify({ ok: true, capability: { capabilityId: 'cap-123', token: 'capability-token-value' } }), { status: 200 });
      },
    });
    expect(config).toMatchObject({ capabilityId: 'cap-123', claimUrl: 'https://example.test/claim', submitUrl: 'https://example.test/submit', pollIntervalMs: 30_000 });
    expect(JSON.stringify(config)).not.toContain('482913');
    expect(requests).toHaveLength(1);
    expect(requests[0].init.method).toBe('POST');
  });

  test('polls one claimed job, runs it locally, and submits only a redacted needs-review result', async () => {
    const submissions: unknown[] = [];
    const calls: unknown[][] = [];
    const response = await pollAndExecuteOnce({
      config: { capabilityId: 'cap-123', token: 'capability-123', claimUrl: 'https://example.test/claim', submitUrl: 'https://example.test/submit', pollIntervalMs: 30_000 },
      workspaceRoot: 'C:/repo',
      fetch: async (url: string, init: RequestInit) => {
        if (url.endsWith('/claim')) return new Response(JSON.stringify({ ok: true, claim: { jobId: 'task-001__r3', taskId: approved.taskId, taskRevision: approved.taskRevision, title: approved.title, brief: approved.brief, leaseToken: 'lease-123', leaseUntilMs: 2_000_000_000_000 } }), { status: 200 });
        submissions.push(JSON.parse(String(init.body)));
        return new Response('{}', { status: 200 });
      },
      commandExists: () => true,
      run: (...args: unknown[]) => { calls.push(args); return { status: 0, stdout: 'changed .env SECRET=should-not-leak', stderr: '' }; },
    });
    expect(response).toMatchObject({ status: 'approval_needed', submitted: true });
    expect(calls.map(([command]) => command)).toEqual(['git', 'codex']);
    expect(submissions).toHaveLength(1);
    expect(JSON.stringify(submissions[0])).not.toContain('should-not-leak');
    expect(JSON.stringify(submissions[0])).toContain('needs_review');
  });

  test('redacts secrets and never submits an unapproved or non-code job', async () => {
    expect(redactForSubmission('token=abc\nOPENAI_API_KEY=top-secret\nnormal line')).toContain('[REDACTED]');
    const fetch = jest.fn();
    const result = await pollAndExecuteOnce({
      config: { capabilityId: 'cap-123', token: 'capability-123', claimUrl: 'https://example.test/claim', submitUrl: 'https://example.test/submit', pollIntervalMs: 30_000 },
      workspaceRoot: 'C:/repo',
      fetch: async () => new Response(JSON.stringify({ claim: { jobId: 'task-001__r3', taskId: 'task-001; push', taskRevision: approved.taskRevision, title: approved.title, brief: approved.brief, leaseToken: 'lease-123', leaseUntilMs: 2_000_000_000_000 } }), { status: 200 }),
      commandExists: () => true,
      run: () => ({ status: 0 }),
    });
    expect(result).toMatchObject({ status: 'blocked', reason: 'claimed_job_invalid' });
    expect(fetch).not.toHaveBeenCalled();
  });

  test('CLI accepts only pair/run commands and does not pass project API keys into child processes', () => {
    const prior = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'must-not-reach-codex';
    try {
      expect(parseArgs(['run', '--once', '--workspace', 'C:/repo'])).toMatchObject({ command: 'run', options: { once: true, workspace: 'C:/repo' } });
      expect(() => parseArgs(['run', '--workspace'])).toThrow('requires a value');
      expect(() => parseArgs(['deploy'])).toThrow('use pair or run');
      expect(safeEnv()).not.toHaveProperty('OPENAI_API_KEY');
    } finally {
      if (prior === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = prior;
    }
  });
});
