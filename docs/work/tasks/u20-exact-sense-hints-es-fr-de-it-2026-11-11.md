# Task packet: U20 — точный смысл подсказок в курсах испанского, французского, немецкого и итальянского

Governance-ID: TG-0C4B373BB715
Governance-ID: TG-EFBBD1AEE738
Governance-ID: TG-AAEB945CBBFA
Governance-ID: TG-D17009E59149
Governance-ID: TG-F9C0FB107DAF
Governance-ID: TG-0226D05C3C20
Governance-ID: TG-12A938A8E5DC
Governance-ID: TG-8565C2AAD457
Governance-ID: TG-828F9A0A805E
Governance-ID: TG-AFD649EA218D
Governance-ID: TG-A9D3DDC528EA
Governance-ID: TG-961E10EA66F0
Governance-ID: TG-4E149933A653
Governance-ID: TG-3E3C28FA18EF
Governance-ID: TG-BD9326ECB519
Governance-ID: TG-D0C818766CCF
Governance-ID: TG-7CEC560FD037
Governance-ID: TG-834245CD50B0
Governance-ID: TG-93FC0B43BB71
Governance-ID: TG-741761F05E1E
Governance-ID: TG-CCBFAC997C18
Governance-ID: TG-5516F7FE4EC0
Governance-ID: TG-E1EB3E0EF814
Governance-ID: TG-7ADAC35B034C
Governance-ID: TG-927B4A9CD2F9
Status: In progress
Owner: сессия Claude (U20, 11.11.2026)
Related epic/enabler: U20 «Точный смысл»; продолжение `u20-exact-sense-hints-en-2026-11-11.md`

## Outcome

Владелец 11.11 поручил проверить тем же способом остальные четыре курса (по 1600 фраз, 8 языков
подсказок каждый). Ученик собирает фразу на изучаемом языке по подсказке на своём; подсказка обязана
вести к той же конструкции: время, лицо и число, отрицание, тип предложения, состояние/действие, слово.

Мера успеха: все 6400 фраз прочитаны проверяющими; находки высокой и средней уверенности внесены слоем
правок после выборочной проверки; находки низкой уверенности перечислены владельцу, а не исправлены молча.

## Scope

In scope:
- временные файлы проверяющих (выгрузки курсов и находки) — вне репозитория, в scratchpad сессии;
- новые слои `docs/work/classic_translation_fixes_u20_exact_sense_<lang>_2026_11_11.json`
  (es, fr, de, it), читает сборщик `scripts/classic_course_pack.mjs`;
- `modules/classic-courses/<lang>/lessons-NN.json` — только строки `sourceLocales` затронутых фраз;
- `modules/classic-courses/<lang>/index.json`, `modules/classic-courses/manifest.json` — пересчёт rev/sha256;
- `scripts/u20_apply_exact_sense_hints.cjs` — параметр языка курса;
- артефакты `docs/work/u20_exact_sense_2026_11_11/findings_<lang>.json`, `applied_<lang>.json`.

Дополнение (владелец 11.11, «Теория 4 курсов», «Сомнительные находки»):
- `scripts/u20_sync_theory_quotes.cjs` + `docs/work/u20_exact_sense_2026_11_11/pairs_<lang>.json` — цитаты старых
  подсказок в `theory.json`, `theory_why.json`, `intro.json` всех пяти курсов приводятся к новым; меняются только
  места, где старая подсказка однозначно привязана к своей фразе (строка «цель — перевод», пара «пример / перевод»,
  таблица переводов, задание с phraseId). Свободный текст объяснений не трогается — остаток перечисляется;
- находки низкой уверенности перечитываются вручную, подтвердившиеся вносятся тем же слоем.

Дополнение (владелец 11.11, «Красный тест урока»): `tests/classic_lesson_prompt_locales.test.ts` — сторож считал пять
мест, где экран урока берёт подсказку; одно из них (шторка «Объясни проще») удалено по решению владельца 11.11
(`docs/work/tasks/remove-explain-simpler-buttons-2026-11-11.md`). Сторож приводится к четырём местам; `app/lesson1.tsx`
не трогается.

Дополнение (владелец 11.11, ответы на вопросы кнопками):
- «Фраза 28.38 → Вопрос в цели»: `it:28:38` `Potrebbe passare dopo la lezione.` → `…lezione?` — все девять подсказок
  вопросительные, ошибка была в самой цели. Внесено в `modules/classic-courses/it/lessons-28.json` (target; прежний
  target уходит в alternatives — так же, как делает сборщик) и в слой `scripts/classic_audit_layer.json` (раздел target),
  чтобы правка пережила пересборку. Плитки и допустимые пути не меняются: знаки препинания в них не входят.
- «Свободный текст теории → Оставить»: ~70 старых формулировок в прозе объяснений не трогаются.

Дополнение (координатор 12.11, по слову владельца «если есть хоть 1 работа — не прекращается»): строка
`es/glossary.json` в `modules/classic-courses/manifest.json` отставала от коммита 9accc8cbf (F18) — пересчитана по
сохранённой версии словаря (`git show HEAD:`), не по диску: в рабочем дереве лежат чужие несохранённые правки словаря.

Out of scope: плитки, соблазны, id; свободный текст теории; код приложения.

## Architecture

No architecture change: тот же шов, что в английском проходе — слой `TRANSLATION_FIXES` сборщика плюс
идемпотентное внесение в готовые lessons-файлы с пересчётом `index.rev` и строк `manifest.files`.
У курсов es/fr/de/it `rev` фразы берётся из исходного архива (contentRevision / contentFingerprint /
revision) и от подсказок не зависит — он не меняется.

## Security and privacy

Не затрагивается: статический учебный контент в бандле. Нет пользовательских данных, сети, авторизации,
секретов, разрешений. Privacy Policy не меняется.

## Technical debt

- Contain: объём находок (сотни на курс) не позволяет перечитать каждую вручную. Принимаются только
  находки высокой и средней уверенности, после выборочной проверки; все находки и принятые значения
  сохраняются артефактом, откат — одним коммитом.
- Accept temporarily: находки низкой уверенности не вносятся; список — владельцу.
- Contain: рабочая копия `manifest.json` содержит чужие незакоммиченные строки; в коммит идут только
  строки затронутого курса (HEAD + свои строки), чужие остаются в рабочей копии.

## Verification

- сверка скриптом: число фраз 1600 на курс, вне `sourceLocales` изменений 0, manifest = файлы;
- `npm run test:one -- tests/classic_courses_pack_2026_11_04.test.ts` через светофор;
- `tests/classic_lesson_prompt_locales.test.ts` (подсказка на языке ученика);
- артефакты находок и применённых правок в `docs/work/u20_exact_sense_2026_11_11/`.

## Rollback

`git revert` коммита курса либо удалить слой курса и вернуть `lessons-*.json`, `index.json` и строки
курса в `manifest.json` из предыдущего коммита. Прогресс пользователей привязан к id фраз и не страдает.
