import fs from 'fs';
import path from 'path';

import { EMPTY_OVERLAY_WANTS, resolveNextOverlay, type OverlayKey, type WantsMap } from '../components/overlay_arbiter_core';
import {
  filterWantsForQuietZone,
  isQuietRoute,
  listQuietDeferredWaiting,
  QUIET_DEFERRED_KEYS,
  QUIET_ROUTE_PATHS,
} from '../components/overlay_quiet_zone';

function wants(...keys: OverlayKey[]): WantsMap {
  const map: WantsMap = { ...EMPTY_OVERLAY_WANTS };
  for (const key of keys) map[key] = true;
  return map;
}

describe('тишина в уроке: какие экраны тихие', () => {
  it('урок, экзамен, карточки и разговор с ИИ — тихие', () => {
    for (const p of ['/lesson1', '/exam', '/level_exam', '/flashcards_blitz_session', '/dialogue_v2_session', '/lesson_complete']) {
      expect(isQuietRoute(p)).toBe(true);
    }
  });

  it('вкладки и обычные экраны — не тихие', () => {
    for (const p of ['/', '/home', '/lessons', '/settings', '/lesson_menu', '/premium_modal', '/lesson10', '']) {
      expect(isQuietRoute(p)).toBe(false);
    }
  });

  it('путь без ведущего слэша, с хвостом и с параметрами распознаётся по первому сегменту', () => {
    expect(isQuietRoute('lesson1')).toBe(true);
    expect(isQuietRoute('/lesson1/')).toBe(true);
    expect(isQuietRoute('/exam?lesson=3')).toBe(true);
    expect(isQuietRoute(null)).toBe(false);
    expect(isQuietRoute(undefined)).toBe(false);
  });

  it('каждый тихий путь — существующий экран в app/ (опечатка не должна молча выключить тишину)', () => {
    for (const route of QUIET_ROUTE_PATHS) {
      const file = path.join(__dirname, '..', 'app', `${route}.tsx`);
      expect({ route, exists: fs.existsSync(file) }).toEqual({ route, exists: true });
    }
  });
});

describe('тишина в уроке: какие окна откладываются', () => {
  it('служебное окно в тихой зоне не получает слот, но остаётся в очереди', () => {
    const map = wants('broadcast', 'update', 'notifNudge');
    const filtered = filterWantsForQuietZone(map, true, null);
    expect(resolveNextOverlay(null, filtered)).toBeNull();
    // исходная просьба не тронута — после выхода окно покажется
    expect(map.broadcast).toBe(true);
    expect(resolveNextOverlay(null, filterWantsForQuietZone(map, false, null))).toBe('update');
  });

  it('окна самого занятия и блокирующие алерты проходят и в тихой зоне', () => {
    const map = wants('broadcast', 'themedAlert', 'lessonResultsSequence', 'actionToast', 'streakMilestone', 'reviewPrompt');
    const filtered = filterWantsForQuietZone(map, true, null);
    expect(filtered.themedAlert).toBe(true);
    expect(filtered.lessonResultsSequence).toBe(true);
    expect(filtered.actionToast).toBe(true);
    expect(filtered.streakMilestone).toBe(true);
    expect(filtered.reviewPrompt).toBe(true);
    expect(filtered.broadcast).toBe(false);
  });

  it('окно, которое уже держит слот, не снимается при входе в тихую зону', () => {
    const map = wants('broadcast', 'appMessageModal');
    const filtered = filterWantsForQuietZone(map, true, 'broadcast');
    expect(resolveNextOverlay('broadcast', filtered)).toBe('broadcast');
    // а следующее служебное за ним уже не встанет
    expect(resolveNextOverlay(null, filterWantsForQuietZone(wants('appMessageModal'), true, null))).toBeNull();
  });

  it('вне тихой зоны список желающих возвращается тем же объектом (без лишних перерисовок)', () => {
    const map = wants('broadcast');
    expect(filterWantsForQuietZone(map, false, null)).toBe(map);
  });

  it('в тихой зоне без служебных желающих список тоже не пересоздаётся', () => {
    const map = wants('actionToast');
    expect(filterWantsForQuietZone(map, true, null)).toBe(map);
  });

  it('список отложенных для журнала — только ждущие служебные, без держателя слота', () => {
    expect(listQuietDeferredWaiting(wants('broadcast', 'update', 'actionToast'), true, 'broadcast')).toEqual(['update']);
    expect(listQuietDeferredWaiting(wants('broadcast'), false, null)).toEqual([]);
  });

  it('откладываются именно служебные окна корня, а не праздники и не алерты', () => {
    for (const key of ['update', 'authRecovery', 'releaseNotes', 'broadcast', 'appMessageModal', 'personalAdminMessage', 'notifNudge', 'entitlementExpired', 'referralWelcome'] as OverlayKey[]) {
      expect(QUIET_DEFERRED_KEYS.has(key)).toBe(true);
    }
    for (const key of ['themedAlert', 'lessonResultsSequence', 'lessonCompleteNotif', 'reviewPrompt', 'actionToast', 'coachToast', 'streakMilestone', 'firstDialog', 'videoReward', 'premiumCelebration'] as OverlayKey[]) {
      expect(QUIET_DEFERRED_KEYS.has(key)).toBe(false);
    }
  });
});
