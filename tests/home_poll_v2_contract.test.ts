import { readFileSync } from 'fs';
import path from 'path';

import { HOME_POLL_V2_RETIRED_SET_IDS, parseHomePollV2Catalog } from '../app/home_polls/home_polls_v2_model';
import { homePollV2WindowForDate } from '../shared/home_polls_v2_schedule';

const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

describe('home polls v2 bundled content and application wiring', () => {
  it('rotates sets deterministically in alternating 3-day and 4-day windows', () => {
    expect(homePollV2WindowForDate('2026-10-19', 100)?.setId).toBe('p2-001');
    expect(homePollV2WindowForDate('2026-10-21', 100)?.setId).toBe('p2-001');
    expect(homePollV2WindowForDate('2026-10-22', 100)?.setId).toBe('p2-002');
    expect(homePollV2WindowForDate('2026-10-25', 100)?.setId).toBe('p2-002');
    expect(homePollV2WindowForDate('2026-10-26', 100)?.setId).toBe('p2-003');
    expect(homePollV2WindowForDate('2027-10-04', 100)).toBeNull();
  });

  it('keeps exactly 100 sets and 230 questions in the files; the shown catalog drops only the retired p2-053', () => {
    const authoring = JSON.parse(read('content/polls/home_polls_v2.json'));
    const runtime = JSON.parse(read('app/home_polls/home_polls_v2.json'));
    expect(runtime).toEqual(authoring);
    // форма наборов в файлах (она же — на сервере) не меняется: 100 наборов и 230 вопросов
    expect(runtime.sets).toHaveLength(100);
    expect(runtime.sets.reduce((sum: number, set: { questions: unknown[] }) => sum + set.questions.length, 0)).toBe(230);
    // в показе снят ровно p2-053 (опрос про ползунок размера карточек, которого больше нет); индексы остальных наборов не сдвинулись
    expect([...HOME_POLL_V2_RETIRED_SET_IDS]).toEqual(['p2-053']);
    const catalog = parseHomePollV2Catalog(runtime);
    expect(catalog).toHaveLength(100);
    const hidden = catalog.map((set, index) => (set ? null : runtime.sets[index].id)).filter(Boolean);
    expect(hidden).toEqual(['p2-053']);
    expect(catalog[53]?.id).toBe('p2-054');
    expect(catalog.reduce((sum, set) => sum + (set?.questions.length ?? 0), 0)).toBe(228);
  });

  it('replaces the Today poll entry with the v2 sheet and never fetches poll text for display', () => {
    const home = read('app/(tabs)/home.tsx');
    const client = read('app/home_polls/home_polls_v2_client.ts');
    expect(home).toContain("import { useHomePollV2 } from '../../hooks/use_home_poll_v2'");
    expect(home).toContain('const homePollV2 = useHomePollV2({ lang, active: homeRuntimeActive });');
    expect(home).toContain('surveyRow={homePollV2.phase !== \'hidden\' ? {');
    expect(home).toContain('onPress: () => setHomePollV2Open(true)');
    expect(home).toContain('<HybridSheetShell');
    expect(home).toContain('testID="home-poll-v2-sheet"');
    expect(home).toContain('<HomePollV2Card model={homePollV2}');
    expect(home).not.toContain('<HomePollV2Card lang={lang} active={homeRuntimeActive} />');
    expect(home).not.toContain('useHomeSurveyEntry(');
    expect(client).toContain("require('./home_polls_v2.json')");
    expect(client).not.toMatch(/collection\(['"]home_polls_v2/);
  });

  it('keeps a durable account-scoped retry queue and guards duplicate taps with a ref', () => {
    const client = read('app/home_polls/home_polls_v2_client.ts');
    const hook = read('hooks/use_home_poll_v2.ts');
    expect(client).toContain('home_polls_v2_queue_v1::${ownerId}');
    expect(client).toContain('flushHomePollV2Queue');
    expect(client).toContain('for (const vote of queue)');
    expect(client).not.toContain('row.dateKey === snapshot.dateKey');
    expect(hook).toContain('answeredQuestionIdsRef.current');
  });

  it('invalidates local poll state on account-generation changes and rejects late owner responses', () => {
    const client = read('app/home_polls/home_polls_v2_client.ts');
    const hook = read('hooks/use_home_poll_v2.ts');
    expect(hook).toContain('subscribeAccountGeneration');
    expect(hook).toContain('setSnapshot(null)');
    expect(hook).toContain('answeredQuestionIdsRef.current.clear()');
    expect(client).toContain('isCurrentAccountGeneration');
  });

  it('does not claim the newly tapped option when the server reports a prior private answer', () => {
    const client = read('app/home_polls/home_polls_v2_client.ts');
    expect(client).toContain("data?.status === 'accepted' ? optionId : null");
    expect(client).toContain("data.status === 'accepted' ? vote.optionId : null");
  });

  it('keeps aggregate counts out of the optimistic card while retaining the admin set summary', () => {
    const card = read('components/home/HomePollV2Card.tsx');
    const admin = read('admin/v2/legacy.html');
    expect(card).not.toContain("model.phase === 'result'");
    expect(card).toContain('accessibilityRole="button"');
    expect(admin).toContain("collection(db, 'home_polls_v2')");
    expect(admin).toContain('Итоги по вопросам');
  });

  it('never shows transport state or an offline claim in the strict optimistic flow', () => {
    const card = read('components/home/HomePollV2Card.tsx');
    expect(card).not.toContain("model.phase === 'sending'");
    expect(card).not.toContain('Отправляем…');
    expect(card).not.toContain('Sending…');
    expect(card).not.toContain('Отправим, когда появится связь');
    expect(card).not.toContain('We’ll send it when you’re online');
  });
});
