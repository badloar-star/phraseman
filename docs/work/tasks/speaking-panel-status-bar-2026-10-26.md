# Task packet: окно «Скажи вслух» на Android под строкой состояния (гейт safe-area Тем)

Governance-ID: TG-887DD2A1F776
Status: In progress
Owner: Learning V2 session; задача координатора 26.10 (Темы: прозрачная модалка без statusBarTranslucent — светлая полоса сверху)

## Outcome

Затемнение окна «Скажи вслух» на Android заходит под строку состояния (без светлой полосы сверху), а сама карточка не заезжает под
часы и нижнюю полосу: отступы затемнения = безопасные отступы + прежние 20.

## Scope

components/SpeakingPanel.tsx (statusBarTranslucent у Modal, отступы затемнения от useStableSafeAreaInsets); перезакрепление отпечатка panel
в tests/flashcards_speaking_liquid_glass_source_contract.test.mjs; тест-сторож.

## Architecture

statusBarTranslucent — окно рисуется от верха экрана; отступы — только через useStableSafeAreaInsets (закон Performance Bible). iOS не
меняется: там модалка и так на весь экран, отступы те же по смыслу.

## Security and privacy

Нет данных.

## Technical debt

Кадр Сверки окна на Android (светлая и тёмная тема).

## Verification

tests/speaking_panel_status_bar_2026_10_26.test.ts; сторож отпечатка panel.

## Rollback

Revert коммита.
