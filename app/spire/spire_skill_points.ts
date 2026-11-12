/**
 * Очки навыков за задание Пика (D207, строка таблицы «Пик: задание» — навык зависит от вида задания; +2).
 * зачем отдельный модуль: экран ступени держит лимит длины (сторож Пика) — сюда вынесено решение «какой навык
 * растёт от какого вида задания», экрану остаётся один вызов. Ночное умолчание 12.11 (утром владелец может поправить):
 *   • на слух (listen_choose / listen_build) — «Слух»;
 *   • скорость (speed_match) — «Скорость»;
 *   • смысл фразы и слова (guess_phrase, context_choice, multi_select, typed_word, reply_pairs, evidence_choice) — «Словарь»;
 *   • остальное — форма и порядок слов — «Грамматика».
 * Начисление никогда не бросает (noteSkillAction).
 */
import { noteSkillAction } from '../../modules/skills/skill_store';
import type { SkillId } from '../../modules/skills/skill_points_table';

const LOG = '[SPIRE]';

const LISTENING = new Set(['listen_choose', 'listen_build']);
const SPEED = new Set(['speed_match']);
const VOCAB = new Set(['guess_phrase', 'context_choice', 'multi_select', 'typed_word', 'reply_pairs', 'evidence_choice']);

/** Какой навык растёт от вида задания Пика. */
export function spireTaskSkill(mode: string): SkillId {
  if (LISTENING.has(mode)) return 'listening';
  if (SPEED.has(mode)) return 'speed';
  if (VOCAB.has(mode)) return 'vocab';
  return 'grammar';
}

/** Верный ответ в задании Пика → очки навыка. `taskId` — повтор того же задания в тот же день даёт половину, потом ноль. */
export function noteSpireTaskSkill(task: Readonly<{ taskId: string; mode: string }> | undefined): void {
  if (!task) {
    console.warn(LOG, 'skill: skip no_task'); // guard-ok: ранний выход называет причину
    return;
  }
  noteSkillAction({ action: 'peak_task', itemKey: `spire_task:${task.taskId}`, skill: spireTaskSkill(task.mode) });
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
