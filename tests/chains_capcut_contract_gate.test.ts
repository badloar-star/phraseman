import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('Chains CapCut contract gate', () => {
  it('locks text style range and no-slowdown audio rules into docs and tooling', () => {
    const rules = fs.readFileSync(path.join(root, 'docs', 'cepicepi_generation_rules.md'), 'utf8');
    const script = fs.readFileSync(path.join(root, 'scripts', 'chains_capcut_contract_check.mjs'), 'utf8');
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

    expect(rules).toContain('styles[0].range == [0, newText.length]');
    expect(rules).toContain('Never slow down, stretch, or time-warp generated speech');
    expect(rules).toContain('audioStretchErrorCount');

    expect(script).toContain('style_range_not_full_text');
    expect(script).toContain('audio_would_stretch_or_slow_down');
    expect(script).toContain('source_timerange?.duration');
    expect(script).toContain('target_timerange?.duration');
    expect(script).toContain('speed !== 1');
    expect(script).toContain('is_tone_modify');

    expect(packageJson.scripts['chains:capcut-contract']).toBe('node ./scripts/chains_capcut_contract_check.mjs');
  });
});
