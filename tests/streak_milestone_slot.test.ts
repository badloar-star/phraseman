import fs from 'fs';
import path from 'path';

import { EMPTY_OVERLAY_WANTS, resolveNextOverlay, type WantsMap } from '../components/overlay_arbiter_core';
import {
  decideStreakMilestoneShow,
  isCoveredByParentSlot,
  shouldRequestStreakMilestoneSlot,
  type StreakMilestoneSlotInput,
} from '../components/streak/moments/streak_milestone_slot';

const base: StreakMilestoneSlotInput = { wants: true, isToast: false, holder: null, shownBefore: false };

describe('рубеж серии на итоге урока: взаимное ожидание очереди', () => {
  it('ФАКТ поломки: пока экран итога держит слот, ключ streakMilestone его не получит никогда', () => {
    const wants: WantsMap = { ...EMPTY_OVERLAY_WANTS, lessonResultsSequence: true, streakMilestone: true };
    // очередь невытесняющая: держатель остаётся, сколько бы раз ни пересчитывали
    expect(resolveNextOverlay('lessonResultsSequence', wants)).toBe('lessonResultsSequence');
  });

  it('под слотом экрана итога окно рубежа свой слот не просит и показывается сразу', () => {
    const input = { ...base, holder: 'lessonResultsSequence' as const };
    expect(isCoveredByParentSlot('lessonResultsSequence')).toBe(true);
    expect(shouldRequestStreakMilestoneSlot(input)).toBe(false);
    expect(decideStreakMilestoneShow(input, false)).toEqual({ show: true, reason: 'parent_slot' });
  });

  it('на других экранах всё по-прежнему: просит слот и ждёт его', () => {
    expect(shouldRequestStreakMilestoneSlot(base)).toBe(true);
    expect(decideStreakMilestoneShow(base, false)).toEqual({ show: false, reason: 'waiting' });
    expect(decideStreakMilestoneShow(base, true)).toEqual({ show: true, reason: 'own_slot' });
  });

  it('чужое окно в слоте прикрытием не считается — два полноэкранных окна на кадре недопустимы', () => {
    for (const holder of ['broadcast', 'update', 'reviewPrompt', 'levelUp', 'themedAlert', 'lessonCompleteNotif'] as const) {
      const input = { ...base, holder };
      expect(isCoveredByParentSlot(holder)).toBe(false);
      expect(shouldRequestStreakMilestoneSlot(input)).toBe(true);
      expect(decideStreakMilestoneShow(input, false).show).toBe(false);
    }
  });

  it('тост слота не берёт и показывается всегда', () => {
    const input = { ...base, isToast: true, holder: 'broadcast' as const };
    expect(shouldRequestStreakMilestoneSlot(input)).toBe(false);
    expect(decideStreakMilestoneShow(input, false)).toEqual({ show: true, reason: 'toast' });
  });

  it('нечего показывать — ни просьбы, ни показа', () => {
    const input = { ...base, wants: false, holder: 'lessonResultsSequence' as const, shownBefore: true };
    expect(shouldRequestStreakMilestoneSlot(input)).toBe(false);
    expect(decideStreakMilestoneShow(input, true)).toEqual({ show: false, reason: 'nothing' });
  });

  it('прикрытие исчезло посреди показа — окно не гаснет и просит свой слот', () => {
    const input = { ...base, holder: null, shownBefore: true };
    expect(shouldRequestStreakMilestoneSlot(input)).toBe(true);
    expect(decideStreakMilestoneShow(input, false)).toEqual({ show: true, reason: 'latched' });
  });
});

describe('рубеж серии: хост использует решение и пишет его в журнал', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'streak', 'moments', 'StreakMilestoneHost.tsx'), 'utf8');

  it('хост берёт держателя слота и решение из streak_milestone_slot', () => {
    expect(src).toContain("from './streak_milestone_slot'");
    expect(src).toContain('useOverlayActiveKey()');
    expect(src).toContain('shouldRequestStreakMilestoneSlot(');
    expect(src).toContain('decideStreakMilestoneShow(');
  });

  it('решение о слоте видно в журнале одной строкой', () => {
    expect(src).toContain("'[STREAK-MILESTONE] slot'");
  });
});
