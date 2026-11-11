Governance-ID: TG-F3FF1D88DA46

# Task packet: красные сторожа, сироты Codex и полный прогон jest перед сборкой

## Outcome
Поручение координатора (06.11): (1) `tests/perf_freeze_contract.test.ts` красный — бесконечные анимации без гарда в `components/scene/SceneStarTwinkle.tsx` и `components/spire/peak/PeakTour.tsx`: нужна остановка при неактивном экране или фоне и учёт Reduce Motion, вид и тайминги не менять; (2) красный `paywall_server_refused_variant`: `app/paywall_v3_rows.ts` в списке нарушителей — разобрать по контракту минимальной правкой; (3) сироты Codex в рабочем дереве (`app/spire/spire_week_result_client.ts`, `use_spire_friends_refresh.ts`, `use_spire_game.ts`, `use_spire_room_sync.ts`, `app/spire_report_client.ts`, `app/speaking_hold_recorder.ts`, `app/speaking_neural_judge.ts`, `components/SpeakingPanel.tsx`): цельно, безопасно, тесты зелёные → коммит «доделка сироты», иначе патч в `docs/work/_parked_2_1_1/<имя>.patch` и файл к HEAD; пейвол и визитку разбирает «Вход»; (4) полный прогон jest на HEAD → список красных с владельцем и причиной в `docs/work/release/RED_TESTS_<время>.md` (шлюз сборки).

## Scope
- Две анимации получают гард (фокус экрана / фон приложения / Reduce Motion) без изменения вида и таймингов.
- Правка `paywall_v3_rows.ts` — только если нарушение внутри разрешённого мне; иначе передать «Входу».
- Сироты — по одной; решение по каждой записывается в отчёт.
- Полный прогон — через светофор, в снимке HEAD без чужих незакоммиченных правок.

## Architecture
Гард — общий хук `useRuntimeActive` / `useIsScreenFocused` проекта (паттерн `components/AvatarAura.tsx`), анимация останавливается при выходе экрана из фокуса или уходе приложения в фон, возобновляется при возврате.

## Security and privacy
Данных не собирают. Сироты с сетью/записью (речь, отчёты Пика) проверяются на утечки и права до коммита.

## Technical debt
Сироты, которые нельзя доделать безопасно, уходят в `_parked_2_1_1` с причиной; красные тесты других владельцев перечисляются в отчёте, а не чинятся здесь.

## Verification
`perf_freeze_contract`, `paywall_server_refused_variant`, тесты по каждой сироте, затем полный прогон jest в снимке HEAD.

## Rollback
`git revert` коммитов; сироты — патч возвращается в дерево.
