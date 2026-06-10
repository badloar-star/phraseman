# Генератор каталога «Сокровищницы» (коллекционные карточки)

Конвейер производства 300 карточек-фраз + 30 секретных (30 сетов × 10+1).
Источник истины — `catalog_seed.json`. Концепция и решения: `docs/reports/COLLECTIBLES_RESEARCH_2026-06-10.md`,
макеты: `docs/reports/COLLECTIBLES_CARDS_MOCKUP_2026-06-10.html`, стиль: `STYLE_GUIDE.md`.

## Команды

```bash
node tools/collectibles/generate.mjs validate            # G1/G2: схема, уникальность, редкости, лимиты, арт-файлы
node tools/collectibles/generate.mjs lint                # G3: стилевые эвристики (канцелярит, штампы)
node tools/collectibles/generate.mjs merge set03_weather # G5: применить batches/<setId>.texts.json (атомарно)
node tools/collectibles/generate.mjs ingest-art set03_weather # G4: принять batches/art/<setId>/*.svg → art/
node tools/collectibles/generate.mjs selftest            # гейт гейтов: 15 негативных тестов G1-G5
node tools/collectibles/generate.mjs stats               # прогресс по сетам (тексты/арт/секретка)
node tools/collectibles/generate.mjs build               # сборка (только при нуле ошибок validate+lint)
node tools/collectibles/generate.mjs placeholders        # SVG-плейсхолдеры для карточек без арта
node tools/collectibles/generate.mjs prompts set03_weather # промпты для агентов writer/illustrator
```

## Конвейер одного сета (агентами — см. AGENTS.md)

1. `prompts <setId>` → запустить агентов **writer** (пишет `batches/<setId>.texts.json`) и **illustrator** (пишет `batches/art/<setId>/*.svg`) параллельно;
2. `merge <setId>` → гейты G1/G2/G3/G5 (отказ = каталог не тронут, правишь батч и повторяешь);
3. `ingest-art <setId>` → гейт G4, арты ложатся в `art/<setId>/`;
4. **reviewer**-агент (G6): факты в историях, естественность примеров, сцены артов; FIX → точечные правки;
5. commit сета; `build` → каталог готов к интеграции; локализация и TTS — отдельными проходами (STYLE_GUIDE §4–5).

Агенты пишут ТОЛЬКО в `batches/` — параллельные агенты и параллельные сессии не конфликтуют (подробно: `AGENTS.md`).

## Статусы карточки

`seed` (только en+ru+rarity) → `texts_done` (все тексты) → `art_done` (есть иллюстрация) → `ready` (ревью пройдено).

## Что уже готово

- Все 330 фраз выбраны и разложены по сетам/редкостям (валидация зелёная: 150/90/45/15).
- Сеты 1–2 («Животные», «Еда») — полные тексты-эталоны; у «Животных» есть и арт (10 SVG в макете).
- 290 уникальных SVG-плейсхолдеров сгенерированы (build/art_placeholders/).
