# VICTORIA — QA-промпты по одному агенту

**Картки маркету (новий формат, `marketplace_phrase_v1`):**  
- Пайплайн MP0–MP8 + LP1–LP5: [MARKETPLACE_PHRASE_PIPELINE.md](./MARKETPLACE_PHRASE_PIPELINE.md)  
- Машинний прогон: `npm run vq:marketplace` (або `node tools/victoria_marketplace_phrase_qa.mjs [шлях/до/official_*.json]`)  
- Звіт: `docs/reports/victoria-marketplace-phrase-<packId-slug>-<YYYYMMDD>.json` + `.md`

**Зворотна сумісність:** `npm run vq:peaky` = стара обгортка, викликає той самий движок, що `vq:marketplace`.

Контент паку (приклад): `app/flashcards/bundles/official_peaky_blinders_en.json`. Інші `official_*.json` — той самий прогон.

**Таблиця нижче (VQ0…VQ9)** — повна схема для паків із **example** / **usage** / **register**; для phrase-only паку багато кроків N/A, див. MARKETPLACE_PHRASE_PIPELINE.

Таблиця нижче — ручні / LLM кроки за промптами.

| Шаг | Файл | Тема |
|-----|------|------|
| 0 | `tools/victoria_marketplace_phrase_qa.mjs` | Машинна цілісність + MP* для `marketplace_phrase_v1` (див. MARKETPLACE_PHRASE_PIPELINE) |
| 1 | [vq1-semantic-en-ru-uk.md](./vq1-semantic-en-ru-uk.md) | Семантика EN ↔ RU ↔ UK |
| 2 | [vq2-register-level-en.md](./vq2-register-level-en.md) | Регистр, level, `en` / `exampleEn` |
| 3 | [vq3-example-ru-uk.md](./vq3-example-ru-uk.md) | `exampleRu` / `exampleUk` vs `exampleEn` |
| 4 | [vq4-literal-explanation.md](./vq4-literal-explanation.md) | `literal*` + `explanation*` |
| 5 | [vq5-transcription-ipa.md](./vq5-transcription-ipa.md) | `transcription` (en-US) |
| 6 | [vq6-usage-note.md](./vq6-usage-note.md) | `usageNoteRu` / `usageNoteUk` |
| 7 | [vq7-pack-integrity.md](./vq7-pack-integrity.md) | Мета `pack` + тон коллекции |
| 8 | [vq8-cross-pack-duplicates.md](./vq8-cross-pack-duplicates.md) | Дубли `en` между паками (отчёт) |
| 9 | [vq9-arbiter-ru-uk.md](./vq9-arbiter-ru-uk.md) | Арбитр RU↔UK (после VQ1) |

**Порядок:** VQ1 → VQ2 → VQ3 → (по необходимости VQ4–VQ6) → VQ7 на пак → VQ8 по всем пакетам → VQ9 после влива VQ1.

**Трекер:** `agent` (VQ1…VQ9), модель, дата, `summary` из JSON, хэш бандла.

**Связь:** [../victoria-pack-qa-agent-prompts.md](../victoria-pack-qa-agent-prompts.md) (указатель) · `victoriaBundleShared.ts` — поля JSON.

*Индекс: версия 2.*
