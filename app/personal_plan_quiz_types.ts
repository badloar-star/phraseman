export type PersonalPlanQuizChoice = { id: string; text: string; isCorrect: boolean; explanation: string };
export type PersonalPlanQuizQuestion = { id: string; prompt: string; sourcePhraseId: string | null; skill: string; choices: PersonalPlanQuizChoice[] };
export type PersonalPlanQuiz = { id: string; questions: PersonalPlanQuizQuestion[] };
