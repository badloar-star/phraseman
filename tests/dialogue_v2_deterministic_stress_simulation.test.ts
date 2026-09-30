import fs from 'node:fs';
import path from 'node:path';

import * as candidateModule from '../scripts/dialogue_v2_content_release_candidate';

const repoRoot = path.resolve(__dirname, '..');

describe('Dialogue V2 deterministic 100-turn simulation', () => {
  it('keeps all 304 language/scenario packets inside their own task and persona boundaries for 100 turns', () => {
    const manifest = JSON.parse(fs.readFileSync(
      path.join(repoRoot, 'content/dialogues-v2/release-candidate/dialogue_v2_content_candidate.v1.json'),
      'utf8',
    )) as unknown;

    const simulate = (candidateModule as Record<string, unknown>).simulateDialogueV2DeterministicStress;
    expect(typeof simulate).toBe('function');

    const report = (simulate as (value: unknown, root: string, turns: number) => unknown)(
      manifest,
      repoRoot,
      100,
    ) as {
      packetCount: number;
      turnsPerPacket: number;
      totalTurns: number;
      violations: readonly string[];
      semanticModelChecked: boolean;
    };

    expect(report).toEqual({
      packetCount: 304,
      turnsPerPacket: 100,
      totalTurns: 30_400,
      violations: [],
      semanticModelChecked: false,
    });
  });
});
