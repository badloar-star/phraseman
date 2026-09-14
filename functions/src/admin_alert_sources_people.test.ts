import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  banAlertFromWrite,
  newUserAlertFromWrite,
  referralAlertsFromWrite,
} from './admin_alert_sources_people';

const NOW_MS = Date.UTC(2026, 8, 12, 18, 0);

describe('people and referral Telegram alert sources', () => {
  test('creates the mandatory new-user event only for a newly created profile', () => {
    expect(newUserAlertFromWrite({
      userId: 'stable-user-A1B2',
      beforeExists: false,
      afterExists: true,
      occurredAtMs: NOW_MS,
      data: {
        platform: 'android',
        language: 'ru',
        username: 'alex_learner',
        referral_code: 'FRIEND',
        email: 'must-not-enter-outbox@example.com',
      },
    })).toEqual({
      eventType: 'newUser',
      source: 'user.created',
      sourceId: 'stable-user-A1B2',
      occurredAtMs: NOW_MS,
      payload: {
        platform: 'android',
        language: 'ru',
        source: 'referral',
        nickname: 'alex_learner',
        uidLast4: 'A1B2',
        route: '#users',
      },
    });
    expect(newUserAlertFromWrite({
      userId: 'stable-user-A1B2', beforeExists: true, afterExists: true,
      occurredAtMs: NOW_MS, data: { platform: 'android' },
    })).toBeNull();
    expect(newUserAlertFromWrite({
      userId: 'stable-user-A1B2', beforeExists: false, afterExists: false,
      occurredAtMs: NOW_MS, data: {},
    })).toBeNull();
  });

  test('separates referral attribution, first launch, qualification and reward', () => {
    expect(referralAlertsFromWrite({
      attributionId: 'referee-A1B2',
      before: null,
      after: { status: 'pending', createdAtMs: NOW_MS },
      nowMs: NOW_MS,
    }).map((event) => event.eventType)).toEqual(['referralAttributed']);

    expect(referralAlertsFromWrite({
      attributionId: 'referee-A1B2',
      before: { status: 'pending' },
      after: { status: 'pending', firstLaunchConfirmedAtMs: NOW_MS },
      nowMs: NOW_MS,
    }).map((event) => event.eventType)).toEqual(['referralFirstLaunch']);

    expect(referralAlertsFromWrite({
      attributionId: 'referee-A1B2',
      before: { status: 'pending', firstLaunchConfirmedAtMs: NOW_MS },
      after: { status: 'qualified', firstLaunchConfirmedAtMs: NOW_MS, qualifiedAtMs: NOW_MS + 1 },
      nowMs: NOW_MS + 1,
    }).map((event) => event.eventType)).toEqual(['referralQualified']);

    expect(referralAlertsFromWrite({
      attributionId: 'referee-A1B2',
      before: { status: 'qualified' },
      after: { status: 'rewarded', rewardedAtMs: NOW_MS + 2 },
      nowMs: NOW_MS + 2,
    }).map((event) => event.eventType)).toEqual(['referralRewarded']);
  });

  test('does not label code attribution as an installation', () => {
    const [event] = referralAlertsFromWrite({
      attributionId: 'referee-A1B2', before: null,
      after: { status: 'pending', createdAtMs: NOW_MS }, nowMs: NOW_MS,
    });
    expect(event.payload.status).toBe('code_applied');
    expect(JSON.stringify(event)).not.toMatch(/install|установ/i);
  });

  test('emits one event for a ban state transition and nothing for unrelated updates', () => {
    expect(banAlertFromWrite({
      userId: 'stable-user-A1B2',
      before: { banned: false },
      after: { banned: true },
      occurredAtMs: NOW_MS,
    })).toMatchObject({ eventType: 'banChanged', payload: { status: 'banned', uidLast4: 'A1B2' } });
    expect(banAlertFromWrite({
      userId: 'stable-user-A1B2',
      before: { banned: true, reason: 'old' },
      after: { banned: true, reason: 'new' },
      occurredAtMs: NOW_MS,
    })).toBeNull();
  });

  test('uses the existing users router with platform retries instead of adding another trigger', () => {
    const router = readFileSync(join(__dirname, 'users_write_router.ts'), 'utf8');
    expect(router).toContain('handleAdminNewUserWrite(event)');
    expect(router).toMatch(/users\/\{userId\}[\s\S]{0,120}retry:\s*true/);
    const peopleSource = readFileSync(join(__dirname, 'admin_alert_sources_people.ts'), 'utf8');
    expect(peopleSource).not.toContain("document: 'users/{userId}'");
  });
});
