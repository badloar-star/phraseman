# Task packet: разделы онбординга, выключенные в Пульте, не прячутся в приложении

Governance-ID: TG-B69C1E5306FE
Status: В работе
Owner: «5 · ВХОД»

## Outcome

Координатор 28.10 (слово владельца): владелец выключил в Пульте разделы онбординга — в приложении ничего не изменилось. Починить так,
чтобы выключенный раздел реально не показывался; логи `[ONB-FLAGS]`; тест «раздел выключен → шаг пропущен».

Факты (только чтение и код):
- Пульт (`admin/v2/legacy.html`, `saveOnboardingScreens`) пишет `remote_config/app.texts.onboarding_enabled_steps_v1`; на бою сейчас
  `["welcome","privacy","niceToMeet","promise","language","level","notifications","name","catalog_2026_08_17"]` — выключены
  improve, source, trialReminder, onboardingPaywall. Тумблер «Пропуск» → `bools.onboarding_skip_enabled`.
- Приложение читает через `app/remote_config_client.ts` (кэш AsyncStorage → сеть при входе, TTL 6 ч) → `applyRemoteConfigSnapshot`
  (`app/remote_flags.ts`). С 30.09 (efe19ae9d, общий снимок 2.0) там белый список ключей: `onboarding_enabled_steps_v1` и
  `onboarding_skip_enabled` в него не входят → значения Пульта молча отбрасываются, `getEnabledOnboardingSteps()` = весь каталог.
- Сторож `tests/remote_config_onboarding_cache.test.ts` (03.10) закреплял это правило («маршрут онбординга — локальное решение»).
  Решения владельца с таким правилом в 03_DECISIONS нет; Пульт продолжал показывать галочки. Владелец 28.10 ждёт, что они работают.

## Scope

- `app/remote_flags.ts`: два ключа в белый список; логи `[ONB-FLAGS]` (что пришло, откуда — кэш/сеть, когда; решение по каждому шагу).
- `app/onboarding_flow.ts`: чистый разбор с причинами по шагам (для лога), поведение `parseEnabledOnboardingSteps` то же.
- `app/remote_config_client.ts`: передаёт источник (кэш/сеть) и время в `applyRemoteConfigSnapshot`.
- Тесты: сторож кэша — по новому смыслу; новый тест «выключено в Пульте → шаг пропущен» на значении с боя.
- `components/CleanOnboarding.tsx` (в правках Codex) не трогается: он уже фильтрует шаги по `getEnabledOnboardingSteps()` и обновляет их
  по `remote_config_changed`.

## Architecture

Источник — тот же один документ `remote_config/app` с кэшем (сеть при входе, TTL 6 ч). Новых чтений нет.

## Security and privacy

Не затрагивает данные пользователя. Локальные рубильники кода (язык/уровень) остаются сильнее Пульта.

## Technical debt

- Тумблер Пульта «приветственная шторка» (`onboarding_welcome_sheet_enabled`) приложение не читает совсем — отдельный вопрос координатору.
- До ответа сети на самом первом запуске (кэша нет) онбординг стартует по полному каталогу; выключенные шаги пропадают, как только придёт
  сеть (событие `remote_config_changed`). Владелец увидит изменение Пульта на устройстве после перезапуска приложения не позже 6 ч (TTL).

## Verification

tsx-прогон на значении с боя до и после правки; jest: remote_config_onboarding_cache, новый тест, onboarding_disabled_steps_contract,
admin_legacy_onboarding_screens_contract; проверка типов.

## Rollback

Убрать два ключа из белого списка — Пульт снова перестанет влиять на маршрут.
