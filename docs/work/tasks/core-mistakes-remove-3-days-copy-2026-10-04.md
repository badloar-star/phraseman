# Task packet: «Мои ошибки» — убрать тексты про «верно в 3 разных дня» (§126/§130)

Governance-ID: TG-B04D18158F5E
Governance-ID: TG-A848198EECF7
Status: Done
Owner: Ядро; поручение координатора 04.10

## Outcome
Прогресс ошибки — только три деления без пояснений. Удалены строки:
- карточка ошибки (`app/mistake_detail.tsx`): пояснение правила «Ответь верно в 3 разных дня…» (9 языков);
- панель ответа на отработке (`MistakeVerdictPanel`): «Нужны ещё два верных дня…», «Ещё один верный день в
  другом режиме…», «Ещё один верный день…». «Эта ошибка исправлена навсегда» остаётся (факт, не правило).
Хаб `mistakes_list.tsx` текста не содержал (только точки) — не трогали.

## Scope
app/mistake_detail.tsx, components/mistake-practice/MistakeVerdictPanel.tsx, tests/mistakes_no_false_claims.test.ts.

## Architecture
Только строки и их вывод. Расчёт дней/режимов (projection, requiredModesForMistake, chain.days/modes) не меняется.

## Security and privacy
Данные не затрагиваются.

## Technical debt
Поля `modes`/`requiredModes` в цепочке панели больше не влияют на текст; оставлены, чтобы не трогать логику
(решение координатора «логику не трогать»).

## Verification
Сторож `mistakes_no_false_claims` переписан: строк правила нет, деления остаются; tsc по файлам.

## Rollback
Откат коммита.
