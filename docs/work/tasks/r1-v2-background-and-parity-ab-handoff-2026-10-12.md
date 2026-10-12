# Task packet: заготовки к сборке R1 — фон Learning V2 на старте + сверка-гейт «А+Б» (патчи, НЕ накладывать)

Governance-ID: TG-1D76A3D43F65
Status: Done (заготовки; наложение — только по решению владельца)
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10, после ea03b6306)
Related epic/enabler: выпуск R1 17.10; handoff/r1_cut_learning_v2.*; docs/phraseman-2.0/R1_PARITY_GATE_OPTIONS.md (dd0928aee)

## Outcome

1. `handoff/r1_cut_learning_v2_background.patch`: в стор-сборке не запускается посев аудио-кэша V2 — меньше работы на холодном
   старте. Планировщик отправки завершений V2 оставлен намеренно (очередь со сборок 1.6.x, где V2 был). Плюс в основной патч выреза добавлена
   правка теста `tests/visual_parity_gate.test.mjs` (плеер V2 в стор-сборке → вырезан), иначе он покраснеет при наложении.
2. `handoff/r1_parity_gate_AB.patch` + `.md`: гейт «приложение = макет» в precheck считает только `release=r1`;
   строки с корзиной `b_reshoot`/`c_owner_decides`/`d_mockup_stale` или `triage.theme_tone` — не нарушения, а отдельный
   громкий счётчик «отложено владельцем (А+Б)». По умолчанию гейт строгий как прежде (флаг `--defer-triage` только явный).
   Число нарушений на текущем реестре с патчем — посчитано.

## Scope

In scope: патч-файлы и описание в docs/phraseman-2.0/handoff/, проверка на выгрузке HEAD во временной папке.
Out of scope: наложение; правка реестра visual_parity.json; файлы Codex (modules/learning-v2/**, content/learning-v2-course/**).

## Architecture

Гейт: опция `deferTriage` в `evaluateRegistry` — нарушения строки, у которой корзина из списка, переносятся в
`deferred` (с разбивкой по корзинам), а не в `violations`. precheck передаёт `--release=r1 --defer-triage` (поле `args`).
Фон V2: условие `IS_STORE_RELEASE` вокруг посева озвучки (`runAfterHomeFirstFrame('v2_audio_seed')`) в `app/_layout.tsx`.

## Security and privacy

Данные не затрагиваются. Планировщик завершений НЕ отключается: в очереди могут быть неотправленные завершения
(сборки 1.6.x, где V2 был) — прогресс человека не теряется.

## Technical debt

- Contain: отложенные строки печатаются списком-счётчиком; после R1 флаг убрать из precheck.

## Verification

Выгрузка HEAD + патчи (оба порядка наложения с патчем выреза V2): `git apply --check`; `node --test
tests/visual_parity_gate.test.mjs`; прогон гейта с флагами на HEAD-реестре и на рабочей копии реестра — числа в .md.

## Rollback

Патчи не наложены; документы исправляются коммитом.
