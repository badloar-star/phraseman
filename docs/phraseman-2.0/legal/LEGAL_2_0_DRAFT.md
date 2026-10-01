# Черновик правок Privacy Policy и Terms под PhraseMan 2.0

Статус: ЧЕРНОВИК для владельца (D88). Живые тексты (`app/legal/*.json`, `legal/*.json`, `privacy.html`, `terms.html`) НЕ изменены.
Основание — решения владельца D70–D90 в `docs/phraseman-2.0/03_DECISIONS.md`.
Источник фактов: скан английских JSON 2026-09-30 (`app/legal/privacy_policy_en.json`, `app/legal/terms_of_use_en.json`; iOS-версии содержат те же места).

## Что меняется в продукте (и должно исчезнуть из текстов)

| Было в текстах | Решение | Что писать |
|---|---|---|
| Shards (жемчуг) как основной виртуальный баланс, Shards packs, покупки наборов за Shards | D70/D84: жемчуг удалён, остатки обнулены без компенсации | Убрать Shards везде. Основной виртуальный баланс — **Coins** (монеты). Упомянуть, что прежний баланс Shards прекращён при обновлении 2.0 без компенсации (юридически обязательно, иначе спор о «потерянной валюте») |
| Runes | D03: руны → монеты | Заменить на Coins |
| Arena matches, duels, Arena star rank, arena stars, tournaments | D74/D78/D83: Арена и турниры удалены | Убрать. Вместо лиги/Арены — **Spire** (Шпиль): недельный результат, ступени, топ-3 |
| leaderboards, clubs, leagues | Лиги удалены (D54, Шпиль) | Заменить на Spire weekly results |
| gifts, gift history, weekly friends chest, nudge/gift-availability | D09: подарки удалены | Убрать подарки и сундук; друзья и «Привет» остаются (без награды, PM-165) |
| boosts | удалены (PM-055, PM-088) | Убрать |
| XP, level | D02: удалены | Проверить отсутствие (скан 2026-09-28 уже PASS) |
| voice tutor / voice calls / Realtime / voice-lesson minutes | MAX законсервирован, text tutor удалён (D81) | Убрать весь раздел «voice tutor voice privacy summary» и абзацы о голосовых звонках и минутах; оставить только то, что реально работает: свободный разговор в «Диалогах» (текст/голосовой ввод, если он есть — проверить) |
| rating comments on «Arena match» | Арена удалена | Убрать «Arena match» из списка |
| reward roulette (referral) | D80: реферальная рулетка ОСТАЁТСЯ | Оставить как есть |

## Что добавить

1. **Coins (монеты)**: основной виртуальный баланс; зарабатываются полезной практикой; тратятся на повышение ранга монеты, визитку (10 000, PM-185) и наборы сообщества (D85); не имеют денежной стоимости, не выводятся.
2. **Energy**: запас 5, −1 за начатое занятие (списывается при показе первого вопроса, D72), автоматический возврат при сбое до первого вопроса (D87), +1 за 10 минут; Plus без расхода энергии.
3. **Free limits**: 3 набора (включая наборы из ссылок на видео, D82), 50 карточек, 30 тренировок карточек в месяц, 30 сессий Шпиля в месяц. Plus снимает лимиты (1500 карточек).
4. **Spire**: какие данные видят другие (ник, аватар-монета, ступень, место в топ-3), граница недели.
5. **Admin grants**: поддержка может вручную начислять монеты и дни Plus (D86).
6. **Удаление данных прекращённых функций**: данные лиг, Арены, подарков, XP и жемчуга удаляются с серверов после выхода 2.0 (D90); история покупок за реальные деньги сохраняется по закону.
7. Языковые пулы Шпиля es/de/fr помечены «бета» и не проверены носителем (D77); ошибку можно сообщить, задание снимается.

## Конкретные места в английском тексте

Terms (`terms_of_use_en.json`):
- §2/§3 (социальные функции, строка ~20): убрать «leaderboards, clubs, tournaments, Arena matches and duels … gifts … Arena star rank, match results and history, tournament scores and placements»; вставить Spire.
- §6 Community Packs (~24): «by spending Shards» → «by spending Coins».
- §7 Purchases (~32): убрать «Shards packs»; убрать «voice-lesson minutes in voice tutor-type plans».
- §8 «Shards and virtual items» (~35–36): переписать целиком под Coins и Energy; убрать Shards, Runes, arena stars, gifts, boosts; добавить абзац о прекращении Shards без компенсации.
- §10 Referrals (~43–44): убрать gifts; рулетку оставить.
- §§ liability/indemnity (~76, ~84, ~88): «Shards» → «Coins».

Privacy (`privacy_policy_en.json`):
- «voice tutor voice privacy summary» (~7–8): удалить раздел.
- §3 (~24): «Shards, Runes, and Energy balances and ledgers, Arena and tournament progress» → «Coins and Energy balances and ledgers, Spire progress».
- §5 (~28): убрать Arena, tournament, club, gifts, weekly friends chest, gift-availability.
- §6 (~32): «with Shards or Runes» → «with Coins».
- §7 (~35–36): убрать gifts, gift history, Shards ledger; рулетку оставить.
- §9 (~43–44): убрать Shards purchases и абзац о Shards balances.
- §11 AI (~52, ~60): убрать «Arena match» и все абзацы о voice tutor / realtime voice calls; оставить AI в «Диалогах», объяснениях, отчётах.
- §§ purposes/legal basis (~76, ~80): «manage Shards and rewards; run leaderboards, clubs … gifts» → «manage Coins and Energy; run Spire weekly results, friends».

## Порядок публикации (после одобрения владельца)
1. Владелец утверждает этот черновик (или правит).
2. Правка всех 4 JSON + `legal/*` + `privacy.html` / `terms.html` синхронно; обновить дату «Last updated».
3. Прогон `terms_retired_word_scan` и расширенного скана (Shards, Arena, tournament, gift, voice tutor) — ноль вхождений.
4. Store-декларации (PM-250): App Privacy / Data safety — убрать голосовые данные, если голоса больше нет.

## Дополнение D128 (2026-09-30): озвучка карточек через OpenAI TTS

Текущий §11 перечисляет генерацию ответов и объяснений, но НЕ озвучку текстов, созданных
пользователями. До релиза (вместе с остальными правками черновика) добавить в §11
`privacy_policy_*.json` и `privacy.html`:

> **Card audio.** To give flashcards natural pronunciation in the correct language, the text of
> cards in official sets and in community sets that you choose to publish (after moderator
> approval) is sent to an AI text-to-speech provider (OpenAI) to generate audio. Only the card
> text and its language are sent — no account identifiers, email, or profile data. The generated
> audio is stored with the published set and played to learners. Private sets that you do not
> publish are not sent for voicing.

RU-версия: «Озвучка карточек. Чтобы карточки звучали естественно и на нужном языке, текст карточек
официальных наборов и тех пользовательских наборов, которые вы публикуете (после одобрения
модератором), отправляется AI-сервису синтеза речи (OpenAI). Передаются только текст карточки и её
язык — без идентификаторов аккаунта, почты и данных профиля. Готовое аудио хранится вместе с
опубликованным набором. Приватные неопубликованные наборы на озвучку не отправляются.»

Store-декларации (PM-250): OpenAI уже указан как обработчик для AI-функций; отметить категорию
«User content — used for app functionality» для опубликованных наборов.

## Дополнение PM-111/112 (2026-10-01): сохранённые видео

Новые данные: список видео, которые человек сохранил себе («избранное»), хранится в его аккаунте
(`users/{uid}/video_favorites/{videoId}` — только id ролика и время сохранения). Общий счётчик
сохранений ролика — обезличенное число, без списка людей.

- **Privacy Policy (EN), раздел «Data we collect» → learning activity:** "Videos you save to your
  favorites (the video identifier and the time you saved it). We also keep an anonymous total of how
  many people saved each video; this total does not identify anyone."
- **RU:** «Видео, которые вы сохранили в избранное (идентификатор видео и время сохранения). Мы также
  храним обезличенное общее число сохранений каждого видео — по нему нельзя определить, кто сохранил».
- **Удаление:** список удаляется вместе с аккаунтом (существующий путь удаления сносит документ
  пользователя и вложенные коллекции).
- Публиковать вместе с остальными правками 2.0 перед релизом (решение владельца R6).
