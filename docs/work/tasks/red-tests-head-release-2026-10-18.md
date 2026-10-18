# Task packet: красные проверки на HEAD к релизу

Governance-ID: TG-DF03926CD13D
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: координатор 18.10 — «красные тесты на HEAD к релизу».

## Outcome

1. Лёгкий срез озвучки (`app/learning_v2_published_audio_sessions_v1.generated.ts`) снова совпадает с полным индексом и больше не может разойтись: его пишет тот же генератор, что и полный индекс.
2. Разобрано падение `learning_v2_owner_final_ui_contract_2026_09_12_gate` (skipIntro в маршруте урока).
3. Полный прогон по HEAD с `--maxWorkers=1` (`npm test`); красные — списком, чьё и почему.

## Scope

- `scripts/build_learning_v2_factory_lesson_audio_index.mjs`: тем же проходом пишет и проверяет (`--check`) срез. Срез раньше правили руками (553cbf47b), поэтому он отставал после каждого переноса уроков.
- Тест сторожа не меняется.
- Чужие красные — только список координатору.

## Architecture

Срез = `{ урок: sessionOrdinals }` из той же структуры `lessons`, что идёт в полный индекс. Формат строк ровно тот, что читает сторож (`N: Object.freeze([..])`). Шапка файла сохраняется.

## Security and privacy

Нет данных.

## Technical debt

Нет. Ручной шаг заменён генератором. Владелец Ядро.

## Verification

- `node scripts/build_learning_v2_factory_lesson_audio_index.mjs --check`;
- сторож `learning_v2_continuous_map_perf_contract`;
- полный прогон.

## Rollback

Ревертнуть коммит. Срез вернётся к ручному.
