# errfix: cards-v2-088 — чип «ES ⌄» и меню языков на настройке Блица (наборы на 2 языках)

Governance-ID: TG-2F2D5AAC432D
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора: шаги новой строки реестра cards-v2-088, Макеты 303b3efc4/ad7f4ebd9)

## Outcome
Строка `cards-v2-088` получает собственную запись в источнике DEV_LINKS: ссылка `studyTarget=es&cardslangs=on…` на `/flashcards_training_setup?mode=blitz`, шаги «пауза → тап по `#fc-training-setup-language-chip` → пауза». Сверке больше не нужна синтетическая ссылка.

## Scope
Только `scripts/dev_links_r1_steps_errfix.py` (мой модуль): одна новая запись через `add()`. Код приложения и чужие модули шагов не меняются; DEV_LINKS пересоберёт Авторизация.

## Architecture
Подмена `cardslangs=on` (`app/dev_fc_lang_state.ts`) выбирает языки по языку изучения (`getDevOtherLanguageDecks(appTarget)`), а НЕ по языку интерфейса: при `studyTarget=es` добавляются французский и английский. Образец №88 — русский интерфейс, меню «English 6 / Español 3» (два языка).

## Security and privacy
Только dev-ссылка сборки разработчика.

## Technical debt
Подмена даёт три языка (English, Español, Français) вместо двух образца и другие счётчики: нужен вариант `cardslangs` для «двух языков» от Ядра (только dev). Параметр `uiLang=en` в ссылку НЕ добавлен: образец русский, а подмена от языка интерфейса не зависит.

## Verification
Загрузка цепочки модулей шагов в порядке генератора без исключений; пересъёмка Сверкой после перегенерации.

## Rollback
git revert коммита.
