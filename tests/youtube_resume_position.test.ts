/**
 * §126 п.9: «видео не помнит позицию» — ролик продолжается с места остановки, досмотренный — с начала.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetYoutubeResumeForTests,
  forgetYoutubePosition,
  readYoutubeResumeSec,
  rememberYoutubePosition,
} from '../app/youtube_resume_position';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  await AsyncStorage.clear();
  __resetYoutubeResumeForTests();
});

test('remembers the position and resumes from it; too early → from the start', async () => {
  rememberYoutubePosition('vid-a', 93.7, true);
  rememberYoutubePosition('vid-b', 3, true);
  await expect(readYoutubeResumeSec('vid-a')).resolves.toBe(93);
  await expect(readYoutubeResumeSec('vid-b')).resolves.toBeNull();
  await expect(readYoutubeResumeSec('vid-unknown')).resolves.toBeNull();
});

test('an ended video is forgotten', async () => {
  rememberYoutubePosition('vid-a', 120, true);
  forgetYoutubePosition('vid-a');
  await flush();
  await expect(readYoutubeResumeSec('vid-a')).resolves.toBeNull();
});

test('survives an app restart through storage (forced write)', async () => {
  rememberYoutubePosition('vid-a', 61, true);
  await flush();
  await flush();
  __resetYoutubeResumeForTests();
  await expect(readYoutubeResumeSec('vid-a')).resolves.toBe(61);
});

test('keeps at most 50 videos — the oldest are dropped', async () => {
  const now = Date.now();
  const spy = jest.spyOn(Date, 'now');
  for (let i = 0; i < 55; i += 1) {
    spy.mockReturnValue(now + i * 20_000);
    rememberYoutubePosition(`vid-${i}`, 30 + i, true);
    await flush();
  }
  spy.mockRestore();
  await flush();
  const raw = await AsyncStorage.getItem('youtube_resume_positions_v1');
  const stored = JSON.parse(String(raw)) as Record<string, unknown>;
  expect(Object.keys(stored)).toHaveLength(50);
  expect(stored['vid-0']).toBeUndefined();
  expect(stored['vid-54']).toBeDefined();
});
