# Task packet: остальные diff-строки реестра в моей зоне (80 строк) — классификация и список «id → что сделал»

Governance-ID: TG-3811E427C547
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10, «diff-строки реестра в твоей зоне по убыванию числа строк на экран»)
Related epic/enabler: docs/phraseman-2.0/R1_DIFF_ONE_FIX.md

## Outcome

1. Строки `status=diff` без `triage.final_bucket` разобраны методом «кадр свежее кода»: свежие (9) — проверка и правка при доказанной причине, старые (71) — пересъёмка.
2. Список «id → что сделал» записан в R1_DIFF_ONE_FIX.md и отправлен координатору.

## Scope

In scope: docs/phraseman-2.0/R1_DIFF_ONE_FIX.md. Out of scope: правки кода без доказанной причины.

## Architecture

No architecture change: документ.

## Security and privacy

Данных не касается.

## Technical debt

Pay now: 80 строк реестра без корзины.

## Verification

Свежесть кадров проверена по git log файлов `code` против `evidence_at`.

## Rollback

Откат коммита.
