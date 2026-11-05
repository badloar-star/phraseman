Governance-ID: TG-599187487F25
Governance-ID: TG-INTRO-LOCALE-0511
Governance-ID: TG-D6C8809BD272
Governance-ID: TG-50C038B005BB

# Task packet: вступление урока классического курса — язык по локали интерфейса (находка Maestro)

## Outcome
При интерфейсе EN и курсе English карточка вступления урока 1 («Что учим сегодня») показывалась на русском: выбор поля падал на RU. Правило владельца: никаких чужих языков в не-ru локалях. Теперь ru→RU, uk→UK, остальные локали → собственный перевод, а если его нет — EN; RU остаётся только для ru и как запасной вариант для вызовов без EN-значения. Журнал `[CLASSIC-INTRO]`.

## Scope
`components/lesson_intro_rich.tsx` (выбор поля, журнал), `app/lesson_data_types.ts` (EN-поля вступления), тест-сторож `tests/classic_intro_locale_2026_11_05.test.ts`. Данные intro.json не меняются.

## Architecture
`legacyIntroValue(lang, studyTarget, ru, uk, es, en?)`: uk→UK(RU запасной); при испанской локали интерфейса → ES→EN→RU; прочие не-ru локали при наличии EN → EN; иначе прежнее RU. Для pt-BR/vi/id/tr/pl — собственное поле, иначе EN. `richTitle` и `plainIntroText` пишут одну строку `[CLASSIC-INTRO]` на (урок, экран, локаль, поле).

## Security and privacy
Данные не собираются; в журнале номер урока, код локали и имя поля.

## Technical debt
Тексты ES/PtBr/Vi/Id/Tr/Pl в intro.json — собственные переводы; EN подставляется только когда своего нет.

## Verification
Тест: en/ru/uk/es/pt-BR на реальных данных урока 1 и на синтетических данных; прежние вызовы без EN-значения ведут себя как раньше.

## Rollback
`git revert` коммита.

## Дополнение 05.11 (dev-эталон для Maestro)
Только `__DEV__`: скрытый Text `lesson1-expected-answer` с эталоном ответа на экране урока (`phraseCanonicalAnswer`) для шагов с вводом текста/речью; Maestro берёт его `copyTextFrom` и вводит `inputText`. В релизе узла нет.
