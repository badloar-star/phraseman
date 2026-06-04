# Lingman Scenarist Pipeline

Локальный пайплайн для сценариев Professor Lingman / Фрейзмен.

## Что внутри

- `LINGMAN_MASTER_PROMPT.md` - главный промпт и правила сценарного алгоритма.
- `LINGMAN_AGENT_OFFICE_PIPELINE.md` - расширенный пайплайн агентного офиса.
- `LINGMAN_ALGORITHM_UPGRADE_*.md` - история правок алгоритма.
- `LINGMAN_APP_ALIGNED_SERIES_PLAN_003_32_LESSONS.md` - план 32 уроков по порядку Фрейзмена.
- `LINGMAN_LESSON_*` - готовые пакеты, сценарии и DOCX.
- `build_*.py` - локальные сборщики DOCX.

## Что не входит

Папка `ФОНЫ БЕКИ/` исключена из этого репозитория, потому что это отдельный проект.

## Перенос на другой ПК через bundle

На этом компьютере:

```bash
git bundle create lingman-scenarist-pipeline.bundle --all
```

На другом компьютере:

```bash
git clone lingman-scenarist-pipeline.bundle СЦЕНАРИСТ
cd СЦЕНАРИСТ
```

Если нужно потом подключить GitHub:

```bash
git remote add origin <URL_ТВОЕГО_РЕПОЗИТОРИЯ>
git push -u origin main
```

## Быстрая проверка

```bash
git status
git log --oneline -5
```

## CapCut Wednesday Assembler

- `capcut_wednesday_assembler/` - reference capture and editable native CapCut
  clone builder for the `WEDNESDAY( c подписей1)` timeline.
- The captured reference profile keeps the timeline map, text styles, audio
  layout, effects, animation refs, and background-track detection.
- The builder creates a new CapCut project with the same editable structure while
  leaving detected direct background tracks empty for manual background insert.

### Wednesday Word Contract

- `capcut_wednesday_assembler/WEDNESDAY_PIPELINE_CONTRACT.md` is the source of
  truth for Wednesday word projects.
- It overrides older notes and failed draft variants.
- Final audio must be one `ru_then_en` MP3 per word: Russian first, English
  delayed to the English text/IPA timing.
- Validate every delivered Wednesday word draft with
  `capcut_wednesday_assembler/validate_wednesday_contract.py`.
