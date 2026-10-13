import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pipelineDir = path.dirname(fileURLToPath(import.meta.url));
const courseRoot = path.resolve(pipelineDir, '..');
const script = path.join(pipelineDir, 'build_mockup.mjs');
const release = path.join(courseRoot, 'release');
const mockupRoot = path.join(courseRoot, 'mockup');
const canonicalMockup = path.join(courseRoot, 'mockup', 'index.html');
const nativeRoot = path.resolve(courseRoot, '..', '..', 'modules', 'learning-v2', 'content', 'factory_native');

function treeHash(root) {
  const hash = crypto.createHash('sha256');
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      hash.update(`${entry.isDirectory() ? 'd' : entry.isSymbolicLink() ? 'l' : 'f'}:${relative}\0`);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isSymbolicLink()) hash.update(fs.readlinkSync(absolute));
      else hash.update(fs.readFileSync(absolute));
    }
  };
  visit(root);
  return hash.digest('hex');
}

function protectedHashes() {
  return {
    mockup: treeHash(mockupRoot),
    release: treeHash(release),
    native: treeHash(nativeRoot),
  };
}

function isolatedOutput(t) {
  const parent = fs.realpathSync(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(parent, 'build-mockup-cli-'));
  t.after(() => {
    assert.equal(path.dirname(directory), parent);
    assert.ok(path.basename(directory).startsWith('build-mockup-cli-'));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const outputDirectory = path.join(directory, 'output');
  fs.mkdirSync(outputDirectory);
  const output = path.join(outputDirectory, 'index.html');
  fs.writeFileSync(output, 'sentinel mockup bytes');
  return { directory, outputDirectory, output, sentinelHash: treeHash(outputDirectory) };
}

function isolatedRelease(t, directory) {
  const candidateRelease = path.join(directory, 'candidate-release');
  const source = path.join(release, 'en', 'l01', 's01');
  const destination = path.join(candidateRelease, 'en', 'l01', 's01');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
  return candidateRelease;
}

function run(args) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: courseRoot,
    encoding: 'utf8',
  });
}

function assertNoMockupWrites({ outputDirectory, sentinelHash }, protectedBefore) {
  assert.equal(treeHash(outputDirectory), sentinelHash, 'isolated output tree changed');
  assert.deepEqual(protectedHashes(), protectedBefore, 'a protected mockup/release/native tree changed');
  assert.deepEqual(fs.readdirSync(outputDirectory), ['index.html'], 'companion mockup files were created');
}

test('--help exits successfully without altering the canonical mockup', () => {
  const canonicalBefore = fs.readFileSync(canonicalMockup);

  const result = run(['--help']);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Usage:.*build_mockup\.mjs/u);
  assert.deepEqual(fs.readFileSync(canonicalMockup), canonicalBefore, 'canonical mockup bytes changed');
});

test('an unknown argument exits nonzero before any mockup write', (t) => {
  const fixture = isolatedOutput(t);
  const protectedBefore = protectedHashes();

  const result = run(['--definitely-unknown', '--release', release, '--out', fixture.output]);

  assert.notEqual(result.status, 0, 'unknown argument unexpectedly succeeded');
  assert.match(result.stderr, /unknown argument.*--definitely-unknown/iu);
  assertNoMockupWrites(fixture, protectedBefore);
});

test('candidate preview remains a valid isolated output path', (t) => {
  const fixture = isolatedOutput(t);
  const candidateRelease = isolatedRelease(t, fixture.directory);
  const protectedBefore = protectedHashes();

  const result = run(['--candidate-preview', '--release', candidateRelease, '--out', fixture.output]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.notEqual(treeHash(fixture.outputDirectory), fixture.sentinelHash);
  assert.deepEqual(protectedHashes(), protectedBefore, 'candidate preview changed a protected tree');
  assert.deepEqual(fs.readdirSync(fixture.outputDirectory).sort(), ['app.js', 'data.js', 'external.html', 'index.html']);
});

test('candidate preview requires an explicit --out before any write', (t) => {
  const fixture = isolatedOutput(t);
  const candidateRelease = isolatedRelease(t, fixture.directory);
  const protectedBefore = protectedHashes();

  const result = run(['--candidate-preview', '--release', candidateRelease]);

  assert.notEqual(result.status, 0, 'candidate preview without --out unexpectedly succeeded');
  assert.match(result.stderr, /candidate_preview_requires_explicit_--out/iu);
  assertNoMockupWrites(fixture, protectedBefore);
});

test('candidate preview requires an explicit --release before any write', (t) => {
  const fixture = isolatedOutput(t);
  const protectedBefore = protectedHashes();

  const result = run(['--candidate-preview', '--out', fixture.output]);

  assert.notEqual(result.status, 0, 'candidate preview without --release unexpectedly succeeded');
  assert.match(result.stderr, /candidate_preview_requires_explicit_--release/iu);
  assertNoMockupWrites(fixture, protectedBefore);
});

for (const flag of ['--out', '--release']) {
  test(`${flag} rejects a missing value before any write`, (t) => {
    const fixture = isolatedOutput(t);
    const protectedBefore = protectedHashes();

    const result = run(['--candidate-preview', flag]);

    assert.notEqual(result.status, 0, `${flag} without a value unexpectedly succeeded`);
    assert.match(result.stderr, new RegExp(`missing value for ${flag}`, 'iu'));
    assertNoMockupWrites(fixture, protectedBefore);
  });
}

for (const [label, protectedRoot] of [
  ['canonical mockup', mockupRoot],
  ['canonical release', release],
  ['native projection', nativeRoot],
]) {
  test(`candidate --out rejects a path inside the ${label} tree`, (t) => {
    const fixture = isolatedOutput(t);
    const candidateRelease = isolatedRelease(t, fixture.directory);
    const protectedBefore = protectedHashes();
    const protectedOutput = path.join(protectedRoot, `__candidate_guard_probe_${process.pid}_${label.replaceAll(' ', '_')}`, 'index.html');

    const result = run(['--candidate-preview', '--release', candidateRelease, '--out', protectedOutput]);

    assert.notEqual(result.status, 0, `candidate output inside ${label} unexpectedly succeeded`);
    assert.match(result.stderr, /candidate_preview_protected_path:--out/iu);
    assert.equal(fs.existsSync(path.dirname(protectedOutput)), false, 'protected output directory was created');
    assertNoMockupWrites(fixture, protectedBefore);
  });

  test(`candidate --release rejects a path inside the ${label} tree`, (t) => {
    const fixture = isolatedOutput(t);
    const protectedBefore = protectedHashes();
    const protectedRelease = path.join(protectedRoot, `__candidate_guard_probe_${process.pid}_${label.replaceAll(' ', '_')}`);

    const result = run(['--candidate-preview', '--release', protectedRelease, '--out', fixture.output]);

    assert.notEqual(result.status, 0, `candidate release inside ${label} unexpectedly succeeded`);
    assert.match(result.stderr, /candidate_preview_protected_path:--release/iu);
    assertNoMockupWrites(fixture, protectedBefore);
  });
}

test('candidate path guard resolves a filesystem alias before checking protected trees', (t) => {
  const fixture = isolatedOutput(t);
  const candidateRelease = isolatedRelease(t, fixture.directory);
  const alias = path.join(fixture.directory, 'release-alias');
  fs.symlinkSync(release, alias, process.platform === 'win32' ? 'junction' : 'dir');
  const protectedBefore = protectedHashes();

  const result = run([
    '--candidate-preview',
    '--release', candidateRelease,
    '--out', path.join(alias, `__candidate_guard_alias_probe_${process.pid}`, 'index.html'),
  ]);

  assert.notEqual(result.status, 0, 'candidate output through a protected-tree alias unexpectedly succeeded');
  assert.match(result.stderr, /candidate_preview_protected_path:--out/iu);
  assert.deepEqual(protectedHashes(), protectedBefore, 'a protected tree changed through an alias');
});
