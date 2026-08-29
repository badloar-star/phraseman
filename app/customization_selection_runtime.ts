import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { getBestAvatarForLevel, getBestFrameForLevel } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from './account_generation';
import {
  commitCustomizationSelection,
  drainCustomizationSelectionOutbox,
} from './customization_selection_journal';
import { commitPhoneStateCustomizationSelection } from './phone_state_economy_bridge';

async function occurrenceIdentity(source: string, occurrenceId: string): Promise<Readonly<{
  operationId: string;
  occurrenceId: string;
}>> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify([source, occurrenceId]),
  );
  return Object.freeze({
    operationId: `customization_external:${source}:${digest.slice(0, 40)}`,
    occurrenceId: `${source}:${digest}`,
  });
}

/**
 * Auto-equip adapter for immutable external reward occurrences. Ownership is
 * still granted by the producer's own receipt; this records only the complete
 * avatar/frame/aura selection so raw mirrors cannot become a second authority.
 */
export async function commitExternalAuraSelectionOccurrence(input: Readonly<{
  source: 'level_gift' | 'league_chest' | 'season_cosmetic';
  occurrenceId: string;
  auraId: string;
  token?: AccountGenerationToken;
  inheritedLease?: AccountTransitionLockLease;
}>): Promise<void> {
  const token = input.token ?? captureAccountGeneration();
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    throw new Error('customization_selection_account_changed');
  }
  const rows = new Map(await AsyncStorage.multiGet([
    'user_avatar', 'user_frame', 'user_total_xp',
  ]));
  if (!isCurrentAccountGeneration(token, ownerStableId)) {
    throw new Error('customization_selection_account_changed');
  }
  const level = Math.max(1, getLevelFromXP(Number(rows.get('user_total_xp')) || 0));
  const identity = await occurrenceIdentity(input.source, input.occurrenceId);
  const committed = await commitCustomizationSelection({
    token,
    operationId: identity.operationId,
    source: 'external',
    occurrenceId: identity.occurrenceId,
    selection: {
      avatarValue: rows.get('user_avatar')?.trim() || getBestAvatarForLevel(level),
      frameId: rows.get('user_frame')?.trim() || getBestFrameForLevel(level).id,
      storedAuraSelection: input.auraId,
      level,
    },
    inheritedLease: input.inheritedLease,
  }, {
    storage: AsyncStorage,
    mirror: commitPhoneStateCustomizationSelection,
  });
  void drainCustomizationSelectionOutbox({
    token,
    lineage: committed.operation.lineage,
  }, {
    storage: AsyncStorage,
    mirror: commitPhoneStateCustomizationSelection,
  }).catch(() => {});
}

