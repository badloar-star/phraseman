# Task packet: «Ещё N» — повтор неверно отвеченных ошибок этой сессии

Governance-ID: TG-221B7F5E5534
Status: Done — mistakeIds, разбор маршрута, логи [MISTAKE-RETRY]; при mistakeIds pool игнорируется
Owner: сессия 1 · ЯДРО (срочная задача координатора, 04.10; кнопку подключает сессия 3)
Related epic/enabler: Мои ошибки 2.0, эталон docs/design/v2-app/mistakes-panel.html (кадр result)

## Outcome

Из итога отработки можно начать новую сессию только из ошибок этой сессии, на которые
ответили неверно. Без параметра всё работает байт в байт как раньше.

## Scope

In scope: buildMistakePracticeSession / prepareMistakePracticeSession — необязательный
mistakeIds; маршрут /mistake_practice_session принимает mistakeIds (через запятую) с
проверкой (≤30, допустимые символы, мусор отбрасывается с логом); логи [MISTAKE-RETRY]; тесты.

Out of scope: кнопка и окно итога (сессия 3), цена (не меняется: от 5 ошибок 1 ⚡).

## Architecture

Фильтр кандидатов по id ставится до выборки (как facets): дальше работают прежние
правила pool, срока и лимита 30. Пустой/не переданный список — фильтра нет.

## Security and privacy

Новых данных нет. id из маршрута — недоверенный ввод: проверяется по шаблону и длине,
отбрасывается с логом; используется только как фильтр локальной проекции.

## Technical debt

Нет нового долга: параметр симметричен facets, отдельного хранения нет.

## Verification

npm run test:one -- tests/mistake_practice_retry_wrong.test.ts + соседние тесты отработки; проверка типов.

## Rollback

git revert; без параметра поведение прежнее, данные не меняются.
