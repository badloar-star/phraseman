import fs from 'node:fs';
import path from 'node:path';

import { DIALOGUE_V2_STUDY_TARGETS } from '../shared/dialogue_v2_language_pack_contract';
import {
  DIALOGUE_V2_EMBEDDED_SERVER_RELEASE_PATH,
  buildDialogueV2EmbeddedRelease,
  dialogueV2EmbeddedLearnerSnapshotPath,
  serializeDialogueV2EmbeddedArtifact,
} from '../scripts/dialogue_v2_embedded_release';

/**
 * Сторож встроенного выпуска Диалогов V2 (владелец 01.10). Падает, если
 * сгенерированные файлы разошлись с одобренным контентом, или контент/квитанция
 * перестали проходить шлюз одобрения. Чинить — перегенерацией
 * `npx tsx scripts/dialogue_v2_embedded_release.ts --write`, а не правкой сторожа.
 */
const repoRoot = path.resolve(__dirname, '..');

function readArtifact(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, ...relativePath.split('/')), 'utf8').replace(/\r\n/g, '\n');
}

describe('Dialogue V2 embedded release guard', () => {
  const built = buildDialogueV2EmbeddedRelease(repoRoot);

  it('server release file matches the owner-approved candidate', () => {
    expect(built.server.source.packetCount).toBe(304);
    expect(readArtifact(DIALOGUE_V2_EMBEDDED_SERVER_RELEASE_PATH))
      .toBe(serializeDialogueV2EmbeddedArtifact(built.server));
  });

  it.each(DIALOGUE_V2_STUDY_TARGETS)('learner snapshot for %s matches the server release', (target) => {
    expect(built.snapshots[target].packets).toHaveLength(76);
    expect(readArtifact(dialogueV2EmbeddedLearnerSnapshotPath(target)))
      .toBe(serializeDialogueV2EmbeddedArtifact(built.snapshots[target]));
  });

  it('learner snapshot carries no server-only release metadata', () => {
    const text = readArtifact(dialogueV2EmbeddedLearnerSnapshotPath('en'));
    for (const forbidden of ['packSha256', 'reviewReceiptSha256', 'catalogueSha256', 'packVersion', '"review"']) {
      expect(text).not.toContain(forbidden);
    }
  });
});
