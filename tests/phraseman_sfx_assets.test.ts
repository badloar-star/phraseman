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
  // зачем 2026-10-11 (координатор 05:30): бандл давно не .wav — звуки перекодированы в .m4a 96k (50e514b63,
  // минус 13 МБ APK), а каталог modules/audio/sound_events.ts требует именно .m4a. Скрипт подготовки остаётся
  // источником «событие → исходник», а сторож проверяет то, что реально попадает в приложение: каждое событие
  // из списка, которое есть в каталоге, лежит в бандле тем .m4a, который каталог подключает. Выпавшие в 2.0
  // события перечислены явно — новое выпадение уронит сторож, а не пройдёт молча.
  const RETIRED_FROM_CATALOG = [
    'pm.learn.correct',
    'pm.learn.hint_reveal',
    'pm.learn.needs_work',
    'pm.reward.collectible',
    'pm.social.gift_received',
  ];

  test('every supplied event still in the sound catalog ships as the .m4a the catalog requires', () => {
    expect(existsSync(SCRIPT)).toBe(true);
    const specs = loadSpecs();
    const enabled = specs.filter((spec) => spec.enabled);
    const catalog = readFileSync(path.join(ROOT, 'modules', 'audio', 'sound_events.ts'), 'utf8');

    expect(new Set(specs.map((spec) => spec.eventId)).size).toBe(specs.length);
    expect(new Set(enabled.map((spec) => spec.destination)).size).toBe(enabled.length);

    const retired = enabled.filter((spec) => !catalog.includes(`'${spec.eventId}'`)).map((spec) => spec.eventId);
    expect(retired.sort()).toEqual(RETIRED_FROM_CATALOG);

    const live = enabled.filter((spec) => catalog.includes(`'${spec.eventId}'`));
    expect(live).toHaveLength(enabled.length - RETIRED_FROM_CATALOG.length);
    const assetRoot = path.resolve(ROOT, 'assets', 'audio', 'sfx', 'v1');
    for (const spec of live) {
      const bundled = spec.destination.replace(/\.wav$/, '.m4a');
      const resolved = path.resolve(ROOT, bundled);
      expect(resolved.startsWith(`${assetRoot}${path.sep}`)).toBe(true);
      expect(existsSync(resolved)).toBe(true);
      expect(catalog).toContain(`require('../../${bundled}')`);
    }
  });

  test('keeps missing supplied events explicit and disabled', () => {
    const specs = loadSpecs();
    const disabledIds = specs.filter((spec) => !spec.enabled).map((spec) => spec.eventId);

    expect(disabledIds).toEqual([
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
