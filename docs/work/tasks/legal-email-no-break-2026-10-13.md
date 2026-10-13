# Task packet: адрес почты в юр. документах не рвётся переносом (EN-проход profile-011/012)

Governance-ID: TG-D8B26186CAB0
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10 ~05:10)

## Outcome

На экранах «Privacy Policy» / «Terms of Use» (components/legal/LegalDocumentSheet.tsx) Android переносил адрес
`support.phraseman@gmail.com` после «support» — на второй строке «.phraseman@gmail.com». Теперь при показе адрес склеивается
невидимым WORD JOINER (U+2060) вокруг «.» и «@» — перенос внутри адреса запрещён, между словами текста — как раньше.
Текст политики (legal/*.json) не меняется.

## Scope

In scope: отображение тела раздела в LegalDocumentSheet + тест помощника. Out of scope: тексты политики/условий, сайт.

## Architecture

Чистая функция `keepEmailsUnbroken(text)` (регулярка адреса) применяется к `section.body` при рендере.

## Security and privacy

Только отображение; данные не меняются.

## Technical debt

- Contain: при копировании текста адрес содержит невидимые U+2060 (копирование из этого экрана не предусмотрено).

## Verification

Тест функции (адрес склеен, остальной текст не тронут, без адреса — без изменений); тесты экрана документов; кадр profile-011/012 переснять.

## Rollback

git revert коммита.
