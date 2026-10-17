# Сборщик паритета: переносить прежние поля и строки вне матрицы
Governance-ID: TG-283FBC5F1114

## Outcome
Координатор 17.10: полная пересборка scripts/visual_parity_build.mjs не теряет ни строк, ни полей. 306 строк жили вне матрицы и стирались; поля release/emulator/triage/note/added_reason стирались у всех.
## Scope
scripts/visual_parity_build.mjs (buildRows), tests/visual_parity_gate.test.mjs (новые тесты). Реестр не пересобираем в коммите — только сухой прогон.
## Architecture
addRow: ...old первым, затем свежие поля матрицы, затем сохраняемые поля. После матрицы и EXTRA_MOCKUPS — прежние строки без пары переносятся как есть с origin: 'carried'.
## Security and privacy
Нет данных.
## Technical debt
Матрица перестаёт быть единственным источником; строки вне матрицы помечены origin=carried.
## Verification
Тест: пересборка на текущем реестре = 1151 строка, release=r1 то же число, cards-v2 >= 44; гейт 35+N; сухой прогон diff = 0 потерь.
## Rollback
git revert коммита.
