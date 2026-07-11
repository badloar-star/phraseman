import {
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';

export const isLevelUpAccountTokenCurrent = (
  token: AccountGenerationToken | null,
): token is AccountGenerationToken => token !== null
  && isCurrentAccountGeneration(token, token.stableId);

export const canAcknowledgeLevelUpForAccount = (
  modalToken: AccountGenerationToken | null,
  queueToken: AccountGenerationToken | null,
): boolean => modalToken !== null
  && queueToken !== null
  && modalToken.generation === queueToken.generation
  && modalToken.stableId === queueToken.stableId
  && modalToken.phase === 'active'
  && queueToken.phase === 'active'
  && isLevelUpAccountTokenCurrent(modalToken);
