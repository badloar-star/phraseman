import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {
  learningV2Lesson1AudioSource,
  learningV2Lesson1FamilyUsesAudio,
  learningV2Lesson1RemoteAudioFilesV1,
} from '../app/learning_v2_lesson1_audio_assets';
import { LEARNING_V2_LESSON1_AUDIO_AUDIT } from '../app/learning_v2_lesson1_audio_manifest';
import { getLesson1SessionRuntime } from '../modules/learning-v2/runtime/lesson1_session_runtime';

const AUDIO_FAMILIES = [
  'listen_choose',
  'sound_contrast',
  'listen_build_dictation',
  'scripted_repeat_compare',
] as const;

// зачем (переписано 04.10 по смыслу, не ослаблено): озвучка старого урока 1 теперь опубликованные mp3 (кэш на устройстве по хэшу), а не
// статические m4a в require(). Прежняя проверка искала `require('../assets/audio/...m4a')` в модуле и красила тест на пустом месте.
// Сторож теперь держит то же правило другими средствами: для КАЖДОЙ карточки с озвучкой есть ровно одна запись таблицы, у записи
// корректные хэш, путь, размер и тип, а разные карточки не делят один хэш.
test('every Lesson 1 listening card has exactly one well-formed published recording entry', () => {
  const runtime = getLesson1SessionRuntime();
  const requiredIds = new Set(runtime.compiled.sessions.flatMap((session) =>
    session.cards.filter((card) => learningV2Lesson1FamilyUsesAudio(card.family))
      .map((card) => card.contentItemId)));
  const files = learningV2Lesson1RemoteAudioFilesV1();
  expect(requiredIds.size).toBeGreaterThan(0);
  for (const contentItemId of requiredIds) {
    expect(learningV2Lesson1AudioSource(contentItemId)).not.toBeNull();
  }
  expect(files.length).toBeGreaterThan(0);
  expect(new Set(files.map((file) => file.contentHash)).size).toBe(files.length);
  for (const file of files) {
    expect(file.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(file.objectPath.startsWith('learning-v2/voice-audio/')).toBe(true);
    expect(file.objectPath.endsWith(`${file.contentHash}.mp3`)).toBe(true);
    expect(file.byteSize).toBeGreaterThan(4_096);
    expect(file.contentType).toBe('audio/mpeg');
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

// зачем (переписано 04.10 по смыслу): прежний тест требовал, чтобы КАЖДАЯ запись старой статической озвучки попала в обновление по воздуху.
// Сегодня код урока 1 не подключает статические m4a вовсе (озвучка — опубликованные mp3 из кэша, см. тест выше), и обычный профиль app.json
// их больше не перечисляет. Сторож держит новую границу: ни один исходник не подключает m4a урока 1 через require/import — иначе файл
// попал бы в сборку, но не в обновление по воздуху, и озвучка пропала бы у обновлённых клиентов. Старые m4a в assets — осиротевшие (убрать отдельно).
test('no source requires the retired static Lesson 1 m4a recordings', () => {
  const offenders: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(path.join(process.cwd(), dir), { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '__tests__') walk(rel);
      } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
        if (/(?:require|import)[^\r\n]*audio\/learning-v2\/lesson1\/[^\r\n]*\.m4a/.test(fs.readFileSync(path.join(process.cwd(), rel), 'utf8'))) offenders.push(rel);
      }
    }
  };
  for (const dir of ['app', 'components', 'modules', 'hooks']) walk(dir);
  expect(offenders).toEqual([]);
});

test('the resolver rejects inherited object keys instead of treating them as assets', () => {
  expect(learningV2Lesson1AudioSource('__proto__')).toBeNull();
  expect(learningV2Lesson1AudioSource('prototype')).toBeNull();
  expect(learningV2Lesson1AudioSource('constructor')).toBeNull();
});

// зачем (владелец 22.10: «аудио убрали и сменили на TTS»): занятие говорит только голосом телефона через общий useAudio —
// без плеера записей, без прямого expo-speech и без сетевых адресов звука.
test('the active session speaks only with the device voice through the shared audio hook', () => {
  const source = fs.readFileSync(path.join(
    process.cwd(),
    'app/learning-v2/session/[id].tsx',
  ), 'utf8');
  expect(source).not.toMatch(/from ["']expo-audio["']/);
  expect(source).not.toContain('learningV2Lesson1AudioSource');
  expect(source).toContain('const { speak: speakLessonAudio, stop: stopLessonAudio } = useAudio();');
  expect(source).toContain('systemTtsOnly: true');
  expect(source).not.toContain('expo-speech');
  expect(source).not.toContain('Speech.speak');
  expect(source).not.toMatch(/https?:\/\//);
});
