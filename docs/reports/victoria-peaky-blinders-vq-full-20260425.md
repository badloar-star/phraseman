# Victoria QA — Peaky Blinders (машинний прогон)

**Дата (UTC):** 2026-04-26T07:23:45.993Z  
**Файл:** `official_peaky_blinders_en.json`  
**Git:** `58be16e`  
**Карток:** 30

## Підсумок машинних гейтів (passSummary)

| Крок | Опис | Статус |
|------|------|--------|
| vq0 | Цілісність JSON + en-US скім (без поширених BrE в en) | **OK** |
| vq2 | Поля `register` / `level` (якщо обов’язкові) | **OK** |
| vq3 | Порожні `example*` лише якщо ключі задані | **OK** |
| vq4 | literal* не дублює explanation* | **OK** |
| vq5 | Транскрипція (IPA) присутня | **OK** |
| vq6 | Високе перетинання usage* vs explanation* | **OK** |
| vq7 | Мета pack + count | **OK** |
| vq8 | Дублікати `en` всередині паку | **OK** |

## Що зроблено автоматично (аналог vq0…vq8)

- **VQ0 / integrity:** дубль id, збіг cardCount, порожні en/ru/uk, пояснення RU/UK, IPA.
- **VQ2 / register-level:** кількість карток без `register` / `level` (у Peaky вони зазвичай відсутні — нормально для phrase pack).
- **VQ3 / examples:** порожні example* лише якщо поле в JSON є.
- **VQ4:** `literal*` === `explanation*` (точний рядок) — погано, якщо >0.
- **VQ5:** відсутня `transcription`.
- **VQ6:** `usageNote*` vs `explanation*` (Jaccard біграм > 0.55) — у Peaky `usageNote*` зазвичай немає.
- **VQ7:** title/description, category, count.
- **VQ8:** дублікат однакового `en` в одному паку.

## LLM-етапи (НЕ запускались з коду)

- **VQ1** — семантика EN ↔ RU ↔ UK: `docs/pipelines/victoria-qa/vq1-semantic-en-ru-uk.md`
- **VQ5 (fine)** — детальний зорів IPA: `docs/pipelines/victoria-qa/vq5-transcription-ipa.md`
- **VQ7 (collection tone)** — цілісність колекції: `docs/pipelines/victoria-qa/vq7-pack-integrity.md`
- **VQ9** — арбітр RU↔UK: `docs/pipelines/victoria-qa/vq9-arbiter-ru-uk.md`

## JSON-звіт

Повний JSON: `docs/reports/victoria-peaky-blinders-vq-full-20260425.json`

---

*Згенеровано `node tools/run_victoria_qa_pack.mjs`*
