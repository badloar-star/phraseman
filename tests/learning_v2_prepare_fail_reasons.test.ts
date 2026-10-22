// зачем (координатор 15.10, урок 1 V2 целиком s01–s56): подготовка занятия не имеет права отказывать молча. Каждый отказ внутри
// prepareCurrentLearningV2CourseSessionV3 называет причину в журнале [V2-PREPARE]; текст ошибки прежний.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'learning_v2_course_released_session_client_v3.ts'), 'utf8');

describe('[V2-PREPARE] · отказ подготовки занятия называет причину', () => {
  it('fail пишет причину в журнал, текст ошибки не меняется', () => {
    expect(src).toContain('function fail(reason?: string, detail?: Readonly<Record<string, unknown>>): never {');
    expect(src).toContain('console.warn("[V2-PREPARE]", JSON.stringify({ reason, ...detail }));');
    expect(src).toContain('throw new Error("learning_v2_course_released_session_app_client_v3_invalid");');
  });

  // зачем (владелец 22.10: «аудио убрали и сменили на TTS»): подготовка больше не готовит записи — отказов про звук нет,
  // вместо них одна строка журнала о том, что занятие говорит голосом телефона.
  it('в подготовке занятия нет безымянных fail() и нет подготовки записей', () => {
    const from = src.indexOf('export async function prepareCurrentLearningV2CourseSessionV3(');
    const to = src.indexOf('export function isLearningV2CourseSessionReadyHandleV3(', from);
    expect(from).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(from);
    const body = src.slice(from, to);
    expect(body).not.toContain('fail()');
    expect(body).toContain('fail("prepare_input_invalid"');
    expect(body).toContain('"[V2-AUDIO-TTS] prepare:device_speech_only"');
    for (const reason of ['audio_child_missing', 'word_audio_conflict', 'audio_preload_handle_invalid', 'audio_summary_mismatch', 'audio_preload_incomplete']) {
      expect(body).not.toContain(`"${reason}"`);
    }
  });
});

describe('[V2-PLAYER] · у плеера V2 нет немых catch', () => {
  it('каждый catch плеера называет причину', () => {
    const player = fs.readFileSync(path.join(__dirname, '..', 'app', 'learning_v2_direct_session_player_v1.tsx'), 'utf8');
    expect(player).not.toMatch(/catch \{/);
    expect(player).not.toMatch(/\.catch\(\(\) => \{/);
  });
});

describe('[V2-FINISH] · сбой сохранения после звёзд: совет про интернет — только при сетевой ошибке', () => {
  it('сеть → «Проверь интернет», иначе → «Не получилось сохранить результат»', () => {
    const player = fs.readFileSync(path.join(__dirname, '..', 'app', 'learning_v2_direct_session_player_v1.tsx'), 'utf8');
    const at = player.indexOf('"[V2-FINISH] save_failed_after_stars"');
    expect(at).toBeGreaterThan(-1);
    const block = player.slice(at - 600, at + 1600);
    expect(block).toContain('const networkFailure = /network|offline|timeout|timed out|unavailable|fetch|internet|connection/i.test(');
    expect(block).toContain('actionToastTri("error", networkFailure ? {');
    expect(block).toContain('ru: "Не получилось сохранить результат"');
  });
});
