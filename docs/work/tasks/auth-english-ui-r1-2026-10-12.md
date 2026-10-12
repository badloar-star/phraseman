# Task packet: английский интерфейс в R1 (п.76 владельца) — зона Авторизации

Governance-ID: TG-16533143F891
Status: In progress
Owner: сессия «5 · АВТОРИЗАЦИЯ» (координатор 12.10)
Related epic/enabler: scripts/scan_untranslated_ui.mjs, config/untranslated-ui-baseline.json, constants/i18n.ts (ENGLISH_UI_LOCALE_ENABLED)

## Outcome

1. Сканер непереведённого интерфейса: NicknameEditModal (8), manage_subscription (6), settings (2) → 0. Настоящие пропуски en: 3 тоста подписки и 1 тост Настроек без `messageEn`, подпись Dev Hub — исправлены. Ложные срабатывания: строки `traceNick(...)` (журнал под __DEV__) и тосты `messageRu`, у которых в том же объекте есть `messageEn` — сканер учится их распознавать (как уже распознаёт `ru: …, en: …`). База — только вниз.
2. English в выборе языка интерфейса (онбординг и Настройки): при включённом флаге он есть в списке и применяется мгновенно, без перезапуска — проверка кодом и тестом; вид онбординга не меняется.
3. Вход, аккаунт, удаление, ошибки входа — есть en везде (аудит словарей).

Коммит на пункт.

## Scope

In scope: `app/manage_subscription.tsx`, `app/(tabs)/settings.tsx` (тост, подпись Dev Hub), `scripts/scan_untranslated_ui.mjs` (traceNick в список журналов; правило тоста ru+en), `config/untranslated-ui-baseline.json` (вниз), тесты; аудит en в файлах входа/аккаунта.
Out of scope: включение `ENGLISH_UI_LOCALE_ENABLED` для стора (решение владельца/координатора), вид онбординга, чужие экраны.

## Architecture

No architecture change: дописываются переводы и правило распознавания в сканере.

## Security and privacy

Нет данных.

## Technical debt

Pay now: недостающие en-тексты. Contain: правило сканера «messageRu + messageEn в одном объекте» — узкое, с проверкой наличия `messageEn` в пределах объекта; новый тост без en по-прежнему ловится.

## Verification

`node scripts/scan_untranslated_ui.mjs --report`; тест сторожа сканера (если есть); тесты Настроек/подписки; тест выбора языка (LangContext/настройки языка).

## Rollback

Откат коммитов по пункту.
