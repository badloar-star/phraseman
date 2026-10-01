// зачем (PM-090-A2, ENERGY.md): при нуле энергии нет принудительной рекламы,
// повторных модалок и списания за простое открытие экрана. Тест охраняет это
// статически, чтобы будущая правка не добавила рекламный SDK или «залипающее» окно.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

describe('PM-090 zero-energy behavior contract', () => {
  it('app has no advertising SDK, so a forced ad cannot appear at zero energy', () => {
    const pkg = JSON.parse(read('package.json'));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    const ads = deps.filter((d) => /admob|mobile-ads|applovin|ironsource|unity-ads|appodeal|facebook-ads/i.test(d));
    expect(ads).toEqual([]);
  });

  it('NoEnergyModal offers only a way out and Plus: no ad / rewarded-video wording or code', () => {
    const src = read('components/NoEnergyModal.tsx');
    expect(/rewarded|interstitial|showAd|adUnit|watch.?ad/i.test(src)).toBe(false);
  });

  it('classic lesson shows the empty-energy window once per hit (re-entry guard)', () => {
    const src = read('app/lesson1.tsx');
    expect(src).toContain('if (isShowingEnergyFeedbackRef.current) return;');
    expect(src).toContain('isShowingEnergyFeedbackRef.current = false;');
  });

  it('energy is charged at the first shown question, never on bare screen open (D72)', () => {
    const gate = read('app/energy_first_question_gate.ts');
    expect(gate).toContain('МОМЕНТ ПОКАЗА');
    expect(gate).toContain('не при открытии экрана');
  });

  it('modal shows time to the next unit from the live recovery state', () => {
    const src = read('components/NoEnergyModal.tsx');
    expect(src).toContain('useEnergyCountdown');
    expect(src).toContain('timeUntilNextMs');
  });
});
