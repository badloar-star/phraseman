// dialogs_data.ts — New Social Mechanics v3
// CLEARED: Waiting for new dialog scenarios to be added

export type ChoiceStyle = 'textbook' | 'casual' | 'awkward';

export interface DialogChoice3 {
  textEN: string;
  style: ChoiceStyle;
  /** For regular steps: absolute social score 0-100. For isFinalStep: delta (e.g. +5, -5) */
  socialScore: number;
  npcEmoji: string;
  impactRU: string;
  impactUK: string;
}

export interface DialogStep3 {
  id: string;
  npcTextEN: string;
  npcTextRU: string;
  npcTextUK: string;
  npcEmojiDefault: string;
  choices: DialogChoice3[];
  /** Last step: socialScore is a delta added to the running average */
  isFinalStep?: boolean;
}

export interface GlossaryEntry {
  phrase: string;
  explanationRU: string;
  explanationUK: string;
}

export interface DialogEnding3 {
  minScore: number;
  maxScore: number;
  icon: string;
  titleRU: string;
  titleUK: string;
  storyRU: string;
  storyUK: string;
  xpReward: number;
}

export interface DialogScenario3 {
  id: string;
  titleRU: string;
  titleUK: string;
  emoji: string;
  bgColor: string;
  setting: string;
  premium: boolean;
  roleRU: string;
  roleUK: string;
  goalRU: string;
  goalUK: string;
  /** 1 = very formal, 5 = very casual */
  toneLevel: number;
  toneLabelRU: string;
  toneLabelUK: string;
  npcName: string;
  npcGender: 'm' | 'f';
  npcEmojiDefault: string;
  gameOverEN: string;
  gameOverRU: string;
  gameOverUK: string;
  steps: DialogStep3[];
  glossary: GlossaryEntry[];
  endings: DialogEnding3[];
}

// ============================================
// DIALOG SCENARIOS - EMPTY, AWAITING NEW DATA
// ============================================

export const DIALOGS: DialogScenario3[] = [];

export function getDialogById(id: string): DialogScenario3 | undefined {
  return DIALOGS.find(d => d.id === id);
}
