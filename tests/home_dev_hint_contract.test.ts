import fs from 'fs';
import path from 'path';

import { pickRandomHomeHint } from '../app/home_hints';

const homeSource = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/home.tsx'), 'utf8');

describe('home dev hint control', () => {
  it('picks a deterministic random item without mutating the source list', () => {
    const source = [
      { id: 'a', category: 'home', audience: 'all' as const, textRu: 'A' },
      { id: 'b', category: 'home', audience: 'all' as const, textRu: 'B' },
    ];
    expect(pickRandomHomeHint(source, () => 0.99)?.id).toBe('b');
    expect(source.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('keeps the session-limited random hint wiring (dev simulator removed with Home V1, 01.10)', () => {
    expect(homeSource).toContain('SELECTED_HOME_HINTS_SNAPSHOT');
    expect(homeSource).toContain('homeHintShownThisAppSession');
    expect(homeSource).toContain('if (homeHintShownThisAppSession) return undefined;');
    expect(homeSource).toContain("if (state === 'background') homeHintShownThisAppSession = false;");
    expect(homeSource).not.toContain('transform: [{ scale: statsHintPulseAnim }]');
  });

  it('uses a fresh random eligible hint for the Statistics-card hint at runtime', () => {
    const runtimeHintEffect = homeSource.slice(
      homeSource.indexOf('const showRandomFromSnapshot'),
      homeSource.indexOf('showRandomFromSnapshot(localSnapshot'),
    );

    expect(runtimeHintEffect).toContain(
      "pickRandomHomeHint(snapshot.items.filter((item) => item.audience === 'all' || item.audience === audience))",
    );
    expect(runtimeHintEffect).not.toContain('selectNextHomeHint(snapshot, audience, before)');
  });
});
