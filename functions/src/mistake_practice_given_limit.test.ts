/** 04.10 (вариант А): ответ ученика в событии ошибки хранится в облаке — не больше 200 знаков. */
import { MISTAKE_GIVEN_MAX_CHARS, parseMistakePracticeEventSyncRequest } from './mistake_practice_event_sync';

const base = {
  eventId: 'mistake-practice:v1:' + 'a'.repeat(64),
  mistakeId: 'mistake:v1:' + 'b'.repeat(64),
  cycleId: 'mistake-cycle:v1:' + 'c'.repeat(64),
  type: 'captured',
  occurredAtMs: 100,
  studyTarget: 'en',
};
const append = (given: string) => parseMistakePracticeEventSyncRequest({
  action: 'append', expectedStableUid: 'owner-a', studyTarget: 'en',
  events: [{ ...base, payload: { canonicalTarget: 'I am ready.', given } }],
}) as unknown as { events: Array<{ payload: { given: string } }> };

beforeEach(() => jest.spyOn(console, 'info').mockImplementation(() => undefined));
afterEach(() => jest.restoreAllMocks());

test('a long answer from an old client is cut to 200 chars and logged', () => {
  const parsed = append('x'.repeat(500));
  expect(parsed.events[0].payload.given).toHaveLength(MISTAKE_GIVEN_MAX_CHARS);
  expect(console.info).toHaveBeenCalledWith('[MISTAKE-SYNC] given_truncated', JSON.stringify({ chars: 500 }));
});

test('a normal answer is stored as is and the same event re-parses to the same bytes', () => {
  expect(append('I is ready').events[0].payload.given).toBe('I is ready');
  expect(JSON.stringify(append('y'.repeat(300)))).toBe(JSON.stringify(append('y'.repeat(300))));
  expect(console.info).toHaveBeenCalledTimes(2);
});
