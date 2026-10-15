# Task packet: три красных теста на HEAD (координатор 15.10 ~13:10)

Governance-ID: TG-153F0701B2CD
Status: В работе — тесты, коммит сразу (только tests/)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

1. `tests/spire_moments_v3_contract` — «никто не импортирует components/spire/moments»: импортирует `components/spire/SpireClimbDock.tsx`
   (m22, cc1c96b09, одобрено координатором 15.10). Контракт держит белый список с причинами — дописать док с `// зачем`.
2. `tests/aa_release_floor_auth_ui` — ждёт `10 * 60_000` в участке app/auth_provider.ts. Строка на месте (стр. 1749); участок режется до
   `'\n}\n'`, а рабочая копия auth_provider.ts в CRLF → конец не находится, вырезка пустая. Не удаление кода — EOL.
3. `tests/initial_deep_link_cold_start` — ждёт `router.replace(rootTarget as Href)` в окне 2600 знаков после метки в app/_layout.tsx.
   Строка на месте (3 вхождения и в HEAD); в CRLF строки длиннее на знак — строка выпадает за окно. EOL, не 3a00301cd.
Фикс 2–3: чтение исходника через `normalizeEol` (`tests/helpers/read_source.ts`) — тот же приём, что 0feae7e41 для 21 теста.

## Scope

Только три файла в tests/. Поведение приложения не меняется.

## Architecture

Механическая обёртка `fs.readFileSync(..., 'utf8')` → `normalizeEol(...)` + импорт; одна строка в белом списке контракта моментов.

## Security and privacy

Не касается данных.

## Technical debt

- Эти два теста не попали в список сторожа `source_guard_eol_normalized_contract` (он ловит многострочные литералы, а здесь — окна и
  вырезки по `\n`). Стоит расширить сторожа на `slice`/`indexOf('\n…')` — отдельно.

## Verification

Три теста зелёные (slot.sh run).

## Rollback

`git revert`.
