/**
 * Общий контракт пропсов для всех 7 одобренных владельцем режимов
 * (docs/v2/mockups/index.html, раздел "Режимы"). Каждый режим — отдельный
 * компонент в этой папке; mode_router_v1.tsx выбирает нужный по `family`.
 *
 * зачем: владелец одобрил 7 конкретных макетов с собственной вёрсткой и
 * анимациями вместо одной универсальной карточки "вопрос + варианты".
 * Технический аудит (Advisor, Opus) настоял на едином пропс-контракте, а НЕ
 * на индивидуальных сигнатурах на каждый компонент — иначе router и player
 * не смогут единообразно прокидывать состояние.
 *
 * ВАЖНО: этот контракт описывает то, что РЕАЛЬНО доступно в текущей схеме
 * контента (LearningV2CourseSessionPracticeInteractionV1 —
 * modules/learning-v2/runtime/course_session_client_children_v1.ts):
 *   inputMode: "ordered_tokens" | "single_choice" | "scripted_speech"
 *   responseOptions: { responseId: string; text: string }[]
 *   prompt: string
 * Режимам вроде sound_contrast (нужны IPA-пары) или speed_match (нужна сетка
 * пар фраза+перевод) этого может не хватать для честного рендера — это
 * ожидаемо и фиксируется на этапе 3 (аудит контента), НЕ на этапе 1.
 * mode_contract_v1 намеренно не выдумывает поля, которых нет в источнике.
 */

import type { LearningV2ActivityFamilyCode } from "../telemetry";

/** Единая машина состояний режима. Совпадает по смыслу с "Контракт состояний"
 * из каждого макета (prompt→active, processing, success, needs_work...). */
export type LearningV2ModePhaseV1 =
  | "idle" // ждём первого осмысленного действия ученика
  | "active" // ученик взаимодействует (выбирает/собирает/слушает)
  | "processing" // локальный вердикт вычисляется (160мс лок по макетам)
  | "success" // верно: волна/заливка/wipe + звезда
  | "needs_work" // неверно: точечная тонировка + подсказка, без тряски экрана
  | "autonext"; // авто-переход к следующему заданию (1400мс, тап = сразу)

/** Один вариант ответа — 1:1 с responseOptions из контента. */
export interface LearningV2ModeOptionV1 {
  readonly responseId: string;
  readonly text: string;
}

/** Пропсы, общие для ВСЕХ 7 режимов. Режим-специфичные поля (IPA-пары,
 * сетка speed_match, голосовая запись) объявлены в самих компонентах режима
 * поверх этого контракта — см. комментарий "зачем" вверху файла. */
export interface LearningV2ModeCommonPropsV1 {
  readonly family: LearningV2ActivityFamilyCode;
  readonly phase: LearningV2ModePhaseV1;
  readonly prompt: string;
  readonly options: readonly LearningV2ModeOptionV1[];
  /** Уже выбранный чип/вариант (single_choice) или собранная последовательность
   * (ordered_tokens), синхронизировано с player'ом — режим не хранит источник
   * истины сам, только читает и просит player изменить его через onPick. */
  readonly selectedChoiceId: string | null;
  readonly orderedResponseIds: readonly string[];
  /** Толчок неверного варианта: {responseId, token}. Рост token запускает
   * точечный wrong_option_nudge именно этого варианта (см. LearningV2AnswerChoice). */
  readonly wrongNudge: Readonly<{ responseId: string | null; token: number }>;
  readonly reducedMotion: boolean;
  /** true когда ответ уже подтверждён верным (result === "correct" в player'е). */
  readonly resolved: boolean;
  /** Текст подсказки после второй ошибки (wrongExplanation в player'е), если есть. */
  readonly explanation: string | null;

  /** Ученик выбрал один вариант (single_choice режимы: listen_choose,
   * sound_contrast, context_gap_grammar, speed_match). */
  readonly onPick: (responseId: string) => void;
  /** Ученик добавил токен в собираемую фразу (ordered_tokens: phrase_builder,
   * listen_build_dictation). */
  readonly onAppendToken: (responseId: string) => void;
  /** Ученик убрал последний добавленный токен (кнопка "Назад"). */
  readonly onUndoToken: () => void;
  /** Проиграть аудио варианта/фразы через уже готовый player audio pipeline. */
  readonly onPlaySelectableAudio: (selectableId: string) => void;
  readonly onPlayFullPhraseAudio: (() => void) | null;
  /** Явное подтверждение (кнопка "Проверить" в ActionDock) — вызывает evaluate
   * в player'е с уже накопленным ответом. Режим НЕ вызывает evaluate напрямую. */
  readonly onSubmit: () => void;
  readonly canSubmit: boolean;
}
