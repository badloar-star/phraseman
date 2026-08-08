import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'prepare_phraseman_sfx.mjs');

type AssetSpec = {
  eventId: string;
  sourceNeedle: string;
  destination: string;
  enabled: boolean;
};

function loadSpecs(): AssetSpec[] {
  const output = execFileSync(process.execPath, [SCRIPT, '--print-specs'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return JSON.parse(output) as AssetSpec[];
}

describe('Phraseman canonical SFX assets', () => {
  // зачем 2026-08-03: было 39 — pm.learn.combo_5/combo_10 убраны вместе с
  // эффектом серии 5/10 (владелец: «убрать полностью»), осталось 37.
  test('maps 37 enabled semantic events to unique safe bundle destinations', () => {
    expect(existsSync(SCRIPT)).toBe(true);
    const specs = loadSpecs();
    const enabled = specs.filter((spec) => spec.enabled);

    expect(enabled).toHaveLength(37);
    expect(new Set(specs.map((spec) => spec.eventId)).size).toBe(specs.length);
    expect(new Set(enabled.map((spec) => spec.destination)).size).toBe(enabled.length);

    for (const spec of enabled) {
      const resolved = path.resolve(ROOT, spec.destination);
      const assetRoot = path.resolve(ROOT, 'assets', 'audio', 'sfx', 'v1');
      expect(resolved.startsWith(`${assetRoot}${path.sep}`)).toBe(true);
      expect(existsSync(resolved)).toBe(true);
    }
  });

  test('keeps missing supplied events explicit and disabled', () => {
    const specs = loadSpecs();
    const disabledIds = specs.filter((spec) => !spec.enabled).map((spec) => spec.eventId);

    expect(disabledIds).toEqual([
      'pm.reward.vip_finale',
    ]);
  });

  test('documents that the two supplied small-reward candidates are byte-identical', () => {
    const sourceRoot = process.env.PHRASEMAN_SFX_SOURCE_DIR;
    if (!sourceRoot) return;

    const base = path.join(
      sourceRoot,
      'Firefly_audio_pm_reward_small_glass_a_v1.wav_Create_a_0.72-secon_variation4.wav',
    );
    const duplicate = path.join(
      sourceRoot,
      'Firefly_audio_pm_reward_small_glass_a_v1.wav_Create_a_0.72-secon_variation4 (1).wav',
    );
    const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');

    expect(sha(base)).toBe(sha(duplicate));
  });
});
