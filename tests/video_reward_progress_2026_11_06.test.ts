// Governance-ID: TG-397DCBE708F3
import fs from 'node:fs';
import path from 'node:path';
import { VIDEO_REWARD_MILESTONES, videoRewardMilestoneFor, videoRewardProgressPercent, videoRewardRowVisible } from '../app/video_reward_progress';

// зачем (владелец 06.11 через координатора): шкала «до +500» — 70 % реального просмотра = «100 %»; строки нет для live и уже полученной награды; журнал на 0/25/50/75/100
const root = path.join(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('шкала награды за просмотр', () => {
  test('проценты нормируются на порог 70 %: порог = 100', () => {
    const duration = 600; const target = duration * 0.7;
    expect(videoRewardProgressPercent(0, target)).toBe(0);
    expect(videoRewardProgressPercent(target / 2, target)).toBe(50);
    expect(videoRewardProgressPercent(target, target)).toBe(100);
    expect(videoRewardProgressPercent(target * 3, target)).toBe(100);
    expect(videoRewardProgressPercent(126, target)).toBe(30);
  });
  test('мусор не ломает: ноль, NaN, отрицательные', () => {
    expect(videoRewardProgressPercent(10, 0)).toBe(0);
    expect(videoRewardProgressPercent(Number.NaN, 100)).toBe(0);
    expect(videoRewardProgressPercent(-5, 100)).toBe(0);
  });
  test('отметки журнала 0/25/50/75/100', () => {
    expect(VIDEO_REWARD_MILESTONES).toEqual([0, 25, 50, 75, 100]);
    expect([0, 24, 25, 49, 50, 74, 75, 99, 100].map(videoRewardMilestoneFor)).toEqual([0, 0, 25, 25, 50, 50, 75, 75, 100]);
  });
  test('строка: нет для live/коротких (null) и уже полученной награды; «Засчитано» остаётся, если получена сейчас', () => {
    expect(videoRewardRowVisible({ percent: null, rewardedBefore: false, grantedNow: false })).toBe(false);
    expect(videoRewardRowVisible({ percent: 40, rewardedBefore: true, grantedNow: false })).toBe(false);
    expect(videoRewardRowVisible({ percent: 40, rewardedBefore: false, grantedNow: false })).toBe(true);
    expect(videoRewardRowVisible({ percent: 100, rewardedBefore: true, grantedNow: true })).toBe(true);
  });
});

describe('экран ролика и детектор', () => {
  const screen = read('app/lingman_video_watch.tsx');
  const hook = read('hooks/use_video_full_watch.ts');
  const view = read('components/video/VideoRewardProgress.tsx');
  test('экран берёт прогресс из детектора и скрывает строку по правилу', () => {
    expect(screen).toContain('progressPct: rewardProgressPct');
    expect(screen).toContain('videoRewardRowVisible({ percent: rewardProgressPct, rewardedBefore: rewardedIds.has(videoId), grantedNow: rewardFlashKey > 0 })');
    expect(screen).toContain('<VideoRewardProgress');
  });
  test('детектор: порог из videoFullTarget, обновление не чаще секунды, журнал [VIDEO-REWARD-PROGRESS]', () => {
    expect(hook).toContain('videoRewardProgressPercent(tick.state.accumulatedSec, videoFullTarget(durationSec))');
    expect(hook).toContain('nowMs - last.atMs < 1000');
    expect(hook).toContain("'[VIDEO-REWARD-PROGRESS]'");
  });
  test('строка: монета ранга, цвета только из пропсов, 9 языков в экране, без обводок', () => {
    expect(view).toContain('MyRankCoin');
    expect(view).not.toMatch(/borderWidth|borderColor|#[0-9a-fA-F]{3,8}\b/);
    const doneLine = screen.split('\n').find((l) => l.includes('rewardDone:')) ?? '';
    for (const code of ['ru', 'uk', 'en', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl']) expect(doneLine).toContain(`${code}:`);
  });
});
