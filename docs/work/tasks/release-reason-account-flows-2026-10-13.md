# Task packet: коды причин releaseReason в аккаунтных потоках (шаг 3 RELEASE_LOGGING_R1, помощник Ядра 4faca60d8)

Governance-ID: TG-B7391FCAE74A
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор / Ядро 13.10 ~04:15)

## Outcome

Релиз вырезает console.log, а console.warn с телефона не доходит до поддержки. В ветках отказа и catch аккаунтных потоков —
одна строка `releaseReason(область, код, итог)` рядом с существующим логом (≈15 мест): журнал обращения получает «область:код».
Файлы: components/CleanOnboarding.tsx, components/RegistrationPromptModal.tsx, app/onboarding_account_switch_confirm.ts,
app/auth_provider.ts, app/account_delete_restore_prompt.ts, components/DeleteAccountConfirmModal.tsx, app/account_delete_quarantine.ts.

## Scope

In scope: только добавление вызовов (console.* не трогаем), импорт помощника, тест подсчёта вызовов и схемы кодов.
Out of scope: изменение поведения, тексты, сам помощник.

## Architecture

Коды — из списка Ядра; итог: blocked — отказ/отмена человеком, error — сбой, info — нейтральный исход.

## Security and privacy

Только коды смысла причины: без uid, email, id, текста ошибки (политика §10 — журнал обращения).

## Technical debt

- Contain: нет.

## Verification

Тест: каждый код проходит isValidReleaseReasonCode; число вызовов по файлам; затронутые наборы тестов аккаунта зелёные; сканер непереведённых.

## Rollback

git revert коммита.

## Result

Новый app/auth_release_reasons.ts (reportSignInOutcome/Threw, reportAccountDeleteHandoffFailed/Threw, releaseReasonForAuthEvent — таблица событий аналитики, подключена одной строкой в logAuthEvent). Прямые вызовы: смена 8, восстановление 3; онбординг 2+2, окно входа 1+1, окно удаления 2. Коды вне схемы → запасной код (sign_in_failed, local_rejected). Тесты: auth_release_reasons + 17 наборов аккаунта/входа/удаления 214/214. Попутно сторож переписи account_authority_legacy_callsite_guard обновлён под 52429d419 (+1 вызов startCloudDeletionEnqueue гостя).
