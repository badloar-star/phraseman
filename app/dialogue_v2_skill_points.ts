/**
 * Очки навыков за ход диалога по сценарию (D207, таблица modules/skills/skill_points_table.ts).
 *
 * зачем (D207, задача координатора 12.11): диалог качает «Речь» за реплику голосом и «Слух» за реплику собеседника,
 * понятую без подсказки. Решение «за что начислить» — здесь, чистой функцией: экран только зовёт noteSkillAction.
 *
 * «Понял без подсказки» (решение на утро, можно откатить — docs/work/tasks/2026-11-12-dialogs-skill-points.md):
 * для реплики собеседника, на которую человек ответил, не открывали перевод и «Почему так», и ответ — не дословная фраза
 * из «Можно сказать…».
 */
import type { SkillActionEvent } from '../modules/skills/skill_store';

export type DialogueV2TurnSkillInput = Readonly<{
  scenarioId: string;
  /** Реплика человека (как ушла на сервер). */
  learnerText: string;
  /** Реплика записана голосом (к пузырю приложена запись). */
  voiced: boolean;
  /** Последняя реплика собеседника перед ответом; null — отвечать было не на что. */
  partner: Readonly<{ id: string; text: string }> | null;
  /** Реплики собеседника, у которых человек открывал перевод или «Почему так». */
  helpedPartnerIds: ReadonlySet<string>;
  /** Фразы «Можно сказать…», показанные под этой репликой. */
  sayHintTexts: readonly string[];
}>;

const KEY_TEXT_MAX = 160;

/** Тот же текст с точностью до регистра, пробелов и знаков в конце. */
export function normalizeDialogueSkillText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').replace(/[.!?…,;:\s]+$/u, '').trim();
}

/** Начисления за принятый сервером ход; пустой список — начислять нечего. */
export function dialogueV2TurnSkillActions(input: DialogueV2TurnSkillInput): readonly SkillActionEvent[] {
  const said = normalizeDialogueSkillText(input.learnerText);
  if (!said) return [];
  const events: SkillActionEvent[] = [];
  if (input.voiced) {
    events.push({ action: 'dialog_voice_reply', itemKey: `dialogue_v2:${input.scenarioId}:voice:${said.slice(0, KEY_TEXT_MAX)}` });
  }
  const partner = input.partner;
  const heard = partner ? normalizeDialogueSkillText(partner.text) : '';
  if (partner && heard && !input.helpedPartnerIds.has(partner.id)) {
    const usedSayHint = input.sayHintTexts.some((hint) => normalizeDialogueSkillText(hint) === said);
    if (!usedSayHint) {
      events.push({ action: 'dialog_understood_no_hint', itemKey: `dialogue_v2:${input.scenarioId}:heard:${heard.slice(0, KEY_TEXT_MAX)}` });
    }
  }
  return Object.freeze(events);
}
