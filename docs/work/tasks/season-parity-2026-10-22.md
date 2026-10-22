# Task packet: «Сезон» (Обучение) — карта экзамена только при включённом экзамене, действия текстом, аватар Plus

Governance-ID: TG-CC70E1D833C7
Status: В работе
Owner: 2 · ДИЗАЙН (поручение координатора 22.10; склейки C:/Temp/claude/png/parity/r2/ss_side_5…9_*.png; эталон course-hybrid-1-4, способ 2)
Related epic/enabler: none

## Outcome

(1) Пока SEASON_CHAPTER_EXAM_ENABLED = false, карта «Экзамен главы» не показывается (и не дублирует подпись «Экзамен главы / Экзамен главы»). (2) Бейдж на карте 16: «✓» в приложении против «🔒» в макете — выяснено: это данные мока (в dev-входе пройдены все 16 эпизодов, в эталоне — 11, «3 из 8»); мок приведён к эталону. (3) Кнопки «Вся глава / Слова / Теория» — текст со значком без подложки, как в эталоне. (4) Аватар-монета с ромбом Plus справа в шапке — из данных, уже имеющихся на экране (в dev-превью — мок, в бою аватар передаёт хозяин экрана через avatarSlot), без новых чтений.

## Scope

In scope: components/learning-v2/season/season_course_model.ts (параметр includeExam), season_preview_fixtures.ts (колода по флагу, индексы, мок-данные экзамена), SeasonCourseView.tsx (действия без подложки), app/dev_season_preview.tsx (аватар), тесты season_*.

Out of scope: сам экзамен главы (его делает Learning V2), боевая интеграция «Сезона» в экран «Обучение» (её нет — сезон живёт только в dev_season_preview), раскрытая карта экзамена.

## Architecture

Модель колоды остаётся чистой: buildSeasonDeck(rows, { includeExam }) — по умолчанию карта экзамена кладётся (тесты эталона), вызывающий передаёт SEASON_CHAPTER_EXAM_ENABLED. Превью-колода берёт флаг; индексы карт в превью считаются с учётом флага; состояния «exam_*» при выключенном экзамене встают на последний эпизод главы.

## Security and privacy

Не затрагивается: данных не собираем, сетевых вызовов нет.

## Technical debt

- Contain: боевой хозяин «Сезона» ещё не написан; когда появится — обязан вызывать buildSeasonDeck с includeExam: SEASON_CHAPTER_EXAM_ENABLED; сторож — тест season_dev_preview_contract; owner: 2 · ДИЗАЙН / Learning V2.

## Verification

- npm run test:one -- tests/season_pure.test.ts tests/season_dev_preview_contract.test.ts tests/season_view_contract.test.ts и новый тест экзамена.
- Склейки Сверки (ss_side_5…9) заново.

## Rollback

Откат: revert коммита; данные не затрагиваются.
