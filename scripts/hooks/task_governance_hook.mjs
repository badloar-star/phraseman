#!/usr/bin/env node
/**
 * Session-scoped task governance for Claude Code.
 *
 * `prompt` arms a unique gate when a user asks for a substantive change.
 * `pre-tool` blocks Write/Edit outside docs/work/tasks until that same session
 * has a complete task packet. Transient state is ignored by git and contains
 * only a digest plus a generated governance ID, never the user's full prompt.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const ROOT = path.resolve(
  process.env.PHRASEMAN_TASK_GOVERNANCE_ROOT || DEFAULT_ROOT,
);
const STATE_DIR = path.join(ROOT, '.codex-tmp', 'task-governance');
const TASKS_DIR = path.join(ROOT, 'docs', 'work', 'tasks');
const REQUIRED_SECTIONS = [
  'Outcome',
  'Scope',
  'Architecture',
  'Security and privacy',
  'Technical debt',
  'Verification',
  'Rollback',
];

function readPayload() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function safeSessionId(value) {
  const raw = String(value || 'unknown-session');
  const safe = raw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return safe || 'unknown-session';
}

function statePath(sessionId) {
  return path.join(STATE_DIR, `${safeSessionId(sessionId)}.json`);
}

function isSubstantiveChange(prompt) {
  const text = String(prompt || '').toLocaleLowerCase('ru-RU');
  if (!text.trim()) return false;
  return /\b(add|build|create|implement|fix|change|update|refactor|remove|delete|write|edit|migrate|deploy|release|plan|roadmap)\b/u.test(text)
    || /(?:добав|созда|сдела|напиш|исправ|почин|измен|обнов|рефактор|удал|внедр|разработ|настрой|перепиш|задепло|выпуст|составь\s+план|спланир)/u.test(text);
}

function writeState(sessionId, prompt) {
  const digest = crypto
    .createHash('sha256')
    .update(`${sessionId}\0${prompt}`)
    .digest('hex');
  const governanceId = `TG-${digest.slice(0, 12).toUpperCase()}`;
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(statePath(sessionId), `${JSON.stringify({
    version: 1,
    sessionId: safeSessionId(sessionId),
    governanceId,
    promptDigest: digest,
    intent: 'substantive-change',
    armedAt: new Date().toISOString(),
  }, null, 2)}\n`, 'utf8');
  return governanceId;
}

function readState(sessionId) {
  try {
    return JSON.parse(fs.readFileSync(statePath(sessionId), 'utf8'));
  } catch {
    return null;
  }
}

function markdownFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const result = [];
  const stack = [directory];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (entry.isFile() && entry.name.endsWith('.md')) result.push(absolute);
    }
  }
  return result;
}

function sectionBody(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(new RegExp(
    `^##\\s+${escaped}\\s*$([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`,
    'im',
  ));
  return match?.[1]?.trim() || '';
}

function inspectPacket(governanceId) {
  for (const file of markdownFiles(TASKS_DIR)) {
    let markdown = '';
    try {
      markdown = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (!markdown.includes(`Governance-ID: ${governanceId}`)) continue;
    const missing = REQUIRED_SECTIONS.filter(
      (heading) => sectionBody(markdown, heading).length < 10,
    );
    return { file, missing };
  }
  return { file: null, missing: REQUIRED_SECTIONS };
}

function isInside(candidate, directory) {
  const relative = path.relative(directory, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function promptMode(payload) {
  const prompt = payload?.prompt || '';
  const sessionId = safeSessionId(payload?.session_id);
  if (!isSubstantiveChange(prompt)) process.exit(0);

  const governanceId = writeState(sessionId, prompt);
  const message = [
    `TASK GOVERNANCE ARMED: ${governanceId}.`,
    'Before any Write/Edit outside docs/work/tasks, create a task packet from',
    'docs/work/tasks/TASK_PACKET_TEMPLATE.md and include this exact line:',
    `Governance-ID: ${governanceId}`,
    'Complete Outcome, Scope, Architecture, Security and privacy, Technical debt,',
    'Verification, and Rollback. Keep the packet specific to this user request.',
  ].join('\n');
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: message,
    },
  }));
}

function preToolMode(payload) {
  const sessionId = safeSessionId(payload?.session_id);
  const state = readState(sessionId);
  if (!state?.governanceId) process.exit(0);

  const rawFile = payload?.tool_input?.file_path || payload?.tool_input?.path || '';
  if (!rawFile) process.exit(0);
  const absolute = path.resolve(ROOT, String(rawFile));
  if (isInside(absolute, TASKS_DIR)) process.exit(0);

  const packet = inspectPacket(state.governanceId);
  if (packet.file && packet.missing.length === 0) process.exit(0);

  const details = packet.file
    ? `Incomplete packet: ${path.relative(ROOT, packet.file)}\nMissing or empty: ${packet.missing.join(', ')}`
    : 'No task packet with this Governance-ID was found.';
  process.stderr.write([
    'BLOCKED: architecture and scope must be explicit before implementation.',
    `Governance-ID: ${state.governanceId}`,
    details,
    'Create a Markdown file under docs/work/tasks/ from TASK_PACKET_TEMPLATE.md.',
    'The task packet itself is allowed through this gate.',
  ].join('\n'));
  process.exit(2);
}

const mode = process.argv[2];
const payload = readPayload();
if (mode === 'prompt') promptMode(payload);
else if (mode === 'pre-tool') preToolMode(payload);
else {
  process.stderr.write('Usage: task_governance_hook.mjs <prompt|pre-tool>\n');
  process.exit(64);
}
