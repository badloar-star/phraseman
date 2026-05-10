import { playExclusiveShortSfx } from './exclusive_short_sfx';

const ACTIVITY_COMPLETE_ASSET = require('../assets/sounds/activity-complete-notification.mp3');

/**
 * Урок полностью → lesson_complete, словарь / глаголы / предлоги — финальный экран,
 * квиз — итоговая карточка (без режима повторения ошибок).
 */
export async function playActivityCompletionModalSound(): Promise<void> {
  await playExclusiveShortSfx(ACTIVITY_COMPLETE_ASSET);
}
