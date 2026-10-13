# Task packet: PM-216 обмер стор-бандла сейчас + PM-252 ревью коммитов 13.10

Governance-ID: TG-3B51D9870B08
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: E21 PM-216, E24 PM-252; координатор 13.10 «не стой — следующее СРАЗУ»

## Outcome

1. PM-216: стор-экспорт Android (`EXPO_PUBLIC_STORE_RELEASE=1`, env профиля production из eas.json) в `dist-store/` под
   светофором; отчёт `scripts/pm216_release_size_report.mjs` (JS / gzip / ассеты по расширениям) + топ-30 модулей по весу
   (по source map) + список «недостижимо в стор-сборке — убрать» с оценкой экономии. Ничего не удаляется без «ок» координатора.
2. PM-252: проход по всем коммитам 13.10 (git log --since=00:00) по рискам: потеря данных/денег, падение, лишние чтения
   Firestore, немые catch. Находки — владельцам зон строкой, итог координатору таблицей.

## Scope

In scope: чтение кода и истории, экспорт бандла в `dist-store/` (папка в .gitignore — проверить), отчёты в
`docs/phraseman-2.0/evidence/`. Out of scope: правка кода зон и удаление модулей (только список), сборки EAS, деплой.

## Architecture

No architecture change: измерение и ревью, код приложения не меняется.

## Security and privacy

Бандл и source map остаются локально, никуда не загружаются. В отчётах — пути модулей и размеры, без секретов и личных данных.

## Technical debt

Contain: найденные «недостижимые» модули — список с оценкой, удаление после ок координатора отдельной задачей.

## Verification

- `dist-store/metadata.json` есть, отчёт PM-216 построен; гейты `store_bundle_dev_strings_gate.mjs` и
  `daily_phrase_dpk_assets_gate.mjs` прогнаны по экспорту.
- Ревью: каждая находка со ссылкой на коммит и файл:строку.

## Rollback

Удалить `dist-store/` и отчёты; код не меняется.
