import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from '../constants/theme';
import type { TaskType } from './daily_tasks';

// Every bundled illustration is intentionally wired here before it is generated.
// This keeps the daily quest art small, static, and traceable to a visible card slot.
const LESSON_ART = require('../assets/images/daily_task_card_art/lesson.webp') as ImageSourcePropType;
const RECALL_ART = require('../assets/images/daily_task_card_art/recall.webp') as ImageSourcePropType;
const WORDS_ART = require('../assets/images/daily_task_card_art/words.webp') as ImageSourcePropType;
const VERBS_ART = require('../assets/images/daily_task_card_art/verbs.webp') as ImageSourcePropType;
const WORD_TRAINER_ART = require('../assets/images/daily_task_card_art/word_trainer.webp') as ImageSourcePropType;
const PHRASE_TRAINER_ART = require('../assets/images/daily_task_card_art/practice.webp') as ImageSourcePropType;

const SAGE_PORCELAIN_LESSON_ART = require('../assets/images/daily_task_card_art/sagePorcelain/lesson.webp') as ImageSourcePropType;
const SAGE_PORCELAIN_RECALL_ART = require('../assets/images/daily_task_card_art/sagePorcelain/recall.webp') as ImageSourcePropType;
const SAGE_PORCELAIN_WORDS_ART = require('../assets/images/daily_task_card_art/sagePorcelain/words.webp') as ImageSourcePropType;
const SAGE_PORCELAIN_VERBS_ART = require('../assets/images/daily_task_card_art/sagePorcelain/verbs.webp') as ImageSourcePropType;
const SAGE_PORCELAIN_WORD_TRAINER_ART = require('../assets/images/daily_task_card_art/sagePorcelain/word_trainer.webp') as ImageSourcePropType;
const SAGE_PORCELAIN_PHRASE_TRAINER_ART = require('../assets/images/daily_task_card_art/sagePorcelain/practice.webp') as ImageSourcePropType;

export function dailyTaskBackgroundArt(type: TaskType, themeMode?: ThemeMode): ImageSourcePropType | undefined {
  const sagePorcelainArt = themeMode === 'sagePorcelain';
  switch (type) {
    case 'lesson_complete':
      return sagePorcelainArt ? SAGE_PORCELAIN_LESSON_ART : LESSON_ART;
    case 'recall_answers':
      return sagePorcelainArt ? SAGE_PORCELAIN_RECALL_ART : RECALL_ART;
    case 'words_learned':
      return sagePorcelainArt ? SAGE_PORCELAIN_WORDS_ART : WORDS_ART;
    case 'verb_learned':
      return sagePorcelainArt ? SAGE_PORCELAIN_VERBS_ART : VERBS_ART;
    case 'trainer_words':
      return sagePorcelainArt ? SAGE_PORCELAIN_WORD_TRAINER_ART : WORD_TRAINER_ART;
    case 'trainer_phrases':
      return sagePorcelainArt ? SAGE_PORCELAIN_PHRASE_TRAINER_ART : PHRASE_TRAINER_ART;
    default:
      return undefined;
  }
}
