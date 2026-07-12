# Admin v2 Content Factory — Release 1 Evidence

## Статус

`implementation verified; routed language smoke deferred to prompt releases`

Release 1 проверяет оркестрацию, preflight, ошибки и retry через deterministic fake-provider smoke. Реальные языковые sample-проверки начинаются с Release 3, когда существуют versioned stage prompts; они выполняются через Codex model routing без Firebase callable и без проектного OpenAI API key.

## Реализовано

### Единый план и точный progress

- `generation_plan.ts` является общим источником canonical mapping legacy-флажков.
- `createGenerationJob()` и `splitGenerationJob()` используют один mapping.
- `progress.total` равен числу сохраняемых units для любой комбинации флажков.
- Job сохраняет `plannedSurfaces` и order-independent `planFingerprint`.
- Replay с тем же ключом принимает старый stored job без fingerprint через backward-compatible derivation, но отвергает изменённые уроки или canonical surfaces.

### Registry preflight

- Callable читает и валидирует выбранный source registry до создания job.
- Coverage проверяется по фактическим ключам lessons, поэтому поддерживает sparse registries.
- Ошибка `source_coverage` возвращает точный `missingLessonIds`.
- Admin перед созданием также читает workspace и показывает отсутствующие lesson IDs человеческим текстом; backend остаётся authoritative.

### Ошибки и retry

- Worker классифицирует ошибки, очищает безопасный detail и сохраняет `retryable`.
- Каждая попытка добавляется в `attemptHistory` с attempt/code/message/time.
- Admin показывает code, message, число попыток и retryability на конкретной карточке unit.
- Batch runner больше не проглатывает исключение: причины текущего прохода показываются в status notice.
- Повтор разрешён только для retryable unit; non-retryable failure блокирует переход к review.
- Успешные units не запускаются повторно.

### Независимый legacy-выбор

- Admin больше не требует выбрать все шесть legacy-флажков для создания draft.
- Достаточно выбрать хотя бы одну группу.
- Полный publish candidate по-прежнему требует все четыре canonical artifacts; существующая публикационная защита не удалена.
- Успешный partial draft показывает статус готового черновика, но не предлагает переход к публикационной проверке и держит Approve/Reject выключенными.

## TDD evidence

- Unit math test: до реализации падал `6 vs 2` и `12 vs 8`; после общего mapping зелёный.
- Coverage test: до реализации отсутствовал exported coverage seam; теперь registry 1–32 + request `[32,33]` возвращает только `[33]`.
- Failure record test: до реализации отсутствовал builder; теперь проверяет normalized retry semantics и sanitized detail.
- Fake-provider smoke: расширен с одной карточки до quiz + flashcard + arena; сначала упал на arena identity mismatch, затем стал зелёным после surface-aware fake provider.

## Свежий verification gate

Functions:

```text
npm run build
12 suites passed
53 tests passed
0 failed
```

Admin v2:

```text
node --check admin/v2/scripts/admin-core.js
2 suites passed
4 tests passed
0 failed
```

UI audits:

```text
tooltip audit: 143/143 controls covered, 0 missing
language audit: 18 files checked, 0 hard-term findings
git diff --check: PASS
```

Неблокирующее предупреждение: Admin language audit сообщает, что `admin-guidance.js` reparsed as ESM из-за отсутствующего package `type`; это существующая настройка модуля и не влияет на результат audit.

## Fake-provider smoke matrix

| Сценарий | Результат |
|---|---|
| Один lesson artifact, 50 phrases, QA receipt | PASS |
| Malformed lesson JSON | PASS: fail-closed |
| Quiz artifact identity/schema | PASS |
| Flashcard artifact identity/schema | PASS |
| Arena, ровно 4 уникальных options | PASS |
| Plan all six legacy flags, two lessons | PASS: 8 persisted units / total 8 |
| Sparse registry coverage | PASS |
| Transient error classification | PASS |
| Immutable checkpoint replay tests | PASS |

## Production rollout smoke

Шаблон `docs/reports/admin-content-factory-release1-smoke.template.json` остаётся необязательным rollout-артефактом для будущего deployment, но не блокирует следующие implementation releases.

Администратор должен:

1. Явно подтвердить Firebase project/alias как non-production.
2. Открыть Admin v2 → Контент → Фабрика языков.
3. Выбрать `english-core-32:v1`, урок 1 и только `Фразы урока`.
4. Создать draft и вручную нажать запуск генерации.
5. Дождаться terminal state или видимой per-unit ошибки.
6. Передать без секретов: project alias, job ID, unit ID, state, attempts, error code/retryable либо artifact preview + QA receipt hashes.

Запрещено включать в экспорт API keys, Authorization headers, полный Firebase credential или несвязанные пользовательские данные.

Текущая локальная `.firebaserc` содержит только default project `phraseman-ea0b3`; поэтому deployment не выполнялся. Это не мешает локальным contract/fake-provider тестам и Codex-routed языковой проверке будущих versioned prompts.

## Откат

- До deployment production не менялся, поэтому runtime rollback сейчас не требуется.
- Если ручной smoke выполняется после guarded non-production deploy, rollback должен вернуть предыдущие версии только затронутых callables и hosting revision; точные version IDs фиксирует оператор перед deploy.
