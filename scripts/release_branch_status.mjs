#!/usr/bin/env node
/** Read-only release ancestry status for humans and the managed post-commit hook. */

import { spawnSync } from 'node:child_process';

const DEFAULT_RELEASE_BRANCH = 'codex/all-development-integration';

function git(args) {
  return spawnSync('git', args, { cwd: process.cwd(), encoding: 'utf8' });
}

function output(args) {
  const result = git(args);
  return result.status === 0 ? result.stdout.trim() : '';
}

function hasCommit(ref) {
  return git(['cat-file', '-e', `${ref}^{commit}`]).status === 0;
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function main() {
  const releaseBranch = process.env.PHRASEMAN_RELEASE_BRANCH || DEFAULT_RELEASE_BRANCH;
  const commit = argumentValue('--commit') || 'HEAD';

  if (!hasCommit(commit)) {
    console.log(`RELEASE: unknown — commit "${commit}" is unavailable`);
    return;
  }
  if (!hasCommit(releaseBranch)) {
    console.log(`RELEASE: unknown — branch "${releaseBranch}" is unavailable`);
    return;
  }

  const sha = output(['rev-parse', '--short=9', commit]) || commit;
  const integrated = git(['merge-base', '--is-ancestor', commit, releaseBranch]).status === 0;
  if (integrated) {
    console.log(`RELEASE: integrated — ${sha} is in ${releaseBranch}`);
  } else {
    console.log(`RELEASE: pending — ${sha} → ${releaseBranch}`);
  }
}

main();
