import {
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';

/** A callback belongs to the active account and to this exact modal opening. */
export const isCurrentLevelGiftOpening = (
  currentOpeningToken: AccountGenerationToken | null,
  handlerToken: AccountGenerationToken,
): boolean => currentOpeningToken === handlerToken
  && isCurrentAccountGeneration(handlerToken);
