import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { writeMockupFile } from './write_mockup_file.mjs';

function fixture(t) {
  const parent = fs.realpathSync(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, 'mockup-write-'));
  t.after(() => {
    assert.equal(path.dirname(dir), parent);
    assert.ok(path.basename(dir).startsWith('mockup-write-'));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const target = path.join(dir, 'index.html');
  fs.writeFileSync(target, 'previous complete page');
  return { dir, target };
}

test('transient replacement failure preserves old page until complete replacement', async (t) => {
  const { dir, target } = fixture(t);
  let attempts = 0;
  const io = { ...fs, renameSync(from, to) {
    assert.equal(fs.readFileSync(to, 'utf8'), 'previous complete page');
    assert.equal(fs.readFileSync(from, 'utf8'), 'next complete page');
    if (++attempts === 1) throw Object.assign(new Error('busy'), { code: 'UNKNOWN' });
    fs.renameSync(from, to);
  } };
  await writeMockupFile(target, 'next complete page', { io, delays: [0] });
  assert.equal(attempts, 2);
  assert.equal(fs.readFileSync(target, 'utf8'), 'next complete page');
  assert.deepEqual(fs.readdirSync(dir), ['index.html']);
});

test('permanent replacement failure is visible and leaves old file intact', async (t) => {
  const { dir, target } = fixture(t);
  let attempts = 0;
  const io = { ...fs, renameSync() {
    attempts++;
    throw Object.assign(new Error('busy'), { code: 'UNKNOWN' });
  } };
  await assert.rejects(writeMockupFile(target, 'next page', { io, delays: [0, 0] }), /index\.html.*UNKNOWN.*3/);
  assert.equal(attempts, 3);
  assert.equal(fs.readFileSync(target, 'utf8'), 'previous complete page');
  assert.deepEqual(fs.readdirSync(dir), ['index.html']);
});

test('identical bytes cause no write or rename', async (t) => {
  const { target } = fixture(t);
  const io = { ...fs, writeFileSync() { assert.fail('unchanged write'); }, renameSync() { assert.fail('unchanged rename'); } };
  assert.equal(await writeMockupFile(target, 'previous complete page', { io }), false);
});

test('non-transient errors are not retried', async (t) => {
  const { dir, target } = fixture(t);
  let attempts = 0;
  const io = { ...fs, renameSync() { attempts++; throw Object.assign(new Error('disk'), { code: 'ENOSPC' }); } };
  await assert.rejects(writeMockupFile(target, 'next page', { io, delays: [0, 0] }), /ENOSPC/);
  assert.equal(attempts, 1);
  assert.deepEqual(fs.readdirSync(dir), ['index.html']);
});

test('cleanup failure preserves the replacement failure and reports remaining temp', async (t) => {
  const { target } = fixture(t);
  const io = { ...fs,
    renameSync() { throw Object.assign(new Error('busy'), { code: 'UNKNOWN' }); },
    unlinkSync() { throw Object.assign(new Error('cleanup blocked'), { code: 'EACCES' }); },
  };
  await assert.rejects(writeMockupFile(target, 'next page', { io, delays: [] }), (error) => {
    assert.ok(error instanceof AggregateError);
    assert.match(error.message, /index\.html.*UNKNOWN/);
    assert.match(error.message, /cleanup.*EACCES/);
    assert.equal(error.errors[0].cause.code, 'UNKNOWN');
    assert.equal(error.errors[1].code, 'EACCES');
    return true;
  });
  assert.equal(fs.readFileSync(target, 'utf8'), 'previous complete page');
});

test('transient comparison read failure does not prevent safe replacement', async (t) => {
  const { target } = fixture(t);
  const io = { ...fs, readFileSync() { throw Object.assign(new Error('busy'), { code: 'UNKNOWN' }); } };
  await writeMockupFile(target, 'next complete page', { io });
  assert.equal(fs.readFileSync(target, 'utf8'), 'next complete page');
});
