# Task packet: банк заданий игр испанского и итальянского — уроки 13–16

Governance-ID: TG-4D15FA3533D0
Status: Done
Owner: Claude (сессия «Настройки шире», ночное дежурство 2026-11-12, задача координатора)
Related epic/enabler: D207; продолжение game-task-bank-es-it-lessons-9-12-2026-11-12.md

## Outcome

На уроках 13–16 испанского и итальянского игры Elevate дают задания своего урока, а не повтор урока 12:
«Лишнее слово» 8, «Сортировка» 8 карт, «Точное слово» 6, «На слух» 6, «Память» 2, «Охота» 2, «Собери диалог» 2,
свои неверные варианты «Потока» 8 фраз — на каждый урок 13–16. Мера: сторожа зелёные по выводу команды.

## Scope

In scope: `modules/games/bank/{odd_word,sort,exact,listen,memory,hunt,order,flow}_{es,it}.ts` (уроки 13–16),
`tests/game_task_bank_es_it.test.ts` (LESSONS и ORDER_LESSONS до 16, gapDecks), `tests/game_flow_distractors.test.ts`
(LAST_LESSON es/it → 16).

Out of scope: «Три формы» для es/it, уроки 17+, другие языки; итальянская фраза урока 28 с «?» (ждёт владельца).

## Architecture

No architecture change: только данные банков и расширение списков уроков в сторожах. Инварианты прежние:
задание урока N — только из слов уроков 1..N; «На слух» произносит фразу урока дословно (у неё есть запись).

## Security and privacy

Не применимо: статические учебные тексты.

## Technical debt

- Contain: однозначность «Лишнего слова» машиной проверяется только по фразам курса; смысловая вычитка ручная,
  сомнительное и отбракованное перечислено ниже.

## Verification

Через светофор: `npm run test:one -- tests/game_task_bank_es_it.test.ts`, `tests/game_flow_distractors.test.ts`,
`tests/game_content_integrity.test.ts`, `tests/phrase_audio_lookup.test.ts`.

## Rollback

`git revert` коммитов задачи — уроки 13–16 снова берут задания урока 12.

## Решения без владельца (безопасный вариант) и отбраковка

Отбраковано при вычитке — фраза с «ошибкой» оказалась бы верной по-испански/итальянски:
- испанские возвратные: «Ella me levanta», «Ana me levanta», «Me lava las manos», «Nos levanta», «Luis me sienta» —
  это верные фразы («она будит меня», «он моет мне руки»), поэтому замены me/te/se/nos не используются; вместо них —
  окончание (levanta / levantan, ducha / duchan) или la / las;
- «pagar con efectivo», «por el viaje», «tornare in casa», «Chiama la sorella», «Non chiudi la porta» — верные;
- «más tarde» → «tarde» — обе формы верны;
- итальянские приказы: «ты» и «вы» (Chiudi / Chiuda) обе верны, поэтому в «Лишнем слове» и «Точном слове» урока 16 —
  только la / il / le и verde / verdi; «на ты / на вы» разведены в «Сортировку» без пропуска;
- «Поток» it 16: «Andiamo al mercato» — не «Поедем…» (andare = и «идти», и «ехать»), неверные меняют место.

Сортировка испанского урока 14 — без пропуска (корзины «про одного / про нескольких»): с пропуском me/se
вторая корзина давала верную фразу «Ana me levanta».

## Итог проверки (12.11)

Через светофор, точечный прогон: game_task_bank_es_it, game_flow_distractors, game_content_integrity — PASS
(93 из 94 тестов). Красный один, чужой и известный: phrase_audio_lookup — не записана итальянская фраза урока 28
«Potrebbe passare dopo la lezione?» (ждёт владельца, не трогали). Все фразы «На слух» уроков 13–16 записаны.

Сторож «Потока» правит и сессия de/fr (LAST_LESSON de/fr → 16, не закоммичено): в коммит ушла только своя часть
строки (es/it → 16) патчем от HEAD; рабочая копия держит обе.
