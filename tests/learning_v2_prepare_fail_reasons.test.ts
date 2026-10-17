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

  it('в подготовке занятия нет безымянных fail()', () => {
    const from = src.indexOf('export async function prepareCurrentLearningV2CourseSessionV3(');
    const to = src.indexOf('[V2-AUDIO] opening_session_with_incomplete_audio', from);
    expect(from).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(from);
    const body = src.slice(from, to);
    expect(body).not.toContain('fail()');
    for (const reason of ['audio_child_missing', 'word_audio_missing', 'word_audio_conflict', 'audio_preload_handle_invalid', 'audio_summary_mismatch']) {
      expect(body).toContain(`"${reason}"`);
    }
    expect(body).toContain('wordId: encounter.lexicalItemId');
    // зачем (17.10): голос слова больше не зашитый ash — причина отказа называет фактический голос записи или его отсутствие.
    expect(body).toContain('voice: file?.voiceId ?? "none_recorded"');
  });
});

describe('[V2-PLAYER] · у плеера V2 нет немых catch', () => {
  it('каждый catch плеера называет причину', () => {
    const player = fs.readFileSync(path.join(__dirname, '..', 'app', 'learning_v2_direct_session_player_v1.tsx'), 'utf8');
    expect(player).not.toMatch(/catch \{/);
    expect(player).not.toMatch(/\.catch\(\(\) => \{/);
    expect(player).toContain('function logPlayerSwallowed(where: string, id: string, error: unknown): void {');
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

describe('[AUDIO-PRELOAD] · бюджет прогрева виден в журнале до отказа', () => {
  it('одна строка на подготовку, предупреждение при заполнении больше 75%, проверка бюджета прежняя', () => {
    const preload = fs.readFileSync(path.join(__dirname, '..', 'app', 'learning_v2_course_session_audio_preload_v1.ts'), 'utf8');
    const at = preload.indexOf('const budgetPct = ');
    expect(at).toBeGreaterThan(-1);
    const block = preload.slice(at, at + 1400);
    expect(block).toContain('if (budgetPct > 75) console.warn("[AUDIO-PRELOAD] budget_high", budgetLine);');
    expect(block).toContain('else console.log("[AUDIO-PRELOAD] budget", budgetLine);');
    expect(block.indexOf('[AUDIO-PRELOAD] budget')).toBeLessThan(block.indexOf('fail("preload_budget_exceeded"'));
  });
});
