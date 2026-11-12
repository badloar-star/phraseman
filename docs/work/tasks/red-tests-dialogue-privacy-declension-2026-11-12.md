# Task packet: три красных теста после чужих правок (маршрут диалога, приватность, склонения)

Governance-ID: TG-749D0A4FA074
Governance-ID: TG-EAF488356536
Governance-ID: TG-8EB52F6CA61E
Status: In progress
Owner: сессия Claude (U20), задача координатора 12.11 по слову владельца «если есть хоть 1 работа — не прекращается»
Related epic/enabler: none

## Outcome

Красные тесты снова отражают намеренное поведение кода, а не устаревшие ожидания; настоящие ошибки — в коде
или текстах, а не в ослабленных проверках. Для каждого теста назван коммит, который его сломал.

## Scope

In scope:
- `tests/dialogue_v2_session_route.test.ts` — ожидание вызова подготовки сессии: поле `hasPremiumAccess`
  добавлено намеренно коммитом 1e324d8ab (владелец 11.11, D204: Plus открывает все сценарии без ранга);
- `tests/number_noun_pairs_guard.test.ts` — сторож не ослабляется; правятся сами тексты «число + слово»
  в файлах без чужих несохранённых правок;
- тест экрана приватности — только если новый переключатель действительно есть в коде.

Out of scope: файлы с чужими несохранёнными правками (пропускаются и называются); `app/dialogue_v2_session.tsx`
(сейчас правится другой сессией — навыки «Речь/Слух», D207).

## Итог разбора (12.11, ночь)

- Маршрут диалога (`tests/dialogue_v2_session_route.test.ts`): поле `hasPremiumAccess` — намеренно, 1e324d8ab (D204);
  ожидание обновлено. Ещё три падения (`unsent: true`, `bottom` не `ended`) — от несохранённой правки
  `app/dialogue_v2_session.tsx` в другой сессии (навыки «Речь/Слух», D207, `modules/skills/*`); файл не тронут.
- Экран приватности (`tests/privacy_settings_liquid_glass_source_contract.test.mjs`): с 2b683c3d9 (04.11) тумблеры —
  общий GlassSwitch, который сам вибрирует; обработчик экрана вибрировал второй раз — **ошибка в коде**, двойная
  вибрация. Исправлено в `app/privacy_settings.tsx`; тест подключает настоящий GlassSwitch (заглушки только его
  зависимостям), геометрия — 36 + hitSlop 8/8 (нажимаемая высота 52 ≥ 48).
- Сторож склонений: 5 настоящих ошибок в `components/home/v2/scene/home_scene_special_copy.ts` (e3b3c313e, 25.10:
  es/pt-BR/en «1 errores», «1 phrases!») — исправлены. 7 ложных срабатываний не тронуты (сторож не ослаблен):
  служебные строки `key=value` (`app/paywall_trial_info.ts:116` — дословно проверяет
  design_paywall_trial_truth_contract; `components/home/v2/scene/home_scene_state.ts:74`;
  `components/home/v2/today_scene/today_scene_state.ts:60`; Пик — `components/spire/SpireStepScreen.tsx:120`,
  `modules/spire/ghost.ts:124,126`, владелец по сканеру «Ядро/Темы», строки призрака проверяют spire_ghost_*) и
  свойство вёрстки `lang={lang} cards={…}` (`app/community_pack_create.tsx:1222`). Решение — за координатором.

## Второй заход (решения координатора 12.11)

- Склонения: исключения в allowlist не добавляются. Сканер `scripts/scan_number_noun_pairs.mjs` не считает словом
  ключ служебного синтаксиса — слово, за которым сразу стоит `=` (`hour=`, `step=`, `ступень=`, `дней=`, JSX-проп
  `cards={…}`). В тест сторожа добавлены случаи: прежние 5 ошибок `home_scene_special_copy.ts` (как были до правки)
  по-прежнему ловятся, служебные строки — нет.
- Маршрут диалога: экран закоммичен в 13804f8ab (D207) — перепрогон и разбор трёх падений.
- Попутные красные: `tests/home_scene_special_more.test.ts` (строка Пика в `app/(tabs)/home.tsx`) и
  `tests/local_switch_on_tone_contract.test.ts` (бегунок GlassSwitch после b70e116c2 «Аврора»).

## Architecture

No architecture change: правки ожиданий тестов и пользовательских строк.

## Security and privacy

Не затрагивается: нет новых данных, прав, сети. Тексты экрана приватности не меняются по смыслу.

## Technical debt

- Contain: три падения маршрута сеанса диалога (`unsent`, `bottom: 'ended'`) вызваны, по всей видимости,
  несохранённой правкой экрана в другой сессии; разбираются после её коммита. Владелец: та сессия.

## Verification

- `npm run test:one -- tests/dialogue_v2_session_route.test.ts -t "loads a verified ID-only"` через светофор;
- `npm run test:one -- tests/number_noun_pairs_guard.test.ts` через светофор.

## Rollback

`git revert` коммитов этой задачи; данные пользователей не затрагиваются.
