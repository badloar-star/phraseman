#!/usr/bin/env node
/**
 * Removes only leading and trailing silence from generated phrase MP3 files.
 * Internal pauses are retained by trimming the audio once in each direction.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const rawArgs = process.argv.slice(2);
const audioRootArg = argValue('--audio-root');
const backupRootArg = argValue('--backup-root');
const audioRoot = audioRootArg ? path.resolve(audioRootArg) : '';
const backupRoot = backupRootArg ? path.resolve(backupRootArg) : '';
const force = rawArgs.includes('--force');

if (!audioRoot || !backupRoot) {
  throw new Error('Usage: node scripts/trim_capcut_phrase_audio_edges.mjs --audio-root <dir> --backup-root <dir>');
}

function argValue(name, fallback = '') {
  const eq = rawArgs.find((arg) => arg.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const index = rawArgs.indexOf(name);
  return index >= 0 ? rawArgs[index + 1] || fallback : fallback;
}

function durationUs(filePath) {
  const output = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
    { encoding: 'utf8' },
  ).trim();
  const seconds = Number(output);
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`Bad duration: ${filePath}`);
  return Math.round(seconds * 1_000_000);
}

function trimFile(filePath, tempPath) {
  const filter = [
    'silenceremove=start_periods=1:start_duration=0.05:start_threshold=-45dB:start_silence=0.05',
    'areverse',
    'silenceremove=start_periods=1:start_duration=0.05:start_threshold=-45dB:start_silence=0.08',
    'areverse',
  ].join(',');
  execFileSync(
    'ffmpeg',
    ['-y', '-v', 'error', '-i', filePath, '-af', filter, '-ar', '44100', '-ac', '1', '-b:a', '128k', tempPath],
    { stdio: 'pipe' },
  );
}

const results = [];
for (const kind of ['ru', 'en']) {
  const sourceDir = path.join(audioRoot, kind);
  const backupDir = path.join(backupRoot, kind);
  const files = fs.readdirSync(sourceDir).filter((name) => /^\d{3}\.mp3$/i.test(name)).sort();
  if (files.length !== 300) throw new Error(`Expected 300 ${kind} MP3 files, got ${files.length}`);
  fs.mkdirSync(backupDir, { recursive: true });
  for (const fileName of files) {
    const filePath = path.join(sourceDir, fileName);
    const backupPath = path.join(backupDir, fileName);
    if (!fs.existsSync(backupPath)) fs.copyFileSync(filePath, backupPath);
    else if (!force) {
      results.push({ kind, fileName, status: 'already-trimmed', beforeUs: 0, afterUs: durationUs(filePath) });
      continue;
    }
    const beforeUs = durationUs(filePath);
    const tempPath = `${filePath}.trim.tmp.mp3`;
    trimFile(filePath, tempPath);
    const afterUs = durationUs(tempPath);
    if (afterUs < 150_000) throw new Error(`Trimmed audio too short: ${filePath}`);
    fs.renameSync(tempPath, filePath);
    results.push({ kind, fileName, status: 'trimmed', beforeUs, afterUs });
  }
}

const trimmed = results.filter((item) => item.status === 'trimmed');
const report = {
  status: 'ready',
  audioRoot,
  backupRoot,
  files: results.length,
  trimmed: trimmed.length,
  savedUs: trimmed.reduce((total, item) => total + item.beforeUs - item.afterUs, 0),
  maxAfterUs: Math.max(...results.map((item) => item.afterUs)),
};
console.log(JSON.stringify(report, null, 2));
