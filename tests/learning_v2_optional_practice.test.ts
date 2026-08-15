// зачем: опциональная практика — фармилка доступа, но НЕ прогресса: максимум два
// слота, никогда не блокирует юнит и не пишет mastery. RED фиксирует детерминированный
// приоритет источников (ошибки → должники → текущий юнит).
import { selectOptionalPracticeSlots } from '../modules/learning-v2/content/optional_practice';

test('shows at most two eligible optional nodes and never blocks the unit', () => {
  const result = selectOptionalPracticeSlots({
    episodeId: 'ep-01',
    microphoneAvailable: true,
    networkAvailable: true,
    dueContentItemIds: ['e1-a'],
    mistakeContentItemIds: ['e1-b'],
    capabilities: [
      { capabilityId: 'quick-speak-v1', family: 'quick_spoken_response', requiresMicrophone: true, requiresNetwork: false, expectedSeconds: 75 },
      { capabilityId: 'echo-rhythm-v1', family: 'shadowing_prosody', requiresMicrophone: true, requiresNetwork: false, expectedSeconds: 90 },
      { capabilityId: 'listen-respond-v1', family: 'scripted_dialogue', requiresMicrophone: true, requiresNetwork: true, expectedSeconds: 120 },
    ],
  });
  expect(result).toHaveLength(2);
  expect(result.every((slot) => slot.requiredForProgress === false)).toBe(true);
});

test('omits microphone-only capabilities when speech is unavailable', () => {
  expect(selectOptionalPracticeSlots({
    episodeId: 'ep-01',
    microphoneAvailable: false,
    networkAvailable: false,
    dueContentItemIds: [],
    mistakeContentItemIds: [],
    capabilities: [{ capabilityId: 'quick-speak-v1', family: 'quick_spoken_response', requiresMicrophone: true, requiresNetwork: false, expectedSeconds: 75 }],
  })).toEqual([]);
});

// зачем: доп. броня — детерминированный порядок (mistake раньше due), стабильная
// сортировка по capabilityId, фильтр сети, mastery всегда false, слоты заморожены.
test('prioritises mistake over due and stays deterministic by capabilityId', () => {
  const input = {
    episodeId: 'ep-01',
    microphoneAvailable: true,
    networkAvailable: false,
    dueContentItemIds: ['e1-due'],
    mistakeContentItemIds: ['e1-mistake'],
    capabilities: [
      { capabilityId: 'zeta-drill-v1', family: 'context_gap_grammar', requiresMicrophone: false, requiresNetwork: false, expectedSeconds: 60 },
      { capabilityId: 'alpha-drill-v1', family: 'phrase_builder', requiresMicrophone: false, requiresNetwork: false, expectedSeconds: 60 },
      { capabilityId: 'net-only-v1', family: 'scripted_dialogue', requiresMicrophone: false, requiresNetwork: true, expectedSeconds: 60 },
    ],
  } as const;
  const result = selectOptionalPracticeSlots(input);
  expect(result).toHaveLength(2);
  expect(result[0].sourcePriority).toBe('mistake');
  expect(result[0].capabilityId).toBe('alpha-drill-v1');
  expect(result[1].capabilityId).toBe('zeta-drill-v1');
  expect(result.every((slot) => slot.canWriteMastery === false)).toBe(true);
  expect(result.every((slot) => Object.isFrozen(slot))).toBe(true);
  const again = selectOptionalPracticeSlots({ ...input, capabilities: [...input.capabilities].reverse() });
  expect(JSON.parse(JSON.stringify(again))).toEqual(JSON.parse(JSON.stringify(result)));
});

test('falls back to current unit when no personalised sources exist', () => {
  const result = selectOptionalPracticeSlots({
    episodeId: 'ep-01',
    microphoneAvailable: true,
    networkAvailable: true,
    dueContentItemIds: [],
    mistakeContentItemIds: [],
    capabilities: [
      { capabilityId: 'quick-speak-v1', family: 'quick_spoken_response', requiresMicrophone: true, requiresNetwork: false, expectedSeconds: 75 },
    ],
  });
  expect(result).toHaveLength(1);
  expect(result[0].sourcePriority).toBe('current_unit');
  expect(result[0].episodeId).toBe('ep-01');
});
