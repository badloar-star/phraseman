# Task packet: «Лимит — N ответов в месяц» — одинаково в двух местах и со склонением по числу (координатор 18.10)

Governance-ID: TG-ABEE0CD98811
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: ce1222c47 (Сайт); пейвол Диалогов

## Outcome

`aiDialogMonthlyLimitText` (`components/DialogQuotaBadge.tsx`) и `quotaUnknownA11y` (`components/dialogs/DialogueV2HubNotices.tsx`) дают одну и ту же фразу. Для ru / uk / pl слово «ответ» склоняется по числу: 1 ответ, 2 ответа, 30 ответов.

## Scope

In scope: две функции; формы через `pluralWord` из `constants/plural.ts`.

Out of scope: логика лимита, fr/de (там форма одна).

## Architecture

No architecture change: общий помощник склонения уже есть в проекте.

## Security and privacy

Не применимо.

## Technical debt

Нет нового долга.

## Verification

- сторожа i18n;
- тесты бейджа лимита и центра Диалогов через slot.sh.

## Rollback

`git revert`.
