# Task packet: статистика не прячется в DEV при включённом «Фри»

Governance-ID: TG-9DAFC8942707
Status: In progress
Owner: сессия Claude, багрепорт владельца 2026-09-14
Related epic/enabler: Revenue VNext Epic 3 (статистика обычного аккаунта); пакет 2026-09-13_freemium_vnext_full_audit_and_rollout.md

## Outcome

Владелец: «какого … статистика не скрыта в DEV, когда фри-мод включаю».
Успех: когда в DEV-центре Plus снят локально (режим «Фри»), экран статистики
показывает ровно то, что видит обычный аккаунт — замки `StatsPremiumBlur` на
всей аналитике, — а не открытые карточки.

## Факты (код, не гипотеза)

- `app/streak_stats.tsx:3348`: `statsDevUnlock = shouldDevUnlockStatsPremiumContent(ENABLE_DEV_TOOLS, testerStripsPremium)`.
- `app/stats_premium_access.ts`: правило = `enableDevTools && testerStripsPremium === false`.
  Оно знает ТОЛЬКО старый тестерский флаг `tester_no_premium` («Снять премиум»).
- DEV-центр (`components/dev/DevHubSheet.tsx:388`) пишет другой механизм —
  `setDevLocalPlusOverride(stableId, 'removed')` («Фри»). `usePremium()` его
  учитывает (`hasPremiumAccess` становится false) и отдаёт наружу как
  `devLocalPlusOverride`, но `statsDevUnlock` его не читает.
- `components/StatsPremiumBlur.tsx:195`: `if (isPremium || devUnlock) return children` —
  DEV-обход побеждает даже при `isPremium === false`. Поэтому в DEV-сборке с
  включённым «Фри» замков нет.

## Scope

In scope: `app/stats_premium_access.ts` (правило учитывает
`devLocalPlusOverride`), `app/streak_stats.tsx` (передача переключателя и лог
решения `[STATS-GATE]`), `tests/stats_premium_access.test.ts`.

Out of scope: `StatsPremiumBlur` (контракт «isPremium || devUnlock» верен —
проблема в том, что devUnlock считался неверно); прод-сборки (там
`ENABLE_DEV_TOOLS=false`, обход не действует).

## Architecture

- Правило DEV-обхода получает третий вход — `devLocalPlusOverride`. При
  `'removed'` обход выключен: DEV-«Фри» обязан показывать экран обычного
  аккаунта, иначе им нельзя проверить пейволы статистики.
- Лог `[STATS-GATE]` печатает все входы решения (isPremium, tester,
  devOverride, enableDevTools) и результат — чтобы следующий такой вопрос
  закрывался одним grep.

## Security and privacy

Не применимо: DEV-only логика, данных нет.

## Technical debt

- Contain: два параллельных DEV-механизма снятия премиума (`tester_no_premium`
  и `dev_local_plus_override`). Объединять не сейчас — записать в RVTD.

## Verification

- `tests/stats_premium_access.test.ts`: при `devLocalPlusOverride === 'removed'`
  обход выключен независимо от тестерского флага.
- `tests/stats_free_account_layout_contract.test.ts` — зелёный.
- На устройстве: DEV-центр → Plus снят → экран статистики с замками; лог
  `[STATS-GATE] … statsDevUnlock=false`.

## Rollback

`git revert` — правка локальна в двух файлах.
