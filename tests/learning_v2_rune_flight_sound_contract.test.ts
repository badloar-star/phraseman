import fs from 'node:fs';
import path from 'node:path';

describe('LearningV2RuneFlight sound contract', () => {
  test('plays only one flight-start cue and never a cue for every rune landing', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components', 'LearningV2RuneFlight.tsx'),
      'utf8',
    );

    expect(source).toContain("soundDirector.request('pm.reward.rune_flight_start'");
    expect(source).not.toContain('pm.reward.rune_flight_land');
    expect(source).not.toContain('playFlightLand');
  });
});
