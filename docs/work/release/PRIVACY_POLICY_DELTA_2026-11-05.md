# ЧТО ОБНОВИТЬ ДО РЕВЬЮ (утренний пункт владельца, ~5 минут)

Решение координатора 05.11: политику ночью не публикуем. В ASC сборку грузим без ревью, поэтому правка политики — ДО нажатия «отправить на ревью» в сторах.

| Приоритет | Что | Где | Правка |
|---|---|---|---|
| 🔴 | Комментарии к наборам видит любой вошедший пользователь, а политика говорит «только добавившие набор» | §6, предложение про комментарии | 1 |
| 🟡 | Лайки/добавления наборов (метка с ID аккаунта) не описаны | §6, новый абзац | 2 |
| 🟡 | Прогресс по языкам курсов es/fr/de/it | §4, одно предложение | 3 |
| 🟡 | Быстрые действия на значке (expo-quick-actions, локально) | §3, одно предложение | 4 |

Комментарии: рекомендация координатора — «правим текст», правила Firestore не трогаем (рискованно ночью). Если владелец решит, что комментарии должен видеть только автор набора, это отдельная правка правил (`pack_comments`, `allow read`) и клиента — не в этот релиз.

## Версия-кандидат (в рабочий путь выкладки НЕ положена)

Лежит только в docs; `legal/`, `app/legal/` и сайт не тронуты:
- `docs/work/release/privacy_candidate/privacy_policy_en.candidate.json`
- `docs/work/release/privacy_candidate/privacy_policy_en_ios.candidate.json`

Это копии `legal/privacy_policy_en*.json` от 29.10 с правками 1–4 (каждая замена сработала ровно один раз в обеих версиях, дифф — 12 строк на файл). «Last updated: October 29, 2026» в первом разделе заменить датой выкладки.

# КАК ВЫЛОЖИТЬ (по слову владельца)

```bash
cp docs/work/release/privacy_candidate/privacy_policy_en.candidate.json legal/privacy_policy_en.json
cp docs/work/release/privacy_candidate/privacy_policy_en_ios.candidate.json legal/privacy_policy_en_ios.json
```

Вручную: в обоих `legal/privacy_policy_en*.json` заменить «Last updated: October 29, 2026» на дату выкладки. Затем синхронизация (обновит `app/legal/*.json`, `privacy.html`, `admin/oauth-privacy.html`, `admin/v2/oauth-privacy.html`, `knowly-www/legal/privacy*`, `data-deletion`):

```bash
npm run legal:sync
```

Проверка: `git diff --stat` (только legal/*, app/legal/*, privacy.html, admin/*oauth-privacy.html, knowly-www/legal/*) и тесты `privacy_*` / `legal_*`. Выкладка сайта:

```bash
npm run hosting:knowly-www
```

```bash
npm run hosting:admin
```

Важно:
- Текст политики **в приложении** лежит в `app/legal/*.json` и едет в сборке/JS-бандле: после sync попадёт в следующую сборку или OTA. Для ревью сторов важна **ссылка на сайт** (`knowly-www/legal/privacy`, `privacy-ios`) — выкладка сайта обновляет её сразу.
- Перед `hosting:*` сработают `deploy_lock_guard`, `website:surface-contract`, `admin_hosting_deploy_guard` — следовать их сообщениям. До выкладки — сверка «прод = HEAD» по хешам файлов `admin/v2` и `knowly-www` (раньше выкладывали незакоммиченное).
- Коммит с кандидатом в `legal/*` и производными — отдельный, через safe_commit, ДО выкладки.
- **Откат:** `git revert <коммит выкладки>` + `npm run legal:sync` + повторные `hosting:knowly-www` и `hosting:admin`; либо Firebase Console → Hosting → предыдущая версия → Rollback (отдельно для таргетов `admin` и `knowlywww`).

---

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

> Likes and additions. When you like a Community Pack or add it to your collection, we record a small marker in the pack linking your account ID to that pack, with the time. We use it so that each person can like or add a pack only once and to keep the like and add counts accurate. Other users see only the totals in the App (for example the number of likes next to a pack), not who liked or added it. You cannot like a pack you wrote. These records stay attached to the pack while it exists; you can ask us to delete them through the privacy contact in section 26.

**RU:**

> Лайки и добавления. Когда вы ставите лайк набору сообщества или добавляете его себе, мы сохраняем в наборе небольшую отметку, связывающую ID вашего аккаунта с этим набором, и время. Она нужна, чтобы лайк и добавление считались один раз на человека и чтобы счётчики были точными. Другие пользователи видят только итоговые числа (например, количество лайков рядом с набором), но не то, кто лайкнул или добавил. Свой набор лайкнуть нельзя. Эти записи остаются у набора, пока он существует; вы можете попросить удалить их через контакт по вопросам конфиденциальности (раздел 26).

⚠ Проверено 05.11: в `functions/src` нет каскада удаления `pack_likes`/`pack_adds` при удалении аккаунта — поэтому в тексте НЕ обещано «deleted together with your account». Отдельная задача для Ядра (не блокер): добавить зачистку в каскад удаления аккаунта, тогда фразу можно усилить. Чтение `pack_likes` открыто любому вошедшему (`allow read: if request.auth != null`), в интерфейсе «кто лайкнул» не показывается — поэтому в тексте «in the App».

## Правка 3 — 🟡 §4 (одно предложение к списку облачного прогресса)

**EN:** после «…language/target selections…» добавить в тот же абзац:

> This includes your progress in each course language you study (for example Spanish, French, German or Italian courses), which is stored under your account so it follows you to a new device.

**RU:** «Сюда входит ваш прогресс в каждом языке курса, который вы изучаете (например, курсы испанского, французского, немецкого или итальянского); он хранится в вашем аккаунте и переезжает с вами на новое устройство.»

## Правка 4 — 🟡 §3 (одно предложение в конец абзаца про локальные данные)

**EN:**

> Home-screen quick actions (the shortcuts shown when you press and hold the app icon, for example to continue your last lesson) are created on your device from your local app state; they do not send any information to us.

**RU:** «Быстрые действия на значке приложения (ярлыки при долгом нажатии, например «продолжить последний урок») формируются на устройстве из локального состояния приложения и ничего нам не передают.»

✔ Уточнено по коду: это expo-quick-actions (`app/quick_actions_bridge.tsx`, ярлыки при долгом нажатии на значок, например «продолжить последний урок»), читает локальный AsyncStorage, в сеть ничего не шлёт. Это не badge.

---

## Что делать координатору

1. 🔴 Правка 1 — до релиза: текущее предложение про «добавившие набор» не соответствует правилам доступа (читает любой вошедший) и сцене набора. Это риск расхождения «политика ↔ поведение» для ревью магазина.
2. 🟡 Правки 2–4 — желательно в ту же выкладку; одна выкладка = `legal/privacy_policy_en*.json` (обе версии, обычная и `_ios`) → `npm run legal:sync` → hosting `admin` + `knowly-www`; дату «Last updated» поставить днём выкладки.
3. Перевод на другие языки в политике не нужен: она одноязычная (EN), в приложении та же копия.
4. Сайт не выкладывал, JSON политики не менял — только этот документ.
