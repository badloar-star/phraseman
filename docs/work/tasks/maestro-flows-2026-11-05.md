# Maestro-flow главных путей (план 150, 05.11.2026)

Governance-ID: TG-4C8758067F3B
Governance-ID: TG-A5BA34E73631
Governance-ID: TG-7E394F0FCDD1

## Outcome
Дописать flow главных путей в `e2e/maestro/`: 04 paywall, 05 урок 1 до итога с проверкой монет, 09 фраза дня en/ru, 10 вступление и теория урока 11 (ru), 11 оформление, 12 выход/вход, 13 полноэкранный тур Пика.

## Scope
Только файлы `e2e/maestro/*.yaml` и этот пакет. Код приложения не трогается; testID берутся из кода как есть.

## Architecture
Каждый flow начинается с `_prelude_home_en.yaml` (или `_prelude_home_ru.yaml` для ru), состояния выставляются ссылками `phraseman://dev_state?…` и `phraseman://dev_spire_preview?…`. Повторяющийся проход урока 1 вынесен в `_lesson1_pass_en.yaml`.

## Security and privacy
Учётка Auth-эмулятора в flow не записана: почта и пароль приходят переменными `AUTH_EMAIL`/`AUTH_PASSWORD` из gitignored seed-файла хоста. Только адреса @phraseman.test.

## Technical debt
Для монет +3/+2/+1 и цвета английских слов в теории нет testID — проверки по тексту и снимкам; при появлении testID заменить.

## Verification
Запуск делает исполнитель Maestro на эмуляторе 2 (emulator-5562); синтаксис проверен `maestro` на сухую при возможности.

## Rollback
Удалить добавленные yaml-файлы; приложение не затронуто.
Governance-ID: TG-ED7FB5691909
Governance-ID: TG-99CBEA04214F

## Дополнение 05.11 (вердикты по кадрам)
Файл docs/work/release/MOCKUP_VERDICTS_LV2_2026-11-05.md — сверка кадров эмулятора с одобренными макетами, только чтение кадров, код не трогается.
Governance-ID: TG-2A28E9B878A0
