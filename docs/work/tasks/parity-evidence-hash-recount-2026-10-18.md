# Task packet: пересчёт evidence_sha256/evidence_at у 55 чужих строк реестра паритета

Governance-ID: TG-6FD5AD591DFA

## Outcome
Во всех строках docs/phraseman-2.0/registries/visual_parity.json, где кадр (evidence) не совпадает с evidence_sha256, хэш и evidence_at берутся по текущему файлу и коммиту кадра (слово координатора 18.10). Если вердикт строки (match/diff) поставлен РАНЬШЕ, чем сменился кадр, строка переводится в pending с пометкой «ПЕРЕСВЕРИТЬ», прежний вердикт (статус, кто/когда, отличия) сохраняется в verdict_note. port_ready_gate без evidence_hash_mismatch.

## Scope
Только visual_parity.json (строки с расхождением хэша, ~55). Кадры, макеты, код приложения не трогаю.

## Architecture
Скрипт C:/Temp/claude/mb/ev_hash_scan.cjs: sha256 по файлу, время кадра — git log -1 %cI по пути кадра; время вердикта — reviewed_at / verdict_at / прежний evidence_at. Логи [EV-HASH] на каждую строку и каждое решение.

## Security and privacy
Только метаданные сверки (хэши, даты, пути к скриншотам эмулятора). Данных пользователей нет, политика не затрагивается.

## Technical debt
Причина рассинхрона — пересъёмка кадров без пересчёта хэша; правило записано в память (project_registry_evidence_hash_on_reframe_2026-10-18). Строки «ПЕРЕСВЕРИТЬ» — очередь вердиктов для Макетов/координатора.

## Verification
Повторный скан: 0 расхождений; node scripts/port_ready_gate.mjs по изменённым строкам — без evidence_hash_mismatch; гейт реестра (быстрые тесты) и полный гейт через слот; numstat коммита = только реестр.

## Rollback
git revert коммита реестра.
