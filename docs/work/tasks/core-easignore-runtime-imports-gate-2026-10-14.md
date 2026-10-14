# Task packet: EAS-архив и код приложения — исключение activation/ в .easignore + сторож precheck

Governance-ID: TG-781960AE7E10
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: предсборочный прогон Тем на 2133977a1 (координатор 14.10), курс Learning V2 в стор-сборке (владелец 11.10)

## Outcome

Незакоммиченный файл Codex `app/learning_v2_factory_runtime_audio_omissions_v1.ts` делает
`require('../content/learning-v2-course/activation/en/runtime-audio-omissions.v1.json')`, его подключает
`app/learning_v2_course_released_session_client_v3.ts`, а боевые маршруты V2 входят в стор-сборку. `.easignore:175` исключает
`/content/` целиком → в архиве EAS файла нет → Metro на сервере падает «Unable to resolve» после загрузки (платная сборка
сгорает). Делаем оба: (1) в `.easignore` точечно возвращаем `content/learning-v2-course/activation/` (12 КБ, 2 файла);
(2) сторож в release_precheck: ни один импорт/require из кода приложения не указывает на файл, который .easignore
выкинет из архива — такое ловится до сборки, а не на сервере.

## Scope

In scope: `.easignore`, новый `scripts/easignore_runtime_imports_gate.mjs`, строка в `scripts/release_precheck.mjs`, тест.
Out of scope: файлы Codex (не трогаем), metro.config.js (уже открыт координатором 8d0ad6149).

## Architecture

Семантика .gitignore (как у EAS CLI): нельзя вернуть подпапку, если исключён родительский каталог целиком, поэтому
`/content/` → `/content/*` + `!/content/learning-v2-course/` + `/content/learning-v2-course/*` +
`!/content/learning-v2-course/activation/`. Сторож: обход app/, modules/, components/, hooks/, constants/ (*.ts, *.tsx, *.js),
поиск относительных require/import/import(), разрешение пути от файла, проверка пакетом `ignore` (5.3.2, тот же формат) по
.easignore; нарушение → список «файл → путь» и код 1.

## Security and privacy

В архив добавляются 2 JSON-манифеста курса (без данных людей). Политика не затрагивается.

## Technical debt

Contain: сторож проверяет только относительные пути; алиасы (@/…) в проекте для content/ не используются.

## Verification

Тест сторожа: импорт в исключённую папку → нарушение; в исключение activation/ → чисто; обычный код → чисто.
Прогон сторожа на текущем дереве: файл Codex проходит после правки .easignore. precheck — без новых отказов.

## Rollback

Вернуть строку `/content/` и убрать сторожа из GATES.
