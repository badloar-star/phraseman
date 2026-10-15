// ═══════════════════════════════════════════════════════════════════════════
// dialogue_chain_gate.ts — m18 «Итог диалога — думает… → реакция → каскад целей» (эталон engagement-moments-v3-all.html `done3`): тайминги и чистые решения.
//
// зачем (координатор 15.10, ТЗ ETALON_MOMENTS_V3_TRANSFER m18): саспенс перед реакцией собеседника делает оценку эмоциональной. Саспенс ложится на НАСТОЯЩЕЕ ожидание итога
// из сети: пока ответа нет — «{Имя} думает…» (с 0,2 с), реакция — не раньше 1,0 с от входа и не раньше ответа; дальше цели по 300 мс с +0,6 с от реакции, «+N монет» за ними.
// Включается один раз при входе на экран (защёлка флага moments_v3, прогретого кэшем) — флаг, пришедший позже, не переключает экран посреди показа.
// Чистые функции: экран и модуль анимации только передают значения; причина каждого решения уходит в журнал [MOMENT-m18].
// ═══════════════════════════════════════════════════════════════════════════

export const DIALOGUE_CHAIN_LOG = '[MOMENT-m18]';

/** Тайминги образца, мс (от входа на экран и от реакции). */
export const DIALOGUE_CHAIN_TIMELINE = {
  /** Аватар и «думает…» всплывают. */
  thinkAt: 200,
  /** Реакция не раньше этого момента от входа (0,8 с саспенса после «думает…»). */
  reactMinAt: 1000,
  /** Первая цель — через 600 мс после реакции (1,6 − 1,0), дальше каждые 300 мс. */
  goalsAfterReact: 600,
  goalStep: 300,
  /** Блок всплывает 500 мс (emUp, сдвиг 18). */
  enter: 500,
  rise: 18,
} as const;

/** Когда показать реакцию: не раньше 1,0 с от входа и не раньше ответа сети (мс от входа). */
export function dialogueReactAt(readyAtFromMount: number): number {
  return Math.max(DIALOGUE_CHAIN_TIMELINE.reactMinAt, Math.max(0, readyAtFromMount));
}

/** Момент всплытия цели i и строки монет (мс от реакции). */
export function dialogueGoalAfterReact(i: number): number {
  return DIALOGUE_CHAIN_TIMELINE.goalsAfterReact + i * DIALOGUE_CHAIN_TIMELINE.goalStep;
}
export function dialogueCoinsAfterReact(goals: number): number {
  return dialogueGoalAfterReact(Math.max(0, goals));
}

export type DialogueReaction = 'pleased' | 'neutral';

export type DialogueReactionInput = Readonly<{
  endedBy: 'bot' | 'manual' | 'limit';
  mood: 'happy' | 'smile' | 'neutral' | 'sad' | 'angry' | null;
  goalsMet: number;
  goalsTotal: number;
}>;

/**
 * Реакция собеседника. «Доволен» — только когда это правда: настроение happy/smile, либо (настроения нет) разговор завершил собеседник и все цели закрыты.
 * Иначе — спокойная реакция без праздника и без звука «верно».
 */
export function deriveDialogueReaction(input: DialogueReactionInput): Readonly<{ reaction: DialogueReaction; reason: string }> {
  if (input.mood === 'happy' || input.mood === 'smile') return { reaction: 'pleased', reason: `настроение ${input.mood}` }; // guard-ok: log-only reason
  if (input.mood) return { reaction: 'neutral', reason: `настроение ${input.mood}` }; // guard-ok: log-only reason
  const allGoals = input.goalsTotal > 0 && input.goalsMet >= input.goalsTotal;
  if (input.endedBy === 'bot' && allGoals) return { reaction: 'pleased', reason: `настроения нет; собеседник завершил, цели ${input.goalsMet}/${input.goalsTotal}` }; // guard-ok: log-only reason
  return { reaction: 'neutral', reason: `настроения нет; завершил=${input.endedBy}, цели ${input.goalsMet}/${input.goalsTotal}` }; // guard-ok: log-only reason
}

/** Имя собеседника из снимка текстов сценария: первая персона; нет — null (подставится «Собеседник»). */
export function dialoguePartnerName(personas: Readonly<Record<string, Readonly<{ displayName: string }>>> | null | undefined): string | null {
  if (!personas) return null;
  for (const persona of Object.values(personas)) {
    const name = persona?.displayName?.trim();
    if (name) return name.slice(0, 40);
  }
  return null;
}
