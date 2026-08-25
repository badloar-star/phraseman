/**
 * DEV-only локальная state machine для полноэкранной витрины режимов —
 * воспроизводит idle→active→success/needs_work тот же смысл, что player'ский
 * evaluate/finish (app/learning_v2_direct_session_player_v1.tsx), но без
 * сети/телеметрии/прогресса. Один источник для полноэкранного runner'а, чтобы
 * не дублировать логику по месту.
 */

import { useCallback, useState } from "react";
import type {
  LearningV2ModeOptionV1,
  LearningV2ModePhaseV1,
} from "./mode_contract_v1";
import type { LearningV2ModeShowcaseInputModeV1 } from "./dev_showcase_fixtures_v1";

export function useLearningV2DevShowcaseModeHostV1(
  options: readonly LearningV2ModeOptionV1[],
  correctResponseId: string,
  inputMode: LearningV2ModeShowcaseInputModeV1,
) {
  const [phase, setPhase] = useState<LearningV2ModePhaseV1>("idle");
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [orderedResponseIds, setOrderedResponseIds] = useState<readonly string[]>([]);
  const [wrongNudge, setWrongNudge] = useState<{ responseId: string | null; token: number }>({
    responseId: null,
    token: 0,
  });
  const [resolved, setResolved] = useState(false);

  const reset = useCallback(() => {
    setPhase("idle");
    setSelectedChoiceId(null);
    setOrderedResponseIds([]);
    setWrongNudge({ responseId: null, token: 0 });
    setResolved(false);
  }, []);

  const onPick = useCallback((responseId: string) => {
    setSelectedChoiceId(responseId);
    setPhase("active");
  }, []);

  const onAppendToken = useCallback((responseId: string) => {
    setOrderedResponseIds((current) => [...current, responseId]);
    setPhase("active");
  }, []);

  const onUndoToken = useCallback(() => {
    setOrderedResponseIds((current) => current.slice(0, -1));
  }, []);

  const evaluateDemo = useCallback(() => {
    const isCorrect =
      inputMode === "single_choice"
        ? selectedChoiceId === correctResponseId
        : orderedResponseIds.length === options.length &&
          orderedResponseIds.join(" ") === correctResponseId;
    if (isCorrect) {
      setResolved(true);
      setPhase("success");
      return;
    }
    // зачем: тот же точечный wrong_option_nudge, что в боевом плеере — не
    // общий shake экрана (запрет владельца из docs/v2/04, раздел Motion tokens).
    const badId =
      inputMode === "single_choice"
        ? selectedChoiceId
        : (orderedResponseIds[orderedResponseIds.length - 1] ?? null);
    setWrongNudge((current) => ({ responseId: badId, token: current.token + 1 }));
    setPhase("needs_work");
  }, [correctResponseId, inputMode, options.length, orderedResponseIds, selectedChoiceId]);

  const canSubmit =
    inputMode === "single_choice" ? selectedChoiceId !== null : orderedResponseIds.length > 0;

  return {
    phase,
    selectedChoiceId,
    orderedResponseIds,
    wrongNudge,
    resolved,
    canSubmit,
    onPick,
    onAppendToken,
    onUndoToken,
    evaluateDemo,
    reset,
  };
}
