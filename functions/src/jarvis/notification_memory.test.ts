import { buildDecision, type Decision } from './decision';
import {
  JARVIS_NOTIFICATION_MEMORY_FIELD,
  notificationTopicKey,
  parseNotificationMemory,
  recordDeliveredNotifications,
  selectNovelNotifications,
} from './notification_memory';

const DAY = 24 * 60 * 60 * 1_000;
const NOW = 1_800_000_000_000;

function decision(count: number, department: Decision['department'] = 'support'): Decision {
  return buildDecision({
    department,
    mode: 'observe',
    trigger: 'scheduled',
    question: 'Почему копится очередь?',
    finding: `В очереди ${count} писем.`,
    hypothesis: 'Нужен разбор.',
    options: [
      { title: 'Разобрать причины', cost: 0, risk: 'low' },
      { title: 'Продолжить наблюдение', cost: 0, risk: 'low' },
    ],
    recommendation: 'Разобрать причины',
    risk: 'Можно пропустить важное письмо.',
    cost: 0,
    successMetric: 'Очередь сокращается.',
    rollback: 'Изменений данных нет.',
    evidence: [{
      sourceId: 'support_inbox', state: 'ready', count,
      truncated: false, droppedCount: 0, observedAtMs: NOW,
    }],
    nowMs: NOW,
  });
}

describe('Jarvis notification memory — unchanged facts are not daily news', () => {
  test('uses one stable topic even when the numeric finding changes', () => {
    expect(notificationTopicKey(decision(125))).toBe(notificationTopicKey(decision(126)));
  });

  test('sends a topic once, then suppresses a small next-day counter change', () => {
    const first = decision(125);
    const memory = recordDeliveredNotifications({ memory: {}, delivered: [first], nowMs: NOW });
    const result = selectNovelNotifications({ decisions: [decision(126)], memory, nowMs: NOW + DAY });
    expect(result.selected).toHaveLength(0);
    expect(result.suppressed).toHaveLength(1);
  });

  test('a material deterioration bypasses the cooldown', () => {
    const first = decision(10);
    const memory = recordDeliveredNotifications({ memory: {}, delivered: [first], nowMs: NOW });
    const result = selectNovelNotifications({ decisions: [decision(15)], memory, nowMs: NOW + DAY });
    expect(result.selected).toHaveLength(1);
  });

  test('an unchanged P1 never becomes daily news again merely because time passed', () => {
    const first = decision(10);
    const memory = recordDeliveredNotifications({ memory: {}, delivered: [first], nowMs: NOW });
    expect(selectNovelNotifications({ decisions: [decision(10)], memory, nowMs: NOW + 2 * DAY }).selected).toHaveLength(0);
    expect(selectNovelNotifications({ decisions: [decision(10)], memory, nowMs: NOW + 30 * DAY }).selected).toHaveLength(0);
  });

  test('different numbered content scopes are not merged into one topic', () => {
    const scoped3 = { ...decision(10, 'content'), question: 'Почему обрывается урок 3?' } as Decision;
    const scoped4 = { ...decision(10, 'content'), question: 'Почему обрывается урок 4?' } as Decision;
    expect(notificationTopicKey(scoped3)).not.toBe(notificationTopicKey(scoped4));
  });

  test('only records topics after a successful delivery', () => {
    const first = decision(10);
    const unchanged = recordDeliveredNotifications({ memory: {}, delivered: [], nowMs: NOW });
    expect(selectNovelNotifications({ decisions: [first], memory: unchanged, nowMs: NOW + DAY }).selected).toHaveLength(1);
  });

  test('parses the bounded field stored inside jarvis_control', () => {
    const first = decision(10);
    const memory = recordDeliveredNotifications({ memory: {}, delivered: [first], nowMs: NOW });
    expect(parseNotificationMemory({ [JARVIS_NOTIFICATION_MEMORY_FIELD]: memory })).toEqual(memory);
    expect(parseNotificationMemory({ [JARVIS_NOTIFICATION_MEMORY_FIELD]: 'broken' })).toEqual({});
  });
});
