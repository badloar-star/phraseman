# Task packet: склонение «<число> монет» в окнах Пика и «Идеального урока» (9 языков) + список остальных мест

Governance-ID: TG-4B8746D4B283
Status: In progress
Owner: сессия «Специалист по переводам» (Ревизор P19, 5a723fc02 → координатор 15.10; строки moments_strings.ts теперь у переводчика)
Related epic/enabler: моменты v3, сборка 16.10

## Outcome

«+21 монета», «22 монеты», «25 монет», en «1 coin / 2 coins», pl «22 monety / 25 monet / 21 monet» — в окнах повышения/удержания/шеринга
итога недели (m01/m02), позиционных окнах m05 и «Идеальном уроке» m09. Проверено на 1/2/5/11/21/22/25 во всех 9 языках тестом.
Плюс список остальных мест приложения, где «<число> монет/фраз/дней» стоит без склонения.

## Scope

In scope: `components/spire/moments/moments_strings.ts`, `components/spire/moments/position_moment_strings.ts`,
`components/lesson_moments/perfect_moment_strings.ts` — шаблоны получают подстановку слова (`{nw}` для `{n}`, `{cw}` для `{coins}`),
форма считается в функции текста через `coinRankCoinsWord` (общий `pluralWord`); новый тест `tests/moments_coin_plural.test.ts`.
Out of scope: `step_moment_strings.ts` (зона Дизайна — в список), вызывающие экраны (не меняются: те же ключи и переменные).

## Architecture

Функции текста (`momentText`, `positionMomentText`, `perfectMomentText`) сами вычисляют слово по числу из переменных `n`/`coins`
(число может прийти отформатированным «1 180» — берём цифры). Вызывающий код не меняется.

## Security and privacy

Не применимо: только видимые тексты.

## Technical debt

Места вне этих трёх файлов — Contain: список координатору с файлами и строками, чинят владельцы или переводчик по слову координатора.

## Verification

Новый тест склонения (1/2/5/11/21/22/25 × 9 языков), контракты spire_moments_v3, spire_position_moments, lesson perfect, сторожа i18n — через slot.sh.

## Rollback

`git revert` коммита — шаблоны вернутся к фиксированному «монет».

## Сделано

- `moments_strings.ts`: `promoBonus`, `promoShortBody`, `promoShareText`, `stayBody`, `stayBodyNoGap` — `{nw}`/`{cw}`; помощники `momentCoinWord`, `withMomentCoinWords`
  (именительный и винительный, общее правило `constants/plural.ts`).
- `position_moment_strings.ts`: `overtakeSub` — винительный (`на 1 монету`, pl `o 1 monetę`), `gapCoins` — именительный.
- `perfect_moment_strings.ts`: `noMistakes` — «+1 монета / +22 монеты / +25 монет».
- Тест `tests/moments_coin_plural.test.ts`: 1/2/5/11/21/22/25 × 9 языков, винительный, «1 181 монета», нет нераскрытых плейсхолдеров.

## Остальные места «<число> монет/фраз/дней» без склонения (список координатору)

Видимые игроку:

| файл:строка | текст (ru) | зона / кто чинит |
|---|---|---|
| components/spire/moments/step_moment_strings.ts:22 | `+{n} монет за вершину` (9 языков) | Дизайн — тот же приём `{nw}` через `withMomentCoinWords` |
| components/stories/story_strings.ts:29 | `{coins} монет за неделю` (+ uk) | сторис — `{cw}` |
| components/stories/story_strings.ts:33 | `Куплен за {price} монет` (+ uk) | сторис — склонение по `{price}` |
| app/session_attempts/session_attempts_copy.ts:37 (uk; ru — соседние строки) | `Потрібно ще ${missing} монет` | попытки урока — `pluralWord` |
| components/spire/spire_game_strings.ts:76 | `{s} ступеней за неделю · {p} …` | Пик — уже есть `spire_plurals.ts` (ступень) |
| app/notifications.ts:721, 1830–1833, 1882, 1931–1934, 2032–2033, 2315 | `Серия ${streak} дней`, `${streak} дней труда`, `Твоя цепочка: ${streak} дней` | уведомления — `pluralWord` (форма дня) — «Серия 1 дней», «Серия 21 дней» |
| app/notifications.ts:836 | `Вчера ты выучил ${phrasesLearned} фраз.` | уведомления — «выучил 1 фраз»; заодно «выучил» — только мужской род |
| components/ReviewPromptModal.tsx:137 | `${streakDays} дней подряд` | окно оценки — `pluralWord` |
| app/activity_365_analytics.ts:333 | `Серия ${currentStreak} дней уже работает…` | аналитика активности (видимый текст) — `pluralWord` |
| app/french_phrase_analytics.ts:151 | `…: ${topCategory.mistakeCount} ошибок за 30 дней.` | аналитика фраз — «1 ошибок» |
| app/lesson_menu.tsx:966 | `${wordsLearned}/${total} слов` | меню урока — «1/12 слов» допустимо (дробь читается «из 12 слов») — оставить |
| app/level_exam_copy.ts:88 | `${durationMinutes} минут` | экзамен уровня — если длительность всегда 5/10/15/20 — безопасно; иначе `pluralWord` |
| constants/i18n.ts:164 | `${n} фраз — осваиваем` | общий словарь — «1 фраз», «22 фраз» |
| app/community_pack_create.tsx:202, 213; app/community_packs/packCardRemovalCopy.ts:16 | `Минимум ${MIN} карточек`, `Не более ${MAX} карточек`, `минимум {min} карточек` | константы MIN = 10, MAX = 50 (app/community_packs/schema.ts) — форма «карточек» верна, менять не нужно |

Не видимые игроку (журналы, не чинить): `app/energy_session_operation_ledger.ts:1249`, `app/flashcards/pack_continue_position.ts:84`.
