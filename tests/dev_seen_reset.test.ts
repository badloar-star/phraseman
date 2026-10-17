// зачем (координатор 18.10, блокер Сверки): dev-ссылка seen=reset|<окно> снимает «уже показано» окон «один раз на аккаунт».
import fs from 'node:fs';
import path from 'node:path';
import { devSeenResetKeys, parseDevSeenRequest } from '../app/dev_seen_reset';

describe('dev seen reset', () => {
  it('отдельное окно — только его ключи; рефералка — с ключом текущего stableId', () => {
    expect(devSeenResetKeys('energy', 'S1', [])).toEqual(['energy_onboarding_shown']);
    expect(devSeenResetKeys('welcome', 'S1', [])).toEqual(['welcome_back_shown_at_v1', 'winback_shown_at_v1']);
    expect(devSeenResetKeys('referral', 'S1', [])).toEqual(['referral_access_ended_seen_for_v1', 'referral_welcome_seen::S1']);
    expect(devSeenResetKeys('referral', null, [])).toEqual(['referral_access_ended_seen_for_v1']);
  });

  it('сторис — только локальные события сторис из хранилища; team — локально ничего', () => {
    const stored = ['story_events_v1:abc', 'story_events_v1:def', 'user_name', 'stories_v1'];
    expect(devSeenResetKeys('stories', 'S1', stored)).toEqual(['story_events_v1:abc', 'story_events_v1:def']);
    expect(devSeenResetKeys('team', 'S1', stored)).toEqual([]);
  });

  it('reset — все окна сразу, без посторонних ключей', () => {
    const keys = devSeenResetKeys('reset', 'S1', ['story_events_v1:x', 'user_name', 'premium_active']);
    expect(keys).toEqual(expect.arrayContaining([
      'energy_onboarding_shown', 'welcome_back_shown_at_v1', 'premium_celebration_seen_v1', 'referral_welcome_seen::S1', 'story_events_v1:x',
    ]));
    expect(keys).not.toContain('user_name');
    expect(keys).not.toContain('premium_active');
  });

  it('разбор параметра: reset и известные окна; прочее — отказ', () => {
    expect(parseDevSeenRequest('reset')).toBe('reset');
    expect(parseDevSeenRequest('Plus')).toBe('plus');
    expect(parseDevSeenRequest('everything')).toBeUndefined();
  });

  it('в стор-сборке ветка недоступна: шаг seen стоит после гейта isDevStateAvailable в applyDevState', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'dev_state_fixtures.ts'), 'utf8');
    const applyAt = src.indexOf('export async function applyDevState(');
    const gateAt = src.indexOf('if (!isDevStateAvailable()) {', applyAt);
    const seenAt = src.indexOf("if (request.seen) {", applyAt);
    expect(applyAt).toBeGreaterThan(0);
    expect(gateAt).toBeGreaterThan(applyAt);
    expect(seenAt).toBeGreaterThan(gateAt);
    expect(src.slice(gateAt, gateAt + 200)).toContain("return { applied, skipped: { all: 'not_dev_build' }, next: null };");
  });
});
