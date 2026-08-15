import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {
  learningV2Lesson1AudioSource,
  learningV2Lesson1FamilyUsesAudio,
} from '../app/learning_v2_lesson1_audio_assets';
import { LEARNING_V2_LESSON1_AUDIO_AUDIT } from '../app/learning_v2_lesson1_audio_manifest';
import { getLesson1SessionRuntime } from '../modules/learning-v2/runtime/lesson1_session_runtime';

const AUDIO_FAMILIES = [
  'listen_choose',
  'sound_contrast',
  'listen_build_dictation',
  'scripted_repeat_compare',
] as const;

test('every Lesson 1 listening card has one non-empty statically bundled recording', () => {
  const runtime = getLesson1SessionRuntime();
  const audioModule = fs.readFileSync(path.join(
    process.cwd(),
    'app/learning_v2_lesson1_audio_assets.ts',
  ), 'utf8');
  const requiredIds = new Set(runtime.compiled.sessions.flatMap((session) =>
    session.cards.filter((card) => learningV2Lesson1FamilyUsesAudio(card.family))
      .map((card) => card.contentItemId)));
  const wired = [...audioModule.matchAll(/'([^']+)': require\('\.\.\/assets\/audio\/learning-v2\/lesson1\/([^']+\.m4a)'\)/g)]
    .map((match) => ({ contentItemId: match[1]!, filename: match[2]! }));

  expect(new Set(wired.map((entry) => entry.contentItemId))).toEqual(requiredIds);
  expect(wired).toHaveLength(requiredIds.size);
  expect(new Set(wired.map((entry) => entry.filename)).size).toBe(wired.length);
  expect([...wired].sort((left, right) => left.contentItemId.localeCompare(right.contentItemId)))
    .toEqual(LEARNING_V2_LESSON1_AUDIO_AUDIT.map((entry) => ({
      contentItemId: entry.contentItemId,
      filename: entry.filename,
    })).sort((left, right) => left.contentItemId.localeCompare(right.contentItemId)));
  for (const entry of wired) {
    const absolute = path.join(
      process.cwd(),
      'assets/audio/learning-v2/lesson1',
      entry.filename,
    );
    const bytes = fs.readFileSync(absolute);
    expect(bytes.byteLength).toBeGreaterThan(4_096);
    expect(bytes.subarray(4, 8).toString('ascii')).toBe('ftyp');
  }
});

test('the audit manifest binds every compiled transcript to the exact decoded asset bytes', () => {
  const runtime = getLesson1SessionRuntime();
  const itemById = new Map(runtime.payload.contentItems.map((item) => [item.contentItemId, item]));
  const requiredIds = new Set(runtime.compiled.sessions.flatMap((session) =>
    session.cards.filter((card) => learningV2Lesson1FamilyUsesAudio(card.family))
      .map((card) => card.contentItemId)));

  expect(new Set(LEARNING_V2_LESSON1_AUDIO_AUDIT.map((entry) => entry.contentItemId))).toEqual(requiredIds);
  for (const entry of LEARNING_V2_LESSON1_AUDIO_AUDIT) {
    const target = itemById.get(entry.contentItemId)?.target.text;
    expect(target).toBe(entry.transcript);
    expect(crypto.createHash('sha256').update(entry.transcript, 'utf8').digest('hex'))
      .toBe(entry.transcriptSha256);
    const bytes = fs.readFileSync(path.join(
      process.cwd(),
      'assets/audio/learning-v2/lesson1',
      entry.filename,
    ));
    expect(bytes.byteLength).toBe(entry.fileBytes);
    expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(entry.assetSha256);
    expect(entry.codec).toBe('AAC-LC');
    expect(entry.channels).toBe(1);
    expect(entry.sampleRateHz).toBe(22_050);
    expect(entry.durationMs).toBeGreaterThanOrEqual(600);
    expect(entry.durationMs).toBeLessThanOrEqual(900);
    expect(entry.audioPackets).toBeGreaterThan(0);
    expect(entry.encodedAudioBytes).toBeGreaterThan(2_000);
    expect(entry.rmsDbfs).toBeGreaterThanOrEqual(-20);
    expect(entry.rmsDbfs).toBeLessThanOrEqual(-12);
    expect(entry.peakDbfs).toBeGreaterThanOrEqual(-6);
    expect(entry.peakDbfs).toBeLessThanOrEqual(-1);
    expect(entry.activeSamplePercent).toBeGreaterThanOrEqual(65);
    expect(entry.activeSamplePercent).toBeLessThanOrEqual(95);
    expect(entry.reviewStatus).toBe('machine_verified_pending_human');
  }
});

test('the production audio-family predicate is exact', () => {
  for (const family of AUDIO_FAMILIES) expect(learningV2Lesson1FamilyUsesAudio(family)).toBe(true);
  for (const family of [
    'speed_match',
    'phrase_builder',
    'context_gap_grammar',
    '__proto__',
    'constructor',
  ]) expect(learningV2Lesson1FamilyUsesAudio(family)).toBe(false);
});

test('normal and minimal OTA profiles include every exact Lesson 1 recording', () => {
  // CommonJS is the public contract of Expo's root app.config.js loader.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const buildExpoConfig = require('../app.config.js') as (options?: { config?: object }) => {
    updates?: { assetPatternsToBeBundled?: string[] };
  };
  const expected = LEARNING_V2_LESSON1_AUDIO_AUDIT.map((entry) =>
    `assets/audio/learning-v2/lesson1/${entry.filename}`).sort();
  const previous = process.env.PHRASEMAN_MINIMAL_OTA_ASSETS;
  try {
    delete process.env.PHRASEMAN_MINIMAL_OTA_ASSETS;
    const normal = buildExpoConfig({ config: {} }).updates?.assetPatternsToBeBundled ?? [];
    process.env.PHRASEMAN_MINIMAL_OTA_ASSETS = '1';
    const minimal = buildExpoConfig({ config: {} }).updates?.assetPatternsToBeBundled ?? [];
    for (const asset of expected) {
      expect(normal).toContain(asset);
      expect(minimal).toContain(asset);
    }
  } finally {
    if (previous === undefined) delete process.env.PHRASEMAN_MINIMAL_OTA_ASSETS;
    else process.env.PHRASEMAN_MINIMAL_OTA_ASSETS = previous;
  }
});

test('the resolver rejects inherited object keys instead of treating them as assets', () => {
  expect(learningV2Lesson1AudioSource('__proto__')).toBeNull();
  expect(learningV2Lesson1AudioSource('prototype')).toBeNull();
  expect(learningV2Lesson1AudioSource('constructor')).toBeNull();
});

test('the active session has no runtime TTS or remote audio fallback', () => {
  const source = fs.readFileSync(path.join(
    process.cwd(),
    'app/learning-v2/session/[id].tsx',
  ), 'utf8');
  expect(source).toContain("from 'expo-audio'");
  expect(source).toContain('learningV2Lesson1AudioSource');
  expect(source).not.toContain('expo-speech');
  expect(source).not.toContain('Speech.speak');
  expect(source).not.toMatch(/https?:\/\//);
});
