# «Назад» (BACK-GLOBAL): путь читать в момент нажатия — правка для `app/_layout.tsx` (файл Codex)

Governance-ID: TG-A717295ABF7D

## Что было (находка Learning V2 + Сверка, 29.10)
Главная → «Уроки» → «Старый курс» → урок 1 → «Назад» → «Назад». Вторая «Назад» со списка ничего не делала. Корневой обработчик `hardwareBackPress` в `app/_layout.tsx` (~1795) берёт `currentPath = navigationPathSignature ?? pathname` из замыкания: путь там устаревший (`/lesson_menu?id=1`), запасной маршрут из него — `/(tabs)/lessons`, и `dismissTo('/(tabs)/lessons')` вёл на экран, на котором человек уже стоит — no-op.

## Что уже сделано без `_layout.tsx` (закоммичено в `app/navigation_back.ts`)
`safeRouterBack` теперь сам замечает, что цель «назад» совпала с текущим экраном (трекер считает текущим то же самое, либо предыдущее «назад» уже привело сюда, а нового экрана трекер не видел), и идёт на запасной путь раздела (с корня «Уроков» — на Главную). В журнале `[NAV-BACK] self_target` с причиной и значениями. Этого достаточно, чтобы вторая «Назад» не была no-op.

## Что остаётся Codex (одна строка, по желанию — делает путь в журнале честным)
В обработчике `BackHandler.addEventListener('hardwareBackPress', …)` вместо
```ts
const currentPath = navigationPathSignature ?? pathname;
```
читать путь трекера в момент нажатия:
```ts
const currentPath = currentNavigationHref() ?? navigationPathSignature ?? pathname;
```
и добавить `currentNavigationHref` в импорт из `./navigation_back` (функция экспортирована). Тогда `[BACK-GLOBAL] press` и запасной маршрут считаются от живого экрана, а не от замыкания.

Проверка после вставки: `npm run test:one -- tests/navigation_back_self_target_2026_10_29.test.ts tests/navigation_back.test.ts` и полная проверка типов.
