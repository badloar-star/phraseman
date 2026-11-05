# Итоговый текст политики конфиденциальности для выпуска 150 — на просмотр владельцу (06.11, «5 · ВХОД»)

Governance-ID: TG-0563FC925479

Показывается ДО публикации. Публикацию ведёт «Сайт» по слову владельца в день выпуска. Здесь только то, что меняется относительно текущей `legal/privacy_policy_en.json` (от 05.11, коммит `871a04e42`); остальной текст не трогается. Редакция А для §20 (очистка чужих лайков/комментариев ещё НЕ выкачена), редакция Б в 150 НЕ берётся.

Готовые файлы (английская и iOS-версия, JSON валиден, отличаются от текущих `legal/` ровно в разделах 3, 4, 6, 20):
- `docs/work/release/privacy_candidate/privacy_policy_en.candidate.json`
- `docs/work/release/privacy_candidate/privacy_policy_en_ios.candidate.json`

Дата «Last updated» в первом разделе не менялась: **владелец ставит дату выкладки** (сейчас стоит November 5, 2026).

## 🔴 Сначала — расхождение, которое надо решить владельцу/Сайту

Коммит `871a04e42` (05.11) УЖЕ внёс в `legal/` и на страницы сайта фразу, что при удалении аккаунта удаляются «your likes, pack additions, comments and contest votes on other users' Community Packs». Но функция очистки этих данных **не выкачена на прод** (ждёт индексы READY, отдельно у Ядра). Если эти страницы уже опубликованы на сайте — политика обещает больше, чем делает приложение. Итоговый текст ниже (редакция А) это исправляет: чужие лайки/комментарии/голоса «may remain … until a cleanup removes them». Проверить, опубликована ли текущая версия, и при необходимости выложить итоговую раньше выпуска.

## Что меняется (по разделам)

### §3 Data stored on your device — добавляется

> Home-screen quick actions (the shortcuts shown when you press and hold the app icon, for example to continue your last lesson) are created on your device from your local app state; they do not send any information to us.

По-русски: быстрые действия на значке приложения создаются на телефоне из локального состояния, ничего нам не отправляют.

### §4 Account, authentication, and cloud sync — добавляется

> This includes your progress in each course language you study (for example Spanish, French, German or Italian courses), which is stored under your account so it follows you to a new device.

> When you watch a video in the in-app catalogue through to the end (at least 70% of its length), the App grants a one-time coin reward for that video. To make the reward work across devices and to prevent it from being granted twice, we store in your account the ID of the video and the time the reward was granted; this record is used only to apply the reward once and to detect abuse, is not shown to other users, and is deleted together with your account.

По-русски: прогресс по языкам курсов хранится в аккаунте; за досмотренное видео (≥70 %) выдаётся разовая награда монетами, для этого хранится ID видео и время награды (только чтобы не выдать дважды и выявлять злоупотребления; другим не показывается; удаляется вместе с аккаунтом). Порог 70 % — из `video-full-reward-server-core-2026-11-05.md`; если Ядро изменит порог, поправить число.

### §6 User content, community packs, reports, and moderation — заменяется предложение про комментарии, добавляется абзац про лайки

Вместо «Comments are visible to other users who have added the same pack, remain attached to the pack, and are not private messages.»:

> Comments are not private messages. Any signed-in user who opens the pack can see the comments on it, together with the commenter's display name. Only a user who has added the pack (or its author) can write a comment. Comments remain attached to the pack until you delete them. If you delete your account, comments you wrote under other users' packs may remain visible; you can delete them yourself before deleting your account, or ask us to remove them through the privacy contact in section 26.

Новый абзац:

> Likes and additions. When you like a Community Pack or add it to your collection, we record a small marker in the pack linking your account ID to that pack, with the time. We use it so that each person can like or add a pack only once and to keep the like and add counts accurate. Other users see only the totals in the App (for example the number of likes next to a pack), not who liked or added it. You cannot like a pack you wrote. These records stay attached to the pack while it exists; you can ask us to delete them through the privacy contact in section 26.

По-русски: комментарии видит любой вошедший пользователь вместе с именем автора (правила базы это допускают); при удалении аккаунта чужие комментарии могут остаться, их можно удалить заранее или попросить нас; лайки/добавления — служебная метка «аккаунт → набор», другим видны только суммы.

### §20 Account and data deletion — добавляется предложение про связанные записи входа и абзац про Сообщество (редакция А)

После «Once the 14 days elapse, deletion runs and becomes irreversible.»:

> When deletion runs, we also remove every other sign-in record (Google, Apple, or email) that was linked to your account, so that signing in again with the same provider afterwards creates a new, empty account.

В перечне удаляемого убрано «; your likes, pack additions, comments and contest votes on other users' Community Packs» (это обещание — редакция Б), и добавлен отдельный абзац:

> Community Packs you created are deleted in full, together with the likes, additions and comments that other users left on them. Likes, additions, comments and contest votes that you left under other users' packs may remain after your account is deleted, linked to a technical account identifier (and, for comments, to the display name you used, which signed-in users can see), until a cleanup removes them.

По-русски: удаление закрывает все связанные способы входа (Q26 — в бою); свои наборы удаляются целиком; чужие лайки/комментарии/голоса могут остаться до очистки, с техническим ID (в комментариях ещё и с именем). Слово «обезличено» не используется: по аудиту данные не обезличены.

## Публикация (только по слову владельца)

```bash
cp docs/work/release/privacy_candidate/privacy_policy_en.candidate.json legal/privacy_policy_en.json
cp docs/work/release/privacy_candidate/privacy_policy_en_ios.candidate.json legal/privacy_policy_en_ios.json
```

Вручную поставить дату выкладки в первом разделе, затем `npm run legal:sync`, проверить `git diff --stat`, выложить сайт (`hosting:knowly-www`). Подробный порядок и защитные сторожа — в конце `PRIVACY_POLICY_DELTA_2026-11-05.md`.
