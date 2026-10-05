# Task packet: 70 — счётчик «n / N» в шапке отработки = пройденные вопросы

Governance-ID: TG-09EF225FF77F
Status: In progress (решено по рекомендации, владелец 11:10; координатор: «70: счётчик n/12 = пройденные вопросы (а)»)
Owner: сессия 1 · ЯДРО

## Outcome

Шапка задания показывала mistakePracticeProgress — число ЗАКРЫТЫХ ошибок: неверный ответ возвращает ошибку в очередь,
верный не закрывает до трёх разных дней, и «1/12 не сдвигался после верного». Теперь шапка — «пройдено вопросов из
общего числа» (новая чистая функция mistakePracticeAnsweredProgress: answered = cursor, total = max(initialCount,
длина очереди) — вернувшаяся в очередь ошибка честно увеличивает total). mistakePracticeProgress (закрытые) остаётся
для своих потребителей и тестов.

## Scope

modules/mistake-practice/session.ts (новая функция), app/mistake_practice_session.tsx (шапка), тест.

## Architecture

Не меняется; добавлена функция рядом с существующей.

## Security and privacy

Не затрагивает.

## Technical debt

Лог [MISTAKE-SESSION] counter печатает и старое, и новое значение до проверки Сверкой.

## Verification

Тест функции; сторожа mistakes.

## Rollback

git revert коммита.
