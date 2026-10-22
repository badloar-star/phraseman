# Task packet: тексты «Друзей» за выключателем — сквозная вычитка 9 языков (Переводчик, координатор 22.10)

Governance-ID: TG-D3DB1789CBCD
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Проверены падежи и формы числа, обращение, длина кнопок и единство терминов («дуэль», «вызов», «серия», «занятие»).

| Файл | Состояние | Итог |
|---|---|---|
| `pair_copy.ts` (Серия вдвоём, полоса «Нет сети») | вычитан ранее (13ea0162f, f4a3a028f, eeb659cce); мёртвая строка offlineSaved убрана Моментами (a3d58ff57) | без правок |
| `lesson_together_copy.ts` (Урок вместе) | вычитан ранее (cedaa4255, 9de6be219), после — без изменений | без правок |
| `duel_copy.ts` (Дуэль) | вычитан ранее (d4e482844); новые tileTitle / tileSub (bfc46c89b) верны | без правок |
| `duel_play_copy.ts` (ход дуэли, итог, отказ, «время вышло») | новый | верно: «секунда/секунды/секунд», pl «sekundy/sekund»; «вызов» везде = uk «виклик», es/pt «desafío/desafio», tr «düello daveti», pl «wyzwanie», vi «lời thách» — как в duel_copy; длина кнопок ≤ 10 знаков |
| `lesson_invite_friend_copy.ts` (приглашение у друга) | новый | **3 правки**, ниже |

Правки в `lesson_invite_friend_copy.ts` — те же термины, что уже выровнены в `lesson_together_copy.ts`:
- tr «seni **derse** çağırıyor» → «seni **oturuma** çağırıyor»; тост «birlikte **ders**» → «birlikte **oturum**»
  (занятие = «oturum», «ders» = урок);
- vi «Bài N · **Phần** M» → «Bài N · **Buổi** M» (занятие = «Buổi»).

На заметку, не ошибка: в ходе дуэли id «Ucapkan dalam bahasa Inggris», а в заданиях Learning V2 та же подпись —
«Katakan dalam bahasa Inggris». Свести к одному можно при следующем касании.

## Scope

In scope: тексты пяти файлов, правки — только явные ошибки. Out of scope: логика, ru.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Не проверено носителями.

## Verification

`babel.parseSync`; тестов со старыми строками нет. Полные прогоны не запускал (тишина по прогонам).

## Rollback

`git revert <коммит>`.
