// Lesson 1 Distractor Logic - Position-Aware Distractors
// Based on competitor analysis: distractors change based on which word position is being filled

// ════════════════════════════════════════════════════════════════════════════════════
// SEMANTIC POOLS - Words grouped by category for intelligent distractor selection
// ════════════════════════════════════════════════════════════════════════════════════

export const L1_SEMANTIC_POOLS = {
  // Subject pronouns (I, you, he, she, it, we, they)
  pronouns_subject: ['I', 'you', 'he', 'she', 'it', 'we', 'they'],

  // Forms of "to be"
  toBe_present: ['am', 'is', 'are', 'be'],
  toBe_past: ['was', 'were'],
  toBe_all: ['am', 'is', 'are', 'be', 'was', 'were', 'been', 'being'],

  // Articles and determiners
  articles: ['a', 'an', 'the'],
  determiners: ['this', 'that', 'these', 'those'],
  possessives: ['my', 'your', 'his', 'her', 'its', 'our', 'their'],

  // Adjectives (A1 level - from lesson 1)
  adjectives_A1: ['young', 'tall', 'smart', 'ready', 'free', 'busy', 'tired', 'easy', 'hard', 'new', 'old', 'good', 'kind'],

  // Professions/Nouns
  professions_singular: ['teacher', 'doctor', 'manager', 'programmer', 'lawyer', 'engineer', 'surgeon', 'dentist', 'accountant', 'consultant'],
  professions_plural: ['students', 'colleagues', 'partners', 'drivers', 'neighbours', 'parents', 'specialists', 'clients'],

  // Common nouns for "it"
  nouns_objects: ['phone', 'project', 'city', 'book', 'answer', 'meeting'],

  // Prepositions
  prepositions: ['at', 'from', 'in', 'on', 'for', 'with'],

  // Intensifiers and modifiers
  intensifiers: ['very', 'so', 'such'],

  // Other auxiliaries/structures (for confusing answers)
  confusing_words: ["not", "nothing", "never", "still", "also"],
};

// ════════════════════════════════════════════════════════════════════════════════════
// PHRASE STRUCTURES - Define what word type is expected at each position
// ════════════════════════════════════════════════════════════════════════════════════

export interface TokenDefinition {
  position: number;
  word: string;
  category: string;           // Category type for distractor selection
  distractorPool: string[];   // Specific distractors to show (or use category default)
}

export interface PhraseStructure {
  phraseIndex: number;
  phrase: string;           // Correct English phrase
  tokens: TokenDefinition[];
}

// ════════════════════════════════════════════════════════════════════════════════════
// LESSON 1 PHRASE STRUCTURES (50 phrases)
// ════════════════════════════════════════════════════════════════════════════════════

export const L1_PHRASE_STRUCTURES: PhraseStructure[] = [
  // 0: "I am a teacher"
  {
    phraseIndex: 0,
    phrase: 'I am a teacher',
    tokens: [
      { position: 0, word: 'I', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'am', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'a', category: 'article', distractorPool: [] },
      { position: 3, word: 'teacher', category: 'profession', distractorPool: [] },
    ]
  },
  // 1: "He is a doctor"
  {
    phraseIndex: 1,
    phrase: 'He is a doctor',
    tokens: [
      { position: 0, word: 'He', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'a', category: 'article', distractorPool: [] },
      { position: 3, word: 'doctor', category: 'profession', distractorPool: [] },
    ]
  },
  // 2: "She is a manager"
  {
    phraseIndex: 2,
    phrase: 'She is a manager',
    tokens: [
      { position: 0, word: 'She', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'a', category: 'article', distractorPool: [] },
      { position: 3, word: 'manager', category: 'profession', distractorPool: [] },
    ]
  },
  // 3: "We are students"
  {
    phraseIndex: 3,
    phrase: 'We are students',
    tokens: [
      { position: 0, word: 'We', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'are', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'students', category: 'profession_plural', distractorPool: [] },
    ]
  },
  // 4: "They are colleagues"
  {
    phraseIndex: 4,
    phrase: 'They are colleagues',
    tokens: [
      { position: 0, word: 'They', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'are', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'colleagues', category: 'profession_plural', distractorPool: [] },
    ]
  },
  // 5: "I am young"
  {
    phraseIndex: 5,
    phrase: 'I am young',
    tokens: [
      { position: 0, word: 'I', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'am', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'young', category: 'adjective', distractorPool: [] },
    ]
  },
  // 6: "He is tall"
  {
    phraseIndex: 6,
    phrase: 'He is tall',
    tokens: [
      { position: 0, word: 'He', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'tall', category: 'adjective', distractorPool: [] },
    ]
  },
  // 7: "She is smart"
  {
    phraseIndex: 7,
    phrase: 'She is smart',
    tokens: [
      { position: 0, word: 'She', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'smart', category: 'adjective', distractorPool: [] },
    ]
  },
  // 8: "We are ready"
  {
    phraseIndex: 8,
    phrase: 'We are ready',
    tokens: [
      { position: 0, word: 'We', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'are', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'ready', category: 'adjective', distractorPool: [] },
    ]
  },
  // 9: "They are at home"
  {
    phraseIndex: 9,
    phrase: 'They are at home',
    tokens: [
      { position: 0, word: 'They', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'are', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'at', category: 'preposition', distractorPool: [] },
      { position: 3, word: 'home', category: 'noun_object', distractorPool: [] },
    ]
  },
  // 10: "I am a programmer"
  {
    phraseIndex: 10,
    phrase: 'I am a programmer',
    tokens: [
      { position: 0, word: 'I', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'am', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'a', category: 'article', distractorPool: [] },
      { position: 3, word: 'programmer', category: 'profession', distractorPool: [] },
    ]
  },
  // 11: "He is a lawyer"
  {
    phraseIndex: 11,
    phrase: 'He is a lawyer',
    tokens: [
      { position: 0, word: 'He', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'a', category: 'article', distractorPool: [] },
      { position: 3, word: 'lawyer', category: 'profession', distractorPool: [] },
    ]
  },
  // 12: "She is an engineer"
  {
    phraseIndex: 12,
    phrase: 'She is an engineer',
    tokens: [
      { position: 0, word: 'She', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'an', category: 'article', distractorPool: [] },
      { position: 3, word: 'engineer', category: 'profession', distractorPool: [] },
    ]
  },
  // 13: "We are partners"
  {
    phraseIndex: 13,
    phrase: 'We are partners',
    tokens: [
      { position: 0, word: 'We', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'are', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'partners', category: 'profession_plural', distractorPool: [] },
    ]
  },
  // 14: "They are drivers"
  {
    phraseIndex: 14,
    phrase: 'They are drivers',
    tokens: [
      { position: 0, word: 'They', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'are', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'drivers', category: 'profession_plural', distractorPool: [] },
    ]
  },
  // 15: "I am free"
  {
    phraseIndex: 15,
    phrase: 'I am free',
    tokens: [
      { position: 0, word: 'I', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'am', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'free', category: 'adjective', distractorPool: [] },
    ]
  },
  // 16: "She is very smart"
  {
    phraseIndex: 16,
    phrase: 'She is very smart',
    tokens: [
      { position: 0, word: 'She', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'very', category: 'intensifier', distractorPool: [] },
      { position: 3, word: 'smart', category: 'adjective', distractorPool: [] },
    ]
  },
  // 17: "We are very tired"
  {
    phraseIndex: 17,
    phrase: 'We are very tired',
    tokens: [
      { position: 0, word: 'We', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'are', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'very', category: 'intensifier', distractorPool: [] },
      { position: 3, word: 'tired', category: 'adjective', distractorPool: [] },
    ]
  },
  // 18: "They are very tall"
  {
    phraseIndex: 18,
    phrase: 'They are very tall',
    tokens: [
      { position: 0, word: 'They', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'are', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'very', category: 'intensifier', distractorPool: [] },
      { position: 3, word: 'tall', category: 'adjective', distractorPool: [] },
    ]
  },
  // 19: "It is easy"
  {
    phraseIndex: 19,
    phrase: 'It is easy',
    tokens: [
      { position: 0, word: 'It', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'easy', category: 'adjective', distractorPool: [] },
    ]
  },
  // 20: "It is hard"
  {
    phraseIndex: 20,
    phrase: 'It is hard',
    tokens: [
      { position: 0, word: 'It', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'hard', category: 'adjective', distractorPool: [] },
    ]
  },
  // 21: "It is a new phone"
  {
    phraseIndex: 21,
    phrase: 'It is a new phone',
    tokens: [
      { position: 0, word: 'It', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'a', category: 'article', distractorPool: [] },
      { position: 3, word: 'new', category: 'adjective', distractorPool: [] },
      { position: 4, word: 'phone', category: 'noun_object', distractorPool: [] },
    ]
  },
  // 22: "He is my new manager"
  {
    phraseIndex: 22,
    phrase: 'He is my new manager',
    tokens: [
      { position: 0, word: 'He', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'my', category: 'possessive', distractorPool: [] },
      { position: 3, word: 'new', category: 'adjective', distractorPool: [] },
      { position: 4, word: 'manager', category: 'profession', distractorPool: [] },
    ]
  },
  // 23: "I am very busy"
  {
    phraseIndex: 23,
    phrase: 'I am very busy',
    tokens: [
      { position: 0, word: 'I', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'am', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'very', category: 'intensifier', distractorPool: [] },
      { position: 3, word: 'busy', category: 'adjective', distractorPool: [] },
    ]
  },
  // 24: "He is a civil engineer"
  {
    phraseIndex: 24,
    phrase: 'He is a civil engineer',
    tokens: [
      { position: 0, word: 'He', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'a', category: 'article', distractorPool: [] },
      { position: 3, word: 'civil', category: 'adjective', distractorPool: [] },
      { position: 4, word: 'engineer', category: 'profession', distractorPool: [] },
    ]
  },
  // 25: "It is an important meeting"
  {
    phraseIndex: 25,
    phrase: 'It is an important meeting',
    tokens: [
      { position: 0, word: 'It', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'an', category: 'article', distractorPool: [] },
      { position: 3, word: 'important', category: 'adjective', distractorPool: [] },
      { position: 4, word: 'meeting', category: 'noun_object', distractorPool: [] },
    ]
  },
  // 26: "She is a surgeon"
  {
    phraseIndex: 26,
    phrase: 'She is a surgeon',
    tokens: [
      { position: 0, word: 'She', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'a', category: 'article', distractorPool: [] },
      { position: 3, word: 'surgeon', category: 'profession', distractorPool: [] },
    ]
  },
  // 27: "They are our new clients"
  {
    phraseIndex: 27,
    phrase: 'They are our new clients',
    tokens: [
      { position: 0, word: 'They', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'are', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'our', category: 'possessive', distractorPool: [] },
      { position: 3, word: 'new', category: 'adjective', distractorPool: [] },
      { position: 4, word: 'clients', category: 'profession_plural', distractorPool: [] },
    ]
  },
  // 28: "I am an accountant"
  {
    phraseIndex: 28,
    phrase: 'I am an accountant',
    tokens: [
      { position: 0, word: 'I', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'am', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'an', category: 'article', distractorPool: [] },
      { position: 3, word: 'accountant', category: 'profession', distractorPool: [] },
    ]
  },
  // 29: "He is a dentist"
  {
    phraseIndex: 29,
    phrase: 'He is a dentist',
    tokens: [
      { position: 0, word: 'He', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'a', category: 'article', distractorPool: [] },
      { position: 3, word: 'dentist', category: 'profession', distractorPool: [] },
    ]
  },
  // 30: "She is a consultant"
  {
    phraseIndex: 30,
    phrase: 'She is a consultant',
    tokens: [
      { position: 0, word: 'She', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'a', category: 'article', distractorPool: [] },
      { position: 3, word: 'consultant', category: 'profession', distractorPool: [] },
    ]
  },
  // 31: "We are neighbours"
  {
    phraseIndex: 31,
    phrase: 'We are neighbours',
    tokens: [
      { position: 0, word: 'We', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'are', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'neighbours', category: 'profession_plural', distractorPool: [] },
    ]
  },
  // 32: "They are parents"
  {
    phraseIndex: 32,
    phrase: 'They are parents',
    tokens: [
      { position: 0, word: 'They', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'are', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'parents', category: 'profession_plural', distractorPool: [] },
    ]
  },
  // 33: "It is the right answer"
  {
    phraseIndex: 33,
    phrase: 'It is the right answer',
    tokens: [
      { position: 0, word: 'It', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'the', category: 'article', distractorPool: [] },
      { position: 3, word: 'right', category: 'adjective', distractorPool: [] },
      { position: 4, word: 'answer', category: 'noun_object', distractorPool: [] },
    ]
  },
  // 34: "He is my partner"
  {
    phraseIndex: 34,
    phrase: 'He is my partner',
    tokens: [
      { position: 0, word: 'He', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'my', category: 'possessive', distractorPool: [] },
      { position: 3, word: 'partner', category: 'profession', distractorPool: [] },
    ]
  },
  // 35: "She is my colleague"
  {
    phraseIndex: 35,
    phrase: 'She is my colleague',
    tokens: [
      { position: 0, word: 'She', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'my', category: 'possessive', distractorPool: [] },
      { position: 3, word: 'colleague', category: 'profession', distractorPool: [] },
    ]
  },
  // 36: "We are your neighbours"
  {
    phraseIndex: 36,
    phrase: 'We are your neighbours',
    tokens: [
      { position: 0, word: 'We', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'are', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'your', category: 'possessive', distractorPool: [] },
      { position: 3, word: 'neighbours', category: 'profession_plural', distractorPool: [] },
    ]
  },
  // 37: "He is a very good doctor"
  {
    phraseIndex: 37,
    phrase: 'He is a very good doctor',
    tokens: [
      { position: 0, word: 'He', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'a', category: 'article', distractorPool: [] },
      { position: 3, word: 'very', category: 'intensifier', distractorPool: [] },
      { position: 4, word: 'good', category: 'adjective', distractorPool: [] },
      { position: 5, word: 'doctor', category: 'profession', distractorPool: [] },
    ]
  },
  // 38: "She is a very experienced engineer"
  {
    phraseIndex: 38,
    phrase: 'She is a very experienced engineer',
    tokens: [
      { position: 0, word: 'She', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'a', category: 'article', distractorPool: [] },
      { position: 3, word: 'very', category: 'intensifier', distractorPool: [] },
      { position: 4, word: 'experienced', category: 'adjective', distractorPool: [] },
      { position: 5, word: 'engineer', category: 'profession', distractorPool: [] },
    ]
  },
  // 39: "It is a new project"
  {
    phraseIndex: 39,
    phrase: 'It is a new project',
    tokens: [
      { position: 0, word: 'It', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'a', category: 'article', distractorPool: [] },
      { position: 3, word: 'new', category: 'adjective', distractorPool: [] },
      { position: 4, word: 'project', category: 'noun_object', distractorPool: [] },
    ]
  },
  // 40: "It is a beautiful city"
  {
    phraseIndex: 40,
    phrase: 'It is a beautiful city',
    tokens: [
      { position: 0, word: 'It', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'a', category: 'article', distractorPool: [] },
      { position: 3, word: 'beautiful', category: 'adjective', distractorPool: [] },
      { position: 4, word: 'city', category: 'noun_object', distractorPool: [] },
    ]
  },
  // 41: "He is from London"
  {
    phraseIndex: 41,
    phrase: 'He is from London',
    tokens: [
      { position: 0, word: 'He', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'from', category: 'preposition', distractorPool: [] },
      { position: 3, word: 'London', category: 'noun_object', distractorPool: [] },
    ]
  },
  // 42: "She is from Berlin"
  {
    phraseIndex: 42,
    phrase: 'She is from Berlin',
    tokens: [
      { position: 0, word: 'She', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'from', category: 'preposition', distractorPool: [] },
      { position: 3, word: 'Berlin', category: 'noun_object', distractorPool: [] },
    ]
  },
  // 43: "We are from Canada"
  {
    phraseIndex: 43,
    phrase: 'We are from Canada',
    tokens: [
      { position: 0, word: 'We', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'are', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'from', category: 'preposition', distractorPool: [] },
      { position: 3, word: 'Canada', category: 'noun_object', distractorPool: [] },
    ]
  },
  // 44: "It is my favorite book"
  {
    phraseIndex: 44,
    phrase: 'It is my favorite book',
    tokens: [
      { position: 0, word: 'It', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'my', category: 'possessive', distractorPool: [] },
      { position: 3, word: 'favorite', category: 'adjective', distractorPool: [] },
      { position: 4, word: 'book', category: 'noun_object', distractorPool: [] },
    ]
  },
  // 45: "He is such a busy person"
  {
    phraseIndex: 45,
    phrase: 'He is such a busy person',
    tokens: [
      { position: 0, word: 'He', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'such', category: 'intensifier', distractorPool: [] },
      { position: 3, word: 'a', category: 'article', distractorPool: [] },
      { position: 4, word: 'busy', category: 'adjective', distractorPool: [] },
      { position: 5, word: 'person', category: 'noun_object', distractorPool: [] },
    ]
  },
  // 46: "She is so kind"
  {
    phraseIndex: 46,
    phrase: 'She is so kind',
    tokens: [
      { position: 0, word: 'She', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'is', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'so', category: 'intensifier', distractorPool: [] },
      { position: 3, word: 'kind', category: 'adjective', distractorPool: [] },
    ]
  },
  // 47: "We are a young team"
  {
    phraseIndex: 47,
    phrase: 'We are a young team',
    tokens: [
      { position: 0, word: 'We', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'are', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'a', category: 'article', distractorPool: [] },
      { position: 3, word: 'young', category: 'adjective', distractorPool: [] },
      { position: 4, word: 'team', category: 'noun_object', distractorPool: [] },
    ]
  },
  // 48: "They are experienced specialists"
  {
    phraseIndex: 48,
    phrase: 'They are experienced specialists',
    tokens: [
      { position: 0, word: 'They', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'are', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'experienced', category: 'adjective', distractorPool: [] },
      { position: 3, word: 'specialists', category: 'profession_plural', distractorPool: [] },
    ]
  },
  // 49: "I am a senior analyst"
  {
    phraseIndex: 49,
    phrase: 'I am a senior analyst',
    tokens: [
      { position: 0, word: 'I', category: 'pronoun', distractorPool: [] },
      { position: 1, word: 'am', category: 'toBe', distractorPool: [] },
      { position: 2, word: 'a', category: 'article', distractorPool: [] },
      { position: 3, word: 'senior', category: 'adjective', distractorPool: [] },
      { position: 4, word: 'analyst', category: 'profession', distractorPool: [] },
    ]
  },
];

// ════════════════════════════════════════════════════════════════════════════════════
// DISTRACTOR SELECTION FUNCTION
// Given a correct word and its category, return 5-6 intelligent distractors
// ════════════════════════════════════════════════════════════════════════════════════

export function getDistractorsForWord(
  correctWord: string,
  category: string,
  previousTokens: string[] = []
): string[] {
  const pools = L1_SEMANTIC_POOLS;
  let basePool: string[] = [];

  // Determine the subject from previous tokens (if available) for context-aware selection
  const subjectContext = previousTokens.length > 0 ? previousTokens[0].toLowerCase() : 'they';

  switch (category) {
    case 'pronoun':
      basePool = pools.pronouns_subject;
      break;

    case 'toBe':
      // Smart: filter based on likely subject
      if (['i'].includes(subjectContext)) {
        basePool = ['is', 'are', 'was', 'were', 'be'];
      } else if (['he', 'she', 'it'].includes(subjectContext)) {
        basePool = ['am', 'are', 'was', 'were', 'be'];
      } else if (['we', 'they', 'you'].includes(subjectContext)) {
        basePool = ['am', 'is', 'was', 'were', 'be'];
      } else {
        basePool = pools.toBe_all;
      }
      // Also add confusing auxiliaries
      basePool = [...basePool, "don't", "doesn't", "didn't"];
      break;

    case 'article':
      basePool = [...pools.articles, ...pools.determiners];
      break;

    case 'possessive':
      basePool = pools.possessives;
      break;

    case 'adjective':
      basePool = pools.adjectives_A1;
      break;

    case 'profession':
      basePool = pools.professions_singular;
      break;

    case 'profession_plural':
      basePool = pools.professions_plural;
      break;

    case 'noun_object':
      basePool = pools.nouns_objects;
      break;

    case 'preposition':
      basePool = pools.prepositions;
      break;

    case 'intensifier':
      basePool = pools.intensifiers;
      break;
  }

  // Remove correct word and return shuffled distractors
  const distractors = basePool
    .filter(w => w.toLowerCase() !== correctWord.toLowerCase())
    .slice(0, 5);

  return distractors.length >= 5 ? distractors : distractors;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
