# Task packet: рычаги ворот релиза — пропуск ворот Learning V2 в стор-сборке и явный обход паритета владельцем

Governance-ID: TG-FE72D06FD52C
Status: In progress
Owner: сессия 1 · ЯДРО (поручение координатора 10.10 02:25)

## Outcome

1. Ворота Learning V2 (learning_v2_release_parity_gate, learning_v2_audio_coverage_gate) в стор-режиме
   (EXPO_PUBLIC_STORE_RELEASE=1) печатают «пропущено: не входит в стор-сборку» и не красные — ТОЛЬКО если регулярка
   стор-ветки router.ctx.js вырезает ВСЕ маршруты app/**/*learning[_-]v2*.tsx. Иначе — строгие, как сейчас.
2. Ворота паритета макетов по умолчанию строгие. Явный режим владельца PARITY_GATE_WAIVER=owner-YYYY-MM-DD:<причина>
   печатает громкое «ВОРОТА ПАРИТЕТА ОБОЙДЕНЫ ВЛАДЕЛЬЦЕМ» с цифрами и не падает; кривое значение — отказ.
   Включает только владелец (env EAS); строка с командой — в RELEASE_BUILD_E4.md.

## Scope

scripts/store_release_surface.mjs (новый, самостоятельный), .easignore (разрешить в архив EAS скрипты, которые запускает eas-build-post-install), scripts/learning_v2_release_parity_gate.mjs (ранний выход в main),
scripts/learning_v2_audio_coverage_gate.mjs (ранний выход), scripts/visual_parity_gate.mjs (обход владельцем),
tests/store_release_gate_levers.test.mjs (новый), docs/phraseman-2.0/RELEASE_BUILD_E4.md.
release_precheck.mjs и package.json НЕ трогаю — в них чужие незакоммиченные правки.

## Architecture

Общий помощник берёт регулярку стор-ветки из visual_parity_gate.storeRouteRegex и проверяет каждый маршрут
*learning[_-]v2*.tsx. Нет регулярки / ни одного маршрута / хоть один достижим → пропуска нет (строго по умолчанию).

## Security and privacy

Данных не касается. Обход паритета — осознанный рычаг владельца: без его env ворота строгие; значение обязано нести
дату и причину и печатается в лог сборки.

## Technical debt

Обход паритета — исключение из правила CLAUDE.md «ГЕЙТ: ПРИЛОЖЕНИЕ = МАКЕТ». Решение включать — за владельцем;
после релиза переменную нужно удалить из EAS (строка в E4).

## Verification

node --test tests/store_release_gate_levers.test.mjs; node --test tests/visual_parity_gate.test.mjs; ручной запуск
ворот с env и без.

## Rollback

git revert коммита; переменную PARITY_GATE_WAIVER удалить из EAS.
