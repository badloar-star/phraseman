/**
 * зачем: PM-194-A1 — сессия «Мои ошибки» для испанского никогда не подмешивает
 * английские карточки. Пишем в ОДНО хранилище ошибки и en, и es (одинаковые
 * sourceId), строим сессию из es-журнала и проверяем: ни id, ни текст
 * английской ошибки в сессии не появляются.
 */
import { MISTAKE_STUDY_TARGETS, type MistakeStudyTarget } from '../modules/mistake-practice/contracts';
import { projectMistakes } from '../modules/mistake-practice/projection';
import { buildMistakePracticeSession } from '../modules/mistake-practice/session';
import { captureObjectiveAttempt, type ObjectiveMistakeAttempt } from '../app/mistake_practice_capture';
import { loadMistakeEventJournal, type MistakePracticeStorage } from '../app/mistake_practice_store';
import { __resetAccountGenerationForTests } from '../app/account_generation';

function createStorage(): MistakePracticeStorage & { getAllKeys(): Promise<readonly string[]> } {
  const data = new Map<string, string>();
  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); },
    getAllKeys: async () => [...data.keys()],
  };
}

const NOW = 2_000_000;

const attemptFor = (studyTarget: MistakeStudyTarget, n: number): ObjectiveMistakeAttempt => ({
  accountScope: 'account-a',
  attemptId: `attempt-${studyTarget}-${n}`,
  studyTarget,
  verdict: 'wrong',
  objective: true,
  content: {
    sourceKind: 'lesson_phrase',
    sourceId: `lesson-1:phrase-${n}`, // один и тот же id у всех языков
    canonicalTarget: `zzphrase ${studyTarget} number${n}`,
    sourceMeaning: `meaning-${studyTarget}-${n}`,
    lessonId: '1',
    tokens: ['zzphrase', studyTarget, `number${n}`],
    distractors: [`distract-${studyTarget}-${n}`],
  },
  facet: { kind: 'word_order' },
});

describe('PM-194-A1: сессия ошибок не смешивает языки', () => {
  afterEach(() => __resetAccountGenerationForTests());

  test.each(MISTAKE_STUDY_TARGETS.filter((t) => t !== 'en'))(
    '%s: в сессии нет английских карточек',
    async (target) => {
      const storage = createStorage();
      for (const t of ['en', target] as const) {
        for (const n of [1, 2, 3]) {
          await captureObjectiveAttempt(attemptFor(t, n), { storage, forceNewCycle: false });
        }
      }
      const journal = await loadMistakeEventJournal({ accountScope: 'account-a', studyTarget: target, storage });
      const projection = projectMistakes(journal.events);
      const items = [...projection.items.values()];
      console.log('[PM-194] target=', target, 'items=', items.length, 'targets=', [...new Set(items.map((i) => i.studyTarget))].join(','));
      expect(items).toHaveLength(3);
      expect(items.every((item) => item.studyTarget === target)).toBe(true);

      const session = buildMistakePracticeSession({
        items,
        requestedLength: 'all',
        nowMs: Date.now() + 60 * 86_400_000,
      });
      expect(session.queue.length).toBeGreaterThan(0);
      const serialized = JSON.stringify(session);
      expect(serialized).not.toContain('zzphrase en ');
      expect(serialized).not.toContain('meaning-en-');
      expect(serialized).not.toContain('distract-en-');
      expect(serialized).toContain(`zzphrase ${target} `);

      // и наоборот: английская сессия не тянет чужие ошибки
      const enJournal = await loadMistakeEventJournal({ accountScope: 'account-a', studyTarget: 'en', storage });
      const enItems = [...projectMistakes(enJournal.events).items.values()];
      expect(enItems.every((item) => item.studyTarget === 'en')).toBe(true);
      const esIds = new Set(items.map((i) => i.mistakeId));
      expect(enItems.some((item) => esIds.has(item.mistakeId))).toBe(false);
    },
  );
});
