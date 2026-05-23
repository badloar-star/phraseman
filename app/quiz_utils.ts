export function isQuizChoiceCorrect(chosen: number, correct: number | number[]): boolean {
  return Array.isArray(correct) ? correct.includes(chosen) : chosen === correct;
}

export function quizPrimaryCorrectIndex(correct: number | number[]): number {
  return Array.isArray(correct) ? Math.min(...correct) : correct;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
