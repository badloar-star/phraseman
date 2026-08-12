"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLearningV2LocalizedContentBatchPlan = buildLearningV2LocalizedContentBatchPlan;
exports.buildLearningV2AudioBatchPlan = buildLearningV2AudioBatchPlan;
exports.materializeLearningV2CourseBatchCursor = materializeLearningV2CourseBatchCursor;
exports.nextLearningV2CourseBatch = nextLearningV2CourseBatch;
const decision_registry_1 = require("../policies/decision_registry");
const generator_course_manifest_1 = require("./generator_course_manifest");
const generator_course_contract_1 = require("./generator_course_contract");
const TOKEN_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const HASH_RE = /^[a-f0-9]{64}$/;
const MAX_BATCH_SIZE = 4;
function waveForEpisode(episodeOrdinal) {
    if (episodeOrdinal === 1)
        return 'e1';
    if (episodeOrdinal <= 8)
        return 'chapter_1';
    return 'season';
}
function assertPackageInput(packageId, prerequisiteFingerprint) {
    if (!TOKEN_RE.test(packageId) || !HASH_RE.test(prerequisiteFingerprint)) {
        throw new Error('learning_v2_course_batch_plan_input_invalid');
    }
}
function materializePlan(packageId, phase, generationAuthority, tasks) {
    const body = Object.freeze({ schemaVersion: 'learning-v2-course-batch-plan.v1', packageId, phase, generationAuthority, tasks: Object.freeze([...tasks]) });
    return Object.freeze({ ...body, planFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) });
}
function buildLearningV2LocalizedContentBatchPlan(input) {
    assertPackageInput(input.packageId, input.approvedOutlineFingerprint);
    if (!TOKEN_RE.test(input.promptVersion))
        throw new Error('learning_v2_course_batch_plan_prompt_version_invalid');
    const tasks = [];
    for (let episodeOrdinal = 1; episodeOrdinal <= 32; episodeOrdinal += 1) {
        for (let sessionOrdinal = 1; sessionOrdinal <= 12; sessionOrdinal += 1) {
            const taskOrdinal = tasks.length + 1;
            const taskId = `localized:${String(episodeOrdinal).padStart(2, '0')}:${String(sessionOrdinal).padStart(2, '0')}`;
            const generationInputFingerprint = (0, decision_registry_1.hashCanonicalBody)(Object.freeze({
                packageId: input.packageId,
                phase: 'localized_content',
                episodeOrdinal,
                sessionOrdinal,
                interfaceLocales: generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES,
                approvedOutlineFingerprint: input.approvedOutlineFingerprint,
                promptVersion: input.promptVersion,
            }));
            tasks.push(Object.freeze({ taskId, taskOrdinal, phase: 'localized_content', waveId: waveForEpisode(episodeOrdinal), episodeOrdinal, sessionOrdinal, locale: null, generationInputFingerprint }));
        }
    }
    return materializePlan(input.packageId, 'localized_content', Object.freeze({ phase: 'localized_content', approvedOutlineFingerprint: input.approvedOutlineFingerprint, promptVersion: input.promptVersion }), tasks);
}
function buildLearningV2AudioBatchPlan(input) {
    assertPackageInput(input.packageId, input.voiceSettingsFingerprint);
    if (input.episodeContentFingerprints.length !== 32 || input.episodeContentFingerprints.some((fingerprint) => !HASH_RE.test(fingerprint))) {
        throw new Error('learning_v2_course_audio_batch_content_invalid');
    }
    const tasks = input.episodeContentFingerprints.map((contentFingerprint, index) => {
        const episodeOrdinal = index + 1;
        const taskId = `audio:${String(episodeOrdinal).padStart(2, '0')}`;
        const generationInputFingerprint = (0, decision_registry_1.hashCanonicalBody)(Object.freeze({
            packageId: input.packageId,
            phase: 'audio',
            episodeOrdinal,
            contentFingerprint,
            provider: 'openai',
            endpoint: '/v1/audio/speech',
            voices: generator_course_manifest_1.LEARNING_V2_AUDIO_VOICES,
            variantsPerItem: 4,
            voiceSettingsFingerprint: input.voiceSettingsFingerprint,
        }));
        return Object.freeze({ taskId, taskOrdinal: episodeOrdinal, phase: 'audio', waveId: waveForEpisode(episodeOrdinal), episodeOrdinal, sessionOrdinal: null, locale: null, generationInputFingerprint });
    });
    return materializePlan(input.packageId, 'audio', Object.freeze({ phase: 'audio', episodeContentFingerprints: Object.freeze([...input.episodeContentFingerprints]), voiceSettingsFingerprint: input.voiceSettingsFingerprint }), tasks);
}
function cursorBody(plan, nextTaskOrdinal) {
    return Object.freeze({
        schemaVersion: 'learning-v2-course-batch-cursor.v1',
        packageId: plan.packageId,
        phase: plan.phase,
        planFingerprint: plan.planFingerprint,
        nextTaskOrdinal,
    });
}
function materializeLearningV2CourseBatchCursor(plan, nextTaskOrdinal) {
    if (!Number.isSafeInteger(nextTaskOrdinal) || nextTaskOrdinal < 1 || nextTaskOrdinal > plan.tasks.length + 1) {
        throw new Error('learning_v2_course_batch_cursor_ordinal_invalid');
    }
    const body = cursorBody(plan, nextTaskOrdinal);
    return Object.freeze({ ...body, cursorFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) });
}
function assertPlan(plan) {
    const body = Object.freeze({ schemaVersion: plan.schemaVersion, packageId: plan.packageId, phase: plan.phase, generationAuthority: plan.generationAuthority, tasks: plan.tasks });
    if (plan.schemaVersion !== 'learning-v2-course-batch-plan.v1' || !TOKEN_RE.test(plan.packageId) ||
        !['localized_content', 'audio'].includes(plan.phase) || plan.planFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body) ||
        plan.tasks.some((task, index) => task.taskOrdinal !== index + 1 || task.phase !== plan.phase || !HASH_RE.test(task.generationInputFingerprint))) {
        throw new Error('learning_v2_course_batch_plan_invalid');
    }
    if (plan.generationAuthority.phase !== plan.phase)
        throw new Error('learning_v2_course_batch_plan_invalid');
    if (plan.phase === 'localized_content') {
        const authority = plan.generationAuthority;
        if (authority.phase !== 'localized_content' || !HASH_RE.test(authority.approvedOutlineFingerprint) || !TOKEN_RE.test(authority.promptVersion) || plan.tasks.length !== 384) {
            throw new Error('learning_v2_course_batch_plan_invalid');
        }
        for (let index = 0; index < plan.tasks.length; index += 1) {
            const task = plan.tasks[index];
            const episodeOrdinal = Math.floor(index / 12) + 1;
            const sessionOrdinal = (index % 12) + 1;
            const expectedFingerprint = (0, decision_registry_1.hashCanonicalBody)(Object.freeze({ packageId: plan.packageId, phase: 'localized_content', episodeOrdinal, sessionOrdinal, interfaceLocales: generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES, approvedOutlineFingerprint: authority.approvedOutlineFingerprint, promptVersion: authority.promptVersion }));
            if (task.taskId !== `localized:${String(episodeOrdinal).padStart(2, '0')}:${String(sessionOrdinal).padStart(2, '0')}` || task.episodeOrdinal !== episodeOrdinal || task.sessionOrdinal !== sessionOrdinal || task.locale !== null || task.waveId !== waveForEpisode(episodeOrdinal) || task.generationInputFingerprint !== expectedFingerprint) {
                throw new Error('learning_v2_course_batch_plan_invalid');
            }
        }
        return;
    }
    const authority = plan.generationAuthority;
    if (authority.phase !== 'audio' || authority.episodeContentFingerprints.length !== 32 || authority.episodeContentFingerprints.some((fingerprint) => !HASH_RE.test(fingerprint)) ||
        !HASH_RE.test(authority.voiceSettingsFingerprint) || plan.tasks.length !== 32) {
        throw new Error('learning_v2_course_batch_plan_invalid');
    }
    for (let index = 0; index < plan.tasks.length; index += 1) {
        const task = plan.tasks[index];
        const episodeOrdinal = index + 1;
        const expectedFingerprint = (0, decision_registry_1.hashCanonicalBody)(Object.freeze({ packageId: plan.packageId, phase: 'audio', episodeOrdinal, contentFingerprint: authority.episodeContentFingerprints[index], provider: 'openai', endpoint: '/v1/audio/speech', voices: generator_course_manifest_1.LEARNING_V2_AUDIO_VOICES, variantsPerItem: 4, voiceSettingsFingerprint: authority.voiceSettingsFingerprint }));
        if (task.taskId !== `audio:${String(episodeOrdinal).padStart(2, '0')}` || task.episodeOrdinal !== episodeOrdinal || task.sessionOrdinal !== null || task.locale !== null || task.waveId !== waveForEpisode(episodeOrdinal) || task.generationInputFingerprint !== expectedFingerprint) {
            throw new Error('learning_v2_course_batch_plan_invalid');
        }
    }
}
function assertCursor(plan, cursor) {
    const body = cursorBody(plan, cursor.nextTaskOrdinal);
    if (cursor.schemaVersion !== body.schemaVersion || cursor.packageId !== body.packageId || cursor.phase !== body.phase ||
        cursor.planFingerprint !== body.planFingerprint || cursor.cursorFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body)) {
        throw new Error('learning_v2_course_batch_cursor_invalid');
    }
}
function requiredPriorApproval(waveId) {
    if (waveId === 'chapter_1')
        return 'e1';
    if (waveId === 'season')
        return 'chapter_1';
    return null;
}
/**
 * Returns at most four deterministic tasks and never crosses an owner gate.
 * The cursor is advisory: writers still use taskId + input fingerprint as the
 * idempotency authority before publishing an immutable shard.
 */
function nextLearningV2CourseBatch(input) {
    assertPlan(input.plan);
    const cursor = input.cursor ?? materializeLearningV2CourseBatchCursor(input.plan, 1);
    assertCursor(input.plan, cursor);
    if (new Set(input.approvedWaves).size !== input.approvedWaves.length || input.approvedWaves.some((wave) => !['e1', 'chapter_1', 'season'].includes(wave))) {
        throw new Error('learning_v2_course_batch_approvals_invalid');
    }
    const maxItems = input.maxItems ?? MAX_BATCH_SIZE;
    if (!Number.isSafeInteger(maxItems) || maxItems < 1 || maxItems > MAX_BATCH_SIZE)
        throw new Error('learning_v2_course_batch_size_invalid');
    if (cursor.nextTaskOrdinal === input.plan.tasks.length + 1)
        return Object.freeze({ kind: 'drained' });
    const first = input.plan.tasks[cursor.nextTaskOrdinal - 1];
    const requiredApproval = requiredPriorApproval(first.waveId);
    if (requiredApproval && !input.approvedWaves.includes(requiredApproval)) {
        return Object.freeze({ kind: 'blocked_wave_approval', requiredApproval, cursor });
    }
    const tasks = input.plan.tasks.slice(cursor.nextTaskOrdinal - 1, cursor.nextTaskOrdinal - 1 + maxItems)
        .filter((task) => task.waveId === first.waveId);
    const nextTaskOrdinal = cursor.nextTaskOrdinal + tasks.length;
    return Object.freeze({
        kind: 'batch',
        tasks: Object.freeze(tasks),
        nextCursor: nextTaskOrdinal > input.plan.tasks.length ? null : materializeLearningV2CourseBatchCursor(input.plan, nextTaskOrdinal),
    });
}
//# sourceMappingURL=generator_course_batch_plan.js.map