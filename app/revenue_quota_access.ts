/**
 * Compatibility entrypoint retained while callers move to monthly_training_sessions.
 * Training is a free local feature: this file intentionally has no premium, flag,
 * Firestore, or phone-state dependency.
 */
export {
  captureAccountGeneration,
  consumeMonthlyTrainingSession as consumeFlashcardTrainingQuota,
  previewMonthlyTrainingSessions as previewFlashcardTrainingQuota,
  type MonthlyTrainingSessionBypass as RevenueQuotaBypass,
  type MonthlyTrainingSessionMode as FlashcardTrainingQuotaMode,
  type MonthlyTrainingSessionQuotaResult as RevenueQuotaAccessResult,
  type MonthlyTrainingSessionStatus as RevenueQuotaAccessStatus,
} from './monthly_training_sessions';

export default function __RouteShim() {
  return null;
}
