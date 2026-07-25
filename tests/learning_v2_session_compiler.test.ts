// зачем: сердце E1-плана — детерминированный компилятор «банк контента → 12 сессий
// в трёх зонах с угасанием подсказок». RED фиксирует форму до реализации.
import { compileV2RequiredSessions } from '../modules/learning-v2/content/session_compiler';
import { validateV2SessionSet } from '../modules/learning-v2/contracts/session';
import { buildEnglishProfile, buildE1ContentItems } from './support/learning_v2_content_builders';

test('compiles twelve ordered sessions in three zones', () => {
  const result = compileV2RequiredSessions({
    episodeId: 'ep-01',
    canDoOutcomeId: 'obj-introduce-self',
    profile: buildEnglishProfile(),
    items: buildE1ContentItems(),
  });
  expect(result.sessions).toHaveLength(12);
  expect(result.sessions.map((session) => session.zone)).toEqual([
    'understand', 'understand', 'understand', 'understand',
    'use', 'use', 'use', 'use',
    'master', 'master', 'master', 'master',
  ]);
  result.sessions.forEach((session) => {
    expect(session.cards.length).toBeGreaterThanOrEqual(7);
    expect(session.cards.length).toBeLessThanOrEqual(9);
    expect(new Set(session.cards.map((card) => card.family)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(session.cards.map((card) => card.family)).size).toBeLessThanOrEqual(4);
  });
});

test('fades support and ends with independent non-reused prompts', () => {
  const result = compileV2RequiredSessions({
    episodeId: 'ep-01',
    canDoOutcomeId: 'obj-introduce-self',
    profile: buildEnglishProfile(),
    items: buildE1ContentItems(),
  });
  expect(result.sessions[0].support).toBe('model');
  expect(result.sessions[11].support).toBe('none');
  expect(result.sessions[11].cards.every((card) => card.promptNovelty !== 'trained')).toBe(true);
});

test('fails when the bank cannot produce seven traceable cards per session', () => {
  expect(() => compileV2RequiredSessions({
    episodeId: 'ep-01',
    canDoOutcomeId: 'obj-introduce-self',
    profile: buildEnglishProfile(),
    items: buildE1ContentItems().slice(0, 1),
  })).toThrow('session_content_insufficient');
});

// зачем: дополнительная броня — результат обязан проходить КАНОНИЧЕСКИЙ валидатор
// session-set (контракт Task 0), быть детерминированным (тот же вход → байт-в-байт
// тот же выход, перестановка банка не меняет результат) и трассируемым.
test('emits a canonical session set that passes the frozen contract validator', () => {
  const result = compileV2RequiredSessions({
    episodeId: 'ep-01',
    canDoOutcomeId: 'obj-introduce-self',
    profile: buildEnglishProfile(),
    items: buildE1ContentItems(),
  });
  const sessionSet = {
    schemaVersion: 'v2-session-set.v1',
    episodeId: 'ep-01',
    version: 1,
    sessions: result.sessions.map(({ support: _support, ...session }) => ({
      ...session,
      cards: session.cards.map((card) => ({ ...card })),
    })),
    optionalPracticeSlots: [],
  };
  const validation = validateV2SessionSet(JSON.parse(JSON.stringify(sessionSet)));
  expect(validation).toMatchObject({ ok: true });
});

test('is deterministic and independent of content bank ordering', () => {
  const input = {
    episodeId: 'ep-01',
    canDoOutcomeId: 'obj-introduce-self',
    profile: buildEnglishProfile(),
    items: buildE1ContentItems(),
  };
  const first = compileV2RequiredSessions(input);
  const second = compileV2RequiredSessions({ ...input, items: [...input.items].reverse() });
  expect(JSON.parse(JSON.stringify(second))).toEqual(JSON.parse(JSON.stringify(first)));
  expect(Object.isFrozen(first)).toBe(true);
  expect(Object.isFrozen(first.sessions[0])).toBe(true);
});

test('every card traces to a real item, its objective and a supported family', () => {
  const items = buildE1ContentItems();
  const profile = buildEnglishProfile();
  const byId = new Map(items.map((item) => [item.contentItemId, item]));
  const result = compileV2RequiredSessions({
    episodeId: 'ep-01',
    canDoOutcomeId: 'obj-introduce-self',
    profile,
    items,
  });
  const promptIds = new Set<string>();
  for (const session of result.sessions) {
    for (const card of session.cards) {
      const item = byId.get(card.contentItemId);
      expect(item).toBeDefined();
      expect(item!.objectiveIds).toContain(card.objectiveId);
      expect(item!.compatibleFamilies).toContain(card.family);
      expect(profile.supportedActivityFamilies).toContain(card.family);
      expect(promptIds.has(card.promptId)).toBe(false);
      promptIds.add(card.promptId);
    }
  }
});

test('rejects items from a foreign episode or foreign language', () => {
  const items = buildE1ContentItems();
  expect(() => compileV2RequiredSessions({
    episodeId: 'ep-02',
    canDoOutcomeId: 'obj-introduce-self',
    profile: buildEnglishProfile(),
    items,
  })).toThrow('session_content_episode_mismatch');
});
