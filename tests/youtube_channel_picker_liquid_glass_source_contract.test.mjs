import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const picker = readFileSync(new URL('../components/youtube/YoutubeChannelPickerSheet.tsx', import.meta.url), 'utf8');
const screen = readFileSync(new URL('../app/lingman_videos.tsx', import.meta.url), 'utf8');

test('live video channel picker uses the approved glass sheet without changing selection', () => {
  assert.match(picker, /motionVariant = 'hybrid'/);
  assert.match(picker, /material="liquid-glass"/);
  assert.match(picker, /glassFill\(t\.bgCard, 0\.46\)/);
  assert.match(picker, /backgroundColor: glassFill\(t\.bgSurface, 0\.72\)/);
  assert.match(picker, /paddingBottom: Math\.max\(32, insets\.bottom \+ 12\)/);
  assert.match(picker, /onPress=\{\(\) => onSelect\(\{ mode: 'manual', channelId: channel\.id \}\)\}/);
  assert.match(screen, /<YoutubeChannelPickerSheet[\s\S]{0,350}motionVariant="hybrid"/);
});
