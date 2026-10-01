// зачем: Q66 — перенос идеи 22372ce80: Firebase-параметры режутся по символам, а не по UTF-16,
// и аналитика НЕ бросает исключение на битом суррогате (в оригинале бросала и теряла событие).
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
import { trackEvent, truncateFirebaseString } from '../app/analytics';

beforeEach(() => {
  firebaseLogEvent.mockClear();
});

test('эмодзи на границе 100 символов остаётся целым', async () => {
  await trackEvent('paywall_shown', { video_title: `${'a'.repeat(99)}😀tail` });
  expect(firebaseLogEvent).toHaveBeenCalledWith('paywall_shown', { video_title: `${'a'.repeat(99)}😀` });
  expect(Array.from(firebaseLogEvent.mock.calls[0]?.[1]?.video_title)).toHaveLength(100);
});

test.each(['broken\uD800', '\uDC00broken'])('одиночный суррогат отбрасывается, событие уходит', async (videoTitle) => {
  await trackEvent('paywall_shown', { video_title: videoTitle });
  expect(firebaseLogEvent).toHaveBeenCalledTimes(1);
  expect(firebaseLogEvent.mock.calls[0]?.[1]?.video_title).toBe('broken');
});

test('ASCII режется как раньше — до 100 символов', async () => {
  await trackEvent('paywall_shown', { video_title: 'a'.repeat(101) });
  expect(firebaseLogEvent).toHaveBeenCalledWith('paywall_shown', { video_title: 'a'.repeat(100) });
});

test('truncateFirebaseString: пустая строка и короткий текст без изменений', () => {
  expect(truncateFirebaseString('')).toBe('');
  expect(truncateFirebaseString('привет')).toBe('привет');
});
