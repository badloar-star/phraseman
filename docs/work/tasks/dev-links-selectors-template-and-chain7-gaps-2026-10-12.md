# Task packet: сторож dev_links_r1_selectors_exist понимает шаблонные testID + ссылки для пропущенных в chain7 id

Governance-ID: TG-5B9C64AE9389
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10: DEV_LINKS_R1.md держит только Авторизация, чтобы не было гонки файла)

## Outcome

1. tests/dev_links_r1_selectors_exist.test.ts: шаг `#prefix-<что угодно>` считается существующим, если в коде есть шаблон `prefix-${…}`
   (литерал-префикс перед `${`). Шаги не трогаются. Тест на оба случая: шаблон есть → зелёный, префикса нет → красный.
2. Ссылки+шаги для пропущенных в chain7 (rescan_verdicts_2026-10-12.md, «Пропущенные»): cards-001, cards-section-001, dialogs-015/016/019/020/022/041,
   learn-*, video-*, coins-*, practice-*, community-025, system-010/012/015, results-007/009, mistakes-panel-004/021 — из существующих dev-подмен.
   Нужна новая подмена в чужом коде → список «id → чего не хватает → чей экран» координатору. Learning V2 (Codex) → помечается «V2/Codex».

## Scope

In scope: тест-сторож, scripts/dev_links_r1_steps_*.py (новый файл шагов этой партии), DEV_LINKS_R1.md (генерация).
Out of scope: код экранов, подмены в чужих модулях, Learning V2.

## Architecture

Генератор scripts/dev_links_r1_generate.py собирает таблицу из модулей шагов; новая партия — отдельный модуль, чтобы не трогать чужие.

## Security and privacy

Ссылки — только гость или №2/№3, подмены в памяти, без записей в прод (сторож dev_links_r1_prod_write_guard).

## Technical debt

- Contain: нет.

## Verification

dev_links_r1_selectors_exist (новые случаи), dev_links_r1_contract (уникальность), prod_write_guard.

## Rollback

Откат коммита.

## Result

1. Сторож — 09500149c: префикс до `${` и суффикс общего компонента (`${testID}-header`, `-star-${n}`, `-confirm`) при базе строкой; 4/4.
2. Ссылки (scripts/dev_links_r1_steps_chain7.py, подключён в генераторе; области +practice/results/system) — 20 id:
   learn-001/003/004/014/028/032, dialogs-015/016/019/022/041, practice-001/002/003 (= блиц cards-section-044/045), community-025,
   system-015, results-007/009, mistakes-panel-004/021. dev_links_r1_selectors_exist 4/4, contract 6/6, prod_write_guard 4/4.
   cards-001, cards-section-001 — removed_by_owner.
3. Не хватает подмен/меток (код не писался — список координатору):
   - learn-007/008/011/012/013 (экзамен уровня «почти»/Free, окна «Ещё рано»/«Уровень закрыт»/«Недоступно») — нужна подмена прогресса уроков
     (сколько пройдено, статус экзамена) в списке уроков;
   - learn-029/031 (D2 «Собирается», D4 «Верно + монеты») — нужна dev-метка следующего ВЕРНОГО слова в lesson1 (как lesson1-word-option-wrong);
   - dialogs-020 («Почему так» — разборы закончились) — подмена исчерпания лимита (dialogue_v2_why_allowance, память);
   - video-001/004/008/009/011 — демо-каталог видео без сети (видео, плейлист, ролик с фразами, премьера «сейчас») + testID вкладки «Плейлисты»;
   - coins-001/003/004 — подмена баланса монет и состояния «повышение — ожидание»;
   - system-010 — dev-способ вызвать экран ошибки (ErrorBoundary);
   - system-012 — подмена «сообщение команды» (окно объявления), slot=message не проверен на этом окне.
