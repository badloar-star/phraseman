# Task packet: значки «прослушать» и микрофона в плеере V2 — цвет графики темы (контраст-гейт OTA Тем)

Governance-ID: TG-010D2FDDE1D3
Status: In progress
Owner: Learning V2 session; задача координатора 26.10 (замер Тем: g.cta на buttonFill до 1,31, на opaqueControl до 1,01)

## Outcome

Значок «прослушать» (на заливке buttonFill) и значок микрофона у распознанного ответа (на opaqueControl) видны во всех 174 сочетаниях
тем: g.cta → g.accentGraphic (≥ 3,20 и ≥ 4,51 по замеру Тем).

## Scope

app/learning_v2_direct_session_player_v1.tsx — две строки цвета значков; тест-сторож.

## Architecture

accentGraphic — роль темы «цвет графики (значки, кольца)», доведённая до ≥ 3:1 на фоне/карточке/шторке; тот же оттенок темы.

## Security and privacy

Нет данных.

## Technical debt

Перемер Тем по хэшу.

## Verification

tests/player_icons_accent_graphic_2026_10_26.test.ts.

## Rollback

Revert коммита.
