# Victoria — marketplace phrase (marketplace_phrase_v1)

**UTC:** 2026-04-26T07:30:00.534Z  
**Файл:** `official_peaky_blinders_en.json`  
**pack.id:** `official_peaky_blinders_en`  
**Git:** `58be16e`  
**Карток:** 30

Пайплайн: [MARKETPLACE_PHRASE_PIPELINE.md](../pipelines/victoria-qa/MARKETPLACE_PHRASE_PIPELINE.md)

## Машинні кроки (MP)

| ID | Що перевіряє | Статус |
|----|----------------|--------|
| MP0 | Унікальні id, count, en/ru/uk, literal*, explanation*, transcription | **OK** |
| MP1 | en-US скім (en + expansionEn + abbrev; без поширеного BrE) | **OK** |
| MP2 | literal* ≠ main ru/uk | **FAIL** |
| MP3 | Довжина explanation*; literal* ≠ explanation* | **OK** |
| MP4 | transcription (IPA, `/…/`) | **OK** |
| MP5 | Баланс довжин RU/UK пояснень | **OK** |
| MP6 | Мета pack | **OK** |
| MP7 | Дублікати `en` | **OK** |
| MP8 | abbrev → `expansionEn` | **OK** |
| (opt) | register/level, example*, usage* якщо задані | — |

**Усі обов’язкові MP:** **FAIL**

## LLM (не з коду)

LP1…LP5 — див. `docs/pipelines/victoria-qa/MARKETPLACE_PHRASE_PIPELINE.md`

## JSON

`C:/appsprojects/phraseman/docs/reports/victoria-marketplace-phrase-official-peaky-blinders-en-20260426.json`  
*Markdown:* `C:/appsprojects/phraseman/docs/reports/victoria-marketplace-phrase-official-peaky-blinders-en-20260426.md`

*Згенеровано `victoria_marketplace_phrase_qa.mjs`*
