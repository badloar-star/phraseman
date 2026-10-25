# Task packet: вычитка строк «Мастерской фраз» (aa2bbfc3e, 2dbf1ed8a) — 9 языков (Переводчик, координатор 25.10)

Governance-ID: TG-73B734B9DC73
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Все видимые строки режима — в `components/learning-v2/workshop/phrase_workshop_copy.ts` (название в кнопке и шапке,
тост «копится»); экран урока и итог берут название оттуда. Вычитано на 9 языков, правки:
- tr название «Cümle atölyesi» → «İfade atölyesi» — «фраза» во всём приложении = «ifade» («Günün ifadesi»);
- pl тост «Otworzy się za chwilę» → «Otworzy się nieco później» — «чуть позже», а не «через мгновение», как в ru/es/pt;
- uk «Майстерня фраз» → «Майстерня висловів»: в украинском интерфейсе «фраза» = «вислів» (слово владельца 12.10, 41443be48);
  тем же коммитом uk в сценах Главной (home_scene_special_copy.ts): «цей вислів», «вислів/вислови/висловів», «І кожен уже твій», «нові вислови»;
- пометка «ждут утверждения Переводчика» снята — тексты утверждены.
Ширина: самое длинное название — pt-BR «Oficina de frases» (17 знаков), в кнопку 300 dp 16/700 влезает с запасом.
Подписи шторки теории (Смысл/Схема/Ловушка/Закрыть) — только ru/uk, на остальных языках кнопки нет — верно.

## Scope

In scope: тексты одного файла. Out of scope: логика режима, флаг, Plus-гейт.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Файл ведёт 2 · ДИЗАЙН; при их незакоммиченных правках — только свои хунки через `--patch`.

## Verification

Разбор файла babel; `tests/phrase_workshop_model_adapter_2026_10_25.test.ts` не читает тексты; `scan_untranslated_ui`.

## Rollback

`git revert <коммит>`.
