import { mergeAppMessagesWithStates, normalizeAppMessage } from '../app/app_messages';
import { selectSettingsMessageSlots } from '../app/settings_message_slots';

const NOW = Date.UTC(2026, 7, 1, 12, 0, 0);

function campaign(id: string, values: Record<string, unknown>) {
  return normalizeAppMessage(id, {
    active: true,
    createdAtMs: NOW,
    expiresAtMs: NOW + 60_000,
    titleRu: id,
    messageRu: 'Текст',
    deliverySurface: 'settings',
    settingsSlot: 'top',
    ...values,
  }, NOW);
}

describe('settings message slots', () => {
  it('selects top and bottom independently and prefers the newest campaign', () => {
    const snapshot = mergeAppMessagesWithStates([
      campaign('top-old', { createdAtMs: NOW - 20, settingsSlot: 'top' }),
      campaign('top-new', { createdAtMs: NOW - 10, settingsSlot: 'top' }),
      campaign('bottom', { createdAtMs: NOW - 5, settingsSlot: 'bottom' }),
    ], [], NOW);

    const selected = selectSettingsMessageSlots(snapshot, {
      stableId: 'owner-a', hasPremiumAccess: false, appVersion: '1.0.0', controlSalt: 'test',
    });

    expect(selected.top?.id).toBe('top-new');
    expect(selected.bottom?.id).toBe('bottom');
  });

  it('filters audiences without mixing free and Plus users', () => {
    const snapshot = mergeAppMessagesWithStates([
      campaign('free', { audience: 'free', settingsSlot: 'top' }),
      campaign('plus', { audience: 'premium', settingsSlot: 'bottom' }),
    ], [], NOW);

    expect(selectSettingsMessageSlots(snapshot, {
      stableId: 'owner-a', hasPremiumAccess: false, appVersion: '1.0.0', controlSalt: 'test',
    })).toMatchObject({ top: { id: 'free' }, bottom: null });
    expect(selectSettingsMessageSlots(snapshot, {
      stableId: 'owner-a', hasPremiumAccess: true, appVersion: '1.0.0', controlSalt: 'test',
    })).toMatchObject({ top: null, bottom: { id: 'plus' } });
  });

  it('keeps deterministic treatment/control assignment for the same account', () => {
    const snapshot = mergeAppMessagesWithStates([
      campaign('experiment', { controlPercent: 50 }),
    ], [], NOW);
    const context = { stableId: 'owner-a', hasPremiumAccess: false, appVersion: '1.0.0', controlSalt: 'stable-v1' };

    const first = selectSettingsMessageSlots(snapshot, context);
    const second = selectSettingsMessageSlots(snapshot, context);

    expect(second.assignments).toEqual(first.assignments);
    expect(Boolean(first.top)).toBe(first.assignments[0]?.variant === 'treatment');
  });

  it('waits for a stable account id before assigning an experiment', () => {
    const snapshot = mergeAppMessagesWithStates([
      campaign('experiment', { controlPercent: 20 }),
    ], [], NOW);

    expect(selectSettingsMessageSlots(snapshot, {
      stableId: '', hasPremiumAccess: false, appVersion: '1.0.0', controlSalt: 'stable-v1',
    })).toEqual({ top: null, bottom: null, assignments: [], primaryAttribution: null });
  });
});
