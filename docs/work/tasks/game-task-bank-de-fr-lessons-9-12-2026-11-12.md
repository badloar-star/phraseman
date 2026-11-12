# Task packet: банк заданий игр немецкого и французского — уроки 9–12

Governance-ID: TG-D8D074065CB8
Status: In progress
Owner: сессия «банк заданий игр de/fr» по задаче сессии «Elevate app механики и макеты»
Related epic/enabler: D207 — игры Elevate в приложении; продолжение `game-task-bank-de-fr-2026-11-11.md`

## Outcome

После урока 8 игры немецкого и французского курсов берут задания своего урока, а не задания урока 8. На уроки
9–12 у каждой игры есть задания того же объёма и тех же правил вычитки, что и на уроки 1–8; «Поток» получает свои
неверные варианты на эти уроки. Мера: сторож банка de/fr расширен на уроки 1–12 и зелёный, фразы «На слух»
находят готовую запись (`tests/phrase_audio_lookup.test.ts`).

## Scope

In scope: `modules/games/bank/{odd_word,sort,exact,listen,memory,hunt,order,flow}_{de,fr}.ts` — записи уроков 9–12;
`tests/game_task_bank_de_fr.test.ts` — уроки 1–12.

Out of scope: `tests/game_flow_distractors.test.ts` — сейчас с несохранёнными правками другой сессии (его проверка
«фраза есть в уроке, вариант отличается одним словом» и так проходит по всем записям банка, включая 9–12);
`forms_de.ts` — список глаголов не привязан к урокам; банки en/es/it.

## Architecture

No architecture change: записи по номеру урока; подбор (`task_source.bankEntryForLesson`) сам берёт урок 9–12.

## Security and privacy

Не применимо: учебные тексты.

## Правила вычитки (те же)

Фраза задания — фраза урока или только из слов уроков 1..N; «Лишнее слово» — без лишнего остаётся верная фраза, убрав
другое слово, верной не получить; неверные варианты грамматически неверны или однозначно не подходят; без терминов;
«На слух» — дословная фраза урока (иначе нет готовой записи), неверные варианты отличаются одним словом и грамматичны.
Особенности: в немецком уроки 11–12 противопоставляют «где» (im, in der, auf dem) и «куда» (ins, in die, auf den) —
задания, где обе формы грамматичны («Ich gehe in der Küche» = «хожу по кухне»), не берутся; во французском — без
лишнего слова рядом с элизией (l’, d’, n’).

## Что сделано (число заданий на уроки 9–12)

На каждый язык: «Лишнее слово» 32 (8 на урок), «Сортировка» 4 колоды по 8 карт, «Точное слово» 24, «На слух» 24,
«Память» 8 раундов, «Охота на ошибку» 8, «Собери диалог» 8, «Поток» — 28 фраз со своими вариантами (7 на урок).

## Сомнительные задания — на решение владельца

| Язык | id | Фраза | В чём сомнение | Предложение |
|---|---|---|---|---|
| de | `ow-de-l11-1`, `ow-de-l11-7`, `ow-de-l11-8` | Der Schlüssel liegt auf [den] dem Tisch и т. п. | без верного слова остаётся «auf den Tisch» — так говорят о движении («кладу на стол»); с «liegt» это ошибка, но ученик урока 11 ещё не видел урока 12 | оставить |
| de | `ex-de-l09-4`, `ex-fr-l09-4` | ___ Gäste kommen (Unsere / Unser); Leur chambre est ___ (libre / libres) | всего два варианта | оставить |
| de | `mem-de-l12-1` | setzen — «садиться» | в уроке слово стоит только как «sich setzen» | оставить |
| de | `ord-de-l12-2` | Gehen wir an den See? / Heute gehen wir ins Kino. / Gehen wir auch ans Meer? / Am Samstag fahren wir ans Meer. | второй ответ связан с вопросом слабее, чем в других диалогах | оставить |
| fr | `ord-fr-l09-1`, `ord-fr-l10-2` | «Il est dans le sac.» / «Il y a des jeux dans le parc ?» | порядок держится на «il / le parc» уже названных раньше — однозначно, но тоньше, чем со словом «Et» | оставить |
| de | `ls-de-l10-4` | Ich bin beim Arzt / beim Nachbarn / beim Sport | неверные варианты собраны из слов урока, дословно в уроке их нет | оставить |
| fr | `sort-fr-l09` | mon / ma | карты «Ma sœur travaille ici», «Tu cherches ma veste» собраны из слов урока (в уроке — «sa sœur», «ta veste») | оставить |

## Technical debt

- Contain: уроки 13+ по-прежнему берут задания урока 12. Выход — следующая порция банка.

## Verification

Через светофор: `npm run test:one -- tests/game_task_bank_de_fr.test.ts tests/phrase_audio_lookup.test.ts
tests/game_flow_distractors.test.ts tests/game_content_integrity.test.ts tests/game_task_source.test.ts` — «N passed».

## Rollback

`git revert` коммитов: игры снова берут на уроках 9+ задания урока 8.
