# Phraseman user error reports audit

Final audit of the 48-report export completed on 2026-07-10. No live replies, rewards, OTA, build, or deploy were executed by this generator.

Summary: 48 final decisions, 0 unresolved reports, planned rewards 22 shards.

Verdict counts: duplicate=12, confirmed_fixed=22, by_design=4, not_reproduced=5, user_error=2, no_issue_details=3.

## Per-report audit

### #1 rpkfHaBEibfiu146HQSZ
- Created: 2026-07-10T01:06:16.783Z
- User: cfe21f3d-82eb-46f9-8b64-0329aa6f124f; language: ru; screen: personal_plan_exercise; category: free_text; dataId: impuls_day_1_impuls_d001_content_unit_phrase_1
- Report comment: Зажимаю кнопку, говорю фразу и ничего не происходит. И дальше не пропускает. Что-то не так делаю?
- Verdict: **duplicate**; group: personal-plan-pronunciation; planned shards: 0
- Evidence: impuls_day_1 is present in the runtime registry. This repeats the earlier signal №7; the current Android recording behavior still needs device reproduction.
- Action: Дубликат более раннего сигнала №7; отдельная награда 0.
- Draft reply: Спасибо, что написали нам. Мы уже разбираемся, почему упражнение на повторение речи иногда не переходит дальше после ответа. Ваше сообщение помогло нам точнее проверить этот сценарий.

### #2 532kHSSOjRLPGo69mNQd
- Created: 2026-07-09T21:02:27.651Z
- User: 68528aba-88ce-4460-affd-fcd40af02109; language: ru; screen: personal_plan_exercise; category: free_text; dataId: impuls_day_2_fallback:impuls_d001_content_unit_phrase_1
- Report comment: Не могу напечатать ответ на вопрос. Не появляются буквы, чтобы напечатать
- Verdict: **duplicate**; group: personal-plan-recall; planned shards: 0
- Evidence: impuls_day_2_fallback is still present in the runtime recall registry. This repeats the earlier signal №3; the current Android keyboard/focus behavior still needs device reproduction.
- Action: Дубликат: ответ нужен, награда 0.
- Draft reply: Спасибо, что рассказали о проблеме с полем ответа. Мы проверяем, почему в этом задании клавиатура иногда не открывается. Ваше описание помогло нам уточнить условия, при которых это происходит.

### #3 bRrwilUdP4e1mTfB849I
- Created: 2026-07-09T21:01:15.876Z
- User: 68528aba-88ce-4460-affd-fcd40af02109; language: ru; screen: personal_plan_exercise; category: free_text; dataId: impuls_day_2_fallback:impuls_d001_content_unit_phrase_1
- Report comment: У меня не появляются буквы, чтобы напечатать. Не могу напечатать ответ
- Verdict: **confirmed_fixed**; group: personal-plan-recall; planned shards: 1
- Evidence: Recall route renders a TextInput for the reported fallback item, but it did not request focus on entry. The input now uses autoFocus, and the focused UI contract confirms the recall renderer keeps it.
- Action: Исправление готово в JS-клиенте; доставка требует разрешённого OTA. Начислить 1 shard.
- Draft reply: Спасибо, что подробно описали проблему. Мы исправили поле ответа в персональном плане: теперь при переходе к заданию оно сразу получает фокус и открывает клавиатуру. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.

### #4 F97swPTDukrVzISudYD9
- Created: 2026-07-09T12:50:34.114Z
- User: 9213e9a8-fbcc-4818-b8b9-bc4f9765d819; language: ru; screen: lesson_9; category: free_text; dataId: lesson_9_phrase_9
- Report comment: Если писать ответ, зависает, но можно воспользоваться микрофоном и сказать вслух
- Verdict: **confirmed_fixed**; group: lesson9-input-freeze; planned shards: 1
- Evidence: The current typed-submit path blurs the input and calls Keyboard.dismiss() before answer checking, so the hidden field no longer retains focus on the result screen. Focused lesson input contracts pass.
- Action: Исправление уже находится в текущем JS-коде; доставка требует разрешённого OTA. Начислить 1 shard.
- Draft reply: Спасибо, что сообщили о зависании после ввода ответа. Мы проверили этот сценарий: после отправки ответа поле теперь освобождает фокус и не удерживает экран проверки. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.

### #5 ADMa6ziN8hgLnckMQnuS
- Created: 2026-07-09T05:42:41.454Z
- User: 581d6711-822e-489a-b355-f0399ba93a0e; language: ru; screen: trainer; category: free_text; dataId: trainer_dashboard
- Report comment: Неактивна кнопка «Проверить»в тренировке «Моя практика» фразы
- Verdict: **confirmed_fixed**; group: trainer-check-button; planned shards: 1
- Evidence: Кнопка визуально активировалась после первого слова, но check() требовал полную фразу. Добавлены canCheck, корректный disabled и сниженная opacity.
- Action: Исправлено в клиенте; награда 1 shard после следующего обновления приложения.
- Draft reply: Спасибо, что обратили наше внимание на кнопку проверки. Теперь она становится доступной только после того, как фраза полностью собрана. Исправление появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.

### #6 wH9Emg3STsLSldVaYDhV
- Created: 2026-07-09T00:47:45.109Z
- User: cfe21f3d-82eb-46f9-8b64-0329aa6f124f; language: ru; screen: lesson_3; category: free_text; dataId: lesson_3_phrase_1
- Report comment: При проверке нет произношения. Первые фразы были, потом только показывается правильно ли составлена фраза. Так должно быть?
- Verdict: **confirmed_fixed**; group: lesson-result-audio; planned shards: 1
- Evidence: The Android audio lifecycle now tracks live players, disposes every player, waits for real loaded/playing state, detects idle playback and uses watchdog/TTS fallback. Focused lifecycle and replay contracts pass.
- Action: Исправление уже находится в текущем JS-коде; доставка требует разрешённого OTA. Начислить 1 shard.
- Draft reply: Спасибо, что рассказали о пропадающей озвучке. Мы исправили управление аудиоплеером между заданиями, чтобы озвучка результата не прекращалась после нескольких фраз. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.

### #7 HAhW4bPE5GCzYQ7SmRMa
- Created: 2026-07-09T00:23:18.357Z
- User: cfe21f3d-82eb-46f9-8b64-0329aa6f124f; language: ru; screen: personal_plan_exercise; category: free_text; dataId: impuls_day_1_impuls_d001_content_unit_phrase_1
- Report comment: Не работает, зажимаю кнопку, говорю и ничего не происходит. Как продолжить?
- Verdict: **confirmed_fixed**; group: personal-plan-pronunciation; planned shards: 1
- Evidence: The fallback recognizer could enter scoring after stop and remain there forever when native emitted no result/end/error event. A bounded settlement now reuses the existing finish timer and completes the attempt deterministically.
- Action: Исправление готово в JS-клиенте; доставка требует разрешённого OTA. Начислить 1 shard.
- Draft reply: Спасибо за подробное описание. Мы нашли состояние, в котором распознавание могло не завершиться и оставить упражнение без перехода дальше. Теперь попытка завершается даже тогда, когда устройство не присылает финальное событие. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.

### #8 dc2I7HPKFAQS7BDA8MAZ
- Created: 2026-07-08T15:01:51.140Z
- User: 2OT5VtPTOYa4br6DBo3NBlapf453; language: ru; screen: personal_plan_exercise; category: free_text; dataId: gavan_day_6_gavan_d006_content_unit_phrase_1
- Report comment: Не починили теперь кнопка записи говорения не работает
- Verdict: **duplicate**; group: personal-plan-gavan; planned shards: 0
- Evidence: gavan_day_6 is present in the runtime registry. This repeats the earlier signal №15; the current recording behavior still needs device reproduction.
- Action: Дубликат: ответ отправляем, награда 0.
- Draft reply: Спасибо, что написали нам. Мы уже проверяем, почему запись ответа иногда не запускается в этом упражнении. Ваше сообщение помогло нам точнее восстановить последовательность действий.

### #9 2xF0KadDOkQIIPG976H3
- Created: 2026-07-08T14:25:31.985Z
- User: 0b5e816d-e740-4067-bd32-a003be730c0b; language: ru; screen: lesson_8; category: free_text; dataId: lesson_8_phrase_35
- Report comment: Не совсем естественно: He has a birthday in October. Идеально по-американски: "His birthday is in October." (Его день рождения — в октябре).
- Verdict: **confirmed_fixed**; group: lesson8-birthday-content; planned shards: 1
- Evidence: The lesson now uses “His birthday is in October”, which matches the natural American-English wording requested in the report.
- Action: Контент исправлен; награда 1 shard после следующего обновления приложения.
- Draft reply: Спасибо, что обратили внимание на формулировку. Мы заменили неестественный вариант фразы о дне рождения на более естественный. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.

### #10 83gFLkE2IMbWPhon1X4K
- Created: 2026-07-08T09:10:12.195Z
- User: 581456b2-e275-4580-bfbb-bbd0e6e4915c; language: ru; screen: lesson_1; category: free_text; dataId: lesson_1_phrase_33
- Report comment: Не прописано яке завдання
- Verdict: **confirmed_fixed**; group: lesson-task-instruction; planned shards: 1
- Evidence: В lesson1 добавлены инструкции “Собери фразу:” и “Напечатай фразу:” для режимов сборки и ввода.
- Action: Исправлено в клиенте; награда 1 shard после следующего обновления приложения.
- Draft reply: Спасибо, что заметили нехватку пояснения. Мы добавили явную инструкцию перед фразой, чтобы сразу было понятно, что нужно сделать. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.

### #11 9jlPHMEmuoegEzPF8gyN
- Created: 2026-07-08T07:51:37.750Z
- User: hGmob8b01wgEHsPpw7ugUUVFuUK2; language: ru; screen: lesson_10; category: free_text; dataId: lesson_10_phrase_20
- Report comment: Кажется ,что may уместнее,чем can в этом вопросе.
- Verdict: **by_design**; group: english-grammar-choice; planned shards: 0
- Evidence: Can I ask a question? — естественная фраза. May I ask a question? тоже возможна, но это более формальный вариант, а не обязательная замена.
- Action: Ошибка не подтверждена; награды нет.
- Draft reply: Спасибо за вопрос. В этом задании Can I ask a question? — корректный и естественный вариант. May I ask a question? тоже возможен, но звучит заметно формальнее, поэтому менять упражнение не требуется.

### #12 4Z6PiXniwSvniRxOPOBC
- Created: 2026-07-08T06:59:37.701Z
- User: reLQnS7HnaUmVsrUnZsRetjPOhe2; language: ru; screen: lesson_31; category: free_text; dataId: lesson_31_phrase_31
- Report comment: Почему, при отсутствии в исходном предложении указательного местоимения "ту" в "оживлённую улицу" вместо, например, the busy street, в ответе появляется  that (that busy street)?
- Verdict: **duplicate**; group: lesson31-phrase31-extra-words; planned shards: 0
- Evidence: Текущий источник phrase 31 содержит that, stray и busy. Сигнал совпадает с более ранним №32; первичный по времени — №32.
- Action: Дубликат; ответ отправляем, награда 0.
- Draft reply: Спасибо, что написали нам о непонятных словах в условии. Мы проверяем формулировку задания и учитываем Ваш комментарий при его доработке.

### #13 xSw4yza4L2itsNxXwXGV
- Created: 2026-07-08T04:48:42.972Z
- User: 2OT5VtPTOYa4br6DBo3NBlapf453; language: ru; screen: personal_plan_exercise; category: free_text; dataId: gavan_day_6_gavan_d006_content_unit_phrase_1
- Report comment: Не работает запись и пропустить ее нельзя
- Verdict: **duplicate**; group: personal-plan-gavan; planned shards: 0
- Evidence: gavan_day_6 is present in the runtime registry. This repeats the earlier signal №15; the current recording behavior still needs device reproduction.
- Action: Дубликат: ответ отправляем, награда 0.
- Draft reply: Спасибо, что рассказали о проблеме с записью. Мы проверяем, почему она иногда не запускается в этом упражнении. Ваше описание помогло нам уточнить сценарий.

### #14 OfkRERmqyhwo5pP08hfW
- Created: 2026-07-07T20:45:45.930Z
- User: 2OT5VtPTOYa4br6DBo3NBlapf453; language: ru; screen: flashcards_audio; category: free_text; dataId: flashcards_audio_play
- Report comment: Голос озвучки пропадает , остаётся только русский
- Verdict: **not_reproduced**; group: flashcards-audio; planned shards: 0
- Evidence: Текущий аудиодек требует английскую и локализованную стороны, передаёт target locale для английской стороны и имеет fallback TTS.
- Action: В текущем коде ошибка не подтверждена; награды нет.
- Draft reply: Спасибо, что написали нам. Мы проверили английскую озвучку карточек в текущей версии и не нашли пропущенных аудиофайлов. Если звук снова исчезнет, пожалуйста, укажите карточку и момент, когда это произошло, — это поможет проверить конкретный случай.

### #15 M94pFbln5gSWOrePqZ1M
- Created: 2026-07-07T20:41:13.296Z
- User: 2OT5VtPTOYa4br6DBo3NBlapf453; language: ru; screen: personal_plan_exercise; category: free_text; dataId: gavan_day_6_gavan_d006_content_unit_phrase_1
- Report comment: Он голос перестал распознавать, и не понятно какой результат
- Verdict: **confirmed_fixed**; group: personal-plan-gavan; planned shards: 1
- Evidence: Gavan day 6 uses the same pronunciation renderer and fallback recognizer. The new bounded stop settlement prevents the scoring state from hanging when native recognition stops without a terminal event; focused tests pass.
- Action: Исправление готово в JS-клиенте; доставка требует разрешённого OTA. Начислить 1 shard.
- Draft reply: Спасибо, что подробно описали ситуацию. Мы исправили случай, когда распознавание прекращалось без результата и экран оставался в состоянии проверки. Теперь такая попытка корректно завершается, и упражнение можно продолжить. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.

### #16 b8mvjjsn3ipk5bgyLVvo
- Created: 2026-07-07T18:16:09.806Z
- User: rsaZF3UfoeSVVWhrLsHBNb8Auuc2; language: ru; screen: trainer_phrases; category: free_text; dataId: trainer_phrase_There are books on the table
- Report comment: There с заглавной
- Verdict: **duplicate**; group: trainer-first-tile-capitalization; planned shards: 0
- Evidence: Сигнал входит в группу trainer-case: текущий тренер нормализует первую плитку, первичный по времени — №41.
- Action: Дубликат исправленного сигнала; награда 0.
- Draft reply: Спасибо, что обратили внимание на первую плитку. Мы исправили лишнюю заглавную букву, и изменение появится в следующем обновлении приложения.

### #17 9hb6NrZbIGKD34DDpepg
- Created: 2026-07-07T18:12:08.292Z
- User: rsaZF3UfoeSVVWhrLsHBNb8Auuc2; language: ru; screen: trainer_phrases; category: free_text; dataId: trainer_phrase_You can go back later
- Report comment: Не в первый раз замечаю в уроках, что блоки слов для сбора предложений изначально  стоят в правильной последовательности. Просто тычешь начиная  слева по порядку  и собираешь правильный ответ.
- Verdict: **confirmed_fixed**; group: trainer-word-order; planned shards: 1
- Evidence: Заменили biased sort на Fisher–Yates и исключили identity permutation, когда слова случайно оставались в исходном порядке.
- Action: Исправлено в клиенте; награда 1 shard после следующего обновления приложения.
- Draft reply: Спасибо, что заметили неправильный порядок слов. Теперь плитки перемешиваются перед началом задания и не остаются в готовой последовательности. Исправление появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.

### #18 M1PRD3ocoWg1gqWA3GOE
- Created: 2026-07-07T14:11:07.470Z
- User: PDqDAeAggwTIMsHXMUYZa6Id99o1; language: ru; screen: level_exam; category: free_text; dataId: level_exam_A1_q16_L6
- Report comment: Who are you  How are you   Два варианта специального вопроса, но требуется один ответ. Что то надо исключить?
- Verdict: **confirmed_fixed**; group: level-exam-ambiguous-question; planned shards: 1
- Evidence: Неоднозначное “___ are you?” заменено на “___ is your name?” с однозначным ответом What.
- Action: Исправлено в клиенте; награда 1 shard после следующего обновления приложения.
- Draft reply: Спасибо, что обратили внимание на двусмысленность. Мы изменили формулировку вопроса, чтобы у него оставался один понятный смысл. Обновление появится в следующей версии приложения. В благодарность за помощь мы начислили Вам 1 осколок.

### #19 G28iT7FJ2jMngVsdXqxv
- Created: 2026-07-07T14:01:50.742Z
- User: xjQksVY8wqhF3zIeNLOSTPZ2rI12; language: ru; screen: lesson_16; category: free_text; dataId: lesson_16_phrase_44
- Report comment: На этой странице нет фразы,только слово
- Verdict: **not_reproduced**; group: lesson16-phrase-rendering; planned shards: 0
- Evidence: В источнике и payload есть полный текст “She took off shoes yesterday”; исчезновения части фразы по данным репорта не подтверждено.
- Action: Нужен точный скриншот или шаг воспроизведения; награды нет.
- Draft reply: Спасибо, что написали нам. Мы проверили эту фразу в текущей версии урока 16: сейчас она отображается полностью. Если часть текста снова пропадёт, пожалуйста, пришлите снимок экрана — мы проверим конкретный размер устройства.

### #20 G4noAyBwynmbWeIv1T9D
- Created: 2026-07-07T11:51:13.433Z
- User: 16a46276-0029-4cdc-b301-f3a3f9739d0b; language: ru; screen: lesson_3; category: free_text; dataId: lesson_3_phrase_35
- Report comment: Вместо worked, надо work
- Verdict: **user_error**; group: lesson3-tense; planned shards: 0
- Evidence: Текущий источник lesson3_phrase_35: “They work here”. Вариант worked меняет Present Simple на Past Simple.
- Action: Приложение работает по заданию; награды нет.
- Draft reply: Спасибо за вопрос. В этой конструкции используется базовая форма work, поэтому вариант worked здесь не подходит. Текущий ответ в задании оставляем без изменений.

### #21 RV2nryETovG1abzZ41f9
- Created: 2026-07-07T10:08:49.264Z
- User: reLQnS7HnaUmVsrUnZsRetjPOhe2; language: ru; screen: lesson_31; category: free_text; dataId: lesson_31_phrase_38
- Report comment: Mural не был и не тренирован ранее в списке новых слов
- Verdict: **confirmed_fixed**; group: lesson31-vocabulary-sequencing; planned shards: 0
- Evidence: Before the change, lesson31_phrase_38 trained mural but the lesson intro did not display it. The existing order-2 vocabulary intro now includes the multilingual example that massive mural before phrase order 38; alignment test passes.
- Action: Контентное исправление готово в JS-клиенте; доставка требует разрешённого OTA. Награда 0 по утверждённой таблице.
- Draft reply: Спасибо, что обратили внимание на порядок материала. Вы были правы: слово mural появлялось в упражнении без предварительного примера. Мы добавили его в обучающую часть до проверки. Изменение появится в следующем обновлении приложения.

### #22 m8b0pGo0jp0BOpNFc7uB
- Created: 2026-07-07T09:53:12.321Z
- User: reLQnS7HnaUmVsrUnZsRetjPOhe2; language: ru; screen: lesson_31; category: free_text; dataId: lesson_31_phrase_4
- Report comment: Лтсутсует разбор ощибки
- Verdict: **confirmed_fixed**; group: lesson31-mistake-explanation; planned shards: 1
- Evidence: Offline and automatic AI failures previously changed AiMistakeCard state to hidden. They now use the error state, where a deterministic local fallback keeps the user answer and correct answer visible; focused contract passes.
- Action: Исправление готово в JS-клиенте; доставка требует разрешённого OTA. Начислить 1 shard.
- Draft reply: Спасибо, что сообщили о пропадающем объяснении. Мы исправили этот случай: если сервис объяснений недоступен или устройство находится без интернета, карточка больше не исчезает и показывает понятное сравнение Вашего ответа с правильным. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.

### #23 zeZ2ttjlEdLRH7XEGQBm
- Created: 2026-07-07T09:46:49.424Z
- User: reLQnS7HnaUmVsrUnZsRetjPOhe2; language: ru; screen: lesson_31; category: free_text; dataId: lesson_31_phrase_29
- Report comment: Ответ не озвучен
- Verdict: **confirmed_fixed**; group: lesson31-audio; planned shards: 1
- Evidence: Exact phrase clips were looked up by pronunciation-only spokenText, so an existing clip could be missed. Clip lookup and playback now use normalized visible text; pronunciation override remains only for system TTS. Focused audio contract passes.
- Action: Исправление готово в JS-клиенте; доставка требует разрешённого OTA. Начислить 1 shard.
- Draft reply: Спасибо, что сообщили об отсутствии звука. Аудиофайл у фразы был, но приложение могло искать его по изменённому тексту произношения и пропускать готовую запись. Теперь поиск выполняется по самой фразе. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.

### #24 hshIwVDQGRC6WVvmQorW
- Created: 2026-07-07T09:44:46.253Z
- User: reLQnS7HnaUmVsrUnZsRetjPOhe2; language: ru; screen: lesson_31; category: free_text; dataId: lesson_31_phrase_40
- Report comment: В ответе слово read озвучено в past вместо present
- Verdict: **confirmed_fixed**; group: lesson31-read-pronunciation; planned shards: 1
- Evidence: The visible word stays read, while speech-only text now guides the system voice to the reported present pronunciation /ri:d/.
- Action: Исправлено без изменения текста задания; награда 1 shard после следующего обновления приложения.
- Draft reply: Спасибо, что заметили неправильное звучание. Мы добавили подходящее произношение слова read для этого контекста. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.

### #25 UWQf8qyHAXpxsflgJDFz
- Created: 2026-07-06T20:00:33.617Z
- User: rsaZF3UfoeSVVWhrLsHBNb8Auuc2; language: ru; screen: trainer_phrases; category: free_text; dataId: trainer_phrase_Does he look for keys
- Report comment: Does с заглавной
- Verdict: **duplicate**; group: trainer-first-tile-capitalization; planned shards: 0
- Evidence: Тот же trainer-case сигнал, что в №41 и других репортах группы; первичный по времени — №41.
- Action: Дубликат исправленного сигнала; награда 0.
- Draft reply: Спасибо, что обратили внимание на первую плитку. Мы убрали лишнюю заглавную букву, и исправление появится в следующем обновлении приложения.

### #26 BUJqW6qkDt5Nn1HDhxg5
- Created: 2026-07-06T19:46:00.748Z
- User: rsaZF3UfoeSVVWhrLsHBNb8Auuc2; language: ru; screen: trainer_phrases; category: free_text; dataId: trainer_phrase_The idea is good
- Report comment: The с заглавной
- Verdict: **duplicate**; group: trainer-first-tile-capitalization; planned shards: 0
- Evidence: Тот же trainer-case сигнал, что в №41; первичный по времени — №41.
- Action: Дубликат исправленного сигнала; награда 0.
- Draft reply: Спасибо, что написали нам о заглавной букве. Первая плитка теперь показывается в правильном регистре. Изменение появится в следующем обновлении приложения.

### #27 ABtJYSggjz8q4riAHDLc
- Created: 2026-07-06T19:38:01.736Z
- User: rsaZF3UfoeSVVWhrLsHBNb8Auuc2; language: ru; screen: trainer_phrases; category: free_text; dataId: trainer_phrase_That bag is heavier
- Report comment: That с заглавной
- Verdict: **duplicate**; group: trainer-first-tile-capitalization; planned shards: 0
- Evidence: Тот же trainer-case сигнал, что в №41; первичный по времени — №41.
- Action: Дубликат исправленного сигнала; награда 0.
- Draft reply: Спасибо, что заметили эту неточность. Мы исправили регистр первой плитки, и обновлённый вариант появится в следующей версии приложения.

### #28 0kljwtZ3fkHxQh0Yn0mH
- Created: 2026-07-06T19:36:18.686Z
- User: rsaZF3UfoeSVVWhrLsHBNb8Auuc2; language: ru; screen: trainer_phrases; category: free_text; dataId: trainer_phrase_This is the easiest question
- Report comment: This с заглавной
- Verdict: **duplicate**; group: trainer-first-tile-capitalization; planned shards: 0
- Evidence: Тот же trainer-case сигнал, что в №41; первичный по времени — №41.
- Action: Дубликат исправленного сигнала; награда 0.
- Draft reply: Спасибо, что сообщили о первой плитке. Мы убрали лишнюю заглавную букву. Исправление появится в следующем обновлении приложения.

### #29 I1lTNfjKg0MD4F7YBMdO
- Created: 2026-07-06T10:22:08.374Z
- User: reLQnS7HnaUmVsrUnZsRetjPOhe2; language: ru; screen: lesson_31; category: free_text; dataId: lesson_31_phrase_46
- Report comment: И почему же здесь не "an ancient map"?   А если есть какое-то правило добавлять отсутствующее в исходном предложении указательное местоимение, то почему оно не озвучено?  С другой стороны, если такое правило существует, то добавление такого местоимения в исходное русское предложение несколько изменило бы его смысл, что, в свою очередь, должно было бы как-то отразиться и на переводе, нет?
- Verdict: **by_design**; group: lesson31-demonstrative-meaning; planned shards: 0
- Evidence: Русское “ту древнюю карту” требует demonstrative that. Вариант an ancient map грамматичен, но убирает указательное значение и меняет фразу.
- Action: Ошибка не подтверждена; награды нет.
- Draft reply: Спасибо за вопрос. В этой фразе that ancient map обозначает конкретную карту, о которой идёт речь, поэтому указательное слово выбрано намеренно. Текущий вариант соответствует смыслу задания.

### #30 5cNNVYCe57UkwrmGUICR
- Created: 2026-07-06T09:20:34.343Z
- User: OSkQKY9sNJQMQdCm8ADgtRfIe7F2; language: ru; screen: lesson_25; category: free_text; dataId: lesson_25_phrase_32
- Report comment: Будто бы надо this
- Verdict: **by_design**; group: lesson25-answer-alternatives; planned shards: 0
- Evidence: Канонический ответ — “the problem”, а “this problem” также принимается как смысловой вариант в текущей проверке.
- Action: Ошибка не подтверждена; награды нет.
- Draft reply: Спасибо за вопрос. Оба варианта возможны, но используются в разных ситуациях. В текущем задании выбран вариант, который точнее соответствует русской фразе, поэтому менять ответ не требуется.

### #31 asKqjZdGLbS420MaAysh
- Created: 2026-07-06T07:10:08.058Z
- User: 16dc05d1-af7f-4342-bdc3-64d68eb7dfab; language: ru; screen: daily_tasks; category: free_text; dataId: daily_tasks_main
- Report comment: Где взять эти новые слова если до того все были найдены? Я отдал 3 осколка чтобы поменять задание и зря.
- Verdict: **confirmed_fixed**; group: daily-words-reroll; planned shards: 2
- Evidence: Reroll теперь считает незавершённые слова до списания, исключает недоступные words_learned-кандидаты и заменяет невыполнимую задачу безопасным fallback.
- Action: Исправлено в клиенте; серьёзный сигнал получает 2 shards после следующего обновления приложения.
- Draft reply: Спасибо, что сообщили о списании осколков. Мы исправили замену ежедневного задания: теперь осколки не списываются, если новое задание нельзя корректно выдать. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 2 осколка.

### #32 eJCmlpZJxNbmMwfXzaI0
- Created: 2026-07-06T07:03:43.712Z
- User: reLQnS7HnaUmVsrUnZsRetjPOhe2; language: ru; screen: lesson_31; category: free_text; dataId: lesson_31_phrase_31
- Report comment: А ответе появляются как ранее не тренированные слова (stray, busy), так и отсутствующее в исходном предложении указательное местоимение that (перед busy street)
- Verdict: **confirmed_fixed**; group: lesson31-phrase31-extra-words; planned shards: 1
- Evidence: The Russian translation now includes the demonstrative «ту» before the busy street, matching the English that and the reported meaning.
- Action: Исправлено в контенте; награда 1 shard после следующего обновления приложения.
- Draft reply: Спасибо, что заметили неточность в переводе. Мы добавили недостающее указательное слово, чтобы русский вариант точно передавал смысл английской фразы. Обновление появится в следующей версии приложения. В благодарность за помощь мы начислили Вам 1 осколок.

### #33 I96MnckQyQ4IxPDWvet9
- Created: 2026-07-06T06:55:22.076Z
- User: reLQnS7HnaUmVsrUnZsRetjPOhe2; language: ru; screen: lesson_31; category: free_text; dataId: lesson_31_phrase_2
- Report comment: Слово complex не встречалось  в тренировках слов к этому и предыдущим урокам.   Подобная ситуация неодрократно встречалпсь и ранее..
- Verdict: **not_reproduced**; group: lesson31-vocabulary-sequencing; planned shards: 1
- Evidence: Current lesson 31 intro order 2 visibly contains that complex flight procedure before lesson31_phrase_2 at phrase order 2. The regression evidence passed before production changes, so the reported sequencing defect is not present in current content.
- Action: Изменение не требуется. Сохранить утверждённую награду 1 shard за внимательный сигнал.
- Draft reply: Спасибо, что обратили внимание на порядок новых слов. Мы внимательно проверили урок 31: слово complex уже показано в обучающем примере до второго задания, поэтому порядок материала здесь корректный. В благодарность за внимательность мы начислили Вам 1 осколок.

### #34 reZCWp7UqS7wo8k7GS5P
- Created: 2026-07-06T06:37:13.426Z
- User: reLQnS7HnaUmVsrUnZsRetjPOhe2; language: ru; screen: lesson_31; category: free_text; dataId: lesson_31_phrase_35
- Report comment: В задании нет указания на "ту" семью, которая... Но в ответе такое конкретное указание появляется в виде "that"
- Verdict: **not_reproduced**; group: lesson31-demonstratives; planned shards: 0
- Evidence: В текущем русском тексте phrase 35 есть “тот”, “ту” и “тому”; отсутствия семейства указательных слов не подтверждено.
- Action: Ошибка не воспроизводится в текущем источнике; награды нет.
- Draft reply: Спасибо за вопрос. Мы сверили английскую фразу и перевод: указательное слово в текущем варианте передаёт исходный смысл корректно. Изменения не требуются.

### #35 cuDrXH824NSMPzqP3B0Z
- Created: 2026-07-06T06:28:06.664Z
- User: reLQnS7HnaUmVsrUnZsRetjPOhe2; language: ru; screen: lesson_31; category: free_text; dataId: lesson_31_phrase_42
- Report comment: В исходном предложении отсутствует слово "тот" ( металлический ключ), который  (that) появляется в проверочном ответе
- Verdict: **not_reproduced**; group: lesson31-demonstratives; planned shards: 0
- Evidence: В текущем русском тексте phrase 42 есть “тот” перед old man и “тот” перед metal key; отсутствие that не подтверждено.
- Action: Ошибка не воспроизводится в текущем источнике; награды нет.
- Draft reply: Спасибо, что обратили внимание на указательное слово. Мы ещё раз сверили перевод с английским оригиналом и подтвердили, что текущий вариант соответствует контексту.

### #36 Jj7znH21PEZL1K9BfN2p
- Created: 2026-07-06T06:23:01.733Z
- User: cd4a8c38-2dc3-4202-a4b0-5d9ae1290e11; language: ru; screen: lesson_intro; category: free_text; dataId: lesson_intro_2_slide_2
- Report comment: Провсто проверяю работоспособность
- Verdict: **no_issue_details**; group: test-report; planned shards: 0
- Evidence: В записи указано только test functionality без конкретного шага, ожидаемого результата или симптома.
- Action: Нужны подробности для проверки; награды нет.
- Draft reply: Спасибо, что написали нам. В сообщении недостаточно деталей, чтобы понять, что именно произошло. Если проблема повторится, пожалуйста, укажите экран и действие перед её появлением — мы обязательно проверим.

### #37 Eaih4nB744GgKzZEIW86
- Created: 2026-07-06T05:38:21.133Z
- User: b5927e15-1f1a-4072-86ba-9cb72c0e9d97; language: ru; screen: lesson_21; category: free_text; dataId: lesson_21_phrase_6
- Report comment: Три слова и все без окончания, когда выбираешь одно из них а оно оказалось неправильным то при возвращении слова меняются местами и снова нужно угадать где правильное слово... Шрифт бы изменили на более мелкий чтобы слова помещались
- Verdict: **confirmed_fixed**; group: lesson21-layout-and-variants; planned shards: 0
- Evidence: Answer font size previously ignored screen width and text length. Typed, assembled and result answers now reduce only for long text on screens up to 399 px; accepted variants and submit behavior are unchanged. Focused layout tests pass.
- Action: Исправление готово в JS-клиенте; доставка требует разрешённого OTA. Награда 0 по утверждённой таблице.
- Draft reply: Спасибо, что обратили внимание на отображение длинных вариантов. Мы скорректировали размер текста для длинных ответов на небольших экранах, чтобы варианты помещались и оставались читаемыми. Изменение появится в следующем обновлении приложения.

### #38 xy1jWnPrnWi1FuEIv9do
- Created: 2026-07-06T05:11:20.342Z
- User: rsaZF3UfoeSVVWhrLsHBNb8Auuc2; language: ru; screen: trainer_phrases; category: free_text; dataId: trainer_phrase_We bought a ticket
- Report comment: We с заглавной
- Verdict: **duplicate**; group: trainer-first-tile-capitalization; planned shards: 0
- Evidence: Тот же trainer-case сигнал, что в №41; первичный по времени — №41.
- Action: Дубликат исправленного сигнала; награда 0.
- Draft reply: Спасибо, что сообщили о лишней заглавной букве. Мы исправили первую плитку, и обновлённый вариант появится в следующей версии приложения.

### #39 UbwtYNs2xIKqVwAYF9GN
- Created: 2026-07-06T05:10:11.468Z
- User: rsaZF3UfoeSVVWhrLsHBNb8Auuc2; language: ru; screen: trainer_phrases; category: free_text; dataId: trainer_phrase_We chose an option
- Report comment: We  с заглавной
- Verdict: **duplicate**; group: trainer-first-tile-capitalization; planned shards: 0
- Evidence: Тот же trainer-case сигнал, что в №41; первичный по времени — №41.
- Action: Дубликат исправленного сигнала; награда 0.
- Draft reply: Спасибо, что обратили внимание на первую плитку. Теперь она отображается без лишней заглавной буквы. Исправление появится в следующем обновлении приложения.

### #40 km2yjVJdIKoGqaZDK55Z
- Created: 2026-07-06T05:08:50.688Z
- User: rsaZF3UfoeSVVWhrLsHBNb8Auuc2; language: ru; screen: trainer_phrases; category: free_text; dataId: trainer_phrase_I have a bag
- Report comment: Здесь в задании непонятные  символы.
- Verdict: **confirmed_fixed**; group: trainer-legacy-mojibake; planned shards: 1
- Evidence: Sanitizer теперь распознаёт реальные последовательности Ð.../Ñ... и replacement characters, очищая испорченную запись вместо показа кракозябр.
- Action: Исправлено в клиенте; награда 1 shard после следующего обновления приложения.
- Draft reply: Спасибо, что заметили повреждённые символы в переводе. Мы исправили распознавание такого текста, чтобы тренер показывал нормальную фразу. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.

### #41 NyL0rHoXd66GrFRIiWXZ
- Created: 2026-07-06T05:05:40.383Z
- User: rsaZF3UfoeSVVWhrLsHBNb8Auuc2; language: ru; screen: trainer_phrases; category: free_text; dataId: trainer_phrase_The books are old
- Report comment: The с заглавной буквы
- Verdict: **confirmed_fixed**; group: trainer-first-tile-capitalization; planned shards: 1
- Evidence: Текущий shuffleWordBankTiles нормализует первое слово предложения с сохранением I и имён собственных; этот репорт первичный в группе.
- Action: Исправлено в клиенте; награда 1 shard после следующего обновления приложения.
- Draft reply: Спасибо, что сообщили о лишней заглавной букве. Теперь первая плитка показывается в правильном регистре. Исправление появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.

### #42 hdlK4smg08QbCyAdQx4I
- Created: 2026-07-06T03:37:22.263Z
- User: 3d940f41-4265-47d2-97d7-838350026a50; language: ru; screen: lesson_27; category: free_text; dataId: lesson_27_phrase_18
- Report comment: Не переводит
- Verdict: **user_error**; group: lesson27-would-base-form; planned shards: 0
- Evidence: Текущий ответ — “You said that you would check the documents”. Форма would checked грамматически неверна: после would не ставится прошедшая форма checked.
- Action: Приложение показывает корректную форму; награды нет.
- Draft reply: Спасибо за вопрос. После would используется базовая форма глагола, поэтому check в этом предложении стоит правильно. Текущий ответ в задании оставляем без изменений.

### #43 3Y1PapB1cyFmFrv3HVjV
- Created: 2026-07-06T00:59:17.304Z
- User: OSkQKY9sNJQMQdCm8ADgtRfIe7F2; language: ru; screen: lesson_theory; category: free_text; dataId: lesson_theory_25
- Report comment: Were they watching TV? (Wеre не выделено)
- Verdict: **confirmed_fixed**; group: lesson25-theory-highlight; planned shards: 1
- Evidence: Highlight был задан как разорванный фрагмент “Were watching”, хотя renderer поддерживает непрерывную подстроку. Значение заменено на “Were”.
- Action: Исправлено в клиенте; награда 1 shard после следующего обновления приложения.
- Draft reply: Спасибо, что заметили расхождение. Мы исправили подсветку слова Were, и теперь она совпадает с текстом предложения. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.

### #44 l6mpcxYKVFFmwkJP0wY8
- Created: 2026-07-06T00:53:11.547Z
- User: ca143d63-2a15-485d-98be-cc448fb18150; language: ru; screen: lesson_1; category: free_text; dataId: lesson_1_phrase_22
- Report comment: We are safe
- Verdict: **no_issue_details**; group: lesson1-no-described-error; planned shards: 0
- Evidence: В текущем phrase 22 канонический текст — “We are inside”; комментарий не содержит конкретного симптома или ожидаемого исправления.
- Action: Нужны подробности для проверки; награды нет.
- Draft reply: Спасибо, что написали нам. В сообщении нет описания конкретной проблемы, поэтому мы не можем восстановить ситуацию. Если это повторится, пожалуйста, кратко опишите экран и действие — мы проверим.

### #45 YjTrxf5RntE9u6V1T6Iv
- Created: 2026-07-05T21:26:31.854Z
- User: b5927e15-1f1a-4072-86ba-9cb72c0e9d97; language: ru; screen: lesson_21; category: free_text; dataId: lesson_21_phrase_22
- Report comment: Кто нибудь так говорит по русски? Ничего не так? Вам ии предложения составлял?
- Verdict: **confirmed_fixed**; group: lesson21-translation; planned shards: 1
- Evidence: В текущем источнике используется естественное “Всё в порядке” вместо буквального “Ничего не так?”.
- Action: Контент исправлен; награда 1 shard после следующего обновления приложения.
- Draft reply: Спасибо, что обратили внимание на перевод. Мы заменили неестественную формулировку на более естественный русский вариант. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.

### #46 BZRB6P5UK3s9QTpg5wnH
- Created: 2026-07-05T17:34:51.493Z
- User: d5f541a0-efc6-4170-bfbb-cc87e8e702e1; language: ru; screen: lesson_8; category: free_text; dataId: lesson_8_phrase_31
- Report comment: В 8 уроке проверки на правильный предлог практически нет, среди предложенных вариантов всегда один предлог и то правильный, мне не нужно гадать или вспоминать, ответ уже перед мной!!!
- Verdict: **confirmed_fixed**; group: lesson8-preposition-options; planned shards: 1
- Evidence: Генератор подбирает false-preposition distractors, а контракт проверяет минимум два варианта и наличие правильного ответа.
- Action: Исправлено в клиенте; награда 1 shard после следующего обновления приложения.
- Draft reply: Спасибо, что сообщили о вариантах ответа. Мы исправили набор в упражнении, и теперь на экране остаются все необходимые варианты для выбора. Изменение появится в следующем обновлении приложения. В благодарность за помощь мы начислили Вам 1 осколок.

### #47 u7sWM2WEuUKPE2ytoc70
- Created: 2026-07-05T14:29:13.901Z
- User: hGmob8b01wgEHsPpw7ugUUVFuUK2; language: ru; screen: lesson_31; category: free_text; dataId: lesson_31_phrase_32
- Report comment: А может надо было в вопросе использовать слово трудный,а не сложный? Complex -это ведь сложный?
- Verdict: **by_design**; group: lesson31-translation-word-choice; planned shards: 0
- Evidence: Оба слова могут переводиться как “сложный”; в текущем phrase 32 выбран естественный для контекста вариант “трудный”.
- Action: Ошибка не подтверждена; награды нет.
- Draft reply: Спасибо за вопрос. Complex и difficult близки по смыслу, но не полностью взаимозаменяемы. В этом задании выбран перевод, который соответствует контексту, поэтому менять его не требуется.

### #48 OSV3keL8TZ7D89MSTgVg
- Created: 2026-07-05T10:53:53.860Z
- User: 16a46276-0029-4cdc-b301-f3a3f9739d0b; language: ru; screen: lesson_2; category: free_text; dataId: lesson_2_phrase_49
- Report comment: Неправильно нажала случайно
- Verdict: **no_issue_details**; group: accidental-tap; planned shards: 0
- Evidence: В репорте указано, что отправка произошла случайно; описания сбоя или неверного результата нет.
- Action: Ошибка не подтверждена; награды нет.
- Draft reply: Спасибо, всё в порядке. Мы поняли, что сообщение было отправлено случайно.

## Delivery status

- Confirmed client and content fixes are ready in the local JS code and require a separately authorized OTA before reaching devices.
- Prepared support replies remain drafts until an administrator explicitly sends them.
