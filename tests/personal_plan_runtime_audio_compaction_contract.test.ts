import fs from 'fs';
import path from 'path';

import { getPlanAudioAssetsForRuntime } from '../app/personal_plan_audio_asset_registry';
import { GENERATED_RUNTIME_AUDIO_ASSETS } from '../app/personal_plan_runtime_audio_assets.generated';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan runtime audio compact index', () => {
  it('reconstructs the exact approved asset registry without bundling the authoring manifest', () => {
    const registrySource = fs.readFileSync(
      path.join(ROOT, 'app', 'personal_plan_audio_asset_registry.ts'),
      'utf8',
    );
    expect(registrySource).toContain("./personal_plan_runtime_audio_assets.compact.generated");
    expect(registrySource).not.toContain("from './personal_plan_runtime_audio_assets.generated'");
    expect(getPlanAudioAssetsForRuntime()).toEqual(GENERATED_RUNTIME_AUDIO_ASSETS);
  });

  it('keeps the generated runtime input materially smaller than the authoring manifest', () => {
    const fullSize = fs.statSync(
      path.join(ROOT, 'app', 'personal_plan_runtime_audio_assets.generated.ts'),
    ).size;
    const compactPath = path.join(
      ROOT,
      'app',
      'personal_plan_runtime_audio_assets.compact.generated.ts',
    );
    expect(fs.existsSync(compactPath)).toBe(true);
    const compactSize = fs.existsSync(compactPath) ? fs.statSync(compactPath).size : fullSize;
    expect(compactSize).toBeLessThan(fullSize * 0.35);
  });

  it('regenerates the compact index whenever an audio maintenance script changes the manifest', () => {
    for (const script of [
      'scripts/regen_plan_listen_audio_full.mjs',
      'scripts/regen_plan_listen_audio.mjs',
      'scripts/regen_plan_listen_audio_targeted.mjs',
    ]) {
      const source = fs.readFileSync(path.join(ROOT, script), 'utf8');
      expect(source).toContain('writePlanRuntimeAudioCompact');
    }
  });
});
