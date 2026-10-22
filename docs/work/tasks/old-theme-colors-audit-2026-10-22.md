# Аудит: экраны, берущие цвета СТАРОЙ темы вместо токенов текущей

Governance-ID: TG-7F47C4ED3BD1

## Outcome
Координатор (закон владельца «цвета строго оттенки текущей темы», распространяется и на семантику верно/неверно, если есть токены текущей темы): найти по v2-экранам места, где цвета берутся из `constants/cinemaThemes.ts` через `t.wrong`, `t.correct`, `t.accent` и т. п., сгруппировать по владельцам, для каждой находки дать токен-замену и контраст. Только список, чужие файлы не правим.

## Scope
In scope: обход `components/` и `app/` (кроме dev-экранов, `_*`, лабораторий и превью), отчёт `docs/work/old_theme_colors_audit_2026-10-22.md`.
Out of scope: любые правки кода экранов; тяжёлые прогоны (идёт тишина для теста монет).

## Architecture
Скрипт считает обращения `t.<токен>` и `theme.<токен>` для 19 полей старой палитры (correct, wrong, accent, gold, onAccent, onCorrect, onGold, bloomA, bloomB, textMuted, textGhost, btnShadow, cardGradient, bgGradient3, borderLight, second, surface, surface2, card), распределяет файлы по владельцам по пути, считает контраст токенов-замен (`g.good`, `g.bad`, `g.accentTextSafe`, `g.accentGraphic`, `g.accentInk`, `g.medalGold`) по 23 темам × 2 оформлениям × 3 уровням.

## Security and privacy
Данных не касается.

## Technical debt
Алиас `t` в файле может быть и не старой темой (эвристика по имени); спорные случаи помечены в отчёте для проверки владельцем файла.

## Verification
Цифры контраста из расчёта токенов; список построен скриптом, повторяемо.

## Rollback
Удалить отчёт.
