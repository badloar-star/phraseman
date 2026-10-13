import {
  DIALOGUE_V2_CEFR_SEQUENCE,
  DIALOGUE_V2_WORLD_IDS,
  type DialogueV2Cefr,
  type DialogueV2WorldId,
} from './dialogue_v2_contract';

/**
 * Server/client-neutral catalogue spine. It deliberately contains no learner
 * copy, personas, prompts or objectives: those are added only by a reviewed,
 * language-specific immutable pack.
 */
export type DialogueV2CatalogueEntry = Readonly<{
  id: string;
  worldId: DialogueV2WorldId;
  /** Структурный номер сценария в разделе (1…19): его проверяют пакеты диалогов (их хэши не меняются). К показу и замкам НЕ относится. */
  rankRequired: number;
  /** Ранг монеты, на котором диалог открывается у человека (0…19): из таблицы DIALOGUE_V2_UNLOCK_RANK_TABLE. Замки, подпись «Откроется на ранге N» и брифинг берут его. */
  unlockRank: number;
  cefr: DialogueV2Cefr;
}>;

/**
 * Одна таблица-источник «диалоги по рангам» (правило владельца 13.10: «диалоги открываются все по мере ранга; с самого начала доступен только 1 диалог
 * уровня A1 в «Общении»; ранги все используются»). Индекс массива = ранг монеты. Ранг 0 — только social_01; остальные 75 диалогов равномерно по рангам
 * 1…19 в порядке уровня A1→C2 (внутри уровня: work, travel, everyday, social; порядок внутри каждого раздела сохранён). Числа и состав стережёт
 * tests/dialogue_v2_unlock_rank_table.test.ts; зеркало в shared/dialogue_v2_catalogue_index.js обязано совпадать.
 */
export const DIALOGUE_V2_UNLOCK_RANK_TABLE: readonly (readonly string[])[] = Object.freeze([
  Object.freeze(['social_01']), // ранг 0
  Object.freeze(['work_01', 'travel_01', 'everyday_01', 'social_02']), // ранг 1
  Object.freeze(['work_02', 'travel_02', 'everyday_02', 'social_03']), // ранг 2
  Object.freeze(['work_03', 'travel_03', 'everyday_03', 'social_04']), // ранг 3
  Object.freeze(['work_04', 'travel_04', 'everyday_04', 'social_05']), // ранг 4
  Object.freeze(['work_05', 'travel_05', 'everyday_05', 'social_06']), // ранг 5
  Object.freeze(['work_06', 'travel_06', 'everyday_06', 'social_07']), // ранг 6
  Object.freeze(['work_07', 'travel_07', 'everyday_07', 'social_08']), // ранг 7
  Object.freeze(['work_08', 'travel_08', 'everyday_08', 'social_09']), // ранг 8
  Object.freeze(['work_09', 'travel_09', 'everyday_09', 'social_10']), // ранг 9
  Object.freeze(['work_10', 'travel_10', 'everyday_10', 'social_11']), // ранг 10
  Object.freeze(['work_11', 'travel_11', 'everyday_11', 'social_12']), // ранг 11
  Object.freeze(['work_12', 'travel_12', 'everyday_12', 'social_13']), // ранг 12
  Object.freeze(['work_13', 'travel_13', 'everyday_13', 'social_14']), // ранг 13
  Object.freeze(['work_14', 'travel_14', 'everyday_14', 'social_15']), // ранг 14
  Object.freeze(['work_15', 'travel_15', 'everyday_15', 'social_16']), // ранг 15
  Object.freeze(['work_16', 'travel_16', 'everyday_16', 'social_17']), // ранг 16
  Object.freeze(['work_17', 'travel_17', 'everyday_17', 'social_18']), // ранг 17
  Object.freeze(['work_18', 'travel_18', 'everyday_18', 'social_19']), // ранг 18
  Object.freeze(['work_19', 'travel_19', 'everyday_19']), // ранг 19
]);

const UNLOCK_RANK_BY_ID: ReadonlyMap<string, number> = new Map(
  DIALOGUE_V2_UNLOCK_RANK_TABLE.flatMap((ids, rank) => ids.map((id) => [id, rank] as const)),
);

export const DIALOGUE_V2_CATALOGUE_INDEX: readonly DialogueV2CatalogueEntry[] = Object.freeze(
  DIALOGUE_V2_WORLD_IDS.flatMap((worldId) => DIALOGUE_V2_CEFR_SEQUENCE.map((cefr, index) => Object.freeze({
    id: `${worldId}_${String(index + 1).padStart(2, '0')}`,
    worldId,
    rankRequired: index + 1,
    // зачем: сторож таблицы гарантирует запись для каждого id; запасное значение — прежняя лестница index+1, чтобы промах не ронял каталог
    unlockRank: UNLOCK_RANK_BY_ID.get(`${worldId}_${String(index + 1).padStart(2, '0')}`) ?? index + 1,
    cefr,
  }))),
);

const ENTRY_BY_ID: ReadonlyMap<string, DialogueV2CatalogueEntry> = new Map(
  DIALOGUE_V2_CATALOGUE_INDEX.map((entry) => [entry.id, entry]),
);

export function getDialogueV2CatalogueEntry(scenarioId: unknown): DialogueV2CatalogueEntry | null {
  if (typeof scenarioId !== 'string') return null;
  return ENTRY_BY_ID.get(scenarioId) ?? null;
}
