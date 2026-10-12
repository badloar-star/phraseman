# Включение английского интерфейса (п.76) — заготовка, НЕ наложена

Решение владельца 12.10: английский интерфейс входит в R1. Флаг `ENGLISH_UI_LOCALE_ENABLED` в `app/config.ts` остаётся `false`,
пока Сверка не пройдёт экраны R1 на английском (съёмка в dev без флага: `dev_state?uiLang=en`, 8bae34fd7).

## Что делает заплатка
`enable_english_ui.patch` — одна строка `false → true` и комментарий с причиной. Больше ничего: выбор English в Настройках,
английский по языку устройства при первом запуске и мгновенная смена уже готовы и стерегутся `tests/english_ui_switch_r1.test.ts`.

## Перед наложением (все зелёные)
1. `tests/english_ui_enable_preflight.test.ts` — словарей без `en` РОВНО 0, прямых чтений `DICT[lang]` без защиты — 0, `en`
   проходит как язык интерфейса при включённом флаге (защита от падения 27.08, когда словари без `en` отдавали undefined).
2. `tests/english_ui_switch_r1.test.ts`, `tests/i18n_missing_en_fallback.test.ts`, `tests/auth_surfaces_english_contract.test.ts`.
3. `npm run i18n:check` (сканер непереведённого не выше базы), `npm run i18n:en-check`, `npm run i18n:en-index-check`.
4. Зелёный проход Сверки по экранам R1 на английском — решение координатора.

## Наложить (только после пункта 4)
```bash
git apply docs/phraseman-2.0/handoff/enable_english_ui.patch
```
Затем прогнать пункт 1–2 ещё раз и закоммитить `app/config.ts` отдельным коммитом. Откат — `git revert` этого коммита.

## Известное после включения
- Экраны Learning V2 — зона Codex (строка в `CODEX_V2_ZERO_LESSONS_2026-10-12.md`, «Просьбы»).
- Словарь без `en` в `triLang` отдаёт испанский и пишет `[I18N-FALLBACK]` — по журналу видно, что ещё не переведено.
