import { captureAccountGeneration, isCurrentAccountGeneration } from '../../app/account_generation';
import { patchAppSnapshot } from '../../app/app_snapshot_store';
import { emitAppEvent } from '../../app/events';
import { avatarCatalog } from './catalog';
import { parseAvatarDNA } from './canonicalize';
import type { AvatarDNA } from './contracts';
import { avatarDNARenderKey } from './render_key';
import { resolveAvatarDNA } from './resolver';
import {
  commitAvatarDNA,
  readAvatarDNAState,
  type AvatarDNAStoredState,
  type CommitAvatarDNAResult,
} from './storage';

export type AvatarDNASaveDependencies = Readonly<{
  validate: (input: unknown) => AvatarDNA | Promise<AvatarDNA>;
  renderLocal: (dna: AvatarDNA) => Readonly<{ portrait: string; studio: string }> | Promise<Readonly<{ portrait: string; studio: string }>>;
  commitLocal: (dna: AvatarDNA, renderIds: Readonly<{ portrait: string; studio: string }>) => Promise<CommitAvatarDNAResult>;
  readCommitted: () => Promise<AvatarDNAStoredState | null>;
  patchSnapshot: (state: AvatarDNAStoredState) => void;
  enqueueSync: (state: AvatarDNAStoredState) => void | Promise<void>;
}>;

export type SaveAvatarDNADraftResult = Readonly<
  | { status: 'committed'; state: AvatarDNAStoredState }
  | { status: 'stale-account' }
>;

export async function saveAvatarDNADraft(
  input: unknown,
  deps: AvatarDNASaveDependencies,
): Promise<SaveAvatarDNADraftResult> {
  const dna = await deps.validate(input);
  const renderIds = await deps.renderLocal(dna);
  const committed = await deps.commitLocal(dna, renderIds);
  if (committed.status === 'stale-account') return committed;
  const state = await deps.readCommitted();
  if (!state) throw new Error('avatar_dna_committed_state_missing');
  deps.patchSnapshot(state);
  try {
    await deps.enqueueSync(state);
  } catch {
    // The local commit is authoritative for personal progress. Offline/public
    // sync is retried later and must never roll back the visible character.
  }
  return { status: 'committed', state };
}

const selectedItemIds = (dna: AvatarDNA): readonly string[] => [
  dna.base.skinToneId,
  dna.base.faceBaseId,
  dna.base.bodyBaseId,
  dna.face.eyesId,
  dna.face.irisColorId,
  dna.face.browsId,
  dna.face.noseId,
  dna.face.mouthId,
  ...dna.face.skinDetailIds,
  ...dna.face.makeupIds,
  ...(dna.face.facialHairId ? [dna.face.facialHairId] : []),
  dna.hair.styleId,
  dna.hair.colorId,
  dna.wearables.outfitId,
  ...[
    dna.wearables.headwearId,
    dna.wearables.maskId,
    dna.wearables.eyewearId,
    dna.wearables.earAccessoryId,
    dna.wearables.neckAccessoryId,
    dna.scene.backgroundId,
    dna.scene.auraId,
    dna.scene.frameId,
    dna.scene.foregroundFxId,
  ].filter((id): id is string => id !== null),
];

export function validateAvatarDNADraft(
  input: unknown,
  ownedItemIds: ReadonlySet<string> = new Set(),
): AvatarDNA {
  const resolved = resolveAvatarDNA(input, avatarCatalog);
  for (const itemId of selectedItemIds(resolved.chosenDNA)) {
    const item = avatarCatalog.items.find((candidate) => candidate.id === itemId);
    if (!item) throw new TypeError('avatar_dna_item_missing');
    if (item.entitlement.kind !== 'free' && !ownedItemIds.has(item.id)) {
      throw new TypeError('avatar_dna_entitlement_missing');
    }
  }
  return parseAvatarDNA(resolved.chosenDNA);
}

export async function buildAvatarDNALocalRenderIds(
  dna: AvatarDNA,
): Promise<Readonly<{ portrait: string; studio: string }>> {
  const renderKey = await avatarDNARenderKey(dna, avatarCatalog.manifestVersion);
  const safeKey = renderKey.replace(/[^A-Za-z0-9._-]/g, '_');
  return {
    portrait: `${safeKey}_portrait`,
    studio: `${safeKey}_studio`,
  };
}

const patchCommittedAvatarDNA = (state: AvatarDNAStoredState): void => {
  patchAppSnapshot((current) => {
    const updatedAt = Math.max(Date.now(), state.updatedAtMs);
    return {
      ...(current.customization ? {
        customization: {
          ...current.customization,
          source: 'local' as const,
          updatedAt,
          avatarDNA: state,
        },
      } : {}),
      ...(current.profile ? {
        profile: {
          ...current.profile,
          source: 'local' as const,
          updatedAt,
          avatarDNA: state,
        },
      } : {}),
    };
  });
};

export async function saveCurrentAvatarDNA(
  input: unknown,
  ownedItemIds: ReadonlySet<string> = new Set(),
): Promise<SaveAvatarDNADraftResult> {
  const account = captureAccountGeneration();
  const ownerStableId = account.stableId?.trim() ?? '';
  if (!ownerStableId || !isCurrentAccountGeneration(account, ownerStableId)) {
    return { status: 'stale-account' };
  }
  return saveAvatarDNADraft(input, {
    validate: (draft) => validateAvatarDNADraft(draft, ownedItemIds),
    renderLocal: buildAvatarDNALocalRenderIds,
    commitLocal: (dna, renderIds) => commitAvatarDNA({
      ownerStableId,
      accountGeneration: account.generation,
      dna,
      renderIds,
      manifestVersion: avatarCatalog.manifestVersion,
    }),
    readCommitted: () => readAvatarDNAState(ownerStableId, account.generation),
    patchSnapshot: patchCommittedAvatarDNA,
    enqueueSync: () => {
      emitAppEvent('avatar_dna_sync_requested', {
        ownerStableId,
        accountGeneration: account.generation,
      });
    },
  });
}
