# План: D186 этап 3 — удалить клиентский модуль «Бонус на старт» (intro) целиком (после R1)

Governance-ID: TG-1C708496A1E0
Status: Карта удаления (только чтение). Патч — по решению координатора (см. «Когда собирать патч»).
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Флаг `INTRO_FULL_ACCESS_REMOVED = true` (app/intro_full_access.ts:42) уже делает модуль немым; этап 3 удаляет сам модуль и все его следы
в клиенте, кроме контура данных (зеркало старых ключей в облако и сервер — отдельно, см. «Не трогаем»).

## Карта (клиент, 15.10, HEAD 088c73625)

| Файл | Что убрать | Риск |
|---|---|---|
| `app/intro_full_access.ts` (251 стр.) | файл целиком | — |
| `components/IntroFullAccessModal.tsx` | файл целиком | — |
| `components/dev/motion_showcase/sections/paywalls.tsx` | секция с `<IntroFullAccessModal variant="welcome">` | dev |
| `app/premium_guard.ts:5, 710–714` | импорт `isIntroFullAccessActive` и шаг `introActive` в `getVerifiedPremiumAccessStatus` (между verified_local и подарком лояльности) | ⚠️ денежный путь: доступ к Plus; под флагом шаг всегда false — удаление поведения не меняет, но тесты premium_guard (2 файла) мокают модуль |
| `components/PremiumContext.tsx` | импорт `getIntroFullAccessState` (34), поля `isIntroFullAccess` / `introFullAccessEndsAt` в типе (66–67), дефолте (91–92), состоянии (186–187, 220–221, 300–308, 346–372, 463–464), подписка `intro_full_access_changed` (859), значение контекста (910–911); `projectDevLocalPlusOverride` принимает эти поля | ⚠️ публичный API контекста — все потребители |
| `app/(tabs)/settings.tsx:364, 661` | `isIntroFullAccess`, `introFullAccessEndsAt` из `usePremium()`; подписка `intro_full_access_changed` | горячий файл |
| `app/use_mistake_explain.ts:234, 644, 672` | `isIntroFullAccess` в чтении и в журнале доступа к ИИ-разбору | — |
| `app/dev_plus_controls.ts:13–14, 29–30` | поля intro в dev-проекции | dev |
| `app/dev_paywall_state.ts:226–241` | dev-подмена «пробный доступ активен» (`setDevIntroFullAccess` / `getDevIntroFullAccess`) | dev |
| `app/dev_state_fixtures.ts:1203–1205` | ветка `introAccess` dev-ссылки (+ разбор параметра и DEV_LINKS) | dev, DEV_LINKS перегенерировать |
| `app/events.ts:46` | событие `intro_full_access_changed` | все emit/on — выше |
| `app/_layout.tsx:321–323, 941–943, 3224–3225, 3314–3326, 3820` | импорт; чтения `expiredUnseen` в апселле level-up и в winback (всегда false); запуск после онбординга + `emitAppEvent`; `handleOnboardingIntroFullAccessStart` и проп `onIntroFullAccessStart` | горячий файл |
| `components/CleanOnboarding.tsx:160` + вызовы | проп `onIntroFullAccessStart` | ⛔ онбординг заморожен до R1 |
| `components/overlay_arbiter_core.ts:14, 63, 133, 185` | ключ `introFullAccess` (тип, приоритет, нативные модалки, пустой набор) | тесты арбитра |
| `app/gift_access_cloud.ts:50–105` | `claimIntroFullAccessOnCloud` (клиентский вызов `introFullAccessClaim`) — после удаления модуля без потребителей | серверную функцию не трогаем |

Тесты (18 файлов): удалить `intro_full_access.test.ts`, `dev_intro_full_access.test.ts`, `intro_full_access_modal_contract.test.ts`,
`intro_full_access_layout_contract.test.ts`; переписать `d186_intro_full_access_removed.test.ts` в сторож «модуля нет нигде» (grep по app/components);
поправить моки в `premium_guard.test.ts`, `unit/premium_guard.test.ts`, `premium_context_vip_events_contract`, `premium_pro_tier_grant_contract`,
`overlay_arbiter.test.ts`, `app_events_overlay_registry`, `storage_snapshot`, `startup_notifications_lazy_contract`, `mobile_admin_panel_retirement_contract`,
`analytics_funnel_coverage` (снять `intro_full_access_started`/`intro_ended_dismiss`).

## Не трогаем (контур данных, отдельное решение)

- `app/intro_full_access_keys.ts` и зеркало ключей в `app/cloud_sync.ts:36–38, 655–660` — старые значения у пользователей в облаке; снятие меняет синхронизацию.
- Сервер: `functions/src/gift_access.ts` (`introFullAccessClaim`), `premium_status.ts`, `accounts_v2_migration/inventory.ts` — зона Ядра; старые сборки ещё зовут.
- `app/paywall_progress_mirror.ts:113` читает `intro_full_access_started_at_v1` — проверить при сборке патча.

## Когда собирать патч (вопрос координатору)

Затронуты самые «горячие» файлы (`_layout`, `settings`, `PremiumContext`, `CleanOnboarding` — правки каждые несколько часов). Патч, собранный сегодня,
к применению после R1 почти наверняка не ляжет (`git apply` по контексту). Рекомендация: собрать патч по этой карте в день применения (≈1 окно
работы + прогон тестов), а не сейчас. Альтернатива — собрать сейчас и пересобрать при конфликте.

## Scope

Сейчас — только карта (docs). Код по карте — после R1, по команде координатора.

## Architecture

Удаление недостижимого под флагом кода; публичный API `usePremium()` теряет `isIntroFullAccess` / `introFullAccessEndsAt`.

## Security and privacy

Денежный путь (`premium_guard`) меняется только удалением шага, который под флагом всегда false. Данные пользователей в облаке не трогаем.

## Technical debt

- Зеркало старых ключей intro в облаке и серверная функция — отдельное решение (Ядро).

## Verification (при сборке)

Типы по всем затронутым файлам (0 ошибок), тесты из списка — N passed, grep: в app/components нет `intro_full_access` кроме ключей зеркала.

## Rollback

`git revert` патча.
