# Политика R1: озвучка карточек (П9), запись согласий, избранное видео — заготовка, НЕ применена

Ядро, 12.10. **Все три пункта ждут «да» владельца.** Файлы `legal/*.json` не тронуты; патч рядом —
[legal_r1_policy_additions.patch](legal_r1_policy_additions.patch) (проверен `git apply --check` на HEAD 12.10).

Меняются оба файла политики одинаково: `legal/privacy_policy_en.json` (Android/сайт) и `legal/privacy_policy_en_ios.json`
(iOS). Разделы 6, 10, 13 в них совпадают дословно, поэтому одна правка — для обоих.

## 1. П9 — озвучка карточек опубликованных наборов (`cardTts*`)

**Зачем.** Сейчас §13 обещает, что озвучка делается только на телефоне и к нам не попадает. С `cardTtsPackWorker` это
станет неправдой: текст карточек одобренного набора уходит с нашего сервера в OpenAI TTS. Выкладывать `cardTts*` до
публикации этого текста нельзя (RELEASE_DAY_PLAN, шаг 3б).

**Факты из кода** (functions/src/card_tts_core.ts, card_tts_worker.ts):

| Что | Как в коде |
|---|---|
| Когда | при одобрении набора (`enqueueCardTtsJob` в community_packs.ts) → задача `card_tts_jobs/{packId}` |
| Кто шлёт | наш сервер (Cloud Function), не телефон |
| Куда | OpenAI `/v1/audio/speech`, модель `gpt-4o-mini-tts`, голос по языку, скорость 0.92 |
| Какой текст | сторона карточки на изучаемом языке (`targetText`, иначе английская), ≤ 300 знаков на карточку |
| Что ещё уходит | ничего: в запросе только model, voice, input, speed — ни uid, ни имени автора |
| Что хранится | mp3 в Firebase Storage `card-audio/v1/<язык>/<ключ>.mp3`; ключ — хэш текста, один клип на одинаковый текст в любых наборах |
| Сколько | не удаляется при снятии набора (клип общий) — «пока нужен наборам» |
| Потолки | 15 000 знаков за прогон, 300 000 знаков в сутки, 4 прогона набора в сутки; рубильник `card_tts_enabled` (по умолчанию ВЫКЛ) |

### §6 «User content, community packs, reports, and moderation» — новый абзац

**Было:** абзац про проверку и перевод наборов ИИ заканчивается словами «…a person reviews the reply before it is sent to
you in the App.», дальше сразу абзац «We may review, block, remove…».

**Стало:** между ними новый абзац:

> When a Community Pack is approved for publication, the text of its cards in the language being learned (up to 300
> characters per card) may be sent from our servers to our AI provider (OpenAI) to generate spoken audio for the cards.
> Only the card text is sent; no account details, names, or identifiers are sent with it. The generated audio files are
> stored in our cloud storage (Google Firebase) and played to users who open the pack. Because a clip depends only on its
> text, the same clip may be reused for identical card text in other packs. Audio is kept for as long as it is needed to
> provide the packs that use it and may be removed at any time.

Для владельца по-русски: когда набор одобрен, текст его карточек (на изучаемом языке, до 300 знаков на карточку) может
уйти с нашего сервера в OpenAI, чтобы получить озвучку. Уходит только текст карточки — без данных аккаунта, имён и
идентификаторов. Готовое аудио лежит в нашем облаке (Google Firebase) и проигрывается тем, кто открыл набор. Одинаковый
текст в разных наборах озвучивается один раз. Аудио хранится, пока нужно наборам, и может быть удалено в любой момент.

### §13 «Text-to-speech, speech recognition, and voice features» — первый абзац

**Было:**

> The App uses your device's built-in text-to-speech engine through expo-speech to pronounce English phrases and example
> sentences. Based on the current implementation, pronunciation is generated on device and Knowly does not receive the
> generated text-to-speech audio.

**Стало:**

> The App uses your device's built-in text-to-speech engine through expo-speech to pronounce English phrases and example
> sentences. Based on the current implementation, this pronunciation is generated on device and Knowly does not receive
> the generated text-to-speech audio. Some approved Community Packs also include pre-generated audio for their cards,
> created on our servers from the card text by our AI provider's text-to-speech service, as described in the Community
> Packs section; it does not use your voice or anything you type.

Для владельца: озвучка на телефоне остаётся как была; добавлено, что у части одобренных наборов есть заранее готовое
аудио, сделанное на нашем сервере сервисом OpenAI из текста карточки, — ни голос человека, ни то, что он вводит, для
этого не используются.

## 2. Запись выбора согласий (фраза от Авторизации)

**Факты из кода:** `record_age_consent_snapshot.ts` пишет в `user_consents/{stableId}` выбор аналитики
(`analyticsConsent`), версию приложения и платформу; `record_ai_consent_factory.ts` — состояние ИИ-согласия и время
изменения. Документ стирается при удалении аккаунта (`account_delete.ts`, `user_consents`).

### §10 «Analytics, diagnostics, device identifiers, and app health» — абзац о согласии

**Было:** абзац заканчивается «…You can change your analytics choice at any time in the App settings.»

**Стало:** в конец того же абзаца добавлено одно предложение:

> We also keep a record of your analytics and AI-feature consent choices (granted or denied, when, app version and
> platform) so we can honour and demonstrate them.

Для владельца: мы храним запись о том, что человек выбрал в согласиях на аналитику и ИИ (да/нет, когда, версия
приложения и платформа), чтобы соблюдать этот выбор и при необходимости подтвердить его.

## 3. Избранное видео (нашёл Дизайн, R1_SPIRE_COMMUNITY_OPTIMISTIC_UI.md «Приватность»)

**Факты из кода:**
- `app/video_favorites.ts` пишет `users/{stableId}/video_favorites/{videoId}` = `{ videoId, savedAtMs }`. Правило
  `firestore.rules:1682` пускает только эти два поля, писать и читать может только владелец.
- Общий счётчик сохранений ролика (`functions/src/video_save_counts.ts`) хранит только число по ролику, без того, кто сохранил.
- При удалении аккаунта подколлекция удаляется вместе с `users/{uid}` (`account_delete.ts`: «собственные подколлекции… сносит
  рекурсивное удаление users/{uid}»). ⚠️ Оговорка: сейчас облачное удаление обрывается раньше этого шага (инцидент индексов
  12.10, разбирает координатор). Обещание «удаляется вместе с аккаунтом» становится правдой после выкладки индексов владельцем.

### §4 «Account, authentication, and cloud sync» — новый абзац в конце раздела

**Было:** раздел заканчивается «…together with attempt counters and recovery records used to prevent abuse.»

**Стало:** после него новый абзац (текст Дизайна, без изменений):

> If you save a video to your favourites, we store the video ID and the time you saved it in your account so your list follows
> you to a new device, and we keep an aggregate count of how many accounts saved each video. The count does not show who saved a
> video. Your list is deleted together with your account.

Для владельца: если человек сохранил ролик в избранное, мы храним в его аккаунте id ролика и время сохранения, чтобы список
переехал на новое устройство. Ещё мы считаем, сколько аккаунтов сохранили каждый ролик, — счётчик не показывает, кто именно.
Список удаляется вместе с аккаунтом.

### Языки (п.60)

Источник политики — только английский: `legal/privacy_policy_en.json` и `_ios.json`. `npm run legal:sync`
(`scripts/sync-legal-html.mjs`) читает только эти файлы и пишет английский текст в приложение, в корневые html и на сайт.
Русской и украинской версий политики нет, поэтому по п.60 до релиза русская не публикуется автоматически.

## Как применить (только по «да» владельца)

1. `git apply docs/phraseman-2.0/handoff/legal_r1_policy_additions.patch`
2. В обоих файлах поправить дату «Last updated: …» в первом разделе на день применения.
3. `npm run legal:sync` — разносит текст в `app/legal`, корневые html и `knowly-www/legal/*`.
4. Закоммитить `legal/` и всё, что обновил `legal:sync`.
5. Выложить сайт: `hosting:knowlywww` (DEPLOY_MORNING_2026-10-13.md, блок «Г»).
6. Открыть https://knowlyapps.com/legal/privacy и убедиться, что три правки видны.
7. Только после этого — шаг 3б RELEASE_DAY_PLAN: `cardTtsPackWorker`, `adminCardTtsRequeuePack`, затем рубильник.

Пункты независимы: в патче это отдельные ханки §4 (избранное видео), §6 и §13 (П9), §10 (согласия) — любой можно наложить отдельно.
Итого в патче 4 абзаца × 2 файла (`git apply --check` на HEAD 12.10 вечер — OK).
