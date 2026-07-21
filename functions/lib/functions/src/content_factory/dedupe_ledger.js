"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLessonLedger = parseLessonLedger;
exports.dedupeLessonCandidates = dedupeLessonCandidates;
exports.approveLessonLedger = approveLessonLedger;
exports.rollbackLessonLedger = rollbackLessonLedger;
const node_crypto_1 = require("node:crypto");
function parseLessonLedger(value, studyTarget) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return Object.freeze({ studyTarget, revision: 0, lessons: Object.freeze({}) });
    const record = value;
    if (record.studyTarget !== studyTarget || !Number.isSafeInteger(record.revision) || typeof record.lessons !== 'object' || record.lessons === null || Array.isArray(record.lessons))
        throw new Error('lesson_ledger_invalid');
    const lessons = {};
    for (const [rawId, rawEntry] of Object.entries(record.lessons)) {
        const lessonId = Number(rawId);
        const entry = rawEntry;
        if (!Number.isSafeInteger(lessonId) || lessonId < 1 || typeof entry !== 'object' || entry === null || typeof entry.phraseArtifactId !== 'string' || !Array.isArray(entry.candidateKeys) || entry.candidateKeys.some((item) => typeof item !== 'string') || typeof entry.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(entry.fingerprint))
            throw new Error('lesson_ledger_invalid');
        lessons[lessonId] = Object.freeze({ phraseArtifactId: entry.phraseArtifactId, candidateKeys: Object.freeze(entry.candidateKeys), fingerprint: entry.fingerprint, state: entry.state === 'stale' ? 'stale' : 'approved' });
    }
    return Object.freeze({ studyTarget, revision: Number(record.revision), lessons: Object.freeze(lessons) });
}
function key(candidate) { return `${candidate.partOfSpeech}\u0000${candidate.lemma.normalize('NFKC').toLocaleLowerCase().trim()}`; }
function fingerprint(phraseArtifactId, keys) { return (0, node_crypto_1.createHash)('sha256').update(JSON.stringify([phraseArtifactId, [...keys].sort()])).digest('hex'); }
function dedupeLessonCandidates(ledger, input) {
    const missingPreviousLessonIds = Array.from({ length: Math.max(0, input.lessonId - 1) }, (_, index) => index + 1).filter((id) => !ledger.lessons[id]);
    if (missingPreviousLessonIds.length)
        return Object.freeze({ state: 'review_required', missingPreviousLessonIds: Object.freeze(missingPreviousLessonIds), extracted: input.candidates, accepted: Object.freeze([]), excludedPrevious: Object.freeze([]), rejected: Object.freeze([]) });
    const previous = new Map();
    for (let id = 1; id < input.lessonId; id += 1)
        for (const candidateKey of ledger.lessons[id]?.candidateKeys ?? [])
            if (!previous.has(candidateKey))
                previous.set(candidateKey, id);
    const seen = new Set();
    const accepted = [];
    const excludedPrevious = [];
    const rejected = [];
    for (const candidate of input.candidates) {
        const candidateKey = key(candidate);
        if (seen.has(candidateKey)) {
            rejected.push(candidate);
            continue;
        }
        seen.add(candidateKey);
        const previousLessonId = previous.get(candidateKey);
        if (previousLessonId)
            excludedPrevious.push(Object.freeze({ ...candidate, previousLessonId }));
        else
            accepted.push(candidate);
    }
    return Object.freeze({ state: 'ready', missingPreviousLessonIds: Object.freeze([]), extracted: input.candidates, accepted: Object.freeze(accepted), excludedPrevious: Object.freeze(excludedPrevious), rejected: Object.freeze(rejected) });
}
function approveLessonLedger(ledger, input) {
    const receipt = dedupeLessonCandidates(ledger, input);
    if (receipt.state !== 'ready')
        throw new Error('lesson_ledger_previous_lessons_missing');
    const candidateKeys = Object.freeze(receipt.accepted.map(key).sort());
    const nextFingerprint = fingerprint(input.phraseArtifactId, candidateKeys);
    const previousFingerprint = ledger.lessons[input.lessonId]?.fingerprint;
    const staleLessonIds = previousFingerprint && previousFingerprint !== nextFingerprint ? Object.keys(ledger.lessons).map(Number).filter((id) => id > input.lessonId).sort((a, b) => a - b) : [];
    const lessons = { ...ledger.lessons, [input.lessonId]: Object.freeze({ phraseArtifactId: input.phraseArtifactId, candidateKeys, fingerprint: nextFingerprint, state: 'approved' }) };
    for (const id of staleLessonIds)
        lessons[id] = Object.freeze({ ...lessons[id], state: 'stale' });
    return Object.freeze({ ledger: Object.freeze({ studyTarget: ledger.studyTarget, revision: ledger.revision + 1, lessons: Object.freeze(lessons) }), staleLessonIds: Object.freeze(staleLessonIds) });
}
function rollbackLessonLedger(ledger, lessonId) {
    const lessons = { ...ledger.lessons };
    delete lessons[lessonId];
    for (const id of Object.keys(lessons).map(Number).filter((id) => id > lessonId))
        lessons[id] = Object.freeze({ ...lessons[id], state: 'stale' });
    return Object.freeze({ studyTarget: ledger.studyTarget, revision: ledger.revision + 1, lessons: Object.freeze(lessons) });
}
//# sourceMappingURL=dedupe_ledger.js.map