# VICTORIA — QA по бандлам: отдельные промпты

Монолитный список разбит **по одному агенту на файл**.

- **Новий тип (маркетплейс phrase, `official_*.json`):** [victoria-qa/MARKETPLACE_PHRASE_PIPELINE.md](./victoria-qa/MARKETPLACE_PHRASE_PIPELINE.md) — машинні **MP0–MP8**, LLM **LP1–LP5** (корелюють з vq* нижче).
- **Повна таблиця VQ (історично / паки з example+usage):** [victoria-qa/README.md](./victoria-qa/README.md)
- **Промпты (копипаста в агента):**
  - [VQ1 — EN ↔ RU ↔ UK](./victoria-qa/vq1-semantic-en-ru-uk.md)
  - [VQ2 — register, level, EN](./victoria-qa/vq2-register-level-en.md)
  - [VQ3 — example Ru/Uk](./victoria-qa/vq3-example-ru-uk.md)
  - [VQ4 — literal + explanation](./victoria-qa/vq4-literal-explanation.md)
  - [VQ5 — transcription IPA](./victoria-qa/vq5-transcription-ipa.md)
  - [VQ6 — usage note](./victoria-qa/vq6-usage-note.md)
  - [VQ7 — целостность pack](./victoria-qa/vq7-pack-integrity.md)
  - [VQ8 — дубли en между паками](./victoria-qa/vq8-cross-pack-duplicates.md)
  - [VQ9 — арбитр RU↔UK](./victoria-qa/vq9-arbiter-ru-uk.md)

Машинный аудит: `npm run audit:victoria-packs` · тип полей: `app/flashcards/bundles/victoriaBundleShared.ts`

*Версия указателя: 2 (разнесённые файлы).*
