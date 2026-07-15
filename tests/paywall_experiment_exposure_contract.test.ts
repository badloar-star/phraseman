import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('paywall actual experiment exposure', () => {
  it.each(['a', 'b', 'c'])('emits only from the rendered paywall %s and reuses its impression ID', (variant) => {
    const source = read(`app/paywall_${variant}.tsx`);
    expect(source).toContain('trackPaywallExperimentExposure');
    expect(source).toContain('analyticsImpression.id');
    expect(source.lastIndexOf('trackPaywallExperimentExposure')).toBeGreaterThan(source.indexOf('export default function'));
  });

  it('marks the current legacy v3 split as unmeasured when no passport exists', () => {
    const source = read('app/paywall_variant.ts');
    expect(source).toContain("measurementStatus: 'legacy_unmeasured'");
    expect(source).toContain('assignment_quality');
  });
});
