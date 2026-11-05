// Макет docs/work/mockups/video-reward-2026-11-05 (одобрен владельцем 05.11): на превью ролика — монета ТЕКУЩЕГО ранга + «+500»;
// получено — приглушённая монета с галочкой. Без обводок и пояснительных подписей. Показ — только под флагом (пока награда не начисляется).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('VideoRewardBadge', () => {
  const badge = read('components/video_reward/VideoRewardBadge.tsx');
  const flag = read('components/video_reward/video_reward_flag.ts');

  it('флаг и условия — из хуков Моментов: remote-флаг, длительность ≥ 30 с, не эфир', () => {
    expect(badge).toContain('isVideoFullRewardEnabled()');
    expect(badge).toContain("videoFullEligibility(durationSec, live) !== 'ok'");
    expect(badge).toContain('rewarded.has(videoId)');
    expect(flag).toContain('VIDEO_REWARD_COINS = 500');
  });

  it('монета текущего ранга; «получено» — приглушённая монета с галочкой без «+500»', () => {
    expect(badge).toContain('useMyCoinRankBinding()');
    expect(badge).toContain('COIN_RANK_TABLE');
    expect(badge).toContain('coinGot');
    expect(badge).toContain("name=\"checkmark\"");
  });

  it('без обводок и подписей: нет borderWidth/borderColor', () => {
    expect(badge).not.toMatch(/border(Width|Color)\s*:/);
  });

  it('карточка раздела «Видео» рисует бейдж и учитывает rewardGot в memo', () => {
    const card = read('components/youtube/YoutubeVideoGridCard.tsx');
    expect(card).toContain('<VideoRewardBadge videoId={video.id}');
  });
});

describe('лента видео на Главной рисует бейдж и передаёт плееру длительность', () => {
  const rail = read('components/home/v2/HomeV2VideoRail.tsx');
  it('бейдж на карточке рейки', () => { expect(rail).toContain('<VideoRewardBadge videoId={video.id} durationSec={video.durationSec} />'); });
  it('плеер получает durationSec и live', () => { expect(rail).toContain('durationSec={selectedVideo.durationSec} live={false}'); });
  it('нет подписи про «Ты досмотрел видео до конца» (слово владельца)', () => { expect(rail).not.toContain('досмотрел'); });
});
