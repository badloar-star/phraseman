/**
 * Служебный текст Диалогов V2 на ЯЗЫКЕ ИНТЕРФЕЙСА (название сцены, брифинг, задания,
 * имена и стиль собеседников).
 *
 * зачем (владелец 01.10: «Почему диалоги в русском интерфейсе все на английском?»):
 * пакеты выпуска несут title/briefing/objectives/personas только на ИЗУЧАЕМОМ языке.
 * Экран брифинга/хаба показывает их по-русски (или на другом языке интерфейса) из
 * отдельного снимка shared/generated/dialogue_v2_ui_copy.<uiLang>.json; одобренный
 * кандидат и серверный выпуск не меняются.
 *
 * Источники:
 *   ru            — одобренный ledger content/dialogues-v2/authoring/dialogue_v2_authoring_ru.json;
 *   en, es        — одобренные пакеты встроенного выпуска (то же, что видит ученик этого языка);
 *   uk, pt-BR, vi, id, tr, pl — перевод с русского (решение координатора Q19 (а)),
 *                   content/dialogues-v2/ui-copy/translations/dialogue_v2_ui_copy.<uiLang>.v1.json,
 *                   принимается только через автопроверки ниже.
 *
 * Запуск:  npx tsx scripts/dialogue_v2_ui_copy.ts --write
 * Сторож:  npx tsx scripts/dialogue_v2_ui_copy.ts --check   (падает при расхождении/провале проверок)
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { DIALOGUE_V2_CATALOGUE_INDEX } from '../shared/dialogue_v2_catalogue_index';

const LOG = '[DIALOGUE-V2-UI-COPY]';
const LEDGER_PATH = 'content/dialogues-v2/authoring/dialogue_v2_authoring_ru.json';
const SERVER_RELEASE_PATH = 'functions/src/generated/dialogue_v2_server_release.json';
const OVERRIDES_PATH = 'content/dialogues-v2/ui-copy/dialogue_v2_ui_copy_overrides.v1.json';
const TRANSLATION_SCHEMA ='dialogue-v2-ui-copy-translation.v1';
const OUTPUT_SCHEMA = 'dialogue-v2-ui-copy.v1';

export const DIALOGUE_V2_UI_COPY_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
export type DialogueV2UiCopyLang = typeof DIALOGUE_V2_UI_COPY_LANGS[number];
const TRANSLATED_LANGS = ['uk', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type TranslatedLang = typeof TRANSLATED_LANGS[number];

export function dialogueV2UiCopyOutputPath(uiLang: DialogueV2UiCopyLang): string {
  return `shared/generated/dialogue_v2_ui_copy.${uiLang}.json`;
}

export function dialogueV2UiCopyTranslationPath(uiLang: TranslatedLang): string {
  return `content/dialogues-v2/ui-copy/translations/dialogue_v2_ui_copy.${uiLang}.v1.json`;
}

/** Предельные длины — те же, что у пакета выпуска (validateDialogueV2LanguagePack). */
export const DIALOGUE_V2_UI_COPY_LIMITS = Object.freeze({
  title: 120,
  briefing: 480,
  objective: 240,
  displayName: 64,
  styleNote: 240,
  world: 80,
});

// зачем: названия миров хаба для en/es — ровно те, что уже стоят в DialogueV2CatalogueContainer.
const RELEASE_WORLD_TITLES: Readonly<Record<'en' | 'es', Record<string, string>>> = Object.freeze({
  en: { social: 'Social', work: 'Work', travel: 'Travel', everyday: 'Everyday' },
  es: { social: 'Social', work: 'Trabajo', travel: 'Viajes', everyday: 'Día a día' },
});

export type DialogueV2UiCopyScenario = Readonly<{
  title: string;
  briefing: string;
  objectiveLabels: Readonly<Record<string, string>>;
  personas: Readonly<Record<string, Readonly<{ displayName: string; styleNote: string }>>>;
}>;

export type DialogueV2UiCopyFile = Readonly<{
  schemaVersion: typeof OUTPUT_SCHEMA;
  uiLang: DialogueV2UiCopyLang;
  source: 'ledger_ru' | 'approved_release' | 'translation_from_ru';
  worlds: Readonly<Record<string, string>>;
  scenarios: Readonly<Record<string, DialogueV2UiCopyScenario>>;
}>;

type PlainRecord = Record<string, unknown>;

function record(value: unknown, error: string): PlainRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(error);
  return value as PlainRecord;
}

function array(value: unknown, error: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(error);
  return value;
}

function str(value: unknown, error: string): string {
  if (typeof value !== 'string') throw new Error(error);
  return value;
}

function readJson(repoRoot: string, relativePath: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, ...relativePath.split('/')), 'utf8')) as unknown;
}

/** Каркас сцен (id заданий и собеседников) — из одобренного английского выпуска. */
type Skeleton = ReadonlyMap<string, Readonly<{ worldId: string; objectiveIds: readonly string[]; personaIds: readonly string[] }>>;

function releasePackets(repoRoot: string): PlainRecord {
  const file = record(readJson(repoRoot, SERVER_RELEASE_PATH), 'server_release_invalid');
  return record(record(file.release, 'server_release_body_invalid').packets, 'server_release_packets_invalid');
}

function skeletonFromRelease(packets: PlainRecord): Skeleton {
  const result = new Map<string, Readonly<{ worldId: string; objectiveIds: readonly string[]; personaIds: readonly string[] }>>();
  for (const entry of DIALOGUE_V2_CATALOGUE_INDEX) {
    const packet = record(packets[`en:${entry.id}`], `release_packet_missing:${entry.id}`);
    const scenario = record(packet.scenario, `release_scenario_invalid:${entry.id}`);
    result.set(entry.id, Object.freeze({
      worldId: entry.worldId,
      objectiveIds: Object.freeze(array(scenario.objectives, 'objectives').map((raw) => str(record(raw, 'objective').id, 'objective_id'))),
      personaIds: Object.freeze(array(scenario.personas, 'personas').map((raw) => str(record(raw, 'persona').id, 'persona_id'))),
    }));
  }
  return result;
}

function fromLedger(repoRoot: string): DialogueV2UiCopyFile {
  const ledger = record(readJson(repoRoot, LEDGER_PATH), 'ledger_invalid');
  const worlds: Record<string, string> = {};
  const scenarios: Record<string, DialogueV2UiCopyScenario> = {};
  for (const rawWorld of array(ledger.worlds, 'ledger_worlds_invalid')) {
    const world = record(rawWorld, 'ledger_world_invalid');
    worlds[str(world.id, 'world_id')] = str(world.titleRu, 'world_title');
    for (const rawScenario of array(world.scenarios, 'ledger_scenarios_invalid')) {
      const scenario = record(rawScenario, 'ledger_scenario_invalid');
      const id = str(scenario.id, 'scenario_id');
      scenarios[id] = Object.freeze({
        title: str(scenario.titleRu, `title:${id}`),
        briefing: str(scenario.briefingRu, `briefing:${id}`),
        objectiveLabels: Object.freeze(Object.fromEntries(array(scenario.objectives, `objectives:${id}`).map((raw) => {
          const objective = record(raw, `objective:${id}`);
          return [str(objective.id, `objective_id:${id}`), str(objective.labelRu, `objective_label:${id}`)];
        }))),
        personas: Object.freeze(Object.fromEntries(array(scenario.personas, `personas:${id}`).map((raw) => {
          const persona = record(raw, `persona:${id}`);
          return [str(persona.id, `persona_id:${id}`), Object.freeze({
            displayName: str(persona.displayNameRu, `persona_name:${id}`),
            styleNote: str(persona.styleNoteRu, `persona_style:${id}`),
          })];
        }))),
      });
    }
  }
  return Object.freeze({ schemaVersion: OUTPUT_SCHEMA, uiLang: 'ru', source: 'ledger_ru', worlds: Object.freeze(worlds), scenarios: Object.freeze(scenarios) });
}

function fromRelease(packets: PlainRecord, uiLang: 'en' | 'es'): DialogueV2UiCopyFile {
  const scenarios: Record<string, DialogueV2UiCopyScenario> = {};
  for (const entry of DIALOGUE_V2_CATALOGUE_INDEX) {
    const packet = record(packets[`${uiLang}:${entry.id}`], `release_packet_missing:${uiLang}:${entry.id}`);
    const scenario = record(packet.scenario, 'scenario');
    const content = record(packet.content, 'content');
    scenarios[entry.id] = Object.freeze({
      title: str(content.title, 'title'),
      briefing: str(content.briefing, 'briefing'),
      objectiveLabels: Object.freeze(Object.fromEntries(array(scenario.objectives, 'objectives').map((raw) => {
        const objective = record(raw, 'objective');
        return [str(objective.id, 'objective_id'), str(objective.label, 'objective_label')];
      }))),
      personas: Object.freeze(Object.fromEntries(array(scenario.personas, 'personas').map((raw) => {
        const persona = record(raw, 'persona');
        return [str(persona.id, 'persona_id'), Object.freeze({
          displayName: str(persona.displayName, 'persona_name'),
          styleNote: str(persona.styleNote, 'persona_style'),
        })];
      }))),
    });
  }
  return Object.freeze({
    schemaVersion: OUTPUT_SCHEMA,
    uiLang,
    source: 'approved_release',
    worlds: Object.freeze({ ...RELEASE_WORLD_TITLES[uiLang] }),
    scenarios: Object.freeze(scenarios),
  });
}

function fromTranslation(repoRoot: string, uiLang: TranslatedLang, skeleton: Skeleton): DialogueV2UiCopyFile {
  const source = record(readJson(repoRoot, dialogueV2UiCopyTranslationPath(uiLang)), `translation_invalid:${uiLang}`);
  if (source.schemaVersion !== TRANSLATION_SCHEMA || source.uiLang !== uiLang || source.sourceLocale !== 'ru') {
    throw new Error(`translation_header_invalid:${uiLang}`);
  }
  const worlds = record(source.worlds, `translation_worlds_invalid:${uiLang}`);
  const personas = record(source.personas, `translation_personas_invalid:${uiLang}`);
  const sourceScenarios = record(source.scenarios, `translation_scenarios_invalid:${uiLang}`);
  const extra = Object.keys(sourceScenarios).filter((id) => !skeleton.has(id));
  if (extra.length > 0) throw new Error(`translation_extra_scenarios:${uiLang}:${extra.slice(0, 3).join(',')}`);
  const scenarios: Record<string, DialogueV2UiCopyScenario> = {};
  for (const [id, shape] of skeleton) {
    const scenario = record(sourceScenarios[id], `translation_scenario_missing:${uiLang}:${id}`);
    const objectives = record(scenario.objectives, `translation_objectives_invalid:${uiLang}:${id}`);
    scenarios[id] = Object.freeze({
      title: str(scenario.title, `translation_title:${uiLang}:${id}`),
      briefing: str(scenario.briefing, `translation_briefing:${uiLang}:${id}`),
      objectiveLabels: Object.freeze(Object.fromEntries(shape.objectiveIds.map((objectiveId) => [
        objectiveId,
        str(objectives[objectiveId], `translation_objective_missing:${uiLang}:${id}:${objectiveId}`),
      ]))),
      personas: Object.freeze(Object.fromEntries(shape.personaIds.map((personaId) => {
        const persona = record(personas[personaId], `translation_persona_missing:${uiLang}:${personaId}`);
        return [personaId, Object.freeze({
          displayName: str(persona.displayName, `translation_persona_name:${uiLang}:${personaId}`),
          styleNote: str(persona.styleNote, `translation_persona_style:${uiLang}:${personaId}`),
        })];
      }))),
    });
    const extraObjectives = Object.keys(objectives).filter((objectiveId) => !shape.objectiveIds.includes(objectiveId));
    if (extraObjectives.length > 0) throw new Error(`translation_extra_objectives:${uiLang}:${id}`);
  }
  return Object.freeze({
    schemaVersion: OUTPUT_SCHEMA,
    uiLang,
    source: 'translation_from_ru',
    worlds: Object.freeze(Object.fromEntries(['social', 'work', 'travel', 'everyday'].map((worldId) => [
      worldId, str(worlds[worldId], `translation_world_missing:${uiLang}:${worldId}`),
    ]))),
    scenarios: Object.freeze(scenarios),
  });
}

/**
 * зачем: одобренный ledger местами несёт английское слово в русском тексте («review»).
 * Ledger и кандидат НЕ меняются (квитанция одобрения); точечная правка только для
 * показа на языке интерфейса, с причиной, отдельным файлом.
 */
function applyOverrides(repoRoot: string, files: Partial<Record<DialogueV2UiCopyLang, DialogueV2UiCopyFile>>): void {
  const absolute = path.join(repoRoot, ...OVERRIDES_PATH.split('/'));
  if (!fs.existsSync(absolute)) return;
  const overrides = record(record(readJson(repoRoot, OVERRIDES_PATH), 'overrides_invalid').overrides, 'overrides_body_invalid');
  for (const [uiLang, rawByScenario] of Object.entries(overrides)) {
    const file = files[uiLang as DialogueV2UiCopyLang];
    if (!file) throw new Error(`override_lang_unknown:${uiLang}`);
    const scenarios: Record<string, DialogueV2UiCopyScenario> = { ...file.scenarios };
    for (const [scenarioId, rawOverride] of Object.entries(record(rawByScenario, `override_lang_invalid:${uiLang}`))) {
      const override = record(rawOverride, `override_invalid:${uiLang}:${scenarioId}`);
      const current = scenarios[scenarioId];
      if (!current) throw new Error(`override_scenario_unknown:${uiLang}:${scenarioId}`);
      str(override.reason, `override_reason_missing:${uiLang}:${scenarioId}`);
      scenarios[scenarioId] = Object.freeze({
        ...current,
        ...(override.title !== undefined ? { title: str(override.title, 'override_title') } : {}),
        ...(override.briefing !== undefined ? { briefing: str(override.briefing, 'override_briefing') } : {}),
      });
    }
    files[uiLang as DialogueV2UiCopyLang] = Object.freeze({ ...file, scenarios: Object.freeze(scenarios) });
  }
}

// ── Автопроверки (решение координатора Q19 (а)) ─────────────────────────────

const CYRILLIC_RE = /[Ѐ-ӿ]/u;
const LATIN_WORD_RE = /[A-Za-z]{3,}/u;
const RUSSIAN_ONLY_LETTERS_RE = /[ыэъёЫЭЪЁ]/u;
const VIETNAMESE_MARK_RE = /[ăâđêôơưàáảãạèéẻẽẹìíỉĩịòóỏõọùúủũụỳýỷỹỵ]/iu;
// зачем: TODO/XXX — с учётом регистра, иначе испанское «todo» ложно считается заглушкой.
const PLACEHOLDER_RE = /\{[^}]*\}|\bTODO\b|\bTBD\b|XXX|[Ll]orem ipsum|\.\.\.|…$|\[[^\]]*\]/u;
const CONTROL_RE = /[\u0000-\u001f\u007f]/u;
// Явные английские служебные слова — признак непереведённой строки в не-английском языке.
const ENGLISH_LEAK_RE = /\b(the|and|your|you|with|please|goal|task|chat with)\b/iu;

type CheckIssue = string;

function checkText(uiLang: DialogueV2UiCopyLang, where: string, value: string, max: number, issues: CheckIssue[], options: Readonly<{ isName?: boolean }> = {}): void {
  if (value !== value.trim() || value.length < 1) issues.push(`${uiLang}:${where}: empty_or_untrimmed`);
  if (value.length > max) issues.push(`${uiLang}:${where}: too_long ${value.length}>${max}`);
  if (CONTROL_RE.test(value)) issues.push(`${uiLang}:${where}: control_char`);
  if (PLACEHOLDER_RE.test(value)) issues.push(`${uiLang}:${where}: placeholder`);
  if (uiLang === 'ru' || uiLang === 'uk') {
    if (!CYRILLIC_RE.test(value)) issues.push(`${uiLang}:${where}: not_cyrillic`);
    if (!options.isName && LATIN_WORD_RE.test(value)) issues.push(`${uiLang}:${where}: latin_word`);
    if (uiLang === 'uk' && RUSSIAN_ONLY_LETTERS_RE.test(value)) issues.push(`${uiLang}:${where}: russian_letters`);
  } else {
    if (CYRILLIC_RE.test(value)) issues.push(`${uiLang}:${where}: cyrillic_in_latin_lang`);
    if (uiLang !== 'en' && !options.isName && ENGLISH_LEAK_RE.test(value)) issues.push(`${uiLang}:${where}: english_leak`);
  }
}

/** Возвращает список нарушений; пустой — файл годен к показу. */
export function checkDialogueV2UiCopy(file: DialogueV2UiCopyFile, skeleton: Skeleton): readonly CheckIssue[] {
  const issues: CheckIssue[] = [];
  const lang = file.uiLang;
  for (const worldId of ['social', 'work', 'travel', 'everyday']) {
    const title = file.worlds[worldId];
    if (typeof title !== 'string') issues.push(`${lang}:world:${worldId}: missing`);
    else checkText(lang, `world:${worldId}`, title, DIALOGUE_V2_UI_COPY_LIMITS.world, issues);
  }
  if (Object.keys(file.scenarios).length !== skeleton.size) issues.push(`${lang}: scenario_count ${Object.keys(file.scenarios).length}`);
  for (const [id, shape] of skeleton) {
    const scenario = file.scenarios[id];
    if (!scenario) { issues.push(`${lang}:${id}: missing`); continue; }
    checkText(lang, `${id}:title`, scenario.title, DIALOGUE_V2_UI_COPY_LIMITS.title, issues);
    checkText(lang, `${id}:briefing`, scenario.briefing, DIALOGUE_V2_UI_COPY_LIMITS.briefing, issues);
    if (lang === 'vi' && !VIETNAMESE_MARK_RE.test(scenario.briefing)) issues.push(`vi:${id}:briefing: no_vietnamese_marks`);
    const objectiveIds = Object.keys(scenario.objectiveLabels);
    if (objectiveIds.length !== shape.objectiveIds.length || shape.objectiveIds.some((objectiveId) => !objectiveIds.includes(objectiveId))) {
      issues.push(`${lang}:${id}: objective_ids_mismatch`);
    }
    for (const objectiveId of shape.objectiveIds) {
      const label = scenario.objectiveLabels[objectiveId];
      if (typeof label !== 'string') issues.push(`${lang}:${id}:${objectiveId}: missing`);
      else checkText(lang, `${id}:${objectiveId}`, label, DIALOGUE_V2_UI_COPY_LIMITS.objective, issues);
    }
    const personaIds = Object.keys(scenario.personas);
    if (personaIds.length !== shape.personaIds.length || shape.personaIds.some((personaId) => !personaIds.includes(personaId))) {
      issues.push(`${lang}:${id}: persona_ids_mismatch`);
    }
    for (const personaId of shape.personaIds) {
      const persona = scenario.personas[personaId];
      if (!persona) { issues.push(`${lang}:${id}:${personaId}: missing`); continue; }
      checkText(lang, `${id}:${personaId}:name`, persona.displayName, DIALOGUE_V2_UI_COPY_LIMITS.displayName, issues, { isName: true });
      checkText(lang, `${id}:${personaId}:style`, persona.styleNote, DIALOGUE_V2_UI_COPY_LIMITS.styleNote, issues);
    }
  }
  return Object.freeze(issues);
}

export type DialogueV2UiCopyBuild = Readonly<{
  files: Readonly<Partial<Record<DialogueV2UiCopyLang, DialogueV2UiCopyFile>>>;
  issues: readonly CheckIssue[];
  missingTranslations: readonly DialogueV2UiCopyLang[];
}>;

/** Детерминированная сборка; языки без файла перевода пропускаются (missingTranslations). */
export function buildDialogueV2UiCopy(repoRoot: string): DialogueV2UiCopyBuild {
  const packets = releasePackets(repoRoot);
  const skeleton = skeletonFromRelease(packets);
  const files: Partial<Record<DialogueV2UiCopyLang, DialogueV2UiCopyFile>> = {
    ru: fromLedger(repoRoot),
    en: fromRelease(packets, 'en'),
    es: fromRelease(packets, 'es'),
  };
  const missingTranslations: DialogueV2UiCopyLang[] = [];
  for (const uiLang of TRANSLATED_LANGS) {
    if (!fs.existsSync(path.join(repoRoot, ...dialogueV2UiCopyTranslationPath(uiLang).split('/')))) {
      missingTranslations.push(uiLang);
      continue;
    }
    files[uiLang] = fromTranslation(repoRoot, uiLang, skeleton);
  }
  applyOverrides(repoRoot, files);
  const issues = DIALOGUE_V2_UI_COPY_LANGS.flatMap((uiLang) => {
    const file = files[uiLang];
    return file ? checkDialogueV2UiCopy(file, skeleton) : [];
  });
  return Object.freeze({ files: Object.freeze(files), issues: Object.freeze(issues), missingTranslations: Object.freeze(missingTranslations) });
}

export function serializeDialogueV2UiCopy(file: DialogueV2UiCopyFile): string {
  return `${JSON.stringify(file)}\n`;
}

function runCli(): void {
  const repoRoot = path.resolve(__dirname, '..');
  const mode = process.argv[2] ?? '--check';
  if (mode !== '--write' && mode !== '--check') throw new Error(`unknown_mode:${mode}`);
  const built = buildDialogueV2UiCopy(repoRoot);
  if (built.issues.length > 0) {
    for (const issue of built.issues.slice(0, 60)) process.stderr.write(`${LOG} ISSUE ${issue}\n`);
    process.stderr.write(`${LOG} FAIL: ${built.issues.length} check issue(s)\n`);
    process.exitCode = 1;
    return;
  }
  if (built.missingTranslations.length > 0) {
    process.stderr.write(`${LOG} FAIL: missing translations ${built.missingTranslations.join(',')}\n`);
    process.exitCode = 1;
    return;
  }
  let drift = 0;
  for (const uiLang of DIALOGUE_V2_UI_COPY_LANGS) {
    const file = built.files[uiLang];
    if (!file) continue;
    const relativePath = dialogueV2UiCopyOutputPath(uiLang);
    const absolute = path.join(repoRoot, ...relativePath.split('/'));
    const expected = serializeDialogueV2UiCopy(file);
    const kb = (Buffer.byteLength(expected, 'utf8') / 1024).toFixed(1);
    if (mode === '--write') {
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      fs.writeFileSync(absolute, expected, 'utf8');
      const shaShort = crypto.createHash('sha256').update(expected, 'utf8').digest('hex').slice(0, 12);
      process.stdout.write(`${LOG} WROTE ${relativePath} (${kb} KB, source ${file.source}, sha ${shaShort})\n`);
      continue;
    }
    // зачем: git autocrlf на Windows превращает LF в CRLF при checkout — это не расхождение.
    const current = fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8').replace(/\r\n/g, '\n') : null;
    if (current !== expected) {
      drift += 1;
      process.stderr.write(`${LOG} DRIFT ${relativePath}: ${current === null ? 'missing' : 'differs from sources'}\n`);
    } else {
      process.stdout.write(`${LOG} OK ${relativePath} (${kb} KB)\n`);
    }
  }
  if (drift > 0) {
    process.stderr.write(`${LOG} FAIL: regenerate with npx tsx scripts/dialogue_v2_ui_copy.ts --write\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`${LOG} PASS langs=${DIALOGUE_V2_UI_COPY_LANGS.length}\n`);
}

if (require.main === module) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${LOG} FAIL ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
