# Task packet: общий GlassSwitch (волна UX 2)

Governance-ID: TG-52FB86BE2A77
Status: In progress
Owner: сессия «Темы»
Related epic/enabler: none

## Outcome

Один переключатель `components/settings/GlassSwitch.tsx` вместо самодельных дорожек. Пользователь получает лёгкий хаптик на тап (тумблер — управляющий элемент), плавный бегунок и смену цвета дорожки на UI-потоке (180 мс); при «Уменьшить движение» — мгновенно. Успех: два экрана (settings_notifications, privacy_settings) переведены, кадры Сверки совпадают по виду.

## Scope

In scope: components/settings/GlassSwitch.tsx (новый), app/settings_notifications.tsx (LocalSwitch → GlassSwitch), app/privacy_settings.tsx (свой переключатель → GlassSwitch), tests/glass_switch_contract.test.ts (новый).

Out of scope: settings, friends_week_mine, support_report, GuestSwitchWarningSheet, CustomSwitch — отдельными коммитами после кадров Сверки; CleanOnboarding (исключение онбординга); DevHubSheet (dev).

## Architecture

Граница: PressableHybrid (variant chip, hitSlop до 44+), hapticTap на управляющем элементе, useReduceMotion, Reanimated: translateX бегунка и кроссфейд двух дорожек. Без setState в кадрах, без новых зависимостей, цвета — токены темы через switchOnTone / switchOffTrackTone.

## Security and privacy

Не применимо: данные не собираются и не передаются, аутентификация и персональные данные не затрагиваются, политика не меняется.

## Technical debt

- SettingsGlassSwitch и CustomSwitch остаются до переноса на GlassSwitch: Contain — владелец «Темы», выход — перенос в следующих коммитах волны 2.
- CleanOnboarding — Accept temporarily: исключение онбординга, владелец Вход, обзор при следующем проходе онбординга.

## Verification

- tests/glass_switch_contract.test.ts: есть хаптик на onPress, useReduceMotion, нет useState в кадрах, два экрана импортируют GlassSwitch.
- Тесты связанных настроек (settings, privacy, notifications) зелёные.
- Проверка типов по затронутым файлам.
- Кадры Сверки: тёмная и светлая тема, переключатель выключен и включён, до/после.

## Rollback

git revert коммита; экраны вернутся к своим переключателям.
