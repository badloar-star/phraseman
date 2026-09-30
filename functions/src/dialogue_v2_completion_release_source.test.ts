import { loadDialogueV2CompletionReleaseCandidate } from './dialogue_v2_completion_release_source';

function repository(input: Readonly<{
  pointer?: unknown;
  release?: unknown;
  packets?: readonly Readonly<{ id: string; data: unknown }>[];
}>) {
  return {
    readDocument: jest.fn(async (path: string) => {
      if (path === 'dialogue_v2_release_control/active') return input.pointer ?? null;
      if (path === 'dialogue_v2_releases/release_2026_09_26') return input.release ?? null;
      return null;
    }),
    readCollection: jest.fn(async () => input.packets ?? []),
  };
}

describe('Dialogue V2 completion production release source', () => {
  test('returns null without an explicit active approved release pointer', async () => {
    const source = repository({});

    await expect(loadDialogueV2CompletionReleaseCandidate(source)).resolves.toBeNull();
    expect(source.readCollection).not.toHaveBeenCalled();
  });

  test('never accepts authoring or review-incomplete release documents', async () => {
    const source = repository({
      pointer: {
        schemaVersion: 'dialogue-v2-release-pointer.v1',
        status: 'active',
        releaseId: 'release_2026_09_26',
      },
      release: {
        schemaVersion: 'dialogue-v2-server-release.v1',
        status: 'authoring_only_not_releaseable',
        manifest: {},
      },
      packets: [{ id: 'de__travel_19', data: { studyTarget: 'de' } }],
    });

    await expect(loadDialogueV2CompletionReleaseCandidate(source)).resolves.toBeNull();
    expect(source.readCollection).not.toHaveBeenCalled();
  });

  test('assembles only a fixed-path approved release candidate for the server authorizer', async () => {
    const manifest = { 'de:travel_19': { scenarioId: 'travel_19' } };
    const packet = { studyTarget: 'de', scenario: { id: 'travel_19' } };
    const source = repository({
      pointer: {
        schemaVersion: 'dialogue-v2-release-pointer.v1',
        status: 'active',
        releaseId: 'release_2026_09_26',
      },
      release: {
        schemaVersion: 'dialogue-v2-server-release.v1',
        status: 'approved',
        manifest,
      },
      packets: [{ id: 'de__travel_19', data: packet }],
    });

    await expect(loadDialogueV2CompletionReleaseCandidate(source)).resolves.toEqual({
      manifest,
      packets: { 'de:travel_19': packet },
    });
    expect(source.readCollection).toHaveBeenCalledWith(
      'dialogue_v2_releases/release_2026_09_26/packets',
    );
  });

  test('fails closed for unsafe release IDs or duplicate packet authority keys', async () => {
    const unsafe = repository({
      pointer: {
        schemaVersion: 'dialogue-v2-release-pointer.v1',
        status: 'active',
        releaseId: '../authoring',
      },
    });
    await expect(loadDialogueV2CompletionReleaseCandidate(unsafe)).resolves.toBeNull();

    const duplicate = repository({
      pointer: {
        schemaVersion: 'dialogue-v2-release-pointer.v1',
        status: 'active',
        releaseId: 'release_2026_09_26',
      },
      release: {
        schemaVersion: 'dialogue-v2-server-release.v1',
        status: 'approved',
        manifest: {},
      },
      packets: [
        { id: 'one', data: { studyTarget: 'de', scenario: { id: 'travel_19' } } },
        { id: 'two', data: { studyTarget: 'de', scenario: { id: 'travel_19' } } },
      ],
    });
    await expect(loadDialogueV2CompletionReleaseCandidate(duplicate)).resolves.toBeNull();
  });
});
