# Временная иконка Шпиля: квадратная вырезка по башне из intro_arena

Governance-ID: TG-B91A9DA596A6
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора: временная иконка, пока Codex рисует пробу)

## Outcome
spire_tile.webp (dark и light) — квадрат 1024×1024 с прозрачным фоном: башня с флагом из ТЕКУЩЕГО арта intro_arena занимает ~80 % кадра, ≤ 400 КБ. Плитка Шпиля на Главной берёт его первым (spire_tile → intro_arena), без нового рисунка.

## Scope
scripts/crop_spire_tile.mjs (вырезка из intro_arena по рамке непрозрачных пикселей), assets/images/v2art/{dark,light}/spire_tile.webp, themed_art_assets.generated.ts (генератор). Когда Codex сдаст выбранный стиль, его файлы просто заменят эти.

## Architecture
sharp: рамка по альфе > 24, квадрат вокруг рамки со стороной bbox/0.8, центр по башне, прозрачные поля, ресайз 1024, webp с подбором качества под лимит 400 КБ. Генератор с сторожем [THEMED-ART-GUARD] регистрирует результат.

## Security and privacy
Локальный офлайн-скрипт, картинки.

## Technical debt
Временное решение: производный от существующего арта; финальный арт — от Codex.

## Verification
Размер и углы (сторож), --check генератора, тесты themed_art/themed_art_guard, кадр Главной Сверке.

## Rollback
git revert коммита (файлы удалятся, плитка вернётся на intro_arena).
