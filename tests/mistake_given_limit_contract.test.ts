/** 04.10 (вариант А): клиент режет ответ ученика до 200 знаков до записи события, которое уйдёт в облако. */
import fs from 'fs';
import path from 'path';
import { MISTAKE_GIVEN_MAX_CHARS } from '../modules/mistake-practice/contracts';

const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('client caps the learner answer and the contract no longer claims it stays local', () => {
  expect(MISTAKE_GIVEN_MAX_CHARS).toBe(200);
  expect(read('app/mistake_practice_capture.ts')).toContain('attempt.facet.given.slice(0, MISTAKE_GIVEN_MAX_CHARS)');
  const contracts = read('modules/mistake-practice/contracts.ts');
  expect(contracts).not.toContain('в Firestore не уходит');
  expect(contracts).toContain('СИНХРОНИЗИРУЕТСЯ в облако');
});
