# Task packet: сплеш — ранний путь HOME-PAINT не скрывает повторно, если сплеш уже снял прежний гейт

Governance-ID: TG-B39AA99A05B8
Status: In progress (координатор 05.10, пакет 11:54: «второе hideAsync — разбери по логам»)
Owner: сессия 1 · ЯДРО

## Outcome

Разбор пакета C:\Temp\claude\coldstart_pack_1154.txt:
- прогон 2 (+13396) двойного скрытия НЕ было: строка — «hideAsync() пропущен — сплеш уже снят по кадру Главной»,
  то есть защита 36230288c сработала;
- прогон 1 — обратный порядок, который 36230288c не закрыл: прежний гейт nativeSplashCanHide снял сплеш на +6863,
  а ранний путь HOME-PAINT через 73 мс (+6936) снял его ещё раз и пометил «сплеш скрыт по кадру Главной».
Фикс: гейт запоминает, что уже снял сплеш (nativeSplashHiddenBy = 'gate'); ранний путь видит это и выходит с
логом «HOME-PAINT early hide: skip {reason: 'gate_already_hid'}». Повторного нативного вызова нет, и в цифрах
пакета виден настоящий источник снятия.

## Scope

app/_layout.tsx — модульная переменная + одна ветка в раннем пути + присвоение в гейте.

## Architecture

Не меняется: два пути снятия, кто первый — тот и снимает, второй пишет в лог, почему пропустил.

## Security and privacy

Не затрагивает.

## Technical debt

homeScreenReady/firstContentReady FALLBACK в обоих прогонах — отдельный пункт (события Главной приходят позже
потолков); этот пакет его не трогает.

## Verification

Синтаксис; сторожа корня (root_layout_startup_navigation_contract, bootstrap_locale_contract); узкая проверка типов
_layout; следующий пакет координатора — «early hide: skip gate_already_hid» вместо второго «сплеш скрыт».

## Rollback

git revert коммита.
