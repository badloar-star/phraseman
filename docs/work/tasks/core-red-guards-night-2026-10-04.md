# Task packet: чужие красные сторожа (находка Дизайна, 68 файлов в лёгком режиме)

Governance-ID: TG-EAB1EC9FA837
Status: In progress
Owner: сессия 1 · ЯДРО (координатор 04.10, ночь)

## Outcome

По каждому сторожу — причина в одну строку, затем починка или «ждёт решения»:
- premium_pro_tier_grant — устарел тест: ждал тир MAX в settings.tsx, MAX удалён (04.10); код верен.
- paywall_manage_identity — устарел тест: после шага «предложение остаться» закрытие шторки и переход в
  магазин вынесены в closeCancelSheet()/openStoreCancel(); защита от устаревшей отмены прежняя.
- lesson_spin_privilege, navigation_back_underlay, retained_tabs_runtime_work, tab_deferred_mount,
  gustav_* (fr) — по очереди, сначала проверка зоны Codex.

## Scope

Тесты в tests/; код — только если сломана логика (тогда сначала логи).

## Architecture

Без изменения поведения там, где устарел тест.

## Security and privacy

Пейвол: логика списаний не меняется, только ожидания тестов.

## Technical debt

Нет.

## Verification

Каждый сторож — прогоном (один jest, --runInBand).

## Rollback

git revert.
