import assert from 'node:assert/strict';

const energyContract = require('../app/energy_contract') as {
  canChargeClassicLessonEntry?: (state: {
    energyReady: boolean;
    lessonHydrated: boolean;
    introGateReady: boolean;
    introVisible: boolean;
    hasPlayableRows: boolean;
    remoteSourceReady: boolean;
  }) => boolean;
  isLearningV2DirectSessionUnready?: (state: {
    directMode: boolean;
    sessionId: string;
    sessionRunId: string;
    hasReadyHandle: boolean;
    routeCoordinatesReady: boolean;
  }) => boolean;
  canChargePreparedTrainingEntry?: (state: { energyReady: boolean; hasPlayableItems: boolean }) => boolean;
  isLearningV2LegacySessionUnready?: (state: { directMode: boolean; sessionIdKnown: boolean }) => boolean;
};

const ready = {
  energyReady: true,
  lessonHydrated: true,
  introGateReady: true,
  introVisible: false,
  hasPlayableRows: true,
  remoteSourceReady: true,
};

assert.equal(typeof energyContract.canChargeClassicLessonEntry, 'function');
assert.equal(energyContract.canChargeClassicLessonEntry(ready), true);

for (const state of [
  { hasPlayableRows: false },
  { lessonHydrated: false },
  { introGateReady: false },
  { introVisible: true },
  { remoteSourceReady: false },
  { energyReady: false },
]) {
  assert.equal(energyContract.canChargeClassicLessonEntry({ ...ready, ...state }), false);
}

console.log('classic lesson paid-entry readiness: 7 cases passed');

const directUnready = energyContract.isLearningV2DirectSessionUnready;
assert.equal(typeof directUnready, 'function');
const directReady = { directMode: true, sessionId: 'lesson-1-session-1', sessionRunId: 'run-1', hasReadyHandle: true, routeCoordinatesReady: true };
assert.equal(directUnready!(directReady), false);
assert.equal(directUnready!({ ...directReady, hasReadyHandle: false }), true);
assert.equal(directUnready!({ ...directReady, routeCoordinatesReady: false }), true);
assert.equal(directUnready!({ ...directReady, sessionId: '' }), true);
assert.equal(directUnready!({ ...directReady, sessionRunId: '' }), true);
assert.equal(directUnready!({ ...directReady, directMode: false }), false);
console.log('Learning V2 direct paid-entry readiness: 6 cases passed');

const trainingReady = energyContract.canChargePreparedTrainingEntry;
assert.equal(typeof trainingReady, 'function');
assert.equal(trainingReady!({ energyReady: true, hasPlayableItems: true }), true);
assert.equal(trainingReady!({ energyReady: false, hasPlayableItems: true }), false);
assert.equal(trainingReady!({ energyReady: true, hasPlayableItems: false }), false);
console.log('prepared training paid-entry readiness: 3 cases passed');

const legacyUnready = energyContract.isLearningV2LegacySessionUnready;
assert.equal(typeof legacyUnready, 'function');
assert.equal(legacyUnready!({ directMode: false, sessionIdKnown: false }), true);
assert.equal(legacyUnready!({ directMode: false, sessionIdKnown: true }), false);
assert.equal(legacyUnready!({ directMode: true, sessionIdKnown: false }), false);
console.log('Learning V2 legacy route readiness: 3 cases passed');
