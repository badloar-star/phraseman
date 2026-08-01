import fs from 'node:fs';
import path from 'node:path';

const SOURCE_PATH = path.join(process.cwd(), 'components', 'tournament', 'TournamentAudioButton.tsx');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

describe('TournamentAudioButton mockup contract', () => {
  it('uses the 108px tap-to-play control from listen mockups 03–05', () => {
    expect(source).toMatch(/autoPlay\s*=\s*false/);
    expect(source).toMatch(/size\s*=\s*108/);
    expect(source).toContain('accessibilityRole="button"');
  });

  it('derives its SVG ring from live audio position rather than a guessed track duration', () => {
    expect(source).toContain('status?.currentTime');
    expect(source).toContain('status?.duration');
    expect(source).toContain('audioProgress');
    expect(source).not.toContain('durationMs');
  });

  it('keeps both icons mounted for an opacity crossfade and honours reduced motion', () => {
    expect(source).toContain("name=\"play\"");
    expect(source).toContain("name=\"volume-high\"");
    expect(source).toContain('useReducedMotion');
    expect(source).toContain('PULSE_CYCLE_MS = 1100');
  });
});
