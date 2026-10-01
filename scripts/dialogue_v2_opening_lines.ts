/**
 * Первые реплики Диалогов V2 (владелец 01.10: «первая реплика всегда уже должна быть
 * на экране, а не ждать, когда юзер начнёт»).
 *
 * Источник — content/dialogues-v2/opening-lines/opening_lines.v1.json, ОТДЕЛЬНО от
 * одобренного кандидата (квитанция 05592659…): кандидат и его хэши не меняются.
 * Этот модуль читает файл и прогоняет автопроверки; встраивание в пакеты делает
 * scripts/dialogue_v2_embedded_release.ts.
 *
 * Автопроверки: 76 сцен × en/es/fr/de, personaId ∈ участники сцены (тот же во всех
 * языках), длина ≤ 600 знаков, число слов по CEFR сцены, нет кириллицы, нет
 * английских служебных слов в es/fr/de, нет заглушек; свободный разговор — 4 языка.
 */
import fs from 'node:fs';
import path from 'node:path';

import { DIALOGUE_V2_CATALOGUE_INDEX } from '../shared/dialogue_v2_catalogue_index';
import {
  DIALOGUE_V2_OPENING_MAX_LENGTH,
  DIALOGUE_V2_STUDY_TARGETS,
  type DialogueV2StudyTarget,
} from '../shared/dialogue_v2_language_pack_contract';

export const DIALOGUE_V2_OPENING_LINES_PATH = 'content/dialogues-v2/opening-lines/opening_lines.v1.json';
const SCHEMA = 'dialogue-v2-opening-lines.v1';

/** Потолок слов по уровню сцены: A1/A2 — коротко, чтобы новичку было что ответить. */
export const DIALOGUE_V2_OPENING_MAX_WORDS: Readonly<Record<string, number>> = Object.freeze({
  A1: 12, A2: 16, B1: 22, B2: 28, C1: 35, C2: 35,
});
const FREEFORM_MAX_WORDS = 12;

export type DialogueV2OpeningLine = Readonly<{ personaId: string; text: string }>;
export type DialogueV2OpeningLines = Readonly<{
  status: string;
  scenarios: Readonly<Record<string, Readonly<Record<DialogueV2StudyTarget, DialogueV2OpeningLine>>>>;
  freeform: Readonly<Record<DialogueV2StudyTarget, string>>;
}>;

type PlainRecord = Record<string, unknown>;

function record(value: unknown, error: string): PlainRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(error);
  return value as PlainRecord;
}

const CYRILLIC_RE = /[Ѐ-ӿ]/u;
// зачем: TODO/XXX — с учётом регистра, иначе испанское «todo» ложно считается заглушкой.
const PLACEHOLDER_RE = /\{[^}]*\}|\[[^\]]*\]|\bTODO\b|\bTBD\b|XXX|[Ll]orem ipsum|\.\.\.$/u;
const CONTROL_RE = /[\u0000-\u001f\u007f]/u;
// Английские служебные слова в испанской/французской/немецкой реплике = утечка языка.
const ENGLISH_LEAK_RE = /(?:^|[\s¿¡"'(])(the|you|your|and|hello|hi|what|is|are|please|thanks)(?=$|[\s,.!?;:"')])/iu;

/** Слова = токены с буквой или цифрой (французское « ? » словом не считается). */
export function countDialogueV2OpeningWords(text: string): number {
  return text.split(/\s+/u).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

function checkLine(target: DialogueV2StudyTarget, where: string, text: unknown, maxWords: number, issues: string[]): text is string {
  if (typeof text !== 'string' || text !== text.trim() || text.length < 1) {
    issues.push(`${where}:${target}: empty_or_untrimmed`);
    return false;
  }
  if (text.length > DIALOGUE_V2_OPENING_MAX_LENGTH) issues.push(`${where}:${target}: too_long ${text.length}`);
  if (CONTROL_RE.test(text)) issues.push(`${where}:${target}: control_char`);
  if (PLACEHOLDER_RE.test(text)) issues.push(`${where}:${target}: placeholder`);
  if (CYRILLIC_RE.test(text)) issues.push(`${where}:${target}: cyrillic`);
  if (target !== 'en' && ENGLISH_LEAK_RE.test(text)) issues.push(`${where}:${target}: english_leak`);
  const words = countDialogueV2OpeningWords(text);
  if (words > maxWords) issues.push(`${where}:${target}: words ${words}>${maxWords}`);
  return true;
}

export type DialogueV2OpeningLinesRead = Readonly<{
  lines: DialogueV2OpeningLines;
  issues: readonly string[];
}>;

/**
 * Читает и проверяет файл реплик. personaIdsByScenario — участники сцены из одобренного
 * выпуска (одинаковые во всех языках). Бросает только на битую структуру файла.
 */
export function readDialogueV2OpeningLines(
  repoRoot: string,
  personaIdsByScenario: ReadonlyMap<string, readonly string[]>,
): DialogueV2OpeningLinesRead {
  const file = record(JSON.parse(fs.readFileSync(path.join(repoRoot, ...DIALOGUE_V2_OPENING_LINES_PATH.split('/')), 'utf8')), 'opening_lines_invalid');
  if (file.schemaVersion !== SCHEMA) throw new Error(`opening_lines_schema:${String(file.schemaVersion)}`);
  const rawScenarios = record(file.scenarios, 'opening_lines_scenarios_invalid');
  const rawFreeform = record(file.freeform, 'opening_lines_freeform_invalid');
  const issues: string[] = [];
  const scenarios: Record<string, Record<DialogueV2StudyTarget, DialogueV2OpeningLine>> = {};
  const known = new Set(DIALOGUE_V2_CATALOGUE_INDEX.map((entry) => entry.id));
  for (const id of Object.keys(rawScenarios)) if (!known.has(id)) issues.push(`${id}: unknown_scenario`);
  for (const entry of DIALOGUE_V2_CATALOGUE_INDEX) {
    const raw = rawScenarios[entry.id];
    if (!raw || typeof raw !== 'object') { issues.push(`${entry.id}: missing`); continue; }
    const byTarget = raw as PlainRecord;
    const personaIds = personaIdsByScenario.get(entry.id) ?? [];
    const maxWords = DIALOGUE_V2_OPENING_MAX_WORDS[entry.cefr] ?? 12;
    const lines = {} as Record<DialogueV2StudyTarget, DialogueV2OpeningLine>;
    const speakers = new Set<string>();
    for (const target of DIALOGUE_V2_STUDY_TARGETS) {
      const line = byTarget[target] as PlainRecord | undefined;
      if (!line || typeof line !== 'object') { issues.push(`${entry.id}:${target}: missing`); continue; }
      if (Object.keys(line).length !== 2) issues.push(`${entry.id}:${target}: extra_keys`);
      const personaId = line.personaId;
      if (typeof personaId !== 'string' || !personaIds.includes(personaId)) {
        issues.push(`${entry.id}:${target}: persona_not_in_scene ${String(personaId)}`);
        continue;
      }
      speakers.add(personaId);
      if (checkLine(target, entry.id, line.text, maxWords, issues)) {
        lines[target] = Object.freeze({ personaId, text: line.text as string });
      }
    }
    if (speakers.size > 1) issues.push(`${entry.id}: speaker_differs_between_languages`);
    scenarios[entry.id] = Object.freeze(lines);
  }
  const freeform = {} as Record<DialogueV2StudyTarget, string>;
  for (const target of DIALOGUE_V2_STUDY_TARGETS) {
    const line = rawFreeform[target] as PlainRecord | undefined;
    const text = line && typeof line === 'object' ? line.text : undefined;
    if (checkLine(target, 'freeform', text, FREEFORM_MAX_WORDS, issues)) freeform[target] = text as string;
  }
  return Object.freeze({
    lines: Object.freeze({
      status: String(file.status ?? ''),
      scenarios: Object.freeze(scenarios),
      freeform: Object.freeze(freeform),
    }),
    issues: Object.freeze(issues),
  });
}
