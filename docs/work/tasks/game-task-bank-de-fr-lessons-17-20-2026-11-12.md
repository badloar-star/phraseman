# Task packet: банк заданий игр немецкого и французского — уроки 17–20

Governance-ID: TG-DEFR1720B4C7
Status: Done
Owner: сессия плиток Главной по задаче сессии «Elevate app механики и макеты» (слово владельца 12.11: «работа идёт дальше»)
Related epic/enabler: D207; продолжение `game-task-bank-de-fr-lessons-13-16-2026-11-12.md`

## Outcome

После урока 16 игры немецкого и французского берут задания своего урока. На уроки 17–20 — тот же объём и те же правила
вычитки. Мера: сторож банка de/fr расширен на уроки 1–20, сторож «Потока» проверяет de/fr до урока 20.

## Scope

In scope: `modules/games/bank/{odd_word,sort,exact,listen,memory,hunt,order,flow}_{de,fr}.ts` — записи уроков 17–20;
`tests/game_task_bank_de_fr.test.ts` — уроки 1–20; `tests/game_flow_distractors.test.ts` — только de/fr в `LAST_LESSON`.

Out of scope: банки en/es/it, данные уроков.

## Architecture

No architecture change.

## Security and privacy

Не применимо: учебные тексты.

## Что сделано (на каждый язык)

«Лишнее слово» 32, «Сортировка» 4 колоды по 8 карт, «Точное слово» 24, «На слух» 24, «Память» 8 раундов, «Охота на ошибку» 8,
«Собери диалог» 8, «Поток» 28 фраз (7 на урок).

Темы: de 17 — sein + прошедшее (ist / hat), 18 — war / hatte, 19 — mich / sich / uns, 20 — сравнение (als / wie);
fr 17 — me / te / se, 18 — avoir + прошедшее (a / ont), 19 — être + прошедшее, род и число (arrivé / arrivée),
20 — était / étaient.

## Данные уроков

`de/lessons-18,20` и `fr/lessons-18,19,20` — с несохранёнными правками другой сессии; фразы и русские переводы совпадают
с последним коммитом (проверено), банк опирается только на них.

## Решено без владельца (безопасный вариант)

- Сторож нашёл слова, которых к уроку ученик ещё не видел, — заменены: schnell (лишнее слово → «die»), sich erholen /
  sich verspäten («Память» → sich treffen / sich waschen), faire / resté (неверные варианты «Точного слова»).
- Немецкие возвратные: не взяты задания, где без «лишнего» местоимения остаётся живая фраза — «Ich wasche [dich] mich»
  (Ich wasche dich — тоже верно), «Wir treffen [euch] uns», «Anna setzt ___ neben Tom» (uns / mich тоже верно).
- Французские возвратные: в «Точном слове» не взяты пропуски на месте me / te / se — «Elle ne me couche pas»,
  «Je te prépare» грамматичны; пропуск ставится на глагол.
- «Лишнее слово» de 20: «als / wie» не берутся лишним словом после schneller / jünger — «schneller wie» встречается
  в живой речи; взяты so … wie и genauso … wie, где als однозначно неверно.
- «Точное слово» fr 20: к «Elle n’avait pas ___ vélo» нет варианта «un» — «pas un vélo» грамматично.

## Сомнительные задания — на решение владельца

| Язык | id | Что | В чём сомнение | Предложение |
|---|---|---|---|---|
| de | `ex-de-l20-1`, `ex-de-l20-2` | teurer ___ die Bahn (als / so / am); so groß ___ unsere (wie / als / am) | «so» и «am» — неверны, но очевидно; «als» во втором — старинно-неверно | оставить |
| de | `ls-de-l19-1` | Ich wasche mich — Ich wasche dich / uns | неверные варианты сами по себе живые фразы; отличие слышно | оставить |
| fr | `ex-fr-l17-5`, `ex-fr-l17-6` | Nous nous ___ tôt (couchons / couche / levez) | «levez» — другой глагол, неверен по лицу; нужных форм couche- курс ещё не дал | оставить |
| fr | `sort-fr-l19` | Ma sœur est ___ / Le facteur est ___ | карты собраны из пройденных слов, дословно в уроке их нет | оставить |
| de | `flow de:18:07` | «У меня было время» — вариант «У меня есть время» | отличие только временем | оставить |

## Verification

Через светофор: `npm run test:one -- tests/game_task_bank_de_fr.test.ts tests/game_flow_distractors.test.ts
tests/phrase_audio_lookup.test.ts tests/game_content_integrity.test.ts tests/game_task_source.test.ts`.
В `phrase_audio_lookup` красная только проверка «каждая фраза каждого урока» — итальянская «Potrebbe passare dopo
la lezione?» (не этот банк).

## Rollback

`git revert` коммита: игры снова берут на уроках 17+ задания урока 16.
