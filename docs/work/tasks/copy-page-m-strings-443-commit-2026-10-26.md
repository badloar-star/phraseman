# Task packet — «было → стало»: строки окон М по 443cb81d0 + коммит страниц М

Governance-ID: TG-1481DAD007AA

## Outcome
Страница docs/design/v2-app/copy-before-after.html показывает строки окон М по последней версии Переводчика (443cb81d0), колонка статуса учитывает коммиты волны текстов 25.10 (e086f2110, 443cb81d0, 1a853b34c, 7c816c8d1, cfbef82ca, ec8389176, f7935cd1d). Страницы paywall-variant-m.html и paywall-m-context.html со строками 443cb81d0 закоммичены.

## Scope
Только три HTML-макета в docs/design/v2-app: copy-before-after.html, paywall-variant-m.html, paywall-m-context.html. Код приложения, реестр сверки и чужие правки (plus-ring-etalon.html, assets/plus-crown.webp) не трогаются.

## Architecture
Страницы собираются скриптами из C:/Temp/claude/mb/spire3 (build_copy_page.cjs, build_pwm_page.cjs, build_pwmc_page.cjs) на настоящих снимках эмулятора; статус — по git grep в app/components/modules/functions/constants.

## Security and privacy
Макеты без личных данных; снимки — тестовый аккаунт эмулятора. Новых сервисов и сбора данных нет.

## Technical debt
Строка-переход hardMode (7c816c8d1) — новый элемент, а не замена текста, поэтому живёт на своей странице hardmode-switch-line.html; в «было → стало» строки нет. e086f2110 и 1a853b34c меняют только переводы (ru прежний) — на ru-странице отметки не дают.

## Verification
Сборка exit=0 (582 КБ); сводка «в приложении» 65 → 67, «частично» 5, «ждёт перевода» 49, «без изменений» 18 → 17; новые строки «Ты в ударе, а энергия — всё», «Пропуск Plus прикроет» на странице, «без шпаргалки» нет. numstat: 6/6, 1/1, 1/1.

## Rollback
git revert коммита; артефакт MjivcsJs7k7K5mQ5sHG86k перепубликовать из предыдущей версии.
