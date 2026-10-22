# Task packet: три красных контракта после переносов (опрос, ленивые модалки, выход с пейвола)

Governance-ID: TG-819CD5EF55AC
Governance-ID: TG-2B333D385DB3
Governance-ID: TG-815603A11802
Status: В работе
Owner: 5 · ВХОД И АККАУНТ (координатор 22.10)

## Outcome

Красные: home_lazy_modals_contract (ленивый SurveySheetModal в home.tsx), survey_offer_delivery_contract (useHomeSurveyEntry на
Главной), paywall_exit_offer_themed_modal_contract (case D187 «не открывать заново исчерпанный диалог»). Сначала проверить по
коду, живо ли поведение; живо — перенацелить тесты без ослабления смысла; потеряно — логи и починка.

## Scope

- Пейвол: поведение живо (см. ниже) — перенацелить case D187 на смысл.
- Анкета (survey): по коду ПОТЕРЯНА доставка анкет-кампаний (4ee8c2585 заменил строку анкеты в «Сегодня» на Poll V2) —
  решение координатора/владельца до правки тестов: восстановить доставку или признать уход.

## Architecture

Пейвол: f8cbf06ff (18.10) убрал из paywall_purchase особый случай dialog_limit (replace на Главную): закрытие пейвола теперь
только шторка (тест paywall_close_keeps_underlying_screen). Петли нет, потому что:
- ai_dialog_session открывает пейвол ТОЛЬКО явным тапом «Plus» на стене лимита (openDialogPaywall, router.push);
- ai_companion_session уходит на пейвол через markNextNavigationAsReplace + router.replace — экрана под пейволом нет.
Тест проверяет это вместо удалённой ветки.

Анкета: useHomeSurveyEntry нигде не вызывается, на /survey_screen ведёт только dev-витрина; кэш предложения анкеты
прогревается на старте (_layout primeSurveyOfferCacheFromStorage), но не показывается. Poll V2 (home_polls_v2) — другая
система: тексты из content/polls, без сервера анкет.

## Security and privacy

Не затрагиваются.

## Technical debt

Заполняется по итогам.

## Verification

Три контракта + paywall_close_keeps_underlying_screen через светофор.

## Rollback

`git revert <hash>`.

## Решение владельца 22.10 по анкетам — вариант (а) «Вернуть анкеты»

Одна строка в «Сегодня»: активная анкета-кампания из админки — первой, иначе Poll V2. useHomeSurveyEntry и лениво
смонтированный SurveySheetModal возвращаются на Главную в прежнем виде (как до 4ee8c2585); тесты home_lazy_modals и
survey_offer_delivery — как есть. Лог [SURVEY-ROW]: выбранный источник и причина (одна строка на смену решения).
Главную параллельно правит 3 · МАКЕТЫ (плитки под «Сегодня») — в коммит идут только свои куски (--patch -U0).
