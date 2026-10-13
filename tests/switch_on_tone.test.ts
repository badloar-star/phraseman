// зачем (разбор diff Темами 13.10, Г5; settings-gap-013/014/015/034): включённый переключатель — дорожка акцента темы + «чернильный» бегунок (образец `.gs-sw.on`),
// и этот бегунок читается на дорожке (≥ 3:1) во всех темах и обоих оформлениях.
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { switchOnTone } from '../components/settings/switch_chrome';

const THEMES = ['graphite', 'grad_aurora', 'grad_iris', 'grad_magma', 'grad_jade', 'grad_orchid', 'grad_midnight', 'rose', 'polar'] as const;
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('switchOnTone', () => {
  it('в тёмном дорожка = акцент темы, бегунок = подпись акцента (Графит: светлая дорожка, чёрный бегунок; Аврора: мятная, тёмно-зелёный)', () => {
    const graphite = liquidGlassTokens('graphite', { appearance: 'dark', intensity: 0 } as never);
    expect(switchOnTone(graphite)).toEqual({ track: '#F2F1F6', knob: '#0B0C0E' });
    const aurora = liquidGlassTokens('grad_aurora', { appearance: 'dark', intensity: 1 } as never);
    expect(switchOnTone(aurora)).toEqual({ track: '#7EF0C8', knob: '#04261D' });
  });

  it('бегунок читается на дорожке (≥ 3:1) во всех темах, уровнях и обоих оформлениях', () => {
    const bad: string[] = [];
    for (const appearance of ['dark', 'light'] as const) {
      for (const id of THEMES) {
        for (const intensity of [0, 0.5, 1]) {
          const g = liquidGlassTokens(id, { appearance, intensity } as never);
          const tone = switchOnTone(g);
          const r = ratio(tone.track.slice(0, 7), tone.knob.slice(0, 7));
          if (r < 3) bad.push(`${id}@${intensity} ${appearance}: ${tone.track}/${tone.knob} = ${r.toFixed(2)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
