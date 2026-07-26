# Phraseman V2: звёзды результата, LearningEvidence и доступ

**Статус:** нормативная спецификация пилота из 32 эпизодов  
**Область:** earned performance, typed learning evidence, earned/purchased access, ворота эпизодов, локальный и облачный прогресс, shards purchase, offline, идемпотентность и честность интерфейса

## 1. Решение в одном абзаце

V2 разделяет три домена. `performanceStarsEarned` отражают лучший reward/performance result конкретного activity slot, но никогда сами по себе не доказывают mastery. `accessStarsEarned` — детерминированная, воспроизводимая проекция тех же earned-performance deltas для открытия пути, а не второй независимо записываемый источник истины. `LearningEvidence` хранит типизированные observations по objective и construct. `accessStarsPurchased` — отдельный gate-scoped Access Boost за осколки после обязательной учебной работы. Покупка не меняет `LearningEvidence`, voice evidence, checkpoint, достижения, лиги или заявления об уровне.

Все числовые решения этого документа имеют claim label `PRODUCT_HYPOTHESIS`: performance-star budget (`HYP-V2-004`), two-loop/gate curve и target (`HYP-V2-005`), цена/caps/eligibility boost (`HYP-V2-006`). [07-migration-analytics-testing.md](./07-migration-analytics-testing.md#0-реестр-гипотез-и-числовых-решений) — governance map гипотез и пилотных решений; единственный machine-readable schema/source `DecisionRegistry` задан в [08-admin-content-studio-and-mode-authoring.md §6.2](./08-admin-content-studio-and-mode-authoring.md#62-immutable-decision-registry-artifact).

## 2. Почему нельзя оставить одну сущность `stars`

Одно число одновременно для качества, доступа и покупки создаёт три ошибки:

1. купленный доступ начинает выглядеть как выученный материал;
2. повтор одной лёгкой активности превращается в бесконечный фарм;
3. голосовая статистика загрязняется печатными ответами и техническими сбоями микрофона.

Поэтому V2 физически разделяет поля, вычисления, ledger и интерфейс:

| Сущность | Источник | Назначение | Можно купить | Можно потратить |
|---|---|---|---|---|
| `performanceStarsEarned` | лучший валидный reward/performance result activity/star slot | мотивация, видимый результат, recovery ranking | нет | нет |
| `accessStarsEarned` | derived projection 1:1 из earned-performance delta | cumulative gates карты | нет | нет |
| `accessStarsPurchased` | server-priced Access Boost за shards | закрывает дефицит только конкретных ворот | да | применяется один раз к gate |
| `LearningEvidence` | валидное наблюдение по objective/construct/support/context/input/time | independent/durable learning decisions и review | нет | нет |
| `voiceBadge` (derived) | наличие resolved assessed spoken evidence с microphone route, calibration и provenance | честная индикация полученного spoken evidence | нет | нет |

Legacy-оценка `0..5` из `lesson*_best_score` не входит ни в одно из этих чисел. Она сохраняется как отдельное legacy evidence.

## 3. Звёзды одной активности

### 3.1 Фиксированный бюджет эпизода

Обычный эпизод содержит 8–9 видимых activity nodes, но ровно восемь gate-eligible `starSlot`. Один slot даёт максимум три earned performance stars. Это стартовая политика `HYP-V2-004`:

```text
MAX_PERFORMANCE_STARS_PER_SLOT = 3
STAR_SLOTS_PER_EPISODE = 8
MAX_PERFORMANCE_STARS_PER_EPISODE = 24
MAX_PERFORMANCE_STARS_PER_SEASON = 32 × 24 = 768
```

Альтернативные ветки, в том числе accessibility fallback, используют тот же `starSlotId`. Пользователь получает лучший результат одной из веток, а не сумму обеих. Дополнительный briefing, theory card или optional side node может не иметь gate stars.

### 3.2 Универсальная семантика `0..3`

Каждая scoring policy переводит activity result в три последовательных критерия награды:

1. **Completion star:** задание валидно завершено, а не пропущено и не оборвано системой.
2. **Quality star:** достигнут целевой порог точности/понимания/ответа для этого типа активности.
3. **Transfer star:** выполнено без критической подсказки, в новом контексте, в capstone или после задержки — конкретный критерий задаёт versioned policy.

Третья звезда не может существовать без второй, вторая — без первой. Названия критериев объясняют reward, но ни одна звезда и их сумма не заменяют `LearningEvidence` или independent/durable mastery decision.

```ts
export type PerformanceStars = 0 | 1 | 2 | 3;
```

Отдельного result contract в economy/progress слое нет. Единственный canonical result — discriminated union `V2ActivityResult`, а единственный canonical attempt — `V2AttemptEvent` из [06-runtime-content-admin-and-release.md](./06-runtime-content-admin-and-release.md#33-normalized-result-и-retry-policy). Этот документ определяет только reducer и derived projections над принятым canonical event.

### 3.3 LearningEvidence: отдельный контракт знания

Performance stars отвечают на вопрос «какой лучший reward result показан в этом slot». Learning evidence отвечает на другой вопрос: «что именно валидно наблюдалось по учебной цели, с какой поддержкой и в каком контексте». `LearningEvidenceBody` — только assessed observation, материализованное из canonical `V2AttemptEventBody/V2Evidence` только после создания `CanonicalAttemptRef`; техническая недоступность и accessibility non-assessment не маскируются под evidence.

```ts
// CanonicalAttemptRef создаётся только после хэширования hash-free
// V2AttemptEventBody из документа 06. Learning records в это тело не входят.
import type { CanonicalAttemptRef } from './attempt';
import type {
  V2DelayedProbeAssignmentRef,
  V2DelayedProbeFailureReceiptRef,
  V2DelayedProbeLaunchReceiptRef,
  V2DelayedProbeTimingReceiptRef,
} from './delayed_probe';

export type LearningConstruct =
  | 'semantic'
  | 'listening'
  | 'recall'
  | 'spoken'
  | 'interaction';

export type LearningEvidencePhase =
  | 'encounter_build'
  | 'near_transfer'
  | 'independent_probe'
  | 'delayed_probe';

export type LearningAssessmentTarget =
  | { targetKind: 'objective'; targetId: string }
  | { targetKind: 'semantic_slot'; targetId: string }
  | { targetKind: 'critical_constraint'; targetId: string };

export interface LearningEvidenceTupleIdentity {
  nodeId: string;
  objectiveId: string;
  skillId: string;
  construct: LearningConstruct;
  phase: LearningEvidencePhase;
  targetKind: LearningAssessmentTarget['targetKind'];
  targetId: string;
}

export type LearningEvidenceTupleKey = `letk1.${string}`;

export const buildLearningEvidenceTupleKey = (
  tuple: LearningEvidenceTupleIdentity,
): LearningEvidenceTupleKey =>
  `letk1.${base64url(utf8(canonicalJsonV1([
    tuple.nodeId,
    tuple.objectiveId,
    tuple.skillId,
    tuple.construct,
    tuple.phase,
    tuple.targetKind,
    tuple.targetId,
  ])))}`;

export interface CanonicalRuntimeEvidenceRef {
  runtimeEvidenceHash: string;
  sourceAttempt: CanonicalAttemptRef;
}

interface LearningRecordTuple {
  nodeId: string;
  objectiveId: string;
  skillId: string;
  construct: LearningConstruct;
  phase: LearningEvidencePhase;
  target: LearningAssessmentTarget;
}

interface LearningObservationBase extends LearningRecordTuple {
  schemaVersion: 'learning-evidence-body.v1';
  observationId: string;
  assessmentStatus: 'assessed';
  outcome: 'success' | 'needs_work';
  sourceAttempt: CanonicalAttemptRef;
  policyId: string;
  policyVersion: number;
}

// Canonical publish-time bounds. Immutable phase/context/prompt identity is
// exact; actual support/hints are recorded separately per attempt and must fit
// these bounds.
export type LearningPedagogicalContextContract =
  | {
      phase: 'encounter_build' | 'near_transfer';
      allowedSupportLevels: Array<
        'model' | 'full_text' | 'partial_cue' | 'visual_only' | 'none'
      >;
      maximumHints: number;
      answerExposure: 'allowed' | 'forbidden';
      context: {
        contextId: string;
        surfaceFormId: string;
        novelty: 'trained' | 'varied' | 'novel';
      };
      prompt: { promptId: string; reusedFromTraining: boolean };
    }
  | {
      phase: 'independent_probe';
      allowedSupportLevels: Array<'partial_cue' | 'visual_only' | 'none'>;
      maximumHints: 0;
      answerExposure: 'forbidden';
      context: {
        contextId: string;
        surfaceFormId: string;
        novelty: 'varied' | 'novel';
      };
      prompt: {
        promptId: string;
        reusedFromTraining: false;
        separatePrompt: true;
      };
    }
  | {
      phase: 'delayed_probe';
      allowedSupportLevels: Array<'partial_cue' | 'visual_only' | 'none'>;
      maximumHints: 0;
      answerExposure: 'forbidden';
      context: {
        contextId: string;
        surfaceFormId: string;
        novelty: 'varied' | 'novel';
        newSurfaceForm: true;
      };
      prompt: {
        promptId: string;
        reusedFromTraining: false;
        separatePrompt: true;
      };
    };

// Canonical actual attempt provenance. Timing is added only when a
// LearningEvidenceBody is materialized.
export type LearningPedagogicalProvenance =
  | {
      phase: 'encounter_build' | 'near_transfer';
      support: {
        level: 'model' | 'full_text' | 'partial_cue' | 'visual_only' | 'none';
        hintsUsed: number;
        answerExposedBeforeAttempt: boolean;
      };
      context: {
        contextId: string;
        surfaceFormId: string;
        novelty: 'trained' | 'varied' | 'novel';
      };
      prompt: { promptId: string; reusedFromTraining: boolean };
    }
  | {
      phase: 'independent_probe';
      support: {
        level: 'partial_cue' | 'visual_only' | 'none';
        hintsUsed: 0;
        answerExposedBeforeAttempt: false;
      };
      context: {
        contextId: string;
        surfaceFormId: string;
        novelty: 'varied' | 'novel';
      };
      prompt: {
        promptId: string;
        reusedFromTraining: false;
        separatePrompt: true;
      };
    }
  | {
      phase: 'delayed_probe';
      support: {
        level: 'partial_cue' | 'visual_only' | 'none';
        hintsUsed: 0;
        answerExposedBeforeAttempt: false;
      };
      context: {
        contextId: string;
        surfaceFormId: string;
        novelty: 'varied' | 'novel';
        newSurfaceForm: true;
      };
      prompt: {
        promptId: string;
        reusedFromTraining: false;
        separatePrompt: true;
      };
    };

export type AssessedLearningPhase =
  | (Extract<
      LearningPedagogicalProvenance,
      { phase: 'encounter_build' | 'near_transfer' }
    > & {
      timing: { occurredAt: string };
    })
  | (Extract<
      LearningPedagogicalProvenance,
      { phase: 'independent_probe' }
    > & {
      timing: { occurredAt: string };
    })
  | (Extract<
      LearningPedagogicalProvenance,
      { phase: 'delayed_probe' }
    > & {
      timing: {
        occurredAtServer: string;
        delayFromInitialExposureMs: number;
        assignmentRef: V2DelayedProbeAssignmentRef;
        launchReceiptRef: V2DelayedProbeLaunchReceiptRef;
        timingReceiptRef: V2DelayedProbeTimingReceiptRef;
        assessmentTiming: 'inside_pinned_window';
      };
    });

export type AssessedLearningRoute =
  | {
      construct: 'spoken';
      input: {
        source: 'microphone';
        speechLocale: string;
        evaluatorProvenance: V2EvaluatorProvenance;
        calibrationReceiptRef: SpeechCalibrationReceiptRef;
        calibrationScopeRef: SpeechCalibrationScopeRef;
        runtimeEvidenceRef: CanonicalRuntimeEvidenceRef;
      };
    }
  | {
      construct: 'listening';
      input: {
        source: 'tap' | 'word_bank' | 'keyboard';
        answerRevealingCaptionUsed: false;
        runtimeEvidenceRef: CanonicalRuntimeEvidenceRef;
      };
    }
  | {
      construct: 'semantic' | 'recall' | 'interaction';
      input: {
        source: 'microphone';
        speechLocale: string;
        evaluatorProvenance: V2EvaluatorProvenance;
        calibrationReceiptRef: SpeechCalibrationReceiptRef;
        calibrationScopeRef: SpeechCalibrationScopeRef;
        runtimeEvidenceRef: CanonicalRuntimeEvidenceRef;
      };
    }
  | {
      construct: 'semantic' | 'recall' | 'interaction';
      input: {
        source: 'tap' | 'word_bank' | 'keyboard' | 'accessibility_alternative';
        runtimeEvidenceRef: CanonicalRuntimeEvidenceRef;
      };
    };

export type LearningEvidenceBody =
  LearningObservationBase &
  AssessedLearningPhase &
  AssessedLearningRoute;

interface LearningNonAssessmentBase extends LearningRecordTuple {
  schemaVersion: 'learning-non-assessment-body.v1';
  nonAssessmentId: string;
  sourceAttempt: CanonicalAttemptRef;
  occurredAt: string;
}

export type LearningNonAssessmentBody =
  | (Omit<LearningNonAssessmentBase, 'phase'> & {
      phase: Exclude<LearningEvidencePhase, 'delayed_probe'>;
      assessmentStatus:
        | 'not_assessed_accessibility'
        | 'not_assessed_system'
        | 'invalid';
      reasonCode: string;
    })
  | (Omit<LearningNonAssessmentBase, 'phase'> & {
      phase: 'delayed_probe';
      assessmentStatus: 'not_assessed_system';
      reasonCode:
        | 'assignment_missing'
        | 'assignment_stale'
        | 'launch_missing'
        | 'launch_expired'
        | 'server_timing_unavailable';
      failureReceiptRef: V2DelayedProbeFailureReceiptRef;
    })
  | (Omit<LearningNonAssessmentBase, 'phase'> & {
      phase: 'delayed_probe';
      assessmentStatus: 'not_assessed_accessibility' | 'invalid';
      reasonCode: string;
      assignmentRef: V2DelayedProbeAssignmentRef;
      timingReceiptRef: V2DelayedProbeTimingReceiptRef;
    })
  | (Omit<LearningNonAssessmentBase, 'phase'> & {
      phase: 'delayed_probe';
      assessmentStatus: 'not_assessed_for_window';
      reasonCode: 'outside_pinned_assessment_window';
      windowPolicyId: string;
      observedDelayMs: number;
      assignmentRef: V2DelayedProbeAssignmentRef;
      timingReceiptRef: V2DelayedProbeTimingReceiptRef;
    });

export interface LearningEvidenceRef {
  observationId: string;
  evidenceBodyHash: string;
  tupleKey: LearningEvidenceTupleKey;
  sourceAttempt: CanonicalAttemptRef;
}

export interface LearningNonAssessmentRef {
  nonAssessmentId: string;
  nonAssessmentBodyHash: string;
  tupleKey: LearningEvidenceTupleKey;
  sourceAttempt: CanonicalAttemptRef;
}

export interface ObjectiveLearningState {
  objectiveId: string;
  semantic: ObjectiveDimensionState;
  listening: ObjectiveDimensionState;
  recall: ObjectiveDimensionState;
  spoken: ObjectiveDimensionState;
  interaction: ObjectiveDimensionState;
  delayed: ObjectiveDimensionState;
}

export type ObjectiveDimensionState =
  | { status: 'not_observed' }
  | {
      status: 'not_assessed';
      reason: 'accessibility' | 'system' | 'invalid' | 'outside_window';
      nonAssessmentRef: LearningNonAssessmentRef;
    }
  | {
      status: 'observed_success' | 'observed_needs_work';
      evidenceRef: LearningEvidenceRef;
    };
```

`LearningEvidenceBody` и `LearningNonAssessmentBody` не содержат собственного hash: ref создаётся после `sha256(canonicalJsonV1(body))`. `ref.sourceAttempt` и `ref.tupleKey` обязаны точно совпасть с resolved body. `LearningEvidenceTupleKey` строится только общим `buildLearningEvidenceTupleKey` из JCS-массива семи полей и base64url, включает `skillId` и не использует delimiter join; ручная конкатенация, потеря поля или альтернативная кодировка запрещены. Для каждого assessed body `input.runtimeEvidenceRef.runtimeEvidenceHash = sha256(canonicalJsonV1(sourceAttemptBody.evidence))`, а его `sourceAttempt` совпадает с canonical attempt ref; ссылка на evidence другой попытки fail-closed. Actual `LearningPedagogicalProvenance` берётся из per-tuple disposition внутри хешированного attempt body: его phase/context/prompt обязаны точно совпасть с опубликованным `LearningPedagogicalContextContract`, а support level, hint count и answer exposure — входить в его пределы. `sourceAttemptBody.evidence.hintsUsed` является единственным canonical attempt-wide hint fact и обязан точно равняться `pedagogicalProvenance.support.hintsUsed` каждого tuple; отдельного дублирующего body field нет. Для `independent_probe`/`delayed_probe` оба значения обязаны быть literal `0`; mismatch или фактические hints `>0` отклоняются до materialization и никогда не дают learning record. Так encounter/near-transfer retry может законно использовать другое разрешённое число подсказок, но reducer не выводит provenance из result code и не принимает произвольный client override. Каждый target — только тип и stable ID из опубликованного episode; raw answer, transcript, phrase и PII в body/ref не входят. На одну попытку допустимо `0..N` records, но не более одного assessed или non-assessment record на каждый объявленный `nodeId + objectiveId + skillId + construct + phase + targetKind + targetId` tuple. Каждая declaration обязана иметь ровно один graph disposition либо один delayed client candidate и затем один receipt-bound terminal resolution: assessed/non-assessment для любого обычного outcome или `no_record/skipped_by_learner` только для `SKIPPED`; node/probe без declarations имеет пустой список. Unknown, duplicate, missing, phase/provenance/hint mismatch или undeclared tuple fail-closed.

Delayed — phase/timing dimension, а не отдельный construct: поле `delayed` в `ObjectiveLearningState` агрегирует только assessed evidence с `phase='delayed_probe'`. Такой assessed body обязан pin-ить exact immutable assignment, launch и server timing receipts из документа 06; timing receipt связывает initial exposure, exact Season/Episode/probe definition, canonical attempt, server-observed D+3…D+7 window и исчерпывающую terminal tuple-resolution table. Client body хранит только hash-pinned candidates; server receipt отображает их в assessed/non-assessment/no-record без переписывания body, а finalized envelope pin-ит receipt как materialization basis. Client clock, строковый `probeRef`, обычный graph node или offline review без server timing attestation не могут создать durable evidence. Доставленный вне exact pinned window probe нормативно отображает каждый не-`no_record` candidate только в `LearningNonAssessmentBody{assessmentStatus:'not_assessed_for_window'}` и projection `not_assessed/outside_window`; `SKIPPED/no_record` не создаёт ref. Missing/stale assignment и missing/expired launch при валидной account/probe binding получают immutable delayed failure receipt с per-tuple `not_assessed_system` resolutions; каждый exact non-assessment body pin-ит этот receipt, а terminal acknowledgement очищает candidate без timing receipt. Account/probe/template/declaration/hash mismatch получает terminal protocol rejection без resolution table, finalized event или learning refs и уходит в quarantine. Typing может подтвердить semantic/recall, но не spoken construct. Captioned route может подтвердить semantic comprehension, но не listening construct. Любой assessed route с `input.source='microphone'`, включая semantic/interaction, требует evaluator provenance и точные calibration receipt+scope; сам факт наличия transcript этого не заменяет. Любая иная недоступность создаёт `LearningNonAssessmentBody`; она отображается как `status: 'not_assessed'` с reason и не участвует в mastery. Агрегировать dimensions в mastery разрешено только versioned evidence policy; performance/access stars не входят в неё.

### 3.4 Best-per-slot, а не сумма попыток

Источник истины — лучший результат стабильного star slot:

```ts
nextBestPerformance = Math.max(previousBestPerformance, candidatePerformanceStars);
performanceStarsDelta = nextBestPerformance - previousBestPerformance;
episodePerformanceStars = sum(bestPerformanceStarsByStarSlot);
accessStarsEarnedDelta = performanceStarsDelta; // derived projection of the same event
```

Следствия:

- одинаковый или худший replay не даёт delta;
- новая лучшая попытка даёт только разницу;
- earned performance stars никогда не уменьшаются;
- удаление activity из нового release не удаляет уже записанные performance results или immutable `LearningEvidence`;
- copy edit переносит прогресс через тот же `progressCompatibilityKey`;
- существенная смена цели/ответа/сложности получает новый compatibility key;
- уже открытый gate никогда не закрывается задним числом.

### 3.5 Голосовой результат

Voice runtime возвращает только canonical `V2ActivityResult` и пишет canonical `V2AttemptEvent` из документа 06; локального `VoiceResultCode` или плоского результата в progress layer нет.

Правила:

- `PASS_CONFIDENT` и `NEEDS_WORK_CONFIDENT` могут участвовать в scoring policy;
- `UNCERTAIN` означает, что система не уверена, а не что пользователь произнёс плохо;
- `INVALID_AUDIO_OR_SYSTEM` покрывает тишину, обрыв, route change, ошибку STT, несовместимый locale и системную недоступность;
- два последних исхода жёстко дают `candidatePerformanceStars: 0`, `voiceEvidence: false`, не создают `LearningEvidence`, не ухудшают best, не расходуют учебную попытку и дают бесплатный retry/fallback; при необходимости они создают отдельный `LearningNonAssessment`/diagnostic;
- текущий transcript similarity можно честно называть совпадением распознанного текста, но не акустическим анализом фонем;
- действующий адаптер может сохранить стартовые пороги `<75 → 1`, `>=75 → 2`, `>=90 → 3` только для уверенного валидного performance result; это `HYP-V2-004`, а не акустически доказанный mastery cutoff;
- typed fallback не создаёт `voiceEvidence`;
- accessibility alternative может заработать performance/access stars по своей объективной policy, но создаёт `LearningNonAssessment{assessmentStatus:'not_assessed_accessibility'}` для неизмеренного spoken/listening construct; objective projection получает `status:'not_assessed', reason:'accessibility'`.

## 4. Два прохода без механического повтора

Следующий эпизод требует завершить два разных loop предыдущего (`HYP-V2-005`):

1. `encounter_build`: понять, различить, собрать, воспроизвести с поддержкой;
2. `near_transfer`: вспомнить с меньшей поддержкой в новом контексте, быстро ответить, пройти диалог/миссию.

Это и есть продуктовая реализация идеи «предыдущий урок нужно пройти два раза». Второй loop не копирует те же карточки: он использует retrieval, variation и transfer. Он может пройти в той же сессии, поэтому не называется delayed review и не доказывает durable mastery. Поле progress хранит completion каждого loop отдельно. Настоящий D+N review назначается отдельно и никогда не блокирует немедленное открытие следующего эпизода.

## 5. Ворота 32-эпизодного пилота

### 5.1 Условия открытия

Эпизод 1 открыт всегда. Для открытия эпизода `n`, где `n=2..32`, одновременно нужны:

1. обязательные nodes обоих loop эпизода `n-1` завершены;
2. в предыдущем эпизоде достигнут локальный earned-performance minimum;
3. cumulative `accessStarsEarned` достигли порога либо дефицит полностью закрыт разрешённым Access Boost;
4. если предыдущий эпизод — checkpoint 8, 16 или 24, checkpoint реально сдан;
5. capability fallback завершён, если основной input недоступен;
6. gate не был ранее открыт или grandfathered.

Купленный boost не заменяет пункты 1, 2, 4 и 5.

### 5.2 Локальный minimum

| Предыдущий эпизод | Performance minimum из 24 |
|---|---:|
| 1–8 | 14 |
| 9–16 | 15 |
| 17–24 | 16 |
| 25–32 | 17 |

Порог растёт по главам, но остаётся ниже perfect. Пользователь не обязан выбивать 24/24, однако один completion без качества недостаточен. Minima относятся к `HYP-V2-005`, а не к mastery standard.

### 5.3 Плавная cumulative curve

Для целевого эпизода `n`:

```ts
ratio(n) = 0.55 + 0.10 * ((n - 2) / 30);
requiredAccess(n) = Math.ceil(24 * (n - 1) * ratio(n));
```

Доля плавно растёт от 55% до 65%. Формула линейная, не экспоненциальная; она не создаёт резкий скачок на границе главы. В release хранится уже рассчитанная таблица, а формула используется валидатором для проверки, чтобы клиент и сервер не разошлись из-за округления. Вся curve относится к `HYP-V2-005`.

| Открыть эпизод | Порог | Открыть эпизод | Порог | Открыть эпизод | Порог |
|---:|---:|---:|---:|---:|---:|
| 2 | 14 | 13 | 169 | 24 | 345 |
| 3 | 27 | 14 | 185 | 25 | 361 |
| 4 | 41 | 15 | 200 | 26 | 379 |
| 5 | 54 | 16 | 215 | 27 | 396 |
| 6 | 68 | 17 | 231 | 28 | 413 |
| 7 | 82 | 18 | 247 | 29 | 431 |
| 8 | 96 | 19 | 263 | 30 | 448 |
| 9 | 111 | 20 | 279 | 31 | 466 |
| 10 | 125 | 21 | 295 | 32 | 484 |
| 11 | 140 | 22 | 311 | — | — |
| 12 | 154 | 23 | 328 | — | — |

Финальный сезонный performance target после эпизода 32 — `500 earned performance stars` из 768 возможных и пройденный checkpoint 32. Это achievement/access-fairness target `HYP-V2-005`, не durable mastery claim. Purchased access в 500 не входит; durable mastery выводится только из D+N `LearningEvidence`.

### 5.4 Route reachability до публикации

Admin validator рассчитывает maximum не только для ideal primary path, но и для каждой опубликованной accessibility route:

```ts
export interface EpisodeRouteReachability {
  episodeId: string;
  maxReachablePerformanceStars: {
    primary: number;
    accessibility: Record<string, number>; // routeId -> max
  };
}
```

Для каждой route валидатор учитывает общий `starSlotId`, starless nodes, route-specific scoring cap и недоступные constructs. Release блокируется, если хотя бы одна обязательная route не может без покупки boost:

- выполнить local minimum своего эпизода;
- накопить cumulative threshold каждого следующего gate;
- завершить mandatory loops и checkpoint через заявленный alternate contract.

Access Boost не является исправлением недостижимой accessibility route. Если route намеренно не оценивает spoken/listening construct, это отражается через `LearningNonAssessment`, но эквивалентные completion/performance/access slots всё равно должны оставлять gate достижимым.

### 5.5 Gate evaluator

```ts
export interface GateInput {
  alreadyUnlocked: boolean;
  grandfathered: boolean;
  requiredLoopsComplete: boolean;
  priorEpisodePerformanceEarned: number;
  localMinimum: number;
  cumulativeAccessEarned: number;
  requiredCumulativeAccess: number;
  purchasedAccessAppliedToThisGate: number;
  checkpointDecision: 'not_required' | V2CheckpointDecision['status'];
}

export function evaluateGate(input: GateInput) {
  if (input.alreadyUnlocked || input.grandfathered) {
    return { allowed: true, basis: 'grandfathered' as const };
  }
  if (!input.requiredLoopsComplete) {
    return { allowed: false, reason: 'required_loops' as const };
  }
  if (input.priorEpisodePerformanceEarned < input.localMinimum) {
    return { allowed: false, reason: 'local_performance' as const };
  }
  if (
    input.checkpointDecision !== 'not_required' &&
    input.checkpointDecision !== 'passed'
  ) {
    return { allowed: false, reason: 'checkpoint' as const };
  }

  const accessForThisGate =
    input.cumulativeAccessEarned + input.purchasedAccessAppliedToThisGate;

  return accessForThisGate >= input.requiredCumulativeAccess
    ? {
        allowed: true,
        basis: input.purchasedAccessAppliedToThisGate > 0
          ? 'earned_plus_boost' as const
          : 'earned' as const,
      }
    : { allowed: false, reason: 'cumulative_access' as const };
}
```

## 6. Access Boost за shards

### 6.1 Pilot policy

Начальные параметры `HYP-V2-006`:

```text
PRICE_PER_ACCESS_STAR = 3 shards
MAX_PURCHASED_PER_GATE = 3
MAX_PURCHASED_PER_CHAPTER = 3
MAX_PURCHASED_PER_SEASON = 12
```

Boost предлагается только если:

- обязательные loop завершены;
- local earned minimum достигнут;
- обязательный checkpoint сдан;
- gate был честно заблокирован минимум два раза;
- показана бесплатная personalized review-рекомендация;
- текущий дефицит составляет `1..3`;
- chapter и season caps позволяют полностью закрыть дефицит;
- есть сеть и серверная quote;
- пользователь явно подтвердил точную цену.

Если дефицит больше разрешённого cap, приложение не продаёт частичный boost, который всё равно оставит gate закрытым. Оно показывает конкретные слабые star slots и бесплатный путь добора.

Access Boost:

- применяется только к одному `gateId`;
- не создаёт переносимый кошелёк access stars;
- не учитывается в следующих воротах;
- не меняет `performanceStarsEarned`, derived `accessStarsEarned` или `LearningEvidence`;
- не проходит checkpoint;
- не создаёт voice evidence;
- не участвует в CEFR/can-do claim, achievement, league, certificate или leaderboard;
- не выдаёт XP/shards обратно;
- после успешной покупки немедленно и навсегда сохраняет unlock этого gate.

Цена, caps, два честных показа block/recovery, deficit range и quote TTL являются `PRODUCT_HYPOTHESIS` (`HYP-V2-006`). Их можно экспериментально менять только через новую immutable `gatePolicyVersion`, sticky assignment и заранее зарегистрированный эксперимент.

### 6.2 Почему нельзя вызывать общий `shardsApplyDelta`

Текущий `functions/src/shards_apply_delta.ts` обеспечивает атомарность и идемпотентность общего shards balance, но сервер принимает `delta` и `reason` от клиента и не сверяет цену с каталогом конкретного товара. Для открытия контента это недостаточно: модифицированный клиент может подставить другую сумму. Кроме того, `PendingShardDelta` в `app/shards_delta_queue.ts` не содержит `stableUid`, поэтому такую очередь нельзя использовать для money-adjacent V2 purchase через account switch.

V2 должен использовать отдельную серверную операцию, которая сама вычисляет дефицит, лимит и цену. Общий `spendShardsIdempotent` остаётся для существующих разрешённых сценариев, но не является purchase authority V2.

### 6.3 Quote и purchase callable

```ts
export interface V2AccessQuoteRequest {
  seasonId: string;
  gateId: string;
  stableId: string;
}

export interface V2AccessQuote {
  quoteId: string;
  gateId: string;
  policyVersion: string;
  releaseId: string;
  expiresAt: string;
  earnedDeficit: number;
  accessStarsToApply: number;
  unitPriceShards: number;
  totalCostShards: number;
  currentShardBalance: number;
}

export interface PurchaseV2AccessBoostRequest {
  opId: string;
  quoteId: string;
  expectedCostShards: number;
  stableId: string;
}
```

`getV2AccessQuote` читает server progress и immutable gate policy. Quote живёт не более пяти минут и не резервирует shards. `purchaseV2AccessBoost` внутри одной Firestore transaction:

1. проверяет Firebase Auth и App Check;
2. резолвит canonical stable UID через существующий identity contract;
3. проверяет `opId`, владельца quote, expiry, release и policy version;
4. повторно вычисляет обязательные условия, cumulative deficit и caps;
5. отклоняет stale quote до любого списания;
6. проверяет `expectedCostShards`;
7. читает authoritative `users/{stableUid}.shards`;
8. проверяет idempotency marker `v2_access_{opId}`;
9. атомарно списывает shards, пишет receipt и unlock basis;
10. возвращает authoritative balance и тот же receipt при повторе `opId`.

Покупка требует сети и не оптимистична: это разрешённое исключение из ordinary local-first mutations. Если ответ потерян после commit, клиент повторяет тот же `opId`, а не создаёт новую операцию.

### 6.4 Ledger

```ts
export interface V2AccessLedgerEntry {
  opId: string;
  stableUid: string;
  seasonId: string;
  chapterId: string;
  gateId: string;
  policyVersion: string;
  releaseId: string;
  accessStarsApplied: number;
  unitPriceShards: number;
  totalCostShards: number;
  balanceBefore: number;
  balanceAfter: number;
  status: 'applied' | 'refunded';
  createdAt: string;
  refundedAt?: string;
  refundReason?:
    | 'gate_removed'
    | 'release_fault'
    | 'duplicate_reconciliation'
    | 'admin_remediation';
}

export interface GateUnlockReceipt {
  gateId: string;
  unlockedAt: string;
  basis: 'earned' | 'earned_plus_boost' | 'grandfathered';
  requiredAccessAtUnlock: number;
  cumulativeAccessEarnedAtUnlock: number;
  purchasedAccessApplied: number;
  policyVersion: string;
  purchaseOpId?: string;
}
```

Cloud paths:

```text
users/{stableUid}/v2_access_ledger/{opId}
users/{stableUid}/v2_gate_receipts/{seasonId__gateId}
users/{stableUid}/reward_claims/v2_access_{opId}
```

Если rollback удаляет уже оплаченный gate или release fault сделал покупку бесполезной, компенсация создаётся отдельной идемпотентной server operation. Если пользователь позже сам добрал performance stars, автоматического refund нет: unlock уже был предоставлен, и это явно показывается перед подтверждением.

## 7. Progress snapshot и canonical attempt projection

### 7.1 Account-scoped local keys

```text
v2:progress:v1:<accountScopeHash>:<seasonId>:<target>:<source>
v2:outbox:v1:<accountScopeHash>:<seasonId>:<target>:<source>
v2:enrollment:v1:<accountScopeHash>:<seasonId>:<target>:<source>
v2:pending-purchase:v1:<accountScopeHash>:<opId>
```

`accountScopeHash` выводится из canonical stable UID локально и не отправляется как аналитический идентификатор. Каждый commit проверяет актуальный account-generation token. Stale generation не имеет права менять storage, memory cache или UI event.

### 7.2 Snapshot

```ts
export type CheckpointEvidenceIndexKey =
  `${string}::${LearningEvidenceTupleKey}`;

export type CheckpointEvidenceState =
  | { status: 'unobserved' }
  | {
      status: 'not_assessed';
      reason: 'accessibility' | 'system' | 'invalid';
      nonAssessmentRef: LearningNonAssessmentRef;
    }
  | {
      status: 'observed_success' | 'observed_needs_work';
      evidenceRef: LearningEvidenceRef;
    };

export type V2CheckpointDecision =
  | { status: 'passed'; repairNodeIds: [] }
  | {
      status: 'repair_required';
      failedCriticalTupleKeys: [LearningEvidenceTupleKey, ...LearningEvidenceTupleKey[]];
      repairNodeIds: [string, ...string[]];
    }
  | {
      status: 'not_assessed';
      unresolvedTupleKeys: [LearningEvidenceTupleKey, ...LearningEvidenceTupleKey[]];
      alternateRouteIds: [string, ...string[]];
    }
  | {
      status: 'incomplete';
      unobservedTupleKeys: [LearningEvidenceTupleKey, ...LearningEvidenceTupleKey[]];
    };

export interface V2ProgressSnapshot {
  schemaVersion: 'v2-progress.v1';
  accountScopeHash: string;
  seasonId: string;
  studyTarget: string;
  learnerSourceLocale: string;
  enrolledPolicyVersion: string;

  slots: Record<string, {
    starSlotId: string;
    activityId: string;
    progressCompatibilityKey: string;
    bestPerformanceStars: PerformanceStars;
    bestPerformanceAttemptRef?: CanonicalAttemptRef;
  }>;

  nodeOutcomes: Record<string, {
    nodeId: string;
    activityId: string;
    progressCompatibilityKey: string;
    bestAcceptedAttemptRef: CanonicalAttemptRef;
    bestAcceptedOutcome: V2AttemptEventBody['outcome'];
  }>;

  learningEvidenceIndex: Record<LearningEvidenceTupleKey, {
    bestAssessedEvidenceRef?: LearningEvidenceRef;
    latestNonAssessmentRef?: LearningNonAssessmentRef;
  }>;

  checkpointEvidenceIndex: Record<CheckpointEvidenceIndexKey, {
    checkpointEpisodeId: string;
    tupleKey: LearningEvidenceTupleKey;
    state: CheckpointEvidenceState;
  }>;

  gates: Record<string, GateUnlockReceipt>;

  legacyEvidence?: {
    migratedAt: string;
    unlockedLegacyLessonIds: number[];
    legacyBestScores: Record<string, number>;
  };

  updatedAt: string;
}
```

В части learning progress source of truth ограничен `bestPerformanceStars` и bounded hash-aware ссылками на canonical attempts/evidence. Slot хранит только один `bestPerformanceAttemptRef`; node identity сохраняется в `nodeOutcomes`; evidence index хранит максимум один best assessed и один latest non-assessment ref на объявленный tuple `nodeId + objectiveId + skillId + construct + phase + targetKind + targetId`, закодированный только общим collision-free `letk1` builder. `checkpointEvidenceIndex` — bounded projection тех же refs только на requirements опубликованного checkpoint contract; он не может создавать новые evidence или выходить за cardinality контракта. `accessStarsEarned`, completion, loop status, quality band, checkpoint decision и voice badge — только derived selectors над этими refs и pinned content/policy; независимо записываемых slot booleans или access totals нет. Полный attempt count относится к cloud analytics/ledger, а не восстанавливается из bounded first-frame snapshot.

```text
episodePerformanceStars = sum(slot.bestPerformanceStars)
cumulativeAccessEarned  = sum(all prior slot.bestPerformanceStars)
voiceBadge              = exists(resolved assessed spoken evidence with valid provenance)
loopComplete            = evaluate required node outcomes from nodeOutcomes
checkpointDecision      = evaluate checkpoint contract from checkpointEvidenceIndex
```

Размер `slots`, `nodeOutcomes`, `learningEvidenceIndex` и `checkpointEvidenceIndex` ограничен IDs/tuples опубликованного season bundle; неизвестный key отклоняется. Полная append-only attempt/evidence history остаётся в cloud ledger. Локальный outbox содержит только pending events и после acknowledgement компактизируется в bounded snapshot. Первый кадр может использовать дополнительный bounded derived cache с `projectionVersion` и fingerprint набора refs; при несовпадении hash/fingerprint cache отбрасывается. Purchased boost остаётся отдельным server receipt в `gates` и не входит в эти projections.

Checkpoint projection вычисляется детерминированно только из `phase='independent_probe'` requirements самого checkpoint. `passed` возможен только когда pass policy выполнена и каждый `criticalSemanticSlotId` и `criticalConstraintId` имеет resolved assessed `success`. Assessed `needs_work` по critical target даёт `repair_required` только с объявленными targeted repair nodes; после них новая independent assessment attempt пересчитывает projection, но не сбрасывает главу. Accessibility/system/invalid non-assessment не является fail и ведёт в equivalent alternate route; `unobserved` оставляет checkpoint `incomplete`. Delayed scheduler records, включая `outside_window`, типом не допускаются в `checkpointEvidenceIndex` и не могут блокировать или изменять immediate checkpoint/access decision. Purchased access не участвует ни в одной из этих ветвей.

Snapshot invariants: `bestPerformanceStars` совпадает с canonical outcome, на который указывает `bestPerformanceAttemptRef` (без ref допустим только `0`); key `nodeOutcomes[nodeId]` совпадает с `nodeId` resolved attempt body; key evidence index равен результату canonical builder для resolved node/objective/skill/construct/phase/target tuple; checkpoint key дополнительно доказывает membership в exact checkpoint contract; один replay не добавляет новую snapshot entry. Нарушение любого ref/hash/key/cardinality инварианта блокирует projection и отправляет конфликт в quarantine.

### 7.3 Canonical attempt input

Reducer принимает sanitized hash-free `V2AttemptEventBody` из документа 06 — никогда не post-hash envelope, — вычисляет `attemptBodyHash = sha256(canonicalJsonV1(body))` и только затем создаёт `CanonicalAttemptRef`. Для starless node canonical outcome уже гарантирует `candidatePerformanceStars=0` и отсутствие `starSlotId`; progress layer не повторяет этот union и не ослабляет его типы. Целый `V2AttemptEvent` envelope не хэшируется: он соединяет attempt body/ref, exact graph/receipt materialization basis и созданные после него learning refs.

Для обычной graph-node attempt client materializer проверяет исчерпывающие per-tuple dispositions и создаёт `0..N` `LearningEvidenceBody` и `0..N` `LearningNonAssessmentBody`; каждый body получает собственный content-addressed ref. Для `attemptSurface.kind='scheduled_delayed_probe'` client сохраняет только body/ref с client candidates как `V2DelayedAttemptCandidate`: server выпускает `timed_finalized` с timing-receipt terminal table, `system_non_assessment_finalized` с failure-receipt terminal table для валидно bound missing/stale assignment или missing/expired launch, либо `protocol_rejected` без terminal table/finalized event/learning refs для substitution/account mismatch. Любая ветка terminal и очищает pending exact namespace; только первые две содержат finalized envelope, whose materialization basis pin-ит exact receipt. Объединённый набор refs уникален по declared tuple и 1:1 совпадает с terminal resolutions, кроме `no_record`: одна попытка не может одновременно заявить assessed и non-assessed observation об одном target. `LearningNonAssessmentBody`/diagnostic хранится отдельно и не попадает в mastery evidence set. Raw audio, transcript, target phrase, email, телефон, адрес или свободный пользовательский текст не входят в bodies, refs, outbox или продуктовую аналитику.

## 8. Local-first, offline и merge

### 8.1 Атомарная локальная запись

Под общим storage mutex graph-node операция:

1. проверяет account generation;
2. валидирует canonical `V2AttemptEventBody`, вычисляет body hash, создаёт `CanonicalAttemptRef`, а затем отдельно хэширует каждый learning body и добавляет нехэшируемый `V2AttemptEvent` envelope в account-scoped outbox;
3. проверяет `0..N` learning refs на exact source attempt, hash, declared tuple, combined uniqueness и cardinality, после чего обновляет bounded best slot ref, `nodeOutcomes`, `learningEvidenceIndex` и `checkpointEvidenceIndex`, а `bestPerformanceStars` — через `max`;
4. выводит `accessStarsEarnedDelta = performanceStarsDelta`, не записывая отдельный access source;
5. пересчитывает derived loop/gate/badge/checkpoint selectors;
6. сохраняет snapshot и outbox вместе;
7. обновляет memory cache и UI немедленно;
8. запускает background sync без блокировки экрана.

Scheduled delayed операция использует отдельную двухфазную ветку под тем же account-scoped mutex:

1. проверяет account generation, exact assignment/launch refs и `attemptSurface='scheduled_delayed_probe'`;
2. атомарно сохраняет `V2DelayedAttemptCandidate` с hash-pinned client candidates в durable outbox без learning refs/server resolution и показывает только `pending_sync`, не durable/mastery success;
3. server ack обязан вернуть тот же `CanonicalAttemptRef` и ровно одну terminal branch: hash-verified timing receipt с exhaustive terminal resolutions и `timed_finalized`, hash-verified system-failure receipt с exhaustive terminal resolutions и `system_non_assessment_finalized`, либо protocol-rejection receipt без resolutions/finalized envelope/learning refs;
4. повторно проверяет account generation, hashes, candidate/declaration/terminal-resolution cardinality, deterministic in-window/outside/system/`SKIPPED` mapping и exact receipt `materializationBasis`, затем один раз применяет 1:1 returned refs к bounded indices, очищает rejected candidate в его старом namespace или quarantine-ит mismatch;
5. только после этого удаляет candidate из outbox и обновляет durable/DTS projection. Duplicate ack идемпотентен; sign-out/account switch не может применить ack к новой generation.

Невалидный/system voice result может создать только `LearningNonAssessmentBody`/diagnostic на объявленные targets, но не меняет star slot и не создаёт `LearningEvidenceBody`.

### 8.2 Cloud model

```text
users/{stableUid}/v2_progress/{seasonId__target__source}
users/{stableUid}/v2_progress_ops/{opId}
users/{stableUid}/v2_delayed_attempts/{opId}
users/{stableUid}/v2_access_ledger/{opId}
users/{stableUid}/v2_enrollments/{seasonId__target__source}
```

Не следует расширять строковый `users.progress` сотнями activity keys. Специальный V2 document проще валидировать, индексировать, удалять вместе с аккаунтом и развивать без legacy regex.

### 8.3 Idempotent server merge

Один `opId` применяется ровно один раз. Merge является set/hash-aware:

```text
cloudAttemptLedgerRefs = hashAwareSetUnion(key=opId, hash=attemptBodyHash)
cloudEvidenceLedgerRefs = hashAwareSetUnion(key=observationId, hash=evidenceBodyHash)
cloudNonAssessmentLedgerRefs = hashAwareSetUnion(key=nonAssessmentId, hash=nonAssessmentBodyHash)
cloudDelayedTimingReceiptRefs = hashAwareSetUnion(key=timingReceiptId, hash=timingReceiptBodyHash)
slot.bestPerformanceAttemptRef = selectBestCanonicalAttempt(slotKey)
nodeOutcomes[nodeId] = selectBestAcceptedNodeOutcome(nodeId)
learningEvidenceIndex[buildLearningEvidenceTupleKey({nodeId,objectiveId,skillId,construct,phase,targetKind,targetId})] = selectBoundedBestAndLatestRefs()
checkpointEvidenceIndex[checkpointId::tuple] = projectDeclaredCheckpointRequirements()
bestPerformanceStars = derive from slot.bestPerformanceAttemptRef
accessStarsEarned = sum(merged slot.bestPerformanceStars)
voiceBadge = derive from resolved assessed spoken evidence
unlockedGates = union of authoritative GateUnlockReceipt
```

Одинаковый key с разным hash — conflict/quarantine, а не last-write-wins. Envelope не имеет общего hash: server не сравнивает и не дедуплицирует его как единый blob; identity/integrity доказываются attempt body ref и каждым learning body ref отдельно. Ref с неизвестным release/content/policy hash не участвует в projections до верификации. Tie-break для bounded best/latest ref задаёт один versioned deterministic reducer; client clock не может сам победить. Boolean OR для completion, checkpoint или voice запрещён: эти состояния пересчитываются из canonical refs и pinned contracts. После cloud acknowledgement соответствующий pending outbox event удаляется; replay не увеличивает first-frame snapshot.

Purchased access и shards balance никогда не объединяются клиентским `max/union`: для них побеждает server receipt.

Outbox не обрезает неподтверждённые учебные события. После acknowledgement события компактизируются в snapshot. При аномальном росте можно приостановить необязательную telemetry, но нельзя терять learning progress.

### 8.4 Offline semantics

- earned progress, stars, loop completion и уже известные gates работают offline;
- новый earned gate открывается локально и позже объединяется монотонно;
- Access Boost offline недоступен, потому что требует authoritative shards transaction;
- ранее купленный и синхронизированный gate остаётся доступен offline;
- checkpoint без обязательного AI/network режима работает offline на детерминированном пакете;
- AI Speaking Club не является единственным обязательным путём core progression;
- account switch сначала закрывает/инвалидирует старое поколение, затем меняет namespace;
- account deletion удаляет local namespaces, V2 cloud documents, ops и ledgers.

## 9. UI semantics

### 9.1 Что показывать

На activity:

- до трёх earned performance stars;
- лучший результат, а не сумму попыток;
- отдельный значок микрофона/`voice evidence`, если он действительно получен;
- `Не удалось уверенно оценить — попробуйте ещё раз` для uncertain;
- понятную alternate activity при недоступности голоса.

На карте:

- `Ваши звёзды доступа: X`;
- `Для эпизода нужно: Y`;
- локальный статус предыдущего эпизода `Z/24`;
- незавершённый loop или checkpoint как отдельная причина;
- конкретную бесплатную CTA: `Улучшить 2 слабых задания`;
- Access Boost только после двух честных блокировок и review explanation.

На confirmation:

```text
Не хватает 2 звёзд доступа.
Access Boost откроет этот эпизод за 6 осколков.
Он не засчитывает владение материалом и не влияет на checkpoint.
```

### 9.2 Визуальное разделение

- earned performance: золотая/основная звезда результата;
- earned access: derived-счётчик пути, полученный из earned performance;
- purchased boost: отдельный символ/контур и подпись `Boost`, не золотая performance-звезда;
- voice evidence: микрофон/волна плюс текст, не цвет alone;
- на lime/neon surface используется только тёмный foreground;
- screen reader произносит тип звезды и назначение, а не просто `две звезды`;
- reduced motion убирает вращение/бесконечные pulses, но не статус операции.

## 10. Abuse, fairness и edge cases

| Ситуация | Нормативное поведение |
|---|---|
| Replay того же ответа | `best=max`, повторной delta нет |
| Две альтернативные ветки | общий `starSlotId`, учитывается один лучший результат |
| Новый scorer строже | старый best не отзывается; новая policy version применяется только к новым попыткам |
| Copy edit release | progress переносится по совместимому key |
| Смысл задания изменён | новый compatibility key; ранее открытый gate grandfathered |
| `UNCERTAIN/INVALID` voice | нейтральный retry, best не меняется |
| Typed fallback | content completion возможен, voice evidence не выдаётся |
| Accessibility alternative | равный путь completion/performance/access; отдельный diagnostic получает `not_assessed_accessibility`, objective state — `not_assessed/accessibility` |
| Delayed probe доставлен вне pinned window | `not_assessed_for_window` → `not_assessed/outside_window`; не failure, не delayed evidence и не mastery |
| Gate уже открыт, curve повысилась | unlock не отзывается |
| Дефицит больше трёх | boost не продаётся, предлагается review |
| Два устройства покупают gate | transaction + `opId`; один receipt, один spend |
| Purchase commit прошёл, ответ потерян | повтор того же `opId` возвращает receipt |
| Shards потрачены на другом устройстве | stale quote/insufficient, без partial write |
| Gate удалён faulty release | server refund operation |
| Пользователь добрал stars после boost | gate остаётся открыт, автоматического refund нет |
| Account switch во время sync | stale generation отбрасывается до storage/memory commit |
| Клиент подменил цену | сервер повторно вычисляет цену и отвергает mismatch |
| Клиент подменил earned stars | не использовать performance stars для денежных выплат, лиг, mastery или сертификата; competitive claims требуют отдельной server-validated evidence |
| Clock rollback | gate не зависит от client clock; время информационное |
| Legacy `best_score` | сохраняет legacy evidence/access, не создаёт V2 performance stars или `LearningEvidence` |

Модифицированный offline-клиент нельзя сделать криптографически доверенным без server scoring всех попыток. Поэтому earned performance stars являются личным reward/progress signal и не дают денежной/соревновательной выгоды. Всё money-adjacent — shards spend, boost receipt, refund — остаётся server-authoritative.

## 11. Focused tests

### 11.1 Pure unit

```text
tests/v2_star_best_semantics.test.ts
tests/v2_star_slot_branching.test.ts
tests/v2_voice_result_taxonomy.test.ts
tests/v2_gate_curve.test.ts
tests/v2_gate_access_separation.test.ts
tests/v2_accessibility_evidence.test.ts
tests/v2_attempt_learning_hash_chain.test.ts
tests/v2_checkpoint_projection.test.ts
```

Обязательные assertions:

- максимум 3 stars/slot и 24/episode;
- все 31 thresholds равны таблице;
- curve строго монотонна и не экспоненциальна;
- replay с тем же/худшим результатом даёт delta 0;
- purchased access не меняет performance/access earned/`LearningEvidence`/voice/checkpoint;
- checkpoint игнорирует purchased boost;
- локальные minimum 14/15/16/17 применяются к правильным диапазонам;
- primary и каждая accessibility route имеют достаточный `maxReachablePerformanceStars` для local/cumulative gates без boost;
- typed fallback не создаёт voice/spoken evidence, captioned route не создаёт listening evidence;
- accessibility route пишет отдельный `LearningNonAssessment(not_assessed_accessibility)`, а objective state становится `not_assessed/accessibility`;
- uncertain/invalid не ухудшают best, не создают `LearningEvidence` и остаются отдельным non-assessment diagnostic;
- attempt body hash не зависит от learning refs; body/ref цепочка создаётся только в порядке attempt body → attempt ref → learning bodies → learning refs, а envelope не имеет общего hash;
- одна graph attempt допускает `0..N` refs и требует ровно один phase-correlated disposition на declaration; delayed candidate требует ровно один client candidate, а receipt — ровно одну terminal resolution на declaration. Missing/duplicate/unknown, assessed+non-assessed collision, provenance/input/calibration mismatch, `evidence.hintsUsed`/tuple provenance mismatch и лишний tuple отклоняются; independent/delayed hints `>0` не парсятся; `SKIPPED` имеет только `no_record` и оставляет checkpoint unobserved;
- scheduled delayed candidate не содержит learning refs/server resolutions; server возвращает terminal timed/system-non-assessment/protocol-rejected ack. Timing/system receipt immutable pin-ит deterministic terminal table, finalized envelope pin-ит его как materialization basis, а inside/outside/system/`SKIPPED` mappings дают exact 1:1 refs кроме `no_record`. Protocol rejection не имеет table/finalized event/learning refs, duplicate ack не растит indices, а offline/client-clock attempt не создаёт durable evidence;
- `not_assessed_for_window` допустим только для scheduler-owned `delayed_probe`, проектируется в `outside_window`, не удовлетворяет mastery и вообще не допускается в independent-only `checkpointEvidenceIndex`;
- checkpoint pass требует assessed success всех critical semantic-slot/constraint tuples, exact assessment-node/requirement/objective set equality и independent-node subset; critical `needs_work` даёт только declared targeted repair, non-assessment даёт alternate route, `SKIPPED` остаётся incomplete, а purchased access не меняет projection;
- season performance target равен 500 earned stars и не считается durable mastery.

### 11.2 Storage и sync

```text
tests/v2_progress_store_atomicity.test.ts
tests/v2_progress_merge.test.ts
tests/v2_progress_outbox.test.ts
tests/v2_progress_account_isolation.test.ts
tests/v2_progress_offline_restore.test.ts
```

Проверить restart между outbox/snapshot, duplicate event, hash-aware cloud-ledger union, одинаковый `opId/observationId/nonAssessmentId` с разным body hash → quarantine, сохранение `nodeId` в bounded `nodeOutcomes`, максимум один best slot ref и два evidence-index refs на полный declared tuple, checkpoint-index cardinality не выше requirements exact contract, отсутствие роста snapshot при бесконечном replay, compaction pending outbox после acknowledgement, derived access/voice badge/checkpoint после two-device merge, stale account generation, anonymous→provider relink, wipe/delete и отсутствие silent queue truncation.

### 11.3 Server economy

```text
functions/src/v2_access_purchase.test.ts
functions/src/v2_access_refund.test.ts
functions/src/v2_progress.test.ts
```

Проверить quote expiry, price mismatch, deficit `0`, deficit `>3`, gate/chapter/season caps, незавершённый loop, local minimum, checkpoint, insufficient balance, concurrent transaction, same-op replay, owner mismatch, stale release/policy и idempotent refund.

### 11.4 Existing regression guards

Новые операции не должны ломать существующие:

```text
tests/shards_idempotent_spend.test.ts
tests/shards_delta_queue.test.ts
tests/shards_delta_queue_reconcile.test.ts
tests/shards_system.test.ts
tests/lesson_lock_system.test.ts
tests/progress_events_engine.test.ts
tests/cloud_sync_account_race_contract.test.ts
```

## 12. Acceptance criteria пилота

- snapshot хранит только `bestPerformanceStars`, canonical attempt/evidence refs и bounded checkpoint projection этих же refs как learning source of truth; access, completion, loops, checkpoint decision и voice badge воспроизводимо выводятся и не имеют независимой write-команды;
- canonical integrity chain не циклична: hash-free attempt body → attempt ref → hash-free learning bodies → learning refs; `V2AttemptEvent` envelope не хэшируется целиком;
- купленная сущность нигде не попадает в `LearningEvidence`, mastery, checkpoint, voice, achievement или league;
- все ворота вычисляются одинаково client/server/admin validator;
- primary и каждая accessibility route доказуемо могут достичь своих local/cumulative gates без Access Boost;
- Access Boost никогда не является первым или единственным способом продолжить;
- purchase atomic, server-priced, account-scoped и idempotent;
- offline earned progress переживает restart и последующий merge;
- ни один технический voice failure не превращается в учебную ошибку;
- legacy progress остаётся нетронутым и не создаёт фиктивных V2 performance stars или `LearningEvidence`;
- UI в каждом месте ясно называет тип звезды и последствия действия.
