# Task packet: dev-фикстура ответа «Код от друга» + ссылки робота для overlays-campaigns-016…026

Status: In progress
Owner: сессия «5 · АВТОРИЗАЦИЯ» по заданию координатора (12.10)
Related: docs/design/v2-app/referral-code-states.html, docs/phraseman-2.0/R1_SHOT_LIST_ACCOUNT_SETTINGS.md (группа G-A08)

## Outcome

1. `dev_state?refcode=<ответ>` — подмена ответа применения кода друга в памяти процесса (как `promo=`):
   `hold` (кружок «Применяем…», кадр 018), `applied|already|invalid|unknown_code|self|too_old|disabled|error|needs_link`, `none` — снять.
   Только `__DEV__ && !IS_STORE_RELEASE`; при подмене НЕ зовутся ни сервер, ни поиск владельца кода, ни заявка в друзья (ноль записей в прод).
2. Шит `components/referral_code_sheet.tsx` читает подмену в одной точке перед `applyManualReferralCode`.
3. Записи `scripts/dev_links_r1_steps.py` для 016…026: ссылка `/referrals?enter=1` + шаги по testID, коды как в макете.
4. Перегенерация `DEV_LINKS_R1.md`, тест `dev_links_r1_contract`, тест `dev_social_state`.

## Scope

In scope: `app/dev_social_state.ts`, `app/dev_state_fixtures.ts` (парсинг/применение `refcode`), `components/referral_code_sheet.tsx` (одна точка), `scripts/dev_links_r1_steps.py`, `docs/phraseman-2.0/DEV_LINKS_R1.md` (генерация), `tests/dev_social_state.test.ts`.
Out of scope: серверная логика рефералов, реальный код друга с другого аккаунта (пишет в прод — только со слова владельца).
