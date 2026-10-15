# Аудит кнопок Карточки + Видео: правки зоны Дизайна (R43, #4–#6, #16–#17, #20–#27, 15.10)

Governance-ID: TG-AD613E9712F9
Governance-ID: TG-8CF3503B4A10
Governance-ID: TG-CD8854E6FAC6

## Outcome
По аудиту кнопок (button-audit-cards-video-2026-10-15.md, 🔴 зоны Дизайна): ни одна кнопка не должна быть «мёртвой» или молчаливой. Карточки: «Вернуть» показывает карточку сразу; нет «⋯» без строк; «Пополнить» без магазина убрано; у Plus нет «N/30»; «Следующий раунд» при нуле энергии открывает окно; на «Говорении», «Блице», «Верно/неверно» есть выход из состояний «Готовим…»/«Не открылась». Микрофон при ожидании доступа показывает индикатор (R43). Видео: плейлист и сетка плейлистов полные, пустой результат — честное состояние с «Повторить», канал строго по языку обучения, «Напомнить» честно говорит об отказе.

## Scope
`app/flashcards/SpeakMicButton.tsx`, `app/flashcards_collection.tsx`, `app/flashcards/CollectionGalleryView.tsx`, `app/flashcards/CardPackShardPaywallModal.tsx`, `app/flashcards/FlashcardsHubScreen.tsx`, `app/flashcards_training_setup.tsx`, `app/flashcards_swipe.tsx`, `app/flashcards_speaking_session.tsx`, `app/flashcards_blitz_session.tsx`; Видео: `app/lingman_videos.tsx`, `app/lingman_playlist.tsx`, `app/all_channel_videos_source.ts`, `app/youtube_premiere_notifications.ts` (причина отказа). Тесты — рядом.

## Architecture
Каждый пункт — локальная правка существующего экрана без нового состояния на сервере. Видео: полный список плейлистов добавляется в уже существующий локальный кэш «Все видео» (`all_channel_videos_source`), без новых чтений Firestore сверх нынешних (тот же раз в 6 часов и манифест).

## Security and privacy
Новых данных пользователя нет, политика не меняется.

## Technical debt
Тексты «На этом языке пока нет роликов» и причины отказа напоминаний — на 9 языках, отдаю Переводчику на вычитку. 🟡 «Коллекция/редактор» и «Видео» — следующим заходом.

## Verification
Точечные тесты соседних сторожей, исходные контракты на каждый пункт; снимки — Сверка.

## Rollback
Откат коммитов.

Governance-ID: TG-90DA3125493B
Дополнение (Ревизор по 9fa4a4835, 15.10): #16/#17 лимит «N/30» только при accessResolved && !hasPremiumAccess; R43 — индикатор ожидания доступа и автозапуск записи на уровне общего gate для всех микрофонов; #25 «Нет роликов» только после allChannel.status === ready; #26 на языке без канала шапка скрывает канал по умолчанию.
