# Task packet: онбординг у вошедшего пользователя на втором холодном старте (Сверка coldstart_1315_r2, координатор — приоритет №1)

Governance-ID: TG-2EC38B4B985A
Status: Шаг 1 — логи [ONB-SHOW]; диагноз после прогона Сверки под №2
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Вошедший №2, второй холодный старт 13:40: Главная нарисована на +15 с, на +37 с `effectiveShowOnboarding:true`, снимок 70 с — логотип
(заглушка, пока грузится модуль онбординга). Журнал был отфильтрован — причины нет. Сперва логи: каждая смена флага онбординга
печатает `[ONB-SHOW] effective= show= devRoute= path= reason=`; причину пишет каждый setShow (boot onboarding_done=…, account_deleted,
onboarding_done, dev_onboarding_restart, dev_onboarding_done, onboarding_paywall_completed). Гипотеза для проверки: флаг онбординга
стоял с загрузки, а скрывал его dev-маршрут (`effective = show && !devRoute`) — ушли с dev-маршрута, онбординг проявился.

## Scope

`app/_layout.tsx`: ref причины + эффект-лог + строка причины у каждого setShow (+12 строк). Поведение не меняется.

## Security and privacy

В лог — флаги, путь без параметров, причина; без uid/email.

## Verification

Тесты, читающие app/_layout.tsx (80 файлов); разбор babel.

## Rollback

`git revert`.
