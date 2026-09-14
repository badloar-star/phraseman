import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const HOOK = resolve('scripts/hooks/task_governance_hook.mjs');

function run(root, payload, mode) {
  return spawnSync(process.execPath, [HOOK, mode], {
    cwd: root,
    env: { ...process.env, PHRASEMAN_TASK_GOVERNANCE_ROOT: root },
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'phraseman-task-governance-'));
  mkdirSync(join(root, 'docs', 'work', 'tasks'), { recursive: true });
  return root;
}

function arm(root, sessionId = 'session-a') {
  const result = run(root, {
    session_id: sessionId,
    prompt: 'Добавь новую функцию и измени экран приложения',
  }, 'prompt');
  assert.equal(result.status, 0, result.stderr);
  const state = JSON.parse(readFileSync(
    join(root, '.codex-tmp', 'task-governance', `${sessionId}.json`),
    'utf8',
  ));
  return state.governanceId;
}

function validPacket(id) {
  return `# Task packet\n\nGovernance-ID: ${id}\n\n## Outcome\nDeliver a bounded result.\n\n## Scope\nIn: one module. Out: unrelated modules.\n\n## Architecture\nPreserve boundaries and contracts.\n\n## Security and privacy\nNo new sensitive data.\n\n## Technical debt\nContain known debt with an owner and exit condition.\n\n## Verification\nRun the focused contract test.\n\n## Rollback\nRevert the isolated module change.\n`;
}

test('read-only prompts do not arm the write gate', () => {
  const root = fixture();
  try {
    const prompt = run(root, { session_id: 'read-only', prompt: 'Объясни, что такое SOC 2' }, 'prompt');
    assert.equal(prompt.status, 0);
    const edit = run(root, {
      session_id: 'read-only',
      tool_input: { file_path: join(root, 'app', 'index.tsx') },
    }, 'pre-tool');
    assert.equal(edit.status, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('substantive change blocks source edits until its own valid packet exists', () => {
  const root = fixture();
  try {
    const id = arm(root);
    const blocked = run(root, {
      session_id: 'session-a',
      tool_input: { file_path: join(root, 'app', 'index.tsx') },
    }, 'pre-tool');
    assert.equal(blocked.status, 2);
    assert.match(blocked.stderr, new RegExp(id));

    const packetPath = join(root, 'docs', 'work', 'tasks', 'feature.md');
    const packetEdit = run(root, {
      session_id: 'session-a',
      tool_input: { file_path: packetPath },
    }, 'pre-tool');
    assert.equal(packetEdit.status, 0);

    writeFileSync(packetPath, validPacket(id));
    const allowed = run(root, {
      session_id: 'session-a',
      tool_input: { file_path: join(root, 'app', 'index.tsx') },
    }, 'pre-tool');
    assert.equal(allowed.status, 0, allowed.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a packet from another session cannot satisfy the gate', () => {
  const root = fixture();
  try {
    const firstId = arm(root, 'session-a');
    arm(root, 'session-b');
    writeFileSync(
      join(root, 'docs', 'work', 'tasks', 'first.md'),
      validPacket(firstId),
    );
    const result = run(root, {
      session_id: 'session-b',
      tool_input: { file_path: join(root, 'components', 'Button.tsx') },
    }, 'pre-tool');
    assert.equal(result.status, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('an incomplete packet does not open the gate', () => {
  const root = fixture();
  try {
    const id = arm(root);
    writeFileSync(
      join(root, 'docs', 'work', 'tasks', 'incomplete.md'),
      `# Task packet\n\nGovernance-ID: ${id}\n\n## Outcome\nSomething.\n`,
    );
    const result = run(root, {
      session_id: 'session-a',
      tool_input: { file_path: join(root, 'functions', 'src', 'index.ts') },
    }, 'pre-tool');
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Technical debt/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
