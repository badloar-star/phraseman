// Гейт №3 Learning V2 проверяет только ВЫПУЩЕННОЕ (≤ потолка бандла), как гейт озвучки №4 (координатор 15.10, V2 показан в R1).
// зачем: невыпущенные занятия (их нельзя открыть) не держат выпуск красным, а замечание в выпущенном — по-прежнему красное.
import assert from 'node:assert/strict';
import test from 'node:test';
import { isReleasedSemanticDriftAdvisory, releasedSessionOrdinal, releasedSessionScope, splitByReleasedScope } from '../scripts/learning_v2_release_parity_gate.mjs';

test('номер занятия — из пути копии и из id задания', () => {
  assert.equal(releasedSessionOrdinal('l01/s07/answers.json'), 7);
  assert.equal(releasedSessionOrdinal('en:lesson-01:session-11:i17'), 11);
  assert.equal(releasedSessionOrdinal('manifest.json'), null);
});

test('невыпущенное не влияет, выпущенное с замечанием — красное, общий файл — красное', () => {
  const issues = [
    { code: 'CONTENT_MISMATCH', path: 'l01/s12/intro.json' },
    { code: 'AUDIO_EVIDENCE_UNVERIFIED', interactionId: 'en:lesson-01:session-30:i4' },
  ];
  assert.deepEqual(splitByReleasedScope(issues, 11).blocking, []);
  const withReleased = [...issues, { code: 'AUDIO_EVIDENCE_UNVERIFIED', interactionId: 'en:lesson-01:session-09:i14' }, { code: 'ONLY_CANONICAL', path: 'index.json' }];
  const split = splitByReleasedScope(withReleased, 11);
  assert.equal(split.blocking.length, 2);
  assert.equal(split.deferred.length, 2);
});

test('потолок не прочитан — строго, весь курс', () => {
  const issues = [{ code: 'CONTENT_MISMATCH', path: 'l01/s40/learner.json' }];
  assert.equal(splitByReleasedScope(issues, null).blocking.length, 1);
  assert.equal(releasedSessionScope(null).length, releasedSessionScope(1000).length);
  assert.deepEqual(releasedSessionScope(2), ['en/l01/s01', 'en/l01/s02']);
});

test('расхождение исходники ↔ выпуск в выпущенных — справка; пауза фабрики, сбой и весь курс — блок (владелец 15.10)', () => {
  const drift = { ready: false, output: '[BUILD][WARN] source_release_parity:en/l01/s09:x\n[BUILD][WARN] source/release semantic parity: BLOCKED (135 mismatches)' };
  assert.equal(isReleasedSemanticDriftAdvisory(drift, 15), true);
  assert.equal(isReleasedSemanticDriftAdvisory(drift, null), false);
  assert.equal(isReleasedSemanticDriftAdvisory({ ...drift, output: drift.output + '\nfactory_intro_practice_course_hold:check' }, 15), false);
  assert.equal(isReleasedSemanticDriftAdvisory({ ready: false, code: 'SEMANTIC_CHECKER_FAILED_TO_START', output: '' }, 15), false);
  assert.equal(isReleasedSemanticDriftAdvisory({ ready: false, output: 'что-то другое' }, 15), false);
  assert.equal(isReleasedSemanticDriftAdvisory({ ready: true, output: '' }, 15), false);
});
