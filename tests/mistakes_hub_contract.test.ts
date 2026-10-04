import fs from 'node:fs';
import path from 'node:path';
import { buildMistakePracticeHubSnapshot, mistakeSourceGroupFor } from '../app/mistake_practice_insights';
import type { MistakeEvent } from '../modules/mistake-practice/contracts';
import { isFeaturePremiumGated, shouldGateFeature } from '../app/feature_gates';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const captured = (id: string, atMs: number, facet: string, sourceKind: string): MistakeEvent => ({
  eventId: `cap:${id}:${atMs}`,
  mistakeId: id,
  cycleId: `${id}:mistake-cycle:1`,
  type: 'captured',
  occurredAtMs: atMs,
  studyTarget: 'en',
  payload: {
    facet, sourceKind, sourceId: `src-${id}`, canonicalTarget: `Phrase ${id}`, sourceMeaning: `Фраза ${id}`,
    tokens: ['Phrase', id], distractors: ['x'], lessonId: '4', contentFingerprint: `fp-${id}`,
  },
});

// зачем (владелец 2026-09-14): хаб и список читают журнал одним снапшотом и
// живут своими экранами; старая плитка на Главной больше не подменяет урок.
describe('mistakes hub snapshot', () => {
  test('groups sources, orders ready mistakes first and counts them', () => {
    const now = 1_000_000;
    const events = [
      captured('a', now - 10, 'word_order', 'lesson_phrase'),
      captured('a', now - 5, 'word_order', 'lesson_phrase'),
      captured('b', now - 8, 'meaning', 'flashcard'),
      captured('c', now - 7, 'listening', 'level_exam'),
    ];
    const snapshot = buildMistakePracticeHubSnapshot(events, now);
    expect(snapshot.readyCount).toBe(3);
    expect(snapshot.items[0]?.mistakeId).toBe('a');
    expect(snapshot.items[0]?.captureCount).toBe(2);
    expect(snapshot.insights.frequentSources).toEqual([
      { source: 'lessons', count: 2 }, { source: 'cards', count: 1 }, { source: 'exams', count: 1 },
    ]);
    // зачем: PM-192-A2 — Арена удалена (D83); старые arena_* записи уходят в «другое».
    expect(mistakeSourceGroupFor('arena_translate')).toBe('other');
    expect(mistakeSourceGroupFor(undefined)).toBe('other');
  });

  test('routes and screens are wired, the old priority swap is retired', () => {
    const layout = read('app/_layout.tsx');
    expect(layout).toContain('<Stack.Screen name="mistakes_hub" />');
    expect(layout).toContain('<Stack.Screen name="mistakes_list" />');
    const hub = read('app/mistakes_hub.tsx');
    expect(hub).toContain('useMistakePracticeStartGate');
    // 04.10 (макет «Панель»): подсказка-наблюдение в хабе не предусмотрена — вызовы ИИ убраны вместе с блоком; каркас загрузки рисует сам хаб.
    expect(hub).not.toContain('resolveMistakeHubAdvice');
    expect(hub).toContain('PanelRing');
    expect(hub).not.toMatch(/ActivityIndicator/);
    expect(hub).not.toMatch(/borderWidth/);
    // Владелец 2026-09-14: без персонажа и без пометки «ИИ» на экране. Комментарии
    // в коде про кэш ИИ — не интерфейс, поэтому смотрим только видимые строки.
    const visibleCopy = hub
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*') && !line.trimStart().startsWith('{/*'))
      .join('\n');
    expect(visibleCopy).not.toMatch(/\bИИ\b|Тео/);
    // Этап 3: строка списка ведёт в карточку ошибки, а отработка одной ошибки
    // запускается уже оттуда — осознанной кнопкой, а не тапом по строке.
    const list = read('app/mistakes_list.tsx');
    expect(list).toContain("pathname: '/mistake_detail'");
    expect(read('app/mistake_detail.tsx')).toContain('focusMistakeId: detail.mistakeId');
    const priority = read('app/home_learning_priority_card.ts');
    expect(priority).toContain("return 'last_lesson';");
  });

  test('daily limit and free short sessions are wired', () => {
    expect(read('app/revenue_daily_limits.ts')).toContain('mistake_practice_starts: 1');
    expect(read('app/revenue_daily_quota.ts')).toContain("gate: 'mistake_practice'");
    // зачем (§141, 04.10): с 30.09 премиум-доступ — локальный контракт (PREMIUM_GATED), не флаг удалённого
    // конфига; проверяем поведение, а не строку: «Мои ошибки» сверх дневного лимита — за Plus, Plus снимает замок.
    expect(isFeaturePremiumGated('mistake_practice')).toBe(true);
    expect(shouldGateFeature('mistake_practice', false)).toBe(true);
    expect(shouldGateFeature('mistake_practice', true)).toBe(false);
    expect(read('app/remote_flags.ts')).toContain('gate_mistake_practice_premium: true');
    const session = read('app/mistake_practice_session.tsx');
    expect(session).toContain('mistakePracticeSessionCostsEnergy(prepared.session.initialCount)');
    expect(session).not.toContain("router.replace({ pathname: '/premium_modal', params: { context: 'mistake_practice'");
    expect(read('functions/src/index.ts')).toContain('exports.mistakeHubAdvice = mistakeHubAdvice;');
  });
});
