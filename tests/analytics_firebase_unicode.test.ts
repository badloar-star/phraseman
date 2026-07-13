const firebaseLogEvent = jest.fn();

jest.mock('../app/firebase', () => ({
  logEvent: (...args: unknown[]) => firebaseLogEvent(...args),
}));
jest.mock('../app/posthog_client', () => ({
  capturePostHog: jest.fn(),
  identifyPostHog: jest.fn(),
  resetPostHog: jest.fn(),
  isPostHogEnabled: () => false,
}));

// Jest mocks must be registered before this module import.
// eslint-disable-next-line import/first
import { trackEvent } from '../app/analytics';

beforeEach(() => {
  firebaseLogEvent.mockClear();
});

test('preserves a complete boundary emoji in the Firebase payload', async () => {
  const videoTitle = `${'a'.repeat(99)}😀tail`;

  await trackEvent('youtube_video_select', { video_title: videoTitle });

  expect(firebaseLogEvent).toHaveBeenCalledWith('youtube_video_select', {
    video_title: `${'a'.repeat(99)}😀`,
  });
  const emittedTitle = firebaseLogEvent.mock.calls[0]?.[1]?.video_title;
  expect(Array.from(emittedTitle)).toHaveLength(100);
});

test.each(['broken\uD800', '\uDC00broken'])('rejects malformed surrogate input before Firebase emission', async (videoTitle) => {
  await trackEvent('youtube_video_select', { video_title: videoTitle });

  expect(firebaseLogEvent).not.toHaveBeenCalled();
});

test('preserves the existing 100-character ASCII truncation policy', async () => {
  await trackEvent('youtube_video_select', { video_title: 'a'.repeat(101) });

  expect(firebaseLogEvent).toHaveBeenCalledWith('youtube_video_select', {
    video_title: 'a'.repeat(100),
  });
});
