"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// зачем: QA-отчёт — последний рубеж перед выпуском юнита: любая потеря трассируемости,
// сломанная кардинальность или несовместимость с профилем БЛОКИРУЕТ выпуск (fail-closed),
// а не превращается в предупреждение. RED до реализации.
const v2_episode_content_qa_1 = require("./v2_episode_content_qa");
const session_compiler_1 = require("../../../modules/learning-v2/content/session_compiler");
const learning_v2_content_builders_1 = require("../../../tests/support/learning_v2_content_builders");
function buildCompiledE1() {
    return (0, session_compiler_1.compileV2RequiredSessions)({
        episodeId: 'ep-01',
        canDoOutcomeId: 'obj-introduce-self',
        profile: (0, learning_v2_content_builders_1.buildEnglishProfile)(),
        items: (0, learning_v2_content_builders_1.buildE1ContentItems)(),
    });
}
test('passes a well-formed compiled unit', () => {
    const report = (0, v2_episode_content_qa_1.qaV2EpisodeContent)(buildCompiledE1(), (0, learning_v2_content_builders_1.buildE1ContentItems)(), (0, learning_v2_content_builders_1.buildEnglishProfile)());
    expect(report.ok).toBe(true);
    expect(report.blockingIssues).toEqual([]);
    expect(report.schemaVersion).toBe('v2-episode-content-quality-report.v1');
    expect(report.episodeId).toBe('ep-01');
    expect(report.checkedSessionIds).toHaveLength(12);
    expect(report.checkedContentItemIds.length).toBeGreaterThan(0);
});
test('blocks release when any card loses content or objective traceability', () => {
    const compiled = buildCompiledE1();
    const broken = {
        ...compiled,
        sessions: compiled.sessions.map((session, index) => index === 0
            ? { ...session, cards: session.cards.map((card, cardIndex) => cardIndex === 0 ? { ...card, contentItemId: 'missing' } : card) }
            : session),
    };
    expect((0, v2_episode_content_qa_1.qaV2EpisodeContent)(broken, (0, learning_v2_content_builders_1.buildE1ContentItems)(), (0, learning_v2_content_builders_1.buildEnglishProfile)())).toMatchObject({
        ok: false,
        blockingIssues: expect.arrayContaining(['compiled_card_content_missing']),
    });
});
// зачем: доп. броня — все блокировки из плана: чужой objective, кардинальность
// сессий/карточек/семей, неподдержанная семья, дубль promptId, trained-подсказка
// в независимой проверке, слот с правом писать mastery.
test('blocks unknown objectives', () => {
    const compiled = buildCompiledE1();
    const broken = {
        ...compiled,
        sessions: compiled.sessions.map((session, index) => index === 1
            ? { ...session, cards: session.cards.map((card, cardIndex) => cardIndex === 0 ? { ...card, objectiveId: 'obj-alien' } : card) }
            : session),
    };
    expect((0, v2_episode_content_qa_1.qaV2EpisodeContent)(broken, (0, learning_v2_content_builders_1.buildE1ContentItems)(), (0, learning_v2_content_builders_1.buildEnglishProfile)())).toMatchObject({
        ok: false,
        blockingIssues: expect.arrayContaining(['compiled_card_objective_missing']),
    });
});
test('blocks session cardinality violations', () => {
    const compiled = buildCompiledE1();
    const eleven = { ...compiled, sessions: compiled.sessions.slice(0, 11) };
    expect((0, v2_episode_content_qa_1.qaV2EpisodeContent)(eleven, (0, learning_v2_content_builders_1.buildE1ContentItems)(), (0, learning_v2_content_builders_1.buildEnglishProfile)())).toMatchObject({
        ok: false,
        blockingIssues: expect.arrayContaining(['compiled_session_count_invalid']),
    });
    const thinCards = {
        ...compiled,
        sessions: compiled.sessions.map((session, index) => index === 3
            ? { ...session, cards: session.cards.slice(0, 6) }
            : session),
    };
    expect((0, v2_episode_content_qa_1.qaV2EpisodeContent)(thinCards, (0, learning_v2_content_builders_1.buildE1ContentItems)(), (0, learning_v2_content_builders_1.buildEnglishProfile)())).toMatchObject({
        ok: false,
        blockingIssues: expect.arrayContaining(['compiled_card_count_invalid']),
    });
});
test('blocks unsupported families and duplicate prompt ids', () => {
    const compiled = buildCompiledE1();
    const unsupported = {
        ...compiled,
        sessions: compiled.sessions.map((session, index) => index === 2
            ? { ...session, cards: session.cards.map((card, cardIndex) => cardIndex === 0 ? { ...card, family: 'branching_scene' } : card) }
            : session),
    };
    expect((0, v2_episode_content_qa_1.qaV2EpisodeContent)(unsupported, (0, learning_v2_content_builders_1.buildE1ContentItems)(), (0, learning_v2_content_builders_1.buildEnglishProfile)())).toMatchObject({
        ok: false,
        blockingIssues: expect.arrayContaining(['compiled_family_unsupported']),
    });
    const duplicatePrompt = {
        ...compiled,
        sessions: compiled.sessions.map((session, index) => index === 5
            ? { ...session, cards: session.cards.map((card, cardIndex) => cardIndex === 1 ? { ...card, promptId: session.cards[0].promptId } : card) }
            : session),
    };
    expect((0, v2_episode_content_qa_1.qaV2EpisodeContent)(duplicatePrompt, (0, learning_v2_content_builders_1.buildE1ContentItems)(), (0, learning_v2_content_builders_1.buildEnglishProfile)())).toMatchObject({
        ok: false,
        blockingIssues: expect.arrayContaining(['compiled_prompt_duplicate']),
    });
});
test('blocks trained prompts inside independent no-support checks', () => {
    const compiled = buildCompiledE1();
    const trainedInMaster = {
        ...compiled,
        sessions: compiled.sessions.map((session, index) => index === 11
            ? { ...session, cards: session.cards.map((card, cardIndex) => cardIndex === 0 ? { ...card, promptNovelty: 'trained' } : card) }
            : session),
    };
    expect((0, v2_episode_content_qa_1.qaV2EpisodeContent)(trainedInMaster, (0, learning_v2_content_builders_1.buildE1ContentItems)(), (0, learning_v2_content_builders_1.buildEnglishProfile)())).toMatchObject({
        ok: false,
        blockingIssues: expect.arrayContaining(['compiled_trained_prompt_in_independent_check']),
    });
});
test('blocks any optional template that could write mastery or block progress', () => {
    const compiled = buildCompiledE1();
    const report = (0, v2_episode_content_qa_1.qaV2EpisodeContent)(compiled, (0, learning_v2_content_builders_1.buildE1ContentItems)(), (0, learning_v2_content_builders_1.buildEnglishProfile)(), [
        {
            slotId: 'optional-ep-01-cheat',
            episodeId: 'ep-01',
            capabilityId: 'cheat-v1',
            family: 'quick_spoken_response',
            sourcePriority: 'current_unit',
            expectedSeconds: 60,
            requiredForProgress: true,
            canWriteMastery: true,
        },
    ]);
    expect(report).toMatchObject({
        ok: false,
        blockingIssues: expect.arrayContaining(['optional_template_progress_forbidden', 'optional_template_mastery_forbidden']),
    });
});
//# sourceMappingURL=v2_episode_content_qa.test.js.map