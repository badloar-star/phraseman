import { DIALOGUE_V2_CATALOGUE_INDEX } from '../../shared/dialogue_v2_catalogue_index';
import { DIALOGUE_V2_STUDY_TARGETS } from '../../shared/dialogue_v2_language_pack_contract';
import { loadDialogueV2CompletionReleaseCandidate } from './dialogue_v2_completion_release_source';
import {
  loadEmbeddedDialogueV2ServerRelease,
  resetEmbeddedDialogueV2ServerReleaseForTests,
} from './dialogue_v2_embedded_release';
import {
  authorizeDialogueV2ServerCatalogue,
  authorizeDialogueV2ServerLanguagePacks,
  authorizeDialogueV2ServerPacket,
} from './dialogue_v2_server_authorization';
import { createDialogueV2SessionStartHandler } from './dialogue_v2_session_start_callable';

/**
 * зачем (владелец 01.10, «Диалоги не загрузились»): в проде нет указателя выпуска.
 * Эти тесты идут по НАСТОЯЩЕМУ встроенному выпуску (не моку) через настоящий
 * авторизатор — то же, что сделает dialogueV2Catalogue/SessionStart после выкладки.
 */
const pointerAbsentRepository = Object.freeze({
  readDocument: async () => null,
  readCollection: async () => [],
});

describe('Dialogue V2 embedded approved release', () => {
  beforeEach(() => resetEmbeddedDialogueV2ServerReleaseForTests());

  it('is the release source when Firestore has no pointer, and is cached per instance', async () => {
    const release = await loadDialogueV2CompletionReleaseCandidate(pointerAbsentRepository);
    expect(release).not.toBeNull();
    expect(Object.keys(release!.manifest)).toHaveLength(304);
    expect(Object.keys(release!.packets)).toHaveLength(304);
    expect(loadEmbeddedDialogueV2ServerRelease()).toBe(loadEmbeddedDialogueV2ServerRelease());
  });

  it.each(DIALOGUE_V2_STUDY_TARGETS)('catalogue authorizes 76 learner packets for %s', async (studyTarget) => {
    const release = await loadDialogueV2CompletionReleaseCandidate(pointerAbsentRepository);
    const catalogue = authorizeDialogueV2ServerCatalogue(studyTarget, release);
    expect(catalogue).not.toBeNull();
    expect(catalogue!.packets).toHaveLength(DIALOGUE_V2_CATALOGUE_INDEX.length);
    expect(catalogue!.packets.every((packet) => packet.studyTarget === studyTarget)).toBe(true);
    expect(authorizeDialogueV2ServerLanguagePacks(studyTarget, release)).toHaveLength(76);
  });

  it('every one of the 304 packets is reachable for a session start', () => {
    const release = loadEmbeddedDialogueV2ServerRelease();
    for (const studyTarget of DIALOGUE_V2_STUDY_TARGETS) {
      for (const entry of DIALOGUE_V2_CATALOGUE_INDEX) {
        const packet = authorizeDialogueV2ServerPacket({ studyTarget, scenarioId: entry.id }, release);
        expect(packet?.scenario.id).toBe(entry.id);
      }
    }
  });

  it('session start finds the packet through the embedded release', async () => {
    const createSession = jest.fn(async () => ({ sessionId: `d2s_${'S'.repeat(32)}`, expiresAtMs: 1 }));
    const handler = createDialogueV2SessionStartHandler({
      resolveStableAccountId: async () => 'stable-user',
      acquireStartPermit: async () => undefined,
      resolveRelease: () => loadDialogueV2CompletionReleaseCandidate(pointerAbsentRepository),
      createSession,
    });

    await expect(handler({
      auth: { uid: 'auth-user' },
      data: { studyTarget: 'es', scenarioId: 'travel_07' },
    })).resolves.toMatchObject({ ok: true });
    expect(createSession).toHaveBeenCalledWith(
      { authUid: 'auth-user', stableAccountId: 'stable-user' },
      { studyTarget: 'es', scenarioId: 'travel_07' },
    );
  });

  it('keeps an inactive Firestore pointer as a kill switch over the embedded release', async () => {
    const release = await loadDialogueV2CompletionReleaseCandidate({
      readDocument: async (path: string) => (path === 'dialogue_v2_release_control/active'
        ? { schemaVersion: 'dialogue-v2-release-pointer.v1', status: 'disabled', releaseId: 'x' }
        : null),
      readCollection: async () => [],
    });
    expect(release).toBeNull();
  });
});
