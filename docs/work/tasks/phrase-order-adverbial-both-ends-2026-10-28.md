# Task packet: «собери фразу» — обстоятельство времени / места в начале или в конце засчитывается

Governance-ID: TG-80B99C6994D0
Status: In progress
Owner: Learning V2 session; координатор 28.10 по сканеру Теории (211 заданий, docs/work/tasks/phrase-order-both-ends-2026-10-28.csv)

## Outcome

«Yesterday she found the keys» и «She found the keys yesterday» — оба верны. Сейчас «собери фразу» засчитывает только порядок автора
(`orderedTokens.join(" ")`). Правило: обстоятельство времени (и места: at home / at work / at school) на одном конце фразы засчитывается и
на другом, если остальной порядок верен. Лог [PHRASE-ORDER], тесты.

## Scope

Новый чистый модуль `modules/learning-v2/content/phrase_order_variants_v1.ts`; одна строка в
`modules/learning-v2/content/factory_native/factory_native_course_v1.ts` (phrase_builder → accepted = все допустимые порядки). Капсула
проверки уже принимает до 32 вариантов. Диктант (listen_build_dictation) не трогаю — порядок задан звуком.

## Architecture

phraseBuilderAcceptedOrdersV1(tokens) → [порядок автора, + перенос обстоятельства на другой конец]. Не переносим: если перед
обстоятельством связка (is / are / was / were / am / be — «Arrival is tomorrow»), если фраза — вопрос (начинается с do / did / is / will /
where …), если без обстоятельства остаётся меньше двух слов. Сравнение — после нормализации капсулы (регистр, пунктуация не важны).

## Security and privacy

Нет данных.

## Technical debt

Подсказки вида «Today поставьте в конце» в части заданий становятся лишними — это текст фабрики (content/learning-v2-course), не правлю;
пометил Теории. Места — только явный короткий список, «here / there» не переносим (меняется смысл).

## Verification

Юнит-тест модуля (примеры из списка Теории, отрицательные случаи), сквозной тест: задание lesson-10 s09 i04 принимает оба порядка через
капсулу; тесты экзамена главы и занятия; проверка типов.

## Rollback

Revert коммита (accepted снова один порядок).
