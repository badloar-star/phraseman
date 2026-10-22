# Task packet: тексты окна согласия на ИИ-диалоги — честно про текст и голос, и про «Свободный разговор» (Переводчик, координатор 22.10)

Governance-ID: TG-4E74CF4FA30E
Status: Done — body на 9 языках (коммит в окно), introductionFree — для 5 · ВХОД
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Окно согласия `components/AiDialogConsentModal.tsx` 5 · ВХОД ставит теперь и перед «Свободным разговором». Сверка с политикой
(`legal/privacy_policy_en.json`):
- ИИ-диалоги — это «scenario practice conversations and the free-form companion chat», отдельное согласие, его можно
  отозвать в настройках;
- голосом: «the recording is kept only in the App's temporary storage on your device… Only in AI dialogues is the recognised
  text of your answer sent» — **в OpenAI уходит распознанный текст сказанного, а не запись голоса**.

Что не так сейчас в `body` на 9 языках:
1. Названы только «переписки с персонажами, задачи» — про свободный разговор ни слова.
2. «Твои сообщения отправляются в OpenAI» — не сказано, что сказанное голосом тоже уходит (как текст).
3. Нет фразы, что запись голоса остаётся на телефоне (так в политике).

⚑ Координатор писал «текст И голос уходят». По политике и коду уходит текст сказанного, а не звук. Писать в окне, что
уходит голос, было бы неправдой и разошлось бы с политикой. Поэтому формулировка «то, что ты пишешь или говоришь
(как распознанный текст)» + «записи голоса остаются на телефоне».

Новый `body` (оба режима; ≤ 4 строк на 360 dp — абзацы переносятся, окно прокручивается) — правлю сам, файл чистый.
Вступление `introduction` описывает только ситуации («в выбранной ситуации»). Для свободного разговора нужно своё —
`introductionFree`, его подключает 5 · ВХОД по режиму. Текст — ниже.

## Scope

In scope: `body` в `AiDialogConsentModal.tsx`; текст `introductionFree` для Входа. Out of scope: подключение окна к «Свободному
разговору» (5 · ВХОД), политика (совпадает, правки не нужны).

## Architecture

No architecture change.

## Security and privacy

Текст согласия теперь совпадает с политикой: распознанный текст речи уходит в OpenAI, запись остаётся на устройстве. Политику менять не нужно.

## Technical debt

- Не проверено носителями.

## Verification

`babel.parseSync`; сторож «ты» (окно на «ты»); поиск старых строк в тестах; `git diff --numstat` = 9/9 + комментарий.

## Rollback

`git revert <коммит>`.

## introductionFree (для 5 · ВХОД)

| ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|
| Говори о чём угодно — собеседник поддержит разговор на изучаемом языке. Ошибаться можно: это практика. | Говори про що завгодно — співрозмовник підтримає розмову мовою, яку вивчаєш. Помилятися можна: це практика. | Talk about anything — your partner keeps the conversation going in the language you’re learning. Mistakes are fine: it’s practice. | Habla de lo que quieras: tu interlocutor sigue la conversación en el idioma que aprendes. Equivocarse está bien: es práctica. | Fale sobre o que quiser — o parceiro mantém a conversa no idioma que você aprende. Errar faz parte: é prática. | Nói về bất cứ điều gì — người đối thoại sẽ tiếp lời bằng ngôn ngữ bạn đang học. Sai cũng không sao: đây là luyện tập. | Bicarakan apa saja — lawan bicara melanjutkan obrolan dalam bahasa yang kamu pelajari. Salah itu wajar: ini latihan. | İstediğin her şeyden konuş — karşındaki öğrendiğin dilde sohbeti sürdürür. Hata yapmak sorun değil: bu bir pratik. | Mów o czym chcesz — rozmówca podtrzyma rozmowę w języku, którego się uczysz. Błędy są w porządku: to ćwiczenie. |
