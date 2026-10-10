# Task packet: вход Google/Apple/гость и удаление аккаунта — двойной тап, откат, логи в каждом catch

Governance-ID: TG-F7EF093C2A25
Governance-ID: TG-4E72AC7F7165 (ожидание окна эмулятора, без правок)
Status: Planned
Owner: сессия «Авторизация» (Account V2), исполнитель Opus
Related epic/enabler: RELEASE_SLICE C (пол релиза 2.0.0 по авторизации), очередь координатора 00:05 п.4

## Outcome
Каждая точка входа (Google, Apple, «Позже»/гость, «У меня уже есть аккаунт») и удаления аккаунта:
1. не запускает вторую операцию при двойном/быстром повторном тапе (замок в процессе, кнопка неактивна/игнорирует, лог `ignored reason=in_flight`);
2. при ошибке возвращает интерфейс в исходное состояние (кнопки снова доступны, состояние не «залипает») и показывает понятную причину, где это положено (отмена пользователем — без окна);
3. в КАЖДОМ `catch` пишет причину с префиксом (`[AUTH-…]`, `[ACC-MUT]`, `[account-delete-ui]`), немых `catch {}` нет.
Итог — таблица «точка → замок / откат / лог» с файлом:строкой в `docs/phraseman-2.0/INBOX_COORDINATOR_FROM_AUTH.md`.

## Scope
In scope (сначала прочитать, править только по найденному факту):
- UI: `components/CleanOnboarding*` (вход/гость), `components/RegistrationPromptModal.tsx`, `components/AuthProviderButtons*`, экран настроек — блок входа/выхода/удаления (`app/settings.tsx` — только свои ханки, файл правят другие сессии), `components/DeleteAccountConfirmModal.tsx`, `app/onboarding_account_switch_confirm.ts`.
- Логика: `app/auth_provider.ts` — функции входа Google/Apple/анонимно, `prepareAccountDeletion`/`finishAccountDeletion`, `signOutAndWipeForAccountSwitch`.
- Тесты: новый `tests/aa_auth_double_tap_contract.test.ts` (поведенческий, где реально — на моках как `tests/aa_guest_server_delete.test.ts`; исходник-сторож только там, где поведенческий невозможен).
Out of scope: сервер (`functions/`), App Check (запломбирован), MAX, тексты/вёрстка (кроме возврата `disabled`), потеря `coin_rank_v1`/`profile_card_pro_v1` при выходе (полоса Ядра).

## Architecture
Без изменения архитектуры: замки — локальные `useRef`-флаги на экране + существующие процессные замки в `auth_provider` (там, где они уже есть). Если замка нет — добавить по образцу `authInFlightRef` (e514aadff) / `switchStageRef`. Инвариант: замок снимается в `finally`, поздний ответ не перетирает свежее состояние.

## Security and privacy
Повторный вход/удаление при двойном тапе — риск двойной постановки удаления и гонки личностей; правка их уменьшает. Новых данных нет. Логи — без токенов, email, uid целиком (только `h:` хеш, как в существующих трассах).

## Technical debt
- Pay now: немые `catch` и отсутствующие замки в перечисленных файлах.
- Accept temporarily: находки вне scope → строка в итоге с владельцем.

## Verification
- Новый тест: двойной вызов каждой точки → одна операция; ошибка → кнопки доступны снова; catch пишет причину.
- Соседние (по одному, со слотом, свободно ≥2 ГБ, `npm run test:one -- tests/<файл>`): `aa_guest_server_delete`, `aa_release_floor_auth_ui`, `aa_guest_honesty_contract`, `registration_prompt_modal_lifecycle`, `auth_provider_behavior`, `account_delete_flow_contract`.
- Независимое ревью до APPROVE.

## Rollback
Отдельный коммит; `git revert`.
