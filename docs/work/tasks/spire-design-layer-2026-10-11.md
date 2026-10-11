# Шпиль: дизайн-слой экранов, жалоба на задание, dev-флаг съёмки

Governance-ID: TG-F8849CA80F3F

## Outcome
Экраны Шпиля (`components/spire/*`, `modules/spire/SpireTaskReportButton.tsx`) приведены к «законченному виду»: токены темы, шкала шрифтов 16/13, «ты», кит-нажатие, замки от двойного тапа, мгновенный отклик. Незакоммиченная работа (флажок жалобы на задание в ступени, поддержка итальянского, снятие задания без штрафа) просмотрена и закоммичена после проверки. Для съёмки на эмуляторе в dev добавлен флаг показа вкладки.

## Scope
`components/spire/SpireHomeScreen.tsx`, `components/spire/SpireStepScreen.tsx`, `modules/spire/SpireTaskReportButton.tsx`, `app/spire/use_spire_game.ts`, `app/spire/use_spire_step_runner.ts`, `modules/spire/{listen_audio,report_queue,step_machine,task_report_client}.ts` (уже изменены другой сессией — проверяю и коммичу целиком как есть), `app/spire_tab_flag.ts` (dev-флаг). Сервер, правила и тесты логики — зона Ядра.

## Architecture
Экраны берут цвета из `useSpirePalette` (токены стекла активной темы; кнопка — `accent`/`accentInk`, акцент как текст — `accentText`), нажатие — `V2Pressable` (кит). Жалоба: `ReportErrorButton` (замок от двойного тапа, откат при сбое) внутри `SpireTaskReportButton`; успешная жалоба снимает задание без сердца и без штрафа (`skipReportedSpireTask`). Dev-флаг: `EXPO_PUBLIC_SPIRE_DEV_TAB=1` включает вкладку только при `__DEV__`; серверный замок `config.enabled` не обходится.

## Security and privacy
Жалоба отправляет id задания, неделю, ступень и комментарий пользователя на сервер (уже описано в политике как отчёты об ошибках); `stableUid` берётся из `ids.stableId`. Новых данных и разрешений нет. Dev-флаг — публичный, секретов нет.

## Technical debt
Съёмка живого Шпиля невозможна, пока `config.enabled=false` на сервере: проверка по макету `spire.html` — статическая (токены, шкала, тексты) и RNTL.

## Verification
Проверка типов в слоте светофора, тесты Шпиля (`tests/spire_*`), контракты достижимости/устойчивости, сторожа дизайна (`accent_text`, `accent_ink`, `two_theme`, типографика).

## Rollback
Откатить коммит.
