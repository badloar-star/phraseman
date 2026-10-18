# Task packet: мелкие правки Ядра 18.10 — контраст статистики, «не понимаю» на it и в свободном разговоре, catch синхронизации Пика

Governance-ID: TG-1BF555931CBA
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: поручения координатора 18.10 (после 26e633d39/b61e4b714). Ревизор c2a45e78d — исключение spireSyncRoom без catch.

## Outcome

1. app/streak_stats.tsx — спокойная подпись «Обновим, как появится связь» без бледного textSecond на светлой карточке (сторож accent_text_on_light_card_contract).
2. «Извини, не понимаю» — 12 вариантов и на итальянском (it открыт, D188).
3. Та же проверка реплики на чужом языке в свободном разговоре Диалогов.
4. use_spire_game: отказ spireSyncRoom пишет причину `[PIK-LOAD] sync_failed code=… ms=…` и не остаётся необработанным.

## Scope

В работе:
- app/streak_stats.tsx;
- app/dialogue_v2_off_language.ts;
- app/dialogue_v2_freeform.tsx;
- app/spire/use_spire_game.ts;
- тесты.

Вне работы: серверные функции.

## Architecture

Архитектура не меняется. Хук Пика остаётся ≤400 строк и без setTimeout (сторожа хука).

## Security and privacy

Не затрагивает: реплика на чужом языке, как и в сессии, не уходит на сервер.

## Technical debt

Нет.

## Verification

Через слот:
- accent_text_on_light_card_contract, load_gate_config_d154;
- dialogue_v2_off_language;
- тесты свободного разговора;
- сторожа хука Пика.

## Rollback

Ревертнуть коммит.
