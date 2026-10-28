import {
  normalizeLearningV2RecordedText,
  parseLearningV2AudioLessonCatalog,
  parseLearningV2AudioReleaseManifest,
  planLearningV2ProgressiveAudioWindow,
} from '../modules/learning-v2/audio/progressive_audio_contract';

const A = 'a'.repeat(64);
const B = 'b'.repeat(64);
const C = 'c'.repeat(64);

const manifest = () => ({
  schemaVersion: 'learning-v2-audio-release-manifest.v1', studyTarget: 'es', releaseId: C,
  availability: 'generated_ready', totalSessionCount: 127,
  lessons: [
    { lessonOrdinal: 1, startOrdinal: 1, endOrdinal: 56, byteSize: 80_000, sha256: A, objectPath: `learning-v2/voice-audio/v1/es/releases/${C}/lessons/l001-${A}.json` },
    { lessonOrdinal: 2, startOrdinal: 57, endOrdinal: 112, byteSize: 80_000, sha256: B, objectPath: `learning-v2/voice-audio/v1/es/releases/${C}/lessons/l002-${B}.json` },
    { lessonOrdinal: 3, startOrdinal: 113, endOrdinal: 127, byteSize: 30_000, sha256: C, objectPath: `learning-v2/voice-audio/v1/es/releases/${C}/lessons/l003-${C}.json` },
  ],
});

const lesson = () => ({
  schemaVersion: 'learning-v2-audio-lesson-catalog.v1', studyTarget: 'es', releaseId: C,
  lessonOrdinal: 1, startOrdinal: 1, endOrdinal: 1,
  packs: [{
    packId: 'base-s0001-s0001-p01', sha256: C, byteSize: 24_690,
    objectPath: `learning-v2/voice-audio/v1/es/packs/base-s0001-s0001-p01-${C}.bin`,
    clips: [{ sha256: A, offset: 0, byteSize: 12_345 }, { sha256: B, offset: 12_345, byteSize: 12_345 }],
  }],
  sessions: [{ ordinal: 1, sessionOrdinal: 1, phrases: [
    { textKey: 'Es fácil.', clipSha256: A }, { textKey: 'es fácil.', clipSha256: B },
  ] }],
});

describe('Learning V2 progressive audio contracts', () => {
  test('parses a sharded release manifest without a startup-sized phrase index', () => {
    const parsed = parseLearningV2AudioReleaseManifest(manifest());
    expect(parsed.lessons).toHaveLength(3);
    expect(parsed.lessons[1].startOrdinal).toBe(57);
  });

  test('indexes multiple clips from one immutable binary pack', () => {
    const parsed = parseLearningV2AudioLessonCatalog(lesson());
    expect(parsed.packsBySha256.get(C)?.clips).toHaveLength(2);
    expect(parsed.sessionsByOrdinal.get(1)?.phrases.get('Es fácil.')?.pack.sha256).toBe(C);
    expect(parsed.sessionsByOrdinal.get(1)?.phrases.get('es fácil.')?.clip.sha256).toBe(B);
  });

  test('rejects traversal, wrong-language paths, overlap, dangling clips, and manifest gaps', () => {
    const base = lesson() as Record<string, unknown>;
    const pack = (base.packs as Record<string, unknown>[])[0];
    expect(() => parseLearningV2AudioLessonCatalog({ ...base, packs: [{ ...pack, objectPath: '../x.bin' }] })).toThrow('learning_v2_progressive_audio_catalog_invalid');
    expect(() => parseLearningV2AudioLessonCatalog({ ...base, packs: [{ ...pack, objectPath: `learning-v2/voice-audio/v1/en/packs/x-${C}.bin` }] })).toThrow('learning_v2_progressive_audio_catalog_invalid');
    expect(() => parseLearningV2AudioLessonCatalog({ ...base, packs: [{ ...pack, clips: [{ sha256: A, offset: 0, byteSize: 12_345 }, { sha256: B, offset: 12_000, byteSize: 12_345 }] }] })).toThrow('learning_v2_progressive_audio_catalog_invalid');
    expect(() => parseLearningV2AudioLessonCatalog({ ...base, sessions: [{ ...(base.sessions as object[])[0], phrases: [{ textKey: 'x', clipSha256: 'd'.repeat(64) }] }] })).toThrow('learning_v2_progressive_audio_catalog_invalid');
    const root = manifest() as Record<string, unknown>;
    const lessons = root.lessons as Record<string, unknown>[];
    expect(() => parseLearningV2AudioReleaseManifest({ ...root, lessons: [{ ...lessons[0], endOrdinal: 55 }, ...lessons.slice(1)] })).toThrow('learning_v2_progressive_audio_catalog_invalid');
  });

  test('normalization preserves case and punctuation distinctions', () => {
    expect(normalizeLearningV2RecordedText('  ES   fa\u0301cil.  ')).toBe('ES fácil.');
    expect(normalizeLearningV2RecordedText('Es fácil.')).not.toBe(normalizeLearningV2RecordedText('es fácil.'));
    expect(normalizeLearningV2RecordedText('Es fácil')).not.toBe(normalizeLearningV2RecordedText('Es fácil.'));
  });

  test.each([[0, 1], [1, 8], [8, 16], [16, 56], [56, 112], [112, 127]])(
    'completed prefix %d prepares through %d', (completedPrefixCount, targetEndOrdinal) => {
      const current = Math.min(completedPrefixCount + 1, 127);
      const chapterStart = Math.floor((current - 1) / 8) * 8 + 1;
      const retainOrdinals = Array.from({ length: Math.min(127, chapterStart + 15) - chapterStart + 1 }, (_, index) => chapterStart + index);
      expect(planLearningV2ProgressiveAudioWindow({ completedPrefixCount, totalSessionCount: 127 })).toEqual({
        requiredStartOrdinal: current, targetEndOrdinal, retainOrdinals,
      });
    },
  );

  test('slides the 56-session frontier beyond session 112', () => {
    expect(planLearningV2ProgressiveAudioWindow({ completedPrefixCount: 112, totalSessionCount: 200 }).targetEndOrdinal).toBe(168);
  });
});
