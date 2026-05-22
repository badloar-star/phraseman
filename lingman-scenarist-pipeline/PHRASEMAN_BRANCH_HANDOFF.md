# Phraseman Branch Handoff

Этот сценарный пайплайн лежит в отдельной ветке репозитория `phraseman`.

## Ветка

```bash
lingman-scenarist-pipeline
```

## Как забрать на другом ПК

```bash
git clone git@github.com:badloar-star/phraseman.git
cd phraseman
git checkout lingman-scenarist-pipeline
```

Пайплайн будет здесь:

```bash
lingman-scenarist-pipeline/
```

## Что внутри

- `LINGMAN_MASTER_PROMPT.md` - главный сценарный промпт.
- `LINGMAN_AGENT_OFFICE_PIPELINE.md` - полный агентный пайплайн.
- `LINGMAN_ALGORITHM_UPGRADE_*.md` - история правок алгоритма.
- `LINGMAN_APP_ALIGNED_SERIES_PLAN_003_32_LESSONS.md` - план 32 уроков по Фрейзмену.
- `LINGMAN_LESSON_*` - готовые сценарии, пакеты и DOCX.
- `build_*.py` - локальные сборщики DOCX.

## Важно

Эта ветка нужна для переноса и хранения сценарного пайплайна.
Код приложения Фрейзмен в этой ветке не менялся.
