import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'components/youtube/YoutubePremiereHero.tsx'), 'utf8');

describe('YouTube premiere premium motion contract', () => {
  it('uses a bounded non-modal 900-1200ms intro without autoplay', () => {
    const duration = Number(source.match(/PREMIERE_INTRO_DURATION_MS\s*=\s*(\d+)/)?.[1]);
    expect(duration).toBeGreaterThanOrEqual(900);
    expect(duration).toBeLessThanOrEqual(1200);
    expect(source).toContain('testID="youtube-premiere-intro"');
    expect(source).not.toContain('<Modal');
    expect(source).not.toContain('autoplay');
  });

  it('honors reduced motion and runtime activity and does not leak looping work', () => {
    expect(source).toContain('useReducedMotion()');
    expect(source).toContain('useRuntimeActive(true)');
    expect(source).toContain("animationPlayState: runtimeActive ? 'running' : 'paused'");
    expect(source).not.toContain('withRepeat(');
    expect(source).not.toContain('runOnJS');
    expect(source).toContain('clearTimeout');
    expect(source).toContain('clearInterval');
  });

  it('persists one intro per video and keeps an expressive static live card', () => {
    expect(source).toContain('shouldPlayPremiereIntro');
    expect(source).toContain('markPremiereIntroSeen');
    expect(source).toContain('AsyncStorage.setItem');
    expect(source).toContain('testID="youtube-premiere-static"');
  });

  it('uses dark copy on the bright live CTA and text labels in addition to color', () => {
    // зачем: Liquid Glass — тёмная подпись на светлой кнопке берётся из токена темы, а не из графитового литерала
    // зачем (11.10): токен тёмной подписи на светлой кнопке переименован в ctaInk (eddde55bd) — смысл тот же.
    expect(source).toMatch(/color: g\.(?:accentInk|ctaInk|ctaFillInk)/);
    expect(source).toContain('copy.liveNow');
    expect(source).toContain('copy.upcoming');
  });
});
