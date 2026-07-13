import { runNonBlockingYoutubeAction } from '../app/youtube_player_actions';

test('calls analytics before linking and a rejected analytics promise cannot block linking', async () => {
  const order: string[] = [];
  const analytics = jest.fn(() => { order.push('analytics'); return Promise.reject(new Error('offline')); });
  const linking = jest.fn(() => { order.push('linking'); return Promise.resolve(); });
  runNonBlockingYoutubeAction(analytics, linking);
  expect(order).toEqual(['analytics', 'linking']);
  expect(linking).toHaveBeenCalledTimes(1);
  await Promise.resolve();
});

test('a synchronous analytics error also cannot block linking', () => {
  const linking = jest.fn();
  runNonBlockingYoutubeAction(() => { throw new Error('broken'); }, linking);
  expect(linking).toHaveBeenCalledTimes(1);
});
