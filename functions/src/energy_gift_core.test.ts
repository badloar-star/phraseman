// Governance-ID: TG-77EE1592FAEB
import {
  ENERGY_GIFT_CLAIM_PER_DAY,
  ENERGY_GIFT_MIN_FRIENDSHIP_MS,
  ENERGY_GIFT_SEND_PER_DAY,
  ENERGY_GIFT_TTL_MS,
  energyGiftClaimDecision,
  energyGiftDayKey,
  energyGiftId,
  energyGiftSendRefusal,
  normalizeEnergyGiftQuota,
} from './energy_gift_core';
import { handleEnergyGiftSend, handleEnergyGiftClaim } from './energy_gift';

// зачем (владелец 05.11: «разрешить с лимитом»): правила подарка энергии зашиты здесь; сторож падает, если лимиты поменяют молча.

const NOW = Date.parse('2026-11-05T12:00:00Z');
const DAY = energyGiftDayKey(NOW);
const emptyQ = normalizeEnergyGiftQuota(undefined, DAY);
const base = {
  fromUid: 'sender_uid_1', toUid: 'receiver_uid_2', friendshipSinceMs: NOW - ENERGY_GIFT_MIN_FRIENDSHIP_MS - 1,
  nowMs: NOW, senderQuota: emptyQ, receiverQuota: emptyQ, receiverHasPlus: false,
};

describe('подарок энергии: правила отправки', () => {
  test('константы по решению владельца: 1 в сутки, получатель до 3, дружба ≥ 24 ч, срок 7 суток', () => {
    expect(ENERGY_GIFT_SEND_PER_DAY).toBe(1);
    expect(ENERGY_GIFT_CLAIM_PER_DAY).toBe(3);
    expect(ENERGY_GIFT_MIN_FRIENDSHIP_MS).toBe(24 * 3600 * 1000);
    expect(ENERGY_GIFT_TTL_MS).toBe(7 * 24 * 3600 * 1000);
  });

  test('обычный подарок разрешён', () => {
    expect(energyGiftSendRefusal(base)).toBeNull();
  });

  test('себе нельзя', () => {
    expect(energyGiftSendRefusal({ ...base, toUid: base.fromUid })).toBe('self');
  });

  test.each([
    ['ребра дружбы нет', null],
    ['дружбе меньше 24 часов', NOW - ENERGY_GIFT_MIN_FRIENDSHIP_MS + 1],
    ['нечисловая отметка', Number.NaN],
  ])('не друг ≥ 24 ч: %s', (_name, since) => {
    expect(energyGiftSendRefusal({ ...base, friendshipSinceMs: since as number | null })).toBe('not_friends_24h');
  });

  test('ровно 24 часа — уже можно', () => {
    expect(energyGiftSendRefusal({ ...base, friendshipSinceMs: NOW - ENERGY_GIFT_MIN_FRIENDSHIP_MS })).toBeNull();
  });

  test('получатель с Plus — отказ', () => {
    expect(energyGiftSendRefusal({ ...base, receiverHasPlus: true })).toBe('plus_receiver');
  });

  test('второй подарок отправителя за сутки — отказ', () => {
    expect(energyGiftSendRefusal({ ...base, senderQuota: { dayKey: DAY, sent: 1, received: 0 } })).toBe('quota_sender');
  });

  test('получатель уже принял 3 за сутки — отказ', () => {
    expect(energyGiftSendRefusal({ ...base, receiverQuota: { dayKey: DAY, sent: 0, received: 3 } })).toBe('quota_receiver');
    expect(energyGiftSendRefusal({ ...base, receiverQuota: { dayKey: DAY, sent: 0, received: 2 } })).toBeNull();
  });

  test('счётчик прошлого дня обнуляется', () => {
    const q = normalizeEnergyGiftQuota({ dayKey: '2026-11-04', sent: 1, received: 3 }, DAY);
    expect(q).toEqual({ dayKey: DAY, sent: 0, received: 0 });
  });

  test('мусор в счётчике читается как ноль', () => {
    expect(normalizeEnergyGiftQuota({ dayKey: DAY, sent: -4, received: 'x' }, DAY)).toEqual({ dayKey: DAY, sent: 0, received: 0 });
    expect(normalizeEnergyGiftQuota([1], DAY)).toEqual({ dayKey: DAY, sent: 0, received: 0 });
  });

  test('номер подарка детерминирован и безопасен для пути', () => {
    expect(energyGiftId('a', 'b', DAY)).toBe(energyGiftId('a', 'b', DAY));
    expect(energyGiftId('a/b', 'c#d', DAY)).not.toMatch(/[/#?[\]]/);
  });
});

describe('подарок энергии: забрать', () => {
  const claim = { status: 'pending', createdAtMs: NOW - 1000, nowMs: NOW, receiverHasPlus: false, receiverQuota: emptyQ };

  test('ожидающий подарок применяется', () => {
    expect(energyGiftClaimDecision(claim)).toEqual({ kind: 'apply' });
  });

  test('повтор уже забранного — без повторного начисления', () => {
    expect(energyGiftClaimDecision({ ...claim, status: 'claimed' })).toEqual({ kind: 'already' });
  });

  test('просроченный и чужой статус гаснут', () => {
    expect(energyGiftClaimDecision({ ...claim, createdAtMs: NOW - ENERGY_GIFT_TTL_MS - 1 })).toEqual({ kind: 'void', reason: 'expired' });
    expect(energyGiftClaimDecision({ ...claim, status: 'void' })).toEqual({ kind: 'void', reason: 'not_pending' });
    expect(energyGiftClaimDecision({ ...claim, createdAtMs: 'bad' })).toEqual({ kind: 'void', reason: 'expired' });
  });

  test('получатель стал Plus — подарок гаснет без ошибки', () => {
    expect(energyGiftClaimDecision({ ...claim, receiverHasPlus: true })).toEqual({ kind: 'void', reason: 'plus_receiver' });
  });

  test('четвёртый за сутки ждёт', () => {
    expect(energyGiftClaimDecision({ ...claim, receiverQuota: { dayKey: DAY, sent: 0, received: 3 } })).toEqual({ kind: 'quota_receiver' });
  });
});

describe('подарок энергии: callable за флагом', () => {
  test('без входа — отказ unauthenticated', async () => {
    await expect(handleEnergyGiftSend({ data: { toUid: 'x' } } as never)).rejects.toThrow('auth_required');
    await expect(handleEnergyGiftClaim({ data: { giftId: 'x' } } as never)).rejects.toThrow('auth_required');
  });
});
