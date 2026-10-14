# Task packet: ночной стор-экспорт HEAD и проверка dev-строк (только измерение)

Governance-ID: TG-2C2D16062A16
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: поручения координатора 14.10 — предсборочные ворота на HEAD; окончательное доказательство «dev-маршруты не попадают в стор-бандл» и что sound_v2 в бандле есть

## Outcome

Свежий стор-экспорт HEAD (`EXPO_PUBLIC_STORE_RELEASE=1 expo export --platform android --output-dir dist-store --source-maps`) и прогон `store_bundle_dev_strings_gate` на нём. Отчёт: размер бандла, есть ли `modules/sound_v2` (ожидаемо да), `dev_moments_preview` и `FontWeightStrip` (ожидаемо нет), попал ли импорт `content/learning-v2-course`.

## Scope

In scope: временный скрипт запуска вне репозитория (`C:/Temp/claude/work/store_export_night.sh`), чтение результата, отчёт.

Out of scope: правки кода, нативная сборка, Metro на 8081 (Сверка).

## Architecture

Один тяжёлый процесс через светофор; старт при свободных ≥ 6 ГБ; сторож памяти убивает экспорт при < 3 ГБ и сообщает. Выходная папка `dist-store/` в `.gitignore`.

## Security and privacy

Данные пользователей не затрагиваются; ключей в отчёт не попадает.

## Technical debt

Contain: единственный источник правды о стор-бандле — свежий экспорт; старый от 18:32 не отражал HEAD.

## Verification

Код выхода экспорта, вывод гейта, подсчёты по source map; отчёт в файле и координатору.

## Rollback

Ничего не меняется в репозитории; `dist-store/` — выбрасываемый артефакт.
