// зачем (packs-simple-004): тап сразу ведёт на экран набора, карточки догружаются — повторный тап не запускает вторую
// загрузку, а экран коллекции получает тот же промис открытия.
jest.mock('../app/community_packs/staging', () => ({
  stageCommunityPackCardsForNavigation: jest.fn(),
}));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn(), actionToastTri: jest.fn(() => ({})) }));

import { stageCommunityPackCardsForNavigation } from '../app/community_packs/staging';
import {
  __resetCommunityPackOpensForTests,
  peekCommunityPackOpen,
  startCommunityPackOpen,
} from '../app/community_packs/stage_with_retry';

const stage = stageCommunityPackCardsForNavigation as jest.Mock;
const card = { id: 'c1', en: 'Hi', ru: 'Привет', uk: 'Привіт', source: 'community', sourceId: 'p' };

describe('community pack open registry', () => {
  beforeEach(() => {
    __resetCommunityPackOpensForTests();
    stage.mockReset();
  });

  it('double tap shares one opening — staging runs once', async () => {
    let resolve: (value: unknown[]) => void = () => {};
    stage.mockReturnValue(new Promise((r) => { resolve = r; }));
    const first = startCommunityPackOpen('p1', 'en', undefined, 'test');
    const second = startCommunityPackOpen('p1', 'en', undefined, 'test');
    expect(second).toBe(first);
    expect(peekCommunityPackOpen('p1', 'en')).toBe(first);
    resolve([card]);
    await expect(first).resolves.toHaveLength(1);
    expect(stage).toHaveBeenCalledTimes(1);
  });

  it('a settled opening can be started again (next tap after a finished open)', async () => {
    stage.mockResolvedValue([card]);
    await startCommunityPackOpen('p2', 'en', undefined, 'test');
    await startCommunityPackOpen('p2', 'en', undefined, 'test');
    expect(stage).toHaveBeenCalledTimes(2);
  });

  it('peek is null for a pack that was never opened from a tap', () => {
    expect(peekCommunityPackOpen('nope', 'en')).toBeNull();
  });
});
