import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string): string => fs.readFileSync(
  path.join(__dirname, '..', relativePath),
  'utf8',
);

describe('Learning V2 system TTS only', () => {
  it('does not create or invoke prerecorded players in either session runtime', () => {
    const direct = read('app/learning_v2_direct_session_player_v1.tsx');
    const legacy = read('app/learning-v2/session/[id].tsx');

    for (const source of [direct, legacy]) {
      expect(source).not.toContain('useAudioPlayer(');
      expect(source).not.toContain('useAudioPlayerStatus(');
      expect(source).not.toContain('playLocalAudio');
    }
    expect(direct).not.toContain('resolveLearningV2CourseSessionFullPhraseAudioV1');
    expect(direct).not.toContain('resolveLearningV2CourseSessionSelectableAudioV1');
    expect(direct).not.toContain('resolveLearningV2CourseSessionSupplementalAudioV1');
  });

  it('opts every live Learning V2 speech surface into device TTS', () => {
    const direct = read('app/learning_v2_direct_session_player_v1.tsx');
    const legacy = read('app/learning-v2/session/[id].tsx');
    const dictionary = read('components/learning-v2/LearningV2LessonDictionaryOverlayV1.tsx');

    expect(direct).toContain('systemTtsOnly: true');
    expect(legacy).toContain('systemTtsOnly: true');
    expect(dictionary).toContain('systemTtsOnly: true');
    expect(direct).toContain('language: previewSpeechLocaleRef.current');
    expect(legacy).toContain('language: studySpeechLocale(studyTarget, "learning_v2_legacy")');
    expect(dictionary).toMatch(/language:\s*ttsLocaleForStudyTarget\(\s*word\.targetLanguage as StudyTargetLang/u);
    expect(dictionary).toContain('const request = speechGuardRef.current.begin(id)');
    expect(dictionary).toContain('speechGuardRef.current.isCurrent(request)');
    expect(dictionary).toContain('speechGuardRef.current.clear(request)');
    expect(dictionary).toMatch(/speechGuardRef\.current\.cancelCurrent\(\);[\s\S]*?setSpeakingId\(null\);\s*stopAudio\(\);\s*const request = speechGuardRef\.current\.begin\(id\)/u);
    expect(dictionary.indexOf('onStart: () =>')).toBeLessThan(
      dictionary.indexOf('setSpeakingId(id)'),
    );
    expect(direct).toMatch(/previewSpeechGuardRef\.current\.cancelCurrent\(\);[\s\S]*?setPreviewSpeechKey\(null\);\s*stopPreviewAudio\(\);\s*const request = previewSpeechGuardRef\.current\.begin\(key\);/u);
    for (const stopPath of ['resetInteraction', 'restartInterruptedRun', 'startVoiceHold']) {
      expect(direct).toMatch(new RegExp(`const ${stopPath} = useCallback\\([\\s\\S]*?cancelPreviewSpeech\\(\\)`, 'u'));
    }
  });

  it('does not seed, prefetch, or preload prerecorded audio for Learning V2', () => {
    const layout = read('app/_layout.tsx');
    const lessons = read('app/(tabs)/lessons.tsx');
    const releasedClient = read('app/learning_v2_course_released_session_client_v3.ts');

    expect(layout).not.toContain('seedLearningV2BootstrapAudioCacheV1');
    expect(layout).not.toContain('v2_audio_seed');
    expect(lessons).not.toContain('prepareLearningV2SessionAudioPackV1');
    expect(lessons).not.toContain('prepareLearningV2AudioSession');
    expect(lessons).not.toContain('learning_v2_lesson_audio_pack_v1');
    expect(releasedClient).not.toContain('preloadLearningV2CourseSessionAudioV1');
    expect(releasedClient).toContain('audioReadiness: "device_system_tts_ready_no_prerecorded_audio"');
    expect(releasedClient).toContain('audioDelivery: "device_system_tts_only"');
  });
});
