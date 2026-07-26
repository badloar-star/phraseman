# Phase 10.1B — решение владельца по provenance legacy placement

**Decision ID:** `DEC-V2-10.1B-LEGACY-PLACEMENT-PROVENANCE`

**Статус:** требуется решение владельца; ничего не утверждено автоматически

**Дата подготовки:** 2026-07-18

**Граница:** документ решения, без persistent migration writes, Firestore, Rules, callable exports, rollout или удаления legacy

## Решение одним предложением

Нужно утвердить, какие legacy-сигналы считаются достаточным основанием для
`highestContiguousCompletedLesson` и какую provenance запись обязан формировать
будущий read-only reader до того, как рекомендация 10.1A предложит placement.

## Рекомендация

Утвердить **вариант A: консервативный reconciled snapshot с fail-closed
provenance**.

Будущий reader должен:

1. читать только account-scoped legacy-состояние текущего `studyTarget` после
   завершения штатного identity/restore barrier;
2. фиксировать account-scope hash, account generation, study target, версию
   reader/policy и digest входного снимка, но не сохранять raw account ID и
   содержимое учебных ответов;
3. считать урок завершённым, если есть валидный `lessonN_best_score > 0` либо
   `lessonN_pass_count >= 1`;
4. использовать `lessonN_progress`, `unlocked_lessons`, exam/premium/tester
   flags только как диагностические сигналы, но не как самостоятельное
   доказательство завершения;
5. выбирать только наивысшую **непрерывную** последовательность L1…LN;
   разрывы не заполнять;
6. при незавершённом restore, смене account generation, неизвестной схеме,
   невалидном числе или существенном конфликте возвращать
   `manual_review_snapshot`, а не угадывать;
7. передавать в уже существующую pure policy 10.1A только нормализованный
   `highestContiguousCompletedLesson`;
8. не писать legacy/V2 progress, не выдавать stars/checkpoint/evidence и не
   превращать placement recommendation в автоматический V2 checkpoint.

Почему это рекомендуемый вариант:

- `pass_count` в текущем legacy-коде означает идеальный прогон, поэтому он
  надёжен, но слишком строг как единственный источник;
- `best_score` записывается при завершении урока и может быть восстановлен
  штатной safety-repair логикой, поэтому подходит для признания опыта, но не
  для V2 mastery;
- `unlocked_lessons` может отражать premium или exam unlock и потому не
  доказывает завершение предыдущего материала;
- post-restore account-scoped view сохраняет anonymous/signed-in и
  multi-device совместимость без второго конкурирующего механизма merge.

## Требуемая provenance форма

В 10.1B достаточно утвердить контракт. Persistent запись появится только в
отдельно одобренном migration/rehearsal task.

Минимальная будущая запись:

```text
schemaVersion
readerVersion
placementPolicyVersion
accountScopeHash
accountGeneration
studyTarget
restoreState: settled | unavailable | in_transition
sourceClass: local_only | cloud_restored | reconciled | unknown
capturedAtServerOrMonotonicContext
inputDigest
perLessonSignals[]:
  lessonId
  bestScore: absent | valid_positive | zero | invalid
  passCount: absent | valid_positive | zero | invalid
  progressShape: absent | present_valid | invalid
  unlockedSignal: present | absent | invalid
  decision: completed | incomplete | ambiguous
  signalDigest
highestContiguousCompletedLesson
recognizedLegacyBoundary
outcome: recommend | manual_review
issueCodes[]
```

Ограничения:

- raw stable UID/auth UID, raw phrase answers и полный `lessonN_progress` в
  provenance не входят;
- timestamp не определяет completion и не заменяет account-generation guard;
- запись не является `LearningEvidence`, checkpoint receipt или star ledger;
- replay одного и того же input digest должен давать тот же результат;
- изменение reader/policy требует новой версии, а не тихой переинтерпретации.

## Варианты для владельца

| Вариант | Правило | Плюсы | Риск |
|---|---|---|---|
| **A — рекомендован** | Reconciled post-restore snapshot; `best_score > 0` или `pass_count >= 1`; неоднозначность → manual review | Сохраняет больше реального опыта, работает offline/anonymous/multi-device, не выдаёт mastery | Требует точного restore/account-generation barrier |
| B — максимально строгий | Только `pass_count >= 1` | Минимальный риск ложного признания | Потеряет множество реально завершённых, но не идеальных уроков |
| C — максимально permissive | Max/union из score, progress, unlock и exam сигналов | Максимум continuity | Premium/unlock/partial progress могут завысить placement; не рекомендуется |

## Точный вопрос владельцу

**Рекомендуемый ответ:** «Утверждаю вариант A в указанной форме».

Если вариант A не подходит, нужно выбрать B или C и отдельно указать:

- можно ли `best_score > 0` считать completion;
- должен ли `unlocked_lessons` когда-либо влиять на completion;
- что делать при account/restore ambiguity;
- требуется ли показывать пользователю причину ручной проверки.

## Что откроет решение

После явного утверждения можно отдельно запланировать RED/GREEN для
`legacy_progress_reader.ts` и `placement_session.ts`: read-only reader,
account/restore guards, deterministic provenance body/digest и session flow.
Persistent migration write, Firestore schema, Rules, callable export, rollout
и legacy mutation в этот следующий пакет не входят.

## Что уже проверено

- Pure policy 10.1A сохранена без изменений.
- `tests/learning_v2_legacy_placement_policy.test.ts`:
  **1 suite / 4 tests PASS** 2026-07-18.
- Политика 10.1A по-прежнему всегда возвращает
  `writesLegacyProgress=false`, `writesV2Progress=false`,
  `grantsV2Stars=false`, `grantsV2Checkpoint=false`,
  `grantsV2LearningEvidence=false`.
