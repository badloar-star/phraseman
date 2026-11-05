# Task packet: заставка «Монета» должна быть видна на запуске (слово владельца ~20:45)

Governance-ID: TG-08967C95879D
Governance-ID: TG-AB1AD5B14EA3
Governance-ID: TG-867B57F53A9E
Status: Planned
Owner: 2 · ДИЗАЙН
Related epic/enabler: components/startup/SplashCoin.tsx, app.json splash, app/_layout.tsx

## Outcome

При холодном запуске видна анимированная заставка: монета катится, переворачивается, раскрывается знак, появляется «Phraseman» — с первого кадра JS, без старой статичной картинки. Мерило — запись экрана холодного запуска, где кадры различаются, плюс журнал [SPLASH-COIN] start/end с временем от запуска процесса.

## Scope

In scope: диагностика логами (нативная заставка из app.json против JS-заставки), app.json/плагин splash, components/startup/SplashCoin.tsx, участок app/_layout.tsx со снятием заставки; сборка dev-клиента на эмулятор только если без неё причину не установить.

Out of scope: релизные сборки, публикация, чужие незакоммиченные файлы.

## Architecture

No architecture change: уточняется момент снятия нативной заставки и монтирования JS-заставки; контракт «JS-заставка рисует финальный кадр с первого пикселя, анимация на нативном драйвере» сохраняется.

## Security and privacy

Данные не собираются, разрешений нет.

## Technical debt

Contain: журнал [SPLASH-COIN] остаётся (ранние выходы и catch пишут причину).

## Verification

Запись экрана 3 холодных запусков; кадры различаются; журнал start/end; тест splash_coin_2026_11_05.

## Rollback

Откатить коммит; нативная часть возвращается пересборкой.
