# Генератор каталога «Сокровищницы» (коллекционные карточки)

Конвейер производства 300 карточек-фраз + 30 секретных (30 сетов × 10+1).
Источник истины — `catalog_seed.json`. Концепция и решения: `docs/reports/COLLECTIBLES_RESEARCH_2026-06-10.md`,
макеты: `docs/reports/COLLECTIBLES_CARDS_MOCKUP_2026-06-10.html`, стиль: `STYLE_GUIDE.md`.

## Команды

```bash
node tools/collectibles/generate.mjs validate        # схема, уникальность, распределение редкостей, лимиты текстов
node tools/collectibles/generate.mjs stats           # прогресс по сетам (тексты/арт/секретка)
node tools/collectibles/generate.mjs build           # build/collectibles_catalog.json + progress.md (только если валидно)
node tools/collectibles/generate.mjs placeholders    # уникальные SVG-плейсхолдеры для карточек без арта
node tools/collectibles/generate.mjs prompts set03_weather   # готовые LLM-промпты: тексты + SVG-арты сета
```

## Конвейер одного сета (батч ~1 час работы с LLM)

1. `prompts <setId>` → скопировать ПРОМПТ 1 (тексты) в Claude → получить JSON 11 объектов;
2. вставить поля в `catalog_seed.json` (статусы карточек → `texts_done`), запустить `validate`;
3. скопировать ПРОМПТ 2 (SVG) → получить 10 иллюстраций → сложить в ассеты, проставить `art` + статус `art_done`;
4. ревью человеком по чек-листу STYLE_GUIDE (особенно `originRu` — факты!);
5. `build` → каталог готов к интеграции; локализация и TTS — отдельными проходами (см. STYLE_GUIDE §4–5).

## Статусы карточки

`seed` (только en+ru+rarity) → `texts_done` (все тексты) → `art_done` (есть иллюстрация) → `ready` (ревью пройдено).

## Что уже готово

- Все 330 фраз выбраны и разложены по сетам/редкостям (валидация зелёная: 150/90/45/15).
- Сеты 1–2 («Животные», «Еда») — полные тексты-эталоны; у «Животных» есть и арт (10 SVG в макете).
- 290 уникальных SVG-плейсхолдеров сгенерированы (build/art_placeholders/).
