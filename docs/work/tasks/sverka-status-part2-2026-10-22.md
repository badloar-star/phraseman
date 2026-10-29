# Статус 6 · СВЕРКА, часть 2 (22.10) — продолжение sverka-status-2026-10-22.md

Governance-ID: TG-97D4A685B6E0
Status: Report (без правок кода)
Owner: 6 · СВЕРКА → 0 · КООРДИНАТОР

## Outcome
Причина чёрного экрана и красной ошибки при запуске приложения на эмуляторе (по логам).

## Scope
Только чтение логов и снимки; эмулятор не выключался.

## Architecture
logcat пакета app.phraseman, getprop кучи, кадры в `C:/Temp/claude/png/parity/seasontop/`.

## Security and privacy
Данных не собирается.

## Technical debt
Нет (документ).

## Verification
Строки logcat и кадры `r1_s.png`, `r2_s.png`, `r3_s.png`.

## Rollback
Не применимо.

---

## 39. Причина чёрного экрана после остановки приложения (ответ на запрос координатора)
1. **Куча:** `dalvik.vm.heapgrowthlimit = 384m`, `heapsize = 512m` — НЕ сбросилась. Ошибок памяти (`MultipartStreamReader`, `crashed too many times`, `OutOfMemory`) в этом запуске нет.
2. **logcat пакета (17:26:25):** `BridgelessReact: ReactHost: Destroy: ReactInstance task faulted … {"type":"UnableToResolveError","originModulePath":"…\components\home\v2\scene\home_scene_baked_assets.generated.ts"…}`. Экземпляр React падает на первой загрузке бандла: сервер бандла отвечает кодом 500 «Unable to resolve module ../../../../assets/images/v2scene/tabbar_cap_color_ff.webp», затем `tabbar_cap_white_ff.webp`. При Reload это красный экран, на холодном старте — чёрный экран без красной плашки (JS не стартовал, строк `ReactNativeJS` нет).
3. **Хвост журнала сборщика** (`.expo/metro-console.log`): не прочитала. Поиск файла в проекте превысил лимит времени, а команды оболочки со словом про сборщик блокирует светофор. Процент сборки не снят; нужен слот светофора или чтение журнала координатором.
4. **Вывод:** причина не память и не ANR, а ошибка определения ассетов сервером бандла: файлы есть на диске и в git (`8d4454aaa`, 16:47), но dev-сервер их не видит (индекс устарел; `touch` не помог). Нужен перезапуск dev-сервера бандла с очисткой кэша под слотом светофора.
