# Контрольный независимый аудит курсов (05.11.2026)

Что: выборка по 400 фраз на язык (en, es, fr, de, it), случайная с фиксированным seed 20261105, расслоена по урокам (12–13 на урок),
без фраз, которые уже правились или попадали в прежние аудиты. Цель владельца: ≤1% фраз с ошибкой в каждом языке (≤4 из 400).

Файлы: `make_sample.mjs` (скрипт), `MANIFEST.json` (seed, коммит, сколько фраз исключено по языкам и откуда, id выборки),
`chunk_<lang>_<NN>.json` (NN 00..03, по 100 записей, формат как у full2), `INSTRUCTIONS.md` (для аудитора).
Аудитор пишет `results_<lang>_<NN>.json` в эту же папку.

Исключается («тронутые», нормализация id к lang:LL.PP): все id из results_*.json во всех docs/work/classic_audit_*, ключи
scripts/classic_audit_layer.json, scripts/classic_distractor_patches.json, docs/work/classic_translation_fixes_*.json.

Перезапуск ПОСЛЕ применения правок: `node docs/work/classic_audit_control_2026_11_05/make_sample.mjs` — те же seed и правила, тронутые
вырастут (новые правки), выборка пересчитается без них и возьмёт данные текущих файлов курса. Чтобы зафиксировать именно эту выборку
(и подтянуть актуальный текст этих же фраз), запускай: `... --keep=docs/work/classic_audit_control_2026_11_05/MANIFEST.json`.
Опции: `--seed=`, `--per-lang=`, `--out=`.

## Расширение: словарь, тексты разделов (intro), теории (15%)
`make_sample_text.mjs` — тот же seed-метод. По данным курса (по умолчанию): 15% лемм glossary.json, 15% экранов intro.json, 15% уроков theory.json на язык
(en: 117 лемм / 14 экранов / 5 теорий; es 52/14/5; fr, de, it по 30/14/5) → `text/chunk_<glossary|intro|theory>_<lang>_<NN>.json`
(по 100 / 20 / 5 записей), `text/MANIFEST_TEXT.json`. Для чанков full3 от Теории: `--full3=<папка с chunk_<lang>_NN.json> --kind=glossary|intro|theory`
берёт 15% записей каждого языка. Формат результата аудитора — как в INSTRUCTIONS.md (id, type, field, problem, fix).
