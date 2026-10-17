import { isValidCoinRank } from './coin_rank_table_v1';
import {
  decideDialogueV2ScenarioAccess,
  type DialogueV2ScenarioAccess,
} from '../shared/dialogue_v2_access_contract';
import {
  getDialogueV2CatalogueEntry,
  type DialogueV2CatalogueEntry,
} from '../shared/dialogue_v2_catalogue_index';

export type DialogueV2LocalRankAccess = Readonly<{
  entry: DialogueV2CatalogueEntry;
  access: DialogueV2ScenarioAccess;
}>;

/**
 * Local-first presentation access for the immutable V2 catalogue.
 * This deliberately accepts no subscription, ownership, or purchase state.
 */
export function getDialogueV2LocalRankAccess(
  scenarioId: unknown,
  localCoinRank: unknown,
): DialogueV2LocalRankAccess | null {
  const entry = getDialogueV2CatalogueEntry(scenarioId);
  if (!entry) return null;

  return {
    entry,
    access: decideDialogueV2ScenarioAccess({
      achievedRank: isValidCoinRank(localCoinRank) ? localCoinRank : null,
      // зачем (правило владельца 13.10): замок берёт ранг открытия из таблицы (unlockRank), а не номер сценария в разделе (rankRequired структурный, для пакетов)
      rankRequired: entry.unlockRank,
    }),
  };
}

export type DialogueV2RankGateRow = Readonly<{
  id: string;
  cefr: string;
  unlockRank: number;
  decision: 'открыт' | 'закрыт' | 'пройден'; // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
}>;

let lastRankGateLogKey = '';

/**
 * Журнал [DIALOG-RANK-GATE] (правило «сперва логи», 13.10): что решил замок по каждому диалогу — id, уровень, ранг открытия, мой ранг, решение.
 * Одна строка на проекцию; повтор с теми же входами не пишется (каталог перерисовывается часто).
 */
export function logDialogueV2RankGate(
  source: 'released' | 'authorized',
  studyTarget: unknown,
  myRank: unknown,
  rows: readonly DialogueV2RankGateRow[],
): void {
  const key = `${source}|${String(studyTarget)}|${String(myRank)}|${rows.map((row) => row.decision[0]).join('')}`;
  if (key === lastRankGateLogKey) return;
  lastRankGateLogKey = key;
  const count = (decision: DialogueV2RankGateRow['decision']) => rows.filter((row) => row.decision === decision).length;
  console.log(`[DIALOG-RANK-GATE] ${source} target=${String(studyTarget)} мой_ранг=${String(myRank)} открыто=${count('открыт')} закрыто=${count('закрыт')} пройдено=${count('пройден')} | ${rows.map((row) => `${row.id}:${row.cefr}@${row.unlockRank}=${row.decision}`).join(' ')}`); // guard-ok: журнал замков по рангам
}
