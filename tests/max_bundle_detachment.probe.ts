import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const file of [
  'modules/audio/sound_events.ts',
  'modules/audio/sound_motion.ts',
  'modules/audio/celebrationBackgroundPlayer.ts',
  'components/dev/motion_showcase/sections/paywalls.tsx',
  'app/push_token_registration.ts',
  'app/settings_notifications.tsx',
]) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert.equal(/max_awaken|cel_max|maxLessonReminderCron|MAX_SECTION|Plus\/Pro\/VIP\/MAX|Plus\/Pro\/MAX|Уроки с MAX/i.test(source), false, file);
}
console.log('MAX bundle and client references: 6 checks passed');
