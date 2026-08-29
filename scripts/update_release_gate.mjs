#!/usr/bin/env node
/**
 * Update/release gate distilled from the project's release process.
 *
 * Fast mode is used by pre-push. Full mode is used before an EAS update.
 * The gate is intentionally honest: device smoke, regression, upgrade,
 * performance, beta, rollout, and monitoring remain human/release-owner steps.
 */

import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const mode = args.has('--full') || args.has('--update') ? 'full' : 'fast';
const dryRun = args.has('--dry-run');
const isPrePush = args.has('--hook=pre-push');

function run(label, command, commandArgs) {
  console.log(`\n[release-gate] ${label}`);
  if (dryRun) {
    console.log(`[release-gate] dry-run: ${command} ${commandArgs.join(' ')}`);
    return true;
  }
  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.error(`[release-gate] FAILED: ${label}`);
    return false;
  }
  return true;
}

function gitOutput(commandArgs) {
  const result = spawnSync('git', commandArgs, { cwd: ROOT, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

function readCard() {
  const configured = process.env.PHRASEMAN_RELEASE_CARD;
  const candidates = configured
    ? [configured]
    : ['.release-card.md', 'docs/release/RELEASE_CARD.md'];
  for (const candidate of candidates) {
    const path = resolve(ROOT, candidate);
    if (existsSync(path)) return { path: candidate, text: readFileSync(path, 'utf8') };
  }
  return null;
}

function validateReleaseCard(card) {
  if (!card) {
    console.error('[release-gate] Missing release card. Create .release-card.md from docs/release/RELEASE_CARD.template.md.');
    return false;
  }
  const required = [
    '## Type',
    '## Goal',
    '## Allowed changes',
    '## Forbidden changes',
    '## Risk level',
    '## Manual tests',
  ];
  const missing = required.filter((heading) => !card.text.includes(heading));
  if (missing.length > 0) {
    console.error(`[release-gate] Release card ${card.path} is missing: ${missing.join(', ')}`);
    return false;
  }
  const sections = new Map();
  for (const heading of required) {
    const body = card.text.split(heading)[1]?.split(/^## /m)[0]?.trim() ?? '';
    sections.set(heading, body);
  }
  const empty = required.filter((heading) => {
    const body = sections.get(heading);
    return !body || /^(-\s*)+$/.test(body) || /\b(?:TODO|TBD)\b/i.test(body);
  });
  if (empty.length > 0) {
    console.error(`[release-gate] Release card has empty/placeholder sections: ${empty.join(', ')}`);
    return false;
  }
  const typeLines = sections.get('## Type').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const types = typeLines.filter((line) => /^(feature|fix|polish)$/i.test(line));
  if (typeLines.length !== 1 || types.length !== 1) {
    console.error('[release-gate] Release card Type must contain exactly one value: feature, fix, or polish.');
    return false;
  }
  return true;
}

function pushedRefs() {
  if (!isPrePush) return [];
  try {
    return readFileSync(0, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const [localRef, localSha, remoteRef, remoteSha] = line.split(/\s+/);
      return { localRef, localSha, remoteRef, remoteSha };
    });
  } catch {
    return [];
  }
}

function validateBranch() {
  const branch = gitOutput(['branch', '--show-current']);
  if (!branch) {
    console.error('[release-gate] Detached HEAD is not a valid update/release branch.');
    return false;
  }
  const refs = pushedRefs();
  const pushedBranches = refs
    .filter(({ remoteRef }) => remoteRef?.startsWith('refs/heads/'))
    .map(({ remoteRef }) => remoteRef.slice('refs/heads/'.length));
  const protectedTarget = pushedBranches.find((name) => /^(main|master)$/.test(name));
  if ((/^(main|master)$/.test(branch) || protectedTarget) && process.env.PHRASEMAN_ALLOW_PROTECTED_BRANCH !== '1') {
    const target = protectedTarget ? `protected remote branch "${protectedTarget}"` : `protected branch "${branch}"`;
    console.error(`[release-gate] Refusing update from ${target}. Use a release/* or fix/* branch.`);
    return false;
  }
  console.log(`[release-gate] branch: ${branch}${pushedBranches.length ? `; pushed refs: ${pushedBranches.join(', ')}` : ''}`);
  return true;
}

function validateCleanTree() {
  // зачем (инцидент 2026-08-29): в релизных версиях 1.6.9–1.6.13 падали экраны
  // с «Property 'peekVoiceMinutes' doesn't exist» и «'CLUB_NAME_EN'» — OTA-бандл
  // был собран из ГРЯЗНОГО дерева, где часть модулей уже переписана, а их
  // потребители ещё старые. Оба символа в зафиксированном дереве живы; класс
  // бага — публикация из непроверяемого состояния. OTA теперь возможен только
  // из чистого дерева: каждая строка бандла соответствует коммиту.
  const res = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  const dirty = String(res.stdout || '').trim();
  if (res.status !== 0) {
    console.error('[release-gate] git status failed:', String(res.stderr || '').slice(0, 200));
    return false;
  }
  if (dirty) {
    console.error('\n[release-gate] ДЕРЕВО ГРЯЗНОЕ — OTA запрещён.');
    console.error('[release-gate] Незакоммиченные файлы (первые 15):');
    dirty.split('\n').slice(0, 15).forEach((l) => console.error('   ' + l));
    console.error('[release-gate] Закоммить (или убери) изменения и повтори. Обход не предусмотрен.');
    return false;
  }
  console.log('[release-gate] Дерево чистое — бандл будет соответствовать коммиту.');
  return true;
}

function main() {
  console.log(`[release-gate] mode: ${mode}${dryRun ? ' (dry-run)' : ''}`);
  if (!validateBranch()) process.exit(1);
  if (mode === 'full' && !dryRun && !validateCleanTree()) process.exit(1);

  if (mode === 'full' && !validateReleaseCard(readCard())) process.exit(1);

  const checks = mode === 'fast'
    ? [
        ['TypeScript', 'npx', ['tsc', '--noEmit', '--pretty', 'false']],
        ['Lint', 'npm', ['run', 'lint']],
      ]
    : [
        ['TypeScript', 'npx', ['tsc', '--noEmit', '--pretty', 'false']],
        ['Lint', 'npm', ['run', 'lint']],
        ['Unit and integration tests', 'npm', ['run', 'test:all', '--', '--runInBand']],
        ['Release key/config gate', 'npm', ['run', 'release:keys']],
      ];

  for (const [label, command, commandArgs] of checks) {
    if (!run(label, command, commandArgs)) process.exit(1);
  }

  console.log('\n[release-gate] Automated checks passed.');
  if (mode === 'full') {
    console.log('[release-gate] Still required before public release: smoke, regression, upgrade, subscription, performance, platform, beta, staged rollout, and 24h monitoring evidence.');
  }
}

main();
