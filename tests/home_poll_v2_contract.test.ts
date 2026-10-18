import { readFileSync } from 'fs';
import path from 'path';

import { parseHomePollV2Catalog } from '../app/home_polls/home_polls_v2_model';
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

  it('contains exactly 100 valid sets and 230 questions', () => {
    const authoring = JSON.parse(read('content/polls/home_polls_v2.json'));
    const runtime = JSON.parse(read('app/home_polls/home_polls_v2.json'));
    expect(runtime).toEqual(authoring);
    const catalog = parseHomePollV2Catalog(runtime);
    expect(catalog).toHaveLength(100);
    expect(catalog.every(Boolean)).toBe(true);
    expect(catalog.reduce((sum, set) => sum + (set?.questions.length ?? 0), 0)).toBe(230);
  });

  it('mounts the v2 card on Home and never fetches poll text for display', () => {
    const home = read('app/(tabs)/home.tsx');
    const client = read('app/home_polls/home_polls_v2_client.ts');
    expect(home).toContain("import HomePollV2Card from '../../components/home/HomePollV2Card'");
    expect(home).toContain('<HomePollV2Card lang={lang} active={homeRuntimeActive} />');
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
    expect(hook).toContain('busyRef.current');
  });

  it('invalidates local poll state on account-generation changes and rejects late owner responses', () => {
    const client = read('app/home_polls/home_polls_v2_client.ts');
    const hook = read('hooks/use_home_poll_v2.ts');
    expect(hook).toContain('subscribeAccountGeneration');
    expect(hook).toContain('setSnapshot(null)');
    expect(hook).toContain('setQueuedChoice(null)');
    expect(client).toContain('isCurrentAccountGeneration');
  });

  it('does not claim the newly tapped option when the server reports a prior private answer', () => {
    const client = read('app/home_polls/home_polls_v2_client.ts');
    expect(client).toContain("data?.status === 'accepted' ? optionId : null");
    expect(client).toContain("data.status === 'accepted' ? vote.optionId : null");
  });

  it('shows counts only in the result phase and includes the admin set summary', () => {
    const card = read('components/home/HomePollV2Card.tsx');
    const admin = read('admin/v2/legacy.html');
    expect(card).toContain("model.phase === 'result'");
    expect(card).toContain('accessibilityRole="button"');
    expect(admin).toContain("collection(db, 'home_polls_v2')");
    expect(admin).toContain('Итоги по вопросам');
  });
});
