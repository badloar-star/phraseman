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

## Дополнение Q41/PM-162 (2026-10-01): блокировка пользователей

Новые данные: список пользователей, которых человек заблокировал в разделе «Друзья»
(`users/{uid}/blocked/{id заблокированного}` — только идентификатор и время блокировки).
Список нужен исключительно для фильтрации: заблокированный не может присылать «Привет» и заявки в друзья.
Заблокированному о блокировке не сообщается.

- **Privacy Policy (EN), раздел Data we collect, social features:** If you block another user, we store
  that user identifier and the time of the block, only to stop their friend requests and greetings
  from reaching you. The blocked user is not notified.
- **RU:** Если вы блокируете другого пользователя, мы храним его идентификатор и время блокировки —
  только чтобы его заявки в друзья и «Привет» до вас не доходили. Заблокированному об этом не сообщается.
- **Удаление:** список удаляется вместе с аккаунтом; записи о вас в списках других людей тоже удаляются.
- Публиковать вместе с остальными правками 2.0 перед релизом.

## Сверка с фактической реализацией (PM-248/PM-249, 2026-10-01)

Юридическая проверка ЭТОГО черновика юристом: НЕ ПРОЙДЕНА и отдельно не выдаётся за пройденную (PM-249-A2). Нужна до публикации.
Опубликованные тексты (`app/legal/*`, `legal/*`, `privacy.html`, `terms.html`) не менялись; `legal:sync` не запускался. Публикация — одним пакетом перед релизом (решение владельца).

### Что в черновике, а что в коде (расхождения)

| Тема | Факт в коде | Что в опубликованном тексте | Что сделать |
|---|---|---|---|
| Срок до удаления аккаунта | **14 дней**, не 30 (`functions/src/account_delete_grace.ts:21`); восстановление при входе в эти 14 дней | EN privacy §19/§20 и terms §3 уже говорят «14-day grace» — верно | Ничего. В ТЗ звучало «30 дней» — это неверно. 30 дней — только срок жизни служебной квитанции удаления Account V2 (`functions/src/accounts_v2_deletion/receipt.ts:37`, без содержимого, TTL по `expireAt`); 90 дней — срок «ожидающей» записи там же (строка 43) |
| TTL 90 дней у `app_errors` / `app_activity` | **Реализован в коде 01.10 (f8c948552), НЕ выложен** (на момент аудита не был: ни один писатель не ставит `expireAt` (`functions/src/client_reports.ts`, `payment_webhook_alert.ts`, `max_voice_*`), в `firestore.indexes.json` нет TTL-политики для этих коллекций (TTL есть только у accounts_v2_*, dialogue_v2_*, taskSecrets)) | Числа «90» в тексте нет: «analytics/error records may be retained longer where needed» | **Не писать «90 дней» в политику, пока не будет кода + политики TTL в консоли.** Решение координатора 01.10 п.4 пока не исполнено. Нужна отдельная задача: `expireAt = now + 90 дн.` в писателях + политика TTL (включает владелец, DEPLOY_NOW) |
| Хранилище прогресса на устройстве (Account V2) | SQLCipher: `app.config.js:161` (`useSQLCipher: true`); ключ в защищённом хранилище устройства, исключён из облачного бэкапа Android (`plugins/withAndroidBackupRules.js`, пакет 6E). Флаг V2 по пакету 6B — выключен | В тексте упомянуто шифрование только в общем виде (2 вхождения) | Добавить фразу (ниже). Публиковать вместе с включением V2, не раньше |
| Блокировка пользователей | `users/{uid}/blocked/{id}`; чистится при удалении обоих участников (`account_delete.ts:1043-1044`) | Нет | Уже в черновике (Q41) — оставить |
| «Привет»: окно тишины | `users/{sender}/friend_hello_cooldowns/{target}` — идентификатор получателя и время, 6 ч; сносится при удалении аккаунта (`account_delete.ts:1036-1038`); push не уходит не-другу | Нет | Добавить фразу (ниже) |
| Избранные видео | `users/{uid}/video_favorites/{videoId}` + обезличенный счётчик | **Уже опубликовано** коммитом 39419617c (с `legal:sync`), хотя владелец решил публиковать разом | Сообщить координатору: часть черновика уже «живая»; это не вред (текст верный), но порядок публикации нарушен |
| Жалобы (наборы, задания Шпиля) | `client_reports.ts`: запись жалобы с идентификатором автора и причиной; жалобы на задания Шпиля идут тем же путём (`client_reports.ts`, квитанция `spire_task_report_receipts`) | «Reports … records» есть в общем виде | Добавить Шпиль в перечень (ниже) |
| Аналитика | PostHog (EU-хост, `app/posthog_client.ts`) и необязательная Firebase Analytics — только после согласия (`app/analytics_consent.ts`); Crashlytics включён всегда (`app/_layout.tsx:1874`) | Совпадает (аналитика молчит без согласия, Crashlytics работает) | Ничего |
| App Check / аттестация устройства | **Снято 2026-10-01** отдельной сессией по пломбе: клиент больше не запрашивает Play Integrity / App Attest, пакет `@react-native-firebase/app-check` удалён; действует с новой нативной сборки | Одно упоминание «App Check» | Упоминание App Check из политики убрать; в Data Safety/App Privacy аттестацию не декларировать |
| Голос | Распознавание речи: `expo-speech-recognition` (микрофон + системное распознавание Google/Apple; на iOS по возможности на устройстве), `whisper.rn` на устройстве. Раздел MAX (голосовые звонки, WebRTC) законсервирован | В тексте 7 вхождений «voice tutor», 1 «voice call» | Убрать, как в таблице выше; оставить микрофон/распознавание для произношения и диалогов |
| Опубликованные устаревшие слова | Privacy EN: Shards 9, Runes 2, Arena 4, tournament 2, gift 8, voice tutor 7, XP 18; Terms EN: Shards 12, Arena 4, gift 8, XP 25, boost 1 (счёт на 2026-10-01) | Описывают УДАЛЁННОЕ как действующее | PM-248-A2 / PM-249-A1 не принять до публикации правок |

### Недостающее: готовый текст (EN + RU, коротко)

**Privacy — Account storage / Хранение учётной записи (добавить в §3 или §19):**
> EN: Your learning progress and cards are kept on your device in an encrypted local database. The encryption key stays in the device's secure storage and is excluded from cloud backups. A synchronized copy is kept on our servers so you can restore your progress; it is deleted with your account (14-day grace period, then irreversible). A short technical deletion receipt without your content is kept for up to 30 days to prove the deletion completed.
> RU: Прогресс и карточки хранятся на вашем устройстве в зашифрованной локальной базе. Ключ шифрования лежит в защищённом хранилище устройства и не попадает в облачные резервные копии. Синхронизированная копия хранится на наших серверах, чтобы вы могли восстановить прогресс; она удаляется вместе с аккаунтом (14 дней на возврат, затем необратимо). Короткая техническая квитанция об удалении — без вашего содержимого — хранится до 30 дней, чтобы подтвердить, что удаление завершено.

**Privacy — «Привет» (social features):**
> EN: When you send a greeting to a friend, we store the recipient identifier and the time, only to avoid repeat notifications within a few hours. This record is deleted with either account.
> RU: Когда вы отправляете «Привет» другу, мы храним идентификатор получателя и время — только чтобы не слать повторные уведомления в течение нескольких часов. Запись удаляется вместе с аккаунтом любого из участников.

**Privacy — Spire reports / Жалобы на задания Шпиля:**
> EN: If you report a Spire task as wrong, we store the task identifier, your account identifier and the reason you choose, to fix or remove the task. Spire language pools for Spanish, German and French are marked beta.
> RU: Если вы сообщаете, что задание Шпиля составлено неверно, мы храним идентификатор задания, ваш идентификатор и выбранную причину — чтобы исправить или снять задание. Языковые пулы Шпиля для испанского, немецкого и французского помечены «бета».

**Privacy — Community pack publishing limit / Лимит публикации наборов (Q55, PM-018-A2):**
> EN: To limit abuse, we store a per-account daily counter of community packs you published (the date and a number up to 3). It is deleted with your account.
> RU: Чтобы ограничить злоупотребления, мы храним суточный счётчик опубликованных вами наборов сообщества (дату и число до 3). Он удаляется вместе с аккаунтом.

**Privacy — Retention (добавить ТОЛЬКО после реализации TTL):**
> EN: Error and activity logs are kept for up to 90 days.
> RU: Журналы ошибок и активности хранятся до 90 дней.
(Код готов с 01.10 — `functions/src/log_ttl.ts`, коммит f8c948552: писатели ставят `expireAt`, политики TTL добавлены в `firestore.indexes.json`. Публиковать формулировку ТОЛЬКО после деплоя indexes и включения TTL в консоли, и помнить: записи ДО релиза без `expireAt` TTL не удалит — нужен одноразовый бэкфилл.)

**Terms — переход старых прав (PM-249), одним абзацем в §8 «Virtual items»:**
> EN: With version 2.0, the previous virtual balance (Shards, including any bought with real money) and the former Arena, tournament, gift and experience-point features end and are not compensated; official card sets that were unlocked with Shards are no longer offered. Lifetime Pro owners receive Coins instead of Shards as referral prizes. Lessons that were free to you before the update stay free.
> RU: С версией 2.0 прежний виртуальный баланс (жемчуг, включая купленный за реальные деньги), а также прежние Арена, турниры, подарки и очки опыта прекращаются без компенсации; официальные наборы карточек, открытые за жемчуг, больше не предлагаются. Владельцы вечного Pro получают монеты вместо жемчуга как призы реферальной рулетки. Уроки, которые были для вас бесплатными до обновления, остаются бесплатными.
Основания в решениях: D68, D70, D103 (жемчуг за деньги сгорает), D100/D105, D122. Фраза «Plus, вечный Pro и купленные наборы сообщества сохраняются» УБРАНА по ответу владельца 01.10 («ничего из этого») — в условия её не писать.

### Что осталось не принятым
- PM-248-A1/A2, PM-249-A1: нужна публикация (владелец) и юрист — NOT_MET.
- TTL 90 дней: код и политика в `firestore.indexes.json` готовы (f8c948552), НЕ выложены; старые записи без `expireAt` не удаляются без бэкфилла.
- ~~Конфликт «App Check запломбирован» ↔ клиент всё ещё аттестует~~ — снят 2026-10-01 (нужна новая нативная сборка).
