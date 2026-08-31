import fs from 'node:fs';
import path from 'node:path';

import { actionToastToneLabel, resolveActionToastMessage } from '../components/action_toast_copy';

const ROOT = path.join(__dirname, '..');

test('English action toast payload resolves English before the legacy Russian fallback', () => {
  expect(resolveActionToastMessage({
    type: 'error',
    messageRu: 'Не удалось',
    messageEn: 'Could not apply the gift. Try again.',
  }, 'en')).toBe('Could not apply the gift. Try again.');
  expect(actionToastToneLabel('error').en).toBe('Something went wrong');
});

test.each([
  'app/(tabs)/home.tsx',
  'app/level_gifts_inventory.tsx',
])('%s supplies English Daily Journey failure feedback', (relative) => {
  const source = fs.readFileSync(path.join(ROOT, relative), 'utf8');
  const dailyJourneyError = source.slice(
    source.indexOf("messageRu: '", source.indexOf('daily_journey')),
    source.indexOf('});', source.indexOf("messageRu: '", source.indexOf('daily_journey'))),
  );
  expect(dailyJourneyError).toContain('messageEn:');
});
