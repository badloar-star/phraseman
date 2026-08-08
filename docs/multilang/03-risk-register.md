# Multilingual foundation risk register

## P0 — блокируют любой новый production language

| ID | Риск | Текущее доказательство | Требуемое закрытие |
|---|---|---|---|
| P0-01 | ES/DE/IT попадают в English storage namespace | `storageStudyTarget()` возвращает default для всего, кроме `fr` | Tests: все валидные target имеют разные keys; unknown target throws |
| P0-02 | Неизвестный source попадает в RU namespace | `storageSourceLocale()` различает только `uk` | Tests: unknown source throws; absent legacy source отдельно defaulted |
| P0-03 | Прогресс разных curriculum versions смешивается | version не входит во все local/cloud scopes | CourseIdentity применяется к каждому progress/SRS/stat key |
| P0-04 | Published release неполон | canonical surfaces только lesson/flashcard | Release manifest доказывает closure всех логических surfaces |
| P0-05 | Артефакт другой пары активируется/читается | target/source checks есть частично и используют разные типы | Shared identity validator на publish, activate, fetch и client load |
| P0-06 | Personal practice теряет/смешивает карточки | identity преимущественно phrase-string/English-centric | Stable item/skill/error key + migration tests |
| P0-07 | Legacy English прогресс повреждается миграцией | миграция нового namespace не определена | Idempotent copy-only migration, receipt, crash/retry/no-overwrite tests |
| P0-08 | Locale-neutral слой обходится legacy полями | phrase schema содержит language-named fields/branches | Один adapter в ContentItem; новые языки не расширяют legacy field matrix |

## P1 — блокируют French L01-L08 pilot

| ID | Риск | Закрытие |
|---|---|---|
| P1-01 | Словарь заявляет старые слова как новые | Build-time lexeme ledger + prior-lessons set-difference gate |
| P1-02 | Словарь не покрывает фразы | 100% target token/lexeme coverage, documented exclusions |
| P1-03 | English curriculum механически переведён | French-specific can-do/grammar sequence reviewed against FEI/CEFR |
| P1-04 | 50 фраз перегружают новой грамматикой | 8–10 new frames, 12–22 new lexemes, labeled review/variation |
| P1-05 | Неправильные глаголы/предлоги копируют English taxonomy | LanguageProfile capabilities и language-specific morphology/government |
| P1-06 | Theory не совпадает с упражнениями | Every theory objective has phrase/task coverage and reverse traceability |
| P1-07 | TTS/STT/normalization не проверены | French mini-pack probe: tokenizer, accents, apostrophes, audio metadata |
| P1-08 | Старый QA script даёт ложный gate | Ремонт/замена `scripts/audit_lessons_1_32.py`, тест на discovery L01-L32 |

## P2 — до масштабирования ES/DE/IT

| ID | Риск | Закрытие |
|---|---|---|
| P2-01 | Одинаковые 32 темы навязаны всем языкам | Отдельный blueprint и dependency graph для каждого target |
| P2-02 | Cambridge используется как языковой авторитет для не-English | Source policy: Goethe/Cervantes/FEI/CILS + CEFR; Cambridge methodology only |
| P2-03 | Reviewer проверяет только grammar | Раздельные linguistic, pedagogical, lexical-ledger, product/runtime reviews |
| P2-04 | Массовая генерация скрывает системные ошибки | Chapter-by-chapter gates: L01, L01-L08, затем 09–16/17–24/25–32 |
| P2-05 | «32 урока = A2» превращается в ложное обещание | Product copy говорит functional A1 + early-A2 bridge, no certification claim |

## Release stop conditions

Новый target не включается в production allowlist, если выполняется хотя бы одно условие:

- есть молчаливый fallback target/source;
- migration test не доказывает idempotency и no-overwrite;
- release не проверяет полную identity;
- отсутствует хотя бы один обязательный surface/embedded-surface proof;
- runtime fallback может открыть English pack для не-English identity;
- vocabulary novelty или phrase coverage ниже 100% без approved exception;
- personal-practice item не имеет stable id и course scope;
- rollback rehearsal не возвращает предыдущий same-identity release.

## Evidence packet для снятия риска

Каждый закрытый риск получает:

1. ссылку на contract/ADR;
2. тест, который сначала был красным;
3. зелёную команду и дату;
4. reviewer verdict;
5. если затронут storage/release — migration или rollback rehearsal result.

