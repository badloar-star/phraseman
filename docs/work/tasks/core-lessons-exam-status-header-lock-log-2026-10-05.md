# Task packet: learn-3/4/8 — статус карточки экзамена и замок заголовка уровня (сперва лог)

Governance-ID: TG-B7324F0089B5
Status: In progress (Дизайн/координатор 05.10: learn (3) флаг замка A2, (4) «Почти — 0%»; Сверка learn-007/008)
Owner: сессия 1 · ЯДРО

## Outcome

- learn-8/4: Free видит «Экзамен A1 · Почти — 0%» вместо «Откроется с Plus» (learn.html listFree). По коду (lessons.tsx,
  карточка экзамена): сохранённый результат (passed → «Сдан», иначе «Почти — N%») стоит ВЫШЕ проверки examPremiumRequired —
  запись с 0% (брошенная попытка?) перекрывает Plus-статус.
- learn-3: заголовок «A2» с замком — по макету замок только у Free (listFree), у Plus без (listPlus). Вопрос: в каком
  состоянии Сверка снимала и что видит список (isPremium/devMode/noLimits).
Сперва лог: однократно на (уровень, итог) — входы и выбранный статус; однократно на (заголовок, locked) — входы.

## Scope

app/(tabs)/lessons.tsx: console.warn [LESSONS-EXAM] status, [LESSONS-HEADER] lock — модульный Set, одна строка на
комбинацию. Поведение не меняется.

## Architecture

Не меняется.

## Security and privacy

Только флаги и проценты.

## Technical debt

Починка порядка статусов — после лога (и решения о «Почти — 0%»).

## Verification

Синтаксис; сторожа lessons; воспроизведение Сверкой.

## Rollback

git revert коммита.
