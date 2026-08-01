import type { ImageSourcePropType } from 'react-native';
import type { TaskType } from './daily_tasks';

// Existing category backgrounds are intentionally preserved as a separate layer.
// Generated task-specific assets belong only in the fixed left icon slot.
const LESSON_ART = require('../assets/images/daily_task_card_art/lesson.webp') as ImageSourcePropType;
const RECALL_ART = require('../assets/images/daily_task_card_art/recall.webp') as ImageSourcePropType;
const WORDS_ART = require('../assets/images/daily_task_card_art/words.webp') as ImageSourcePropType;
const VERBS_ART = require('../assets/images/daily_task_card_art/verbs.webp') as ImageSourcePropType;
const WORD_TRAINER_ART = require('../assets/images/daily_task_card_art/word_trainer.webp') as ImageSourcePropType;
const PHRASE_TRAINER_ART = require('../assets/images/daily_task_card_art/practice.webp') as ImageSourcePropType;

export function dailyTaskBackgroundArt(type: TaskType): ImageSourcePropType | undefined {
  switch (type) {
    case 'lesson_complete':
      return LESSON_ART;
    case 'recall_answers':
      return RECALL_ART;
    case 'words_learned':
      return WORDS_ART;
    case 'verb_learned':
      return VERBS_ART;
    case 'trainer_words':
      return WORD_TRAINER_ART;
    case 'trainer_phrases':
      return PHRASE_TRAINER_ART;
    default:
      return undefined;
  }
}
