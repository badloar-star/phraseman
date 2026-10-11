// зачем (координатор 22:20: «durationSec пуст у части роликов»): длительность из каталога не должна теряться
// при переводе ролика в ленту Главной; у ролика без длительности (эфир, премьера) поля нет — плашка не рисуется.
jest.mock('../app/video_language_contour', () => ({ resolveVideoChannelForStudyTarget: jest.fn() }));

import { catalogVideoToRailVideo } from '../app/home_video_rail_source';

const base = {
  id: 'dQw4w9WgXcQ', channelId: 'ch', title: 't', description: 'd', thumbnailUrl: 'u', watchUrl: 'w',
  publishedAt: '2026-10-01T00:00:00Z', state: 'video' as const, playlistIds: [] as string[],
};

describe('catalogVideoToRailVideo', () => {
  it('переносит длительность', () => {
    expect(catalogVideoToRailVideo({ ...base, durationSec: 615 }).durationSec).toBe(615);
  });
  it('без длительности — поля нет', () => {
    expect('durationSec' in catalogVideoToRailVideo(base)).toBe(false);
  });
});
