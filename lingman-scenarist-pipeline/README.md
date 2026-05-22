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
