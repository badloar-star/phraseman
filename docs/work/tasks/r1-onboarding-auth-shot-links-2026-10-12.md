# Task packet: ссылки съёмки онбординга и входа — onboarding-002/005/026–029

Governance-ID: TG-DB5B5A07ADB6
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10: «строки без ссылок онбординга и входа — твоя зона; подмены только память, заглушка в
сторе, guest=required там, где действие с аккаунтом; ссылки — в свой модуль шагов»)
Related epic/enabler: DEV_LINKS_R1, triage.coverage=link_missing

## Outcome

- onboarding-002 «Вход: Google / Apple» — onbstep=welcome + «У меня есть аккаунт» (без входа).
- onboarding-005 «Аккаунта нет» — новый режим `signin=unknown`: вход ДО замков и сети возвращает created_new с вымышленной почтой
  (example.com) и именем; онбординг показывает «Аккаунта … у нас нет». guest=required.
- onboarding-026/027/028 — /language_welcome?target=en (язык макета «Английский»), шаги тапами; ничего не сохраняется до «Начать».
- onboarding-029 «Новый язык выбран» — dev-параметр маршрута `devStep=done` (только __DEV__ && !IS_STORE_RELEASE): сразу экран
  подтверждения с целью everyday/уровнем a1, БЕЗ saveLanguageProfile/applyStudyLanguageSelection (язык гостя не меняется).

## Scope

In scope: app/dev_account_state.ts (+ заглушка: режим unknown), app/auth_provider.ts (ветка stub → created_new), app/dev_state_fixtures.ts
(перечень режимов через DEV_SIGNIN_MODES — без правки), app/language_welcome.tsx (devStep), scripts/dev_links_r1_steps_auth.py, тесты.
Out of scope: продуктовое поведение без флагов.

## Architecture

signin=unknown — ещё один режим существующей подмены входа. devStep — dev-only чтение параметра маршрута при первом рендере.

## Security and privacy

Без настоящего входа и сети; почта вымышленная (example.com). devStep в стор-сборке игнорируется (IS_STORE_RELEASE).
Если в окне «Аккаунта нет» нажать «Создать аккаунт», онбординг пойдёт дальше без настоящей привязки — только dev, робот не жмёт.

## Technical debt

- Contain: dev-инструменты съёмки.

## Verification

Тесты: режим unknown → created_new без сети; devStep игнорируется вне dev и не вызывает сохранения; шаги разбираются грамматикой.

## Rollback

Откат коммита.
