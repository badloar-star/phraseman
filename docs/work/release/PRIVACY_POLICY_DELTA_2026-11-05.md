# Privacy Policy — дельта к сборке 2.1.0 (05.11, Сайт)

Источник политики: `legal/privacy_policy_en.json` (от 29.10), копии `app/legal/*`, `privacy.html`, `knowly-www/legal/privacy*`. Правка делается в JSON → `npm run legal:sync` → выкладка hosting. **Сайт НЕ трогаю: выкладка только по слову координатора утром.** Ниже — готовые абзацы.

## Сводка

| # | Что в сборке | Покрыто? | Статус |
|---|---|---|---|
| а1 | Комментарии: видны «пользователям, добавившим набор» | Нет, **неточно**: правила Firestore (`pack_comments` → `allow read: if request.auth != null`) отдают текст любому вошедшему; сцена набора с кнопкой «Обсуждение набора» открывается без добавления | 🔴 править до релиза |
| а2 | Лайки наборов (`pack_likes/{uid}`: userId, packId, createdAt) и «добавил себе» (`pack_adds/{uid}`) | Нет: в §5/§6 нет ни слова про лайки наборов; есть только «activity likes» и «ratings/votes» | 🟡 дописать (метаданные, но привязаны к аккаунту) |
| а3 | Число лайков и 💬 в строках каталога, имя автора с монетой/Plus | Покрыто §5 («community pack author information», Plus marker) | ✅ |
| а4 | Создание/публикация наборов, пользовательский текст, uid и имя автора | Покрыто §6 (title, card text, author ID, moderation, OpenAI-проверка, озвучка) | ✅ |
| а5 | Плашка «Сообщество» — флаг закрытия | Только на устройстве, данных не собирает | ✅ (не требует текста) |
| б | Проверка подписки RevenueCat при каждом запуске, до онбординга и согласий | Покрыто §9 дословно (каждый старт, app user ID + данные магазина/устройства, до покупки и до выборов онбординга; основание — договор + законный интерес) | ✅ |
| в | Прогресс курсов es/fr/de/it в облаке | Покрыто в целом: §4 («lessons, streaks… language/target selections»), §5 («compact record of which course lessons you have completed»). Языки поимённо не нужны | 🟡 по желанию — одна фраза про выбранный язык курса |
| г | Ярлыки на значке | Только устройство, данных нет | 🟡 по желанию — одна фраза в §3 |
| д | Запоминание настроек тренировки (размер/время/направление) | Локально (`story_events_v1:cards_training_setup_prefs`), сеть не используется | ✅ покрыто §3 |

Итог для координатора: **🔴 одно (а1), 🟡 три (а2, в, г).** RevenueCat (б) уже в политике.

---

## Правка 1 — 🔴 §6 «User content, community packs…» (заменить абзац про комментарии)

**Сейчас:** «Comments are visible to other users who have added the same pack, remain attached to the pack, and are not private messages.»

**EN (замена предложения):**

> Comments on a Community Pack are not private messages. Any signed-in user who opens the pack can see the comments on it, together with the commenter's display name. Only a user who has added the pack (or its author) can write a comment. Comments remain attached to the pack until you delete them or you delete your account.

**RU (для справки владельцу):**

> Комментарии к набору сообщества — не личные сообщения. Любой вошедший пользователь, открывший набор, видит комментарии к нему вместе с отображаемым именем автора комментария. Писать комментарии могут только пользователи, добавившие набор себе, и автор набора. Комментарии остаются у набора, пока вы их не удалите или не удалите аккаунт.

Остальной текст абзаца (pin/hide автором, удаление своего комментария, жалобы, уведомление автору с отрывком) остаётся без изменений. Скрытый автором комментарий технически читается любым вошедшим (клиент его фильтрует) — фраза «a hidden comment is not deleted and may still be reviewed if reported» остаётся верной.

## Правка 2 — 🟡 §6 (новый абзац после абзаца про комментарии)

**EN:**

> Likes and additions. When you like a Community Pack or add it to your collection, we record a small marker in the pack linking your account ID to that pack, with the time. We use it so that each person can like or add a pack only once and to keep the like and add counts accurate. Other users see only the totals (for example the number of likes next to a pack), not who liked or added it. You cannot like a pack you wrote. These records are deleted together with your account.

**RU:**

> Лайки и добавления. Когда вы ставите лайк набору сообщества или добавляете его себе, мы сохраняем в наборе небольшую отметку, связывающую ID вашего аккаунта с этим набором, и время. Она нужна, чтобы лайк и добавление считались один раз на человека и чтобы счётчики были точными. Другие пользователи видят только итоговые числа (например, количество лайков рядом с набором), но не то, кто лайкнул или добавил. Свой набор лайкнуть нельзя. Эти записи удаляются вместе с аккаунтом.

⚠ Проверить перед выкладкой: что удаление аккаунта действительно чистит `pack_likes/{uid}` и `pack_adds/{uid}` во всех наборах (`functions` — каскад удаления). Если нет — фразу «deleted together with your account» заменить на «removed when the pack is removed or when we process your deletion request» и завести задачу на каскад. Доступ к чтению `pack_likes` у правил открыт любому вошедшему (`allow read: if request.auth != null`) — в приложении «кто лайкнул» не показывается, поэтому формулировка «Other users see only the totals» верна для интерфейса; для строгости можно добавить «in the App».

## Правка 3 — 🟡 §4 (одно предложение к списку облачного прогресса)

**EN:** после «…language/target selections…» добавить в тот же абзац:

> This includes your progress in each course language you study (for example Spanish, French, German or Italian courses), which is stored under your account so it follows you to a new device.

**RU:** «Сюда входит ваш прогресс в каждом языке курса, который вы изучаете (например, курсы испанского, французского, немецкого или итальянского); он хранится в вашем аккаунте и переезжает с вами на новое устройство.»

## Правка 4 — 🟡 §3 (одно предложение в конец абзаца про локальные данные)

**EN:**

> Home-screen shortcuts and icon badges, if you use them, are created on your device from your local app state; they do not send any information to us.

**RU:** «Ярлыки на значке приложения и счётчики на нём, если вы ими пользуетесь, формируются на устройстве из локального состояния приложения и ничего нам не передают.»

⚠ Для (г): формулировка «ярлыки на значке» взята из задачи координатора; если это iOS/Android quick actions — слова «Home-screen shortcuts» верны, если счётчик-значок (badge) — заменить на «icon badges». Свериться с `app.json`/кодом перед выкладкой (в `app.json` конфигурации quick actions не нашёл — возможно, это нативная часть сборки).

---

## Что делать координатору

1. 🔴 Правка 1 — до релиза: текущее предложение про «добавившие набор» не соответствует правилам доступа (читает любой вошедший) и сцене набора. Это риск расхождения «политика ↔ поведение» для ревью магазина.
2. 🟡 Правки 2–4 — желательно в ту же выкладку; одна выкладка = `legal/privacy_policy_en*.json` (обе версии, обычная и `_ios`) → `npm run legal:sync` → hosting `admin` + `knowly-www`; дату «Last updated» поставить днём выкладки.
3. Перевод на другие языки в политике не нужен: она одноязычная (EN), в приложении та же копия.
4. Сайт не выкладывал, JSON политики не менял — только этот документ.
