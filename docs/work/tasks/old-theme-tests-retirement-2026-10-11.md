# Старые сторожа системы тем (до Liquid Glass 2.0): обновить под текущие темы или убрать с пояснением

Governance-ID: TG-34774552BF32
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0» (передано Ядром через координатора 00:40)
Related epic/enabler: красные сторожа `theme_*`, `olive_*`, `sage_*`, `onboarding_graphite_*`

## Outcome

Красные тесты старой системы тем не создают ложного шума в общих прогонах: каждый красный тест либо обновлён под текущие темы (`liquidGlassThemeVariants`, токены), либо удалён с пояснением, если проверяет несуществующее (старые режимы Olive/Indigo/Sage Porcelain, Plus-замки тем, покупки тем за жемчуг, литералы `themeMode === 'olive'`). Зелёные тесты не трогаются.

## Scope

In scope: файлы `tests/{theme_,olive_,sage_,onboarding_graphite_}*` — только красные тесты внутри них.
Out of scope: код приложения; тесты, зелёные сейчас; чужие сторожа.

## Architecture

Правила решения по каждому красному тесту:
1. Предмет жив (функция/модуль есть и используется) → обновить ожидание под текущее поведение.
2. Предмета нет (старый режим темы, Plus-тариф темы, покупка за жемчуг, `themeMode === 'olive'`) → удалить тест (или файл, если красно всё) и написать причину в сообщении коммита и в `INBOX_COORDINATOR_FROM_THEMES.md`.
Замена по смыслу уже существует: `theme_selection_runtime`, `theme_intensity_slider`, `theme_palette_roles`, `theme_contrast_report`, `theme_gradient_plate_contrast`, `theme_color_level_appearance_runtime`, `legacy_theme_retirement_compatibility`, `liquid_glass_theme_palette`.

## Security and privacy

Не применимо.

## Technical debt

Остаются зелёные тесты старых тем, которые охраняют ещё живые файлы (например `olive_completion_chrome`); их судьба — отдельное решение, когда файлы будут удалены.

## Verification

Прогон каждого изменённого файла по одному (`--runInBand`, слот), итоговый список в INBOX; `git diff --stat` — удалённые тесты перечислены в сообщении коммита.

## Rollback

`git revert` коммита вернёт удалённые тесты.
