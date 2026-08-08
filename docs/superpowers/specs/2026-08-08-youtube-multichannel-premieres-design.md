# Мультиканальный YouTube-раздел и премьеры — дизайн

Дата: 2026-08-08  
Статус: утверждено владельцем  
Проект: Phraseman

## 1. Цель

Переделать существующий экран `app/lingman_videos.tsx` из каталога одного YouTube-канала в мультиканальный раздел, который:

- автоматически открывает основной канал, соответствующий языку приложения;
- позволяет открыть витрину «Все наши каналы» и вручную выбрать другой канал;
- показывает для каждого канала отдельные вкладки «Главная», «Плейлисты» и «Все видео»;
- автоматически импортирует публичные плейлисты канала;
- распознаёт ожидаемые, активные и завершённые премьеры;
- показывает обратный отсчёт до ожидаемой премьеры;
- предлагает локальное напоминание за 10 минут до начала;
- встречает пользователя однократной кинематографической анимацией, если премьера уже идёт;
- управляется из действующей legacy-админки.

## 2. Зафиксированная граница админки

Правильная админка проекта — legacy-интерфейс, физически расположенный в `admin/v2/legacy.html`.

Это подтверждается текущим кодом:

- Firebase Hosting target `admin` публикует каталог `admin/v2`;
- `/` и `/index.html` перенаправляются на публичный URL `/legacy.html`;
- исходником этого URL и текущего редактора YouTube является `admin/v2/legacy.html`.

Название каталога `v2` историческое и не означает, что используется Admin 2. Забракованная белая Admin 2-панель (`admin/v2/index.html` и `admin/v2/scripts/**`) остаётся замороженной. Отставшая копия `admin/legacy.html` также не изменяется.

## 3. Текущее состояние

Сейчас приложение:

- получает один активный канал через `getActiveYoutubeChannel()`;
- загружает RSS `feeds/videos.xml?channel_id=...`;
- фильтрует Shorts;
- объединяет RSS с ручными видео из `youtube_pinned_videos`;
- кэширует последний успешный список;
- показывает одну ленту без каналов, плейлистов и статусов премьер;
- использует встроенный YouTube player без autoplay.

Legacy-админка хранит только один набор `youtube_channel_id`, `youtube_channel_handle`, `youtube_channel_name`, `youtube_channel_url` и общий список `youtube_pinned_videos`.

RSS остаётся полезным fallback-источником, но не является достаточным источником точного статуса премьеры и `scheduledStartTime`.

## 4. Выбранный продуктовый подход

Выбран серверный каталог с кэшем.

```text
Legacy Admin
    ↓ config
YouTube Catalog Sync ←→ YouTube Data API
    ↓ atomic publish
Firestore public snapshot
    ↓ read-only
Mobile app + local cache + local premiere reminder
```

Мобильное приложение не содержит YouTube API-ключ и не делает отдельные Data API-запросы с каждого устройства.

Официальные возможности, на которых основан дизайн:

- `video.liveStreamingDetails` содержит `scheduledStartTime`, `actualStartTime` и `actualEndTime`: https://developers.google.com/youtube/v3/docs/videos
- `search.list` поддерживает `eventType=upcoming|live|completed`: https://developers.google.com/youtube/v3/docs/search/list
- `playlists.list` получает публичные плейлисты по `channelId`: https://developers.google.com/youtube/v3/docs/playlists/list
- YouTube Data API использует проектную квоту и рекомендует ограничивать поля и кэшировать ответы: https://developers.google.com/youtube/v3/getting-started

## 5. Архитектура и границы ответственности

### 5.1 Legacy Admin

Legacy-админка редактирует только конфигурацию владельца:

- каналы и их порядок;
- языковые привязки;
- основной канал каждого языка;
- видимость каналов;
- видимость и порядок автоматически найденных плейлистов;
- безопасные ручные overrides премьер;
- ручной запуск синхронизации;
- диагностика последней синхронизации.

Админка не вызывает YouTube Data API напрямую и не получает API-ключ.

### 5.2 YouTube Catalog Sync

Серверная синхронизация:

1. читает и валидирует конфигурацию;
2. получает публичные данные каналов, видео, плейлистов и премьер;
3. применяет админские overrides;
4. сохраняет существующее продуктовое правило «длинные видео без Shorts» и нормализует записи в единый контракт;
5. публикует новый снимок атомарно только после полной валидации;
6. сохраняет admin-only диагностику и состояние следующего обновления.

Планировщик запускается раз в минуту, но канал запрашивается только когда его `nextSyncAt` наступил:

- обычный каталог: не чаще одного раза в 15 минут;
- ожидаемая премьера в ближайшие 24 часа: не чаще одного раза в 2 минуты;
- активная премьера: не чаще одного раза в минуту;
- после завершения: возврат к обычному интервалу.

Для обычного каталога используются uploads playlist и `videos.list`. `search.list` применяется как ограниченный fallback для обнаружения upcoming/live-событий и работает через общий дневной бюджет не выше 80 вызовов. После обнаружения videoId состояние события обновляется дешёвым `videos.list`, без повторного event search каждую минуту.

Ручной refresh в админке соблюдает тот же серверный budget manager и не может запустить неограниченный цикл запросов.

### 5.3 Firestore

Выделяется коллекция `youtube_catalog`:

- `youtube_catalog/config` — admin-only конфигурация;
- `youtube_catalog/public` — компактный manifest с указателем `activeVersion`, доступный приложению только для чтения;
- `youtube_catalog/sync_state` — admin-only диагностика, ETag, ошибки, `nextSyncAt` и оценка расхода квоты.

Данные активной версии хранятся отдельно:

- `youtube_catalog_snapshots/{version}` — метаданные версии;
- `youtube_catalog_snapshots/{version}/channels/{channelId}` — канал и порядок его разделов;
- `youtube_catalog_snapshots/{version}/channels/{channelId}/videos/{videoId}` — видео;
- `youtube_catalog_snapshots/{version}/channels/{channelId}/playlists/{playlistId}` — плейлист;
- `youtube_catalog_snapshots/{version}/channels/{channelId}/playlists/{playlistId}/pages/{page}` — страницы до 50 videoId.

Сервер сначала полностью строит и валидирует новую версию, затем одной транзакцией переключает `youtube_catalog/public.activeVersion`. Поэтому частично записанная версия никогда не становится видимой клиенту. Старые безопасные публичные версии сохраняются семь дней для rollback, затем удаляются bounded cleanup-задачей.

Запись manifest и versioned snapshot происходит только с сервера. Мобильный клиент не может менять каталог.

### 5.4 Мобильное приложение

Приложение:

- сразу показывает последний локальный кэш;
- затем читает `youtube_catalog/public`;
- выбирает канал по языковой привязке или сохранённому ручному выбору;
- вычисляет отображаемый countdown локально из абсолютного ISO/RFC 3339 времени;
- управляет однократностью премиальной анимации на устройстве;
- планирует и отменяет локальное напоминание через существующий слой `app/notifications.ts`;
- продолжает открывать видео через доверенные YouTube URL и существующий встроенный player.

## 6. Контракты данных

### 6.1 Config

```ts
type YoutubeCatalogConfig = {
  schemaVersion: 1;
  enabled: boolean;
  channels: YoutubeChannelConfig[];
  localeDefaults: Record<string, string>; // locale -> internal channelId
  updatedAt: string;
  updatedBy: string;
};

type YoutubeChannelConfig = {
  id: string;                         // стабильный внутренний id
  youtubeChannelId: string;           // UC + 22 base64url символа
  enabled: boolean;
  order: number;
  languageTags: string[];             // BCP-47, например en, es, pt-BR
  displayNameOverride?: string;
  pinnedVideos?: PinnedVideoInput[];
  playlistOverrides: Record<string, {
    hidden?: boolean;
    order?: number;
    titleOverride?: string;
  }>;
  premiereOverrides: Record<string, {
    hidden?: boolean;
    titleOverride?: string;
    scheduledStartOverride?: string;
    expiresAt: string;
  }>;
};
```

Правила валидации:

- внутренние `id` уникальны и неизменяемы после создания;
- `youtubeChannelId` должен соответствовать `UC[0-9A-Za-z_-]{22}`;
- один locale имеет не более одного основного канала;
- основной канал locale должен быть включён;
- все внешние URL строятся сервером или проходят существующую trusted-host валидацию;
- любой premiere override имеет `expiresAt` и не живёт бесконечно;
- неверная конфигурация не заменяет последний опубликованный снимок.

### 6.2 Public manifest и versioned snapshot

```ts
type YoutubeCatalogManifest = {
  schemaVersion: 1;
  activeVersion: string;
  generatedAt: string;
  sourceRefreshedAt: string;
  defaultChannelId: string;
  localeDefaults: Record<string, string>;
  channels: Array<{
    id: string;
    displayName: string;
    avatarUrl?: string;
    languageTags: string[];
    order: number;
  }>;
};

type YoutubeChannelSnapshot = {
  id: string;
  youtubeChannelId: string;
  displayName: string;
  handle: string;
  url: string;
  avatarUrl?: string;
  languageTags: string[];
  order: number;
  activeEventVideoId?: string;
  recentVideoIds: string[];
  playlistIds: string[];
};

type YoutubeVideoSnapshot = {
  id: string;
  channelId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  watchUrl: string;
  publishedAt?: string;
  viewCount?: number;
  state: 'video' | 'upcoming' | 'live' | 'completed';
  scheduledStartTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  playlistIds: string[];
};

type YoutubePlaylistSnapshot = {
  id: string;
  channelId: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  url: string;
  itemCount: number;
  order: number;
  pageCount: number;
};

type YoutubePlaylistPage = {
  page: number;
  videoIds: string[]; // максимум 50
};
```

`sync_state` не включается в публичные документы, кроме безопасных `generatedAt` и `sourceRefreshedAt` в manifest. Разделение по версиям и страницам не позволяет одному каналу или большому плейлисту приблизить документ к лимиту Firestore.

## 7. UX приложения

### 7.1 Выбор канала

При первом входе:

1. нормализуется текущий язык приложения до BCP-47;
2. ищется точное соответствие `localeDefaults`;
3. затем соответствие по базовому языку, например `es-MX → es`;
4. затем используется `defaultChannelId`;
5. финальный встроенный fallback — PHRASEMAN English.

Пользователь может открыть «Все наши каналы» и выбрать другой канал. Ручной выбор сохраняется отдельно от автоматического режима. В витрине есть действие «Выбирать автоматически по языку», которое очищает ручной override.

Для одного языка разрешены один основной и дополнительные каналы. Автовыбор ведёт на основной, дополнительные доступны в витрине.

### 7.2 Навигация канала

Верхняя одиночная плашка канала заменяется структурой:

- заголовок текущего канала;
- кнопка «Все наши каналы»;
- вкладки «Главная», «Плейлисты», «Все видео».

«Главная» содержит ближайшее событие, популярные/первые плейлисты и новые видео.  
«Плейлисты» показывает все разрешённые плейлисты текущего канала.  
«Все видео» показывает длинные видео канала в обратном хронологическом порядке.

Открытие плейлиста ведёт на отдельный экран с обложкой, описанием, количеством видео, «Воспроизвести всё» и роликами в порядке YouTube. Нажатие «Воспроизвести всё» открывает доверенный официальный URL плейлиста в YouTube, где YouTube управляет очередью; отдельные ролики по-прежнему открываются существующим встроенным player. Эта версия задачи не добавляет собственный autoplay/queue engine.

### 7.3 Ожидаемая премьера

Ближайшая ожидаемая премьера занимает hero-зону сверху:

- метка «Скоро премьера»;
- обложка и название;
- локализованные дни, часы и минуты до старта;
- на последнем часу добавляются секунды;
- кнопка «Напомнить»;
- кнопка «Подробнее»/открытие карточки.

Countdown:

- пересчитывается по абсолютному `scheduledStartTime`;
- не бывает отрицательным;
- при достижении нуля показывает состояние «Проверяем начало…», пока новый снимок не подтвердит live;
- при подтверждённом live превращается в активную премьеру без перезапуска приложения.

### 7.4 Локальное напоминание

Нажатие «Напомнить»:

1. запрашивает разрешение только в этот момент через существующую permission-модель;
2. проверяет существующий master-переключатель уведомлений; если он выключен, предлагает включить его, не обходя настройку пользователя;
3. планирует уведомление за 10 минут до `scheduledStartTime`;
4. если до старта меньше 10 минут, планирует его ровно на момент начала и сообщает «Напомним в момент начала»;
5. сохраняет связь `videoId → notificationId + scheduledStartTime`;
6. при изменении времени отменяет старое уведомление и создаёт новое;
7. при отмене, скрытии или завершении премьеры отменяет уведомление;
8. при нажатии на уведомление открывает экран активного канала и соответствующее видео.

Добавляется отдельный тип локального уведомления `youtube_premiere`; он не должен быть случайно удалён функциями, которые чистят другие категории.

### 7.5 Активная премьера

Если `state === 'live'`, hero получает выбранное премиальное вступление:

- один световой кинематографический контур;
- проявление метки «Премьера сейчас» и CTA «Присоединиться»;
- длительность вступления не более 1,2 секунды;
- видео не запускается автоматически;
- экран не блокируется модальным окном;
- при системном reduced motion вступление заменяется статичным акцентом;
- анимация воспроизводится один раз на устройстве для каждого `videoId`.

Ключ однократности хранится как bounded map последних премьер, а не как бесконечный набор. После первого воспроизведения остаётся выразительная статичная live-карточка.

### 7.6 Завершённая премьера

После `actualEndTime` событие перестаёт быть hero и появляется в обычной ленте как запись. Метка live и countdown исчезают. Ссылка и встроенный player остаются обычными YouTube-видео.

## 8. Legacy-админка

Текущая карточка «YouTube-канал» в живом legacy-файле `admin/v2/legacy.html` превращается в «YouTube-каталог».

### 8.1 Список каналов

Левая/верхняя колонка показывает:

- название;
- язык;
- статус enabled;
- основной/дополнительный статус;
- последнюю синхронизацию;
- действие «Добавить канал».

Админ вставляет Channel ID или доверенную YouTube-ссылку. Сервер подтягивает имя, handle и аватар. Невалидный ввод остаётся в форме и не публикуется.

### 8.2 Редактор канала

Поля:

- название в приложении;
- Channel ID;
- языковые теги;
- основной канал выбранного locale;
- enabled;
- порядок;
- ручные pinned videos, привязанные к каналу.

Сохранение атомарно: сначала полная валидация, затем запись config и запуск sync. Ошибка не меняет public snapshot.

### 8.3 Плейлисты

Публичные плейлисты импортируются автоматически. Для каждого можно:

- скрыть/показать;
- изменить порядок drag-and-drop;
- задать отображаемое название;
- открыть оригинал на YouTube.

Удаление автоматического плейлиста из YouTube не ломает config: override помечается orphaned и виден в диагностике до ручного удаления.

### 8.4 Премьеры

Вкладка показывает upcoming/live/completed события, полученные от YouTube, и их исходные поля. Разрешены только overrides:

- скрыть событие;
- изменить подпись в приложении;
- временно заменить `scheduledStartTime`;
- принудительно перечитать событие.

Override всегда показывает отличие от YouTube, автора изменения, время и срок действия. Просроченный override автоматически перестаёт применяться.

### 8.5 Диагностика

Показываются:

- время последнего успешного и последнего неуспешного sync;
- ошибка по каждому каналу;
- возраст public snapshot;
- `nextSyncAt`;
- оценка дневного расхода quota/search budget;
- количество каналов, видео, плейлистов и активных событий;
- «Обновить сейчас»;
- read-only preview опубликованного снимка.

## 9. Ошибки и отказоустойчивость

- Сбой одного канала не должен удалять успешные данные других каналов.
- Новая snapshot-версия становится активной только после полной schema validation; иначе manifest продолжает указывать на предыдущую версию.
- Если YouTube недоступен, приложение использует локальный и Firestore-кэш.
- Stale-каталог не блокирует просмотр; при заметной устарелости показывается спокойная отметка последнего обновления.
- Пустой новый канал показывает понятное empty state и кнопку открыть канал на YouTube.
- Недоверенные URL отбрасываются существующей trusted-host логикой.
- Некорректные даты не участвуют в countdown и попадают в admin diagnostics.
- Сетевые повторные попытки используют exponential backoff с jitter и server-side `nextSyncAt`.
- Удалённое YouTube-видео исчезает после успешной синхронизации; сохранённое напоминание отменяется.
- Перевод часов устройства не меняет абсолютный момент премьеры; countdown пересчитывается при resume.

## 10. Миграция и обратная совместимость

Миграция выполняется без отключения текущего раздела:

1. из `youtube_channel_*` строится первый `YoutubeChannelConfig`;
2. если override отсутствует, первым каналом становится встроенный PHRASEMAN English;
3. `youtube_pinned_videos` переносятся в `pinnedVideos` первого канала;
4. выполняется первая серверная синхронизация, проверка snapshot и переключение `activeVersion`;
5. новый клиент читает `youtube_catalog/public` и активную версию, но при отсутствии manifest использует существующий RSS-путь;
6. legacy-поля не удаляются в первой версии и остаются rollback fallback;
7. запись только в новый config включается после подтверждения, что production-клиенты читают новый snapshot.

В миграции участвует только живой legacy-файл `admin/v2/legacy.html`. Забракованные файлы Admin 2 (`admin/v2/index.html`, `admin/v2/scripts/**`) и замороженная копия `admin/legacy.html` не изменяются.

## 11. Безопасность и приватность

- YouTube API key хранится в серверном secret, а не в `.env.local`, bundle или Firestore.
- Ключ ограничивается YouTube Data API и, где возможно, серверными ограничениями Google Cloud.
- Public manifest и versioned snapshots содержат только публичные YouTube-данные и безопасные admin overrides.
- Config и sync diagnostics доступны только действующим администраторам.
- Все admin writes проверяются сервером; клиентская HTML-валидация не считается границей безопасности.
- Текстовые overrides экранируются в legacy-админке и отображаются в React Native как текст, без HTML-инъекций.
- Ручной refresh защищён admin auth, rate limit и audit trail.
- App Check для админских callable-функций в рамках этой задачи не включается.
- Функция не добавляет пользовательское отслеживание и не меняет существующие analytics-consent правила.

## 12. Тестирование

### 12.1 Unit

- парсинг и валидация channel/video/playlist ID;
- уникальность основных каналов locale;
- точный и базовый языковой fallback;
- нормализация `video | upcoming | live | completed`;
- countdown, zero boundary и смена часового пояса;
- merge RSS/Data API/pinned/overrides без дублей;
- bounded storage однократной анимации;
- расчёт нового notification schedule.

### 12.2 Cloud Functions

- YouTube API mock для обычного, upcoming, live, completed и deleted video;
- per-channel partial failure;
- quota/search budget enforcement;
- ETag/cache и `nextSyncAt`;
- retry/backoff;
- schema rejection не заменяет public snapshot;
- неполностью записанная версия не переключает `activeVersion`;
- rollback на предыдущую версию и bounded cleanup версий старше семи дней;
- admin-only manual refresh;
- Firestore Rules/authorization для config, public и sync_state.

### 12.3 Legacy Admin

- добавление и редактирование канала;
- невалидный URL/ID;
- конфликт основного канала locale;
- автоматический импорт, скрытие и reorder плейлистов;
- premiere override, expiry и reset к YouTube;
- loading/empty/success/error состояния sync;
- HTML escaping и отсутствие XSS;
- контракт гарантирует, что изменяется только `admin/v2/legacy.html`, а Admin 2 shell и замороженные копии не затронуты.

### 12.4 React Native

- первый кадр из cache;
- канал по языку и сохранённый ручной выбор;
- вкладки и playlist detail;
- upcoming hero и timer;
- live hero, однократная animation и reduced motion;
- completed video в обычной ленте;
- notification permission только после tap;
- schedule/reschedule/cancel и deep-link;
- touch targets не меньше 44 dp и accessibility labels;
- offline и stale snapshot;
- существующий trusted YouTube navigation и отсутствие autoplay.

### 12.5 Интеграционный сценарий

Один сценарий обязан пройти без переустановки приложения:

1. админ добавляет новый языковой канал в живом legacy-интерфейсе `admin/v2/legacy.html`;
2. sync публикует канал, видео и плейлисты;
3. приложение соответствующего языка выбирает его автоматически;
4. будущая премьера появляется с countdown;
5. пользователь включает напоминание;
6. время премьеры меняется, уведомление переносится;
7. событие становится live, проигрывается одна анимация;
8. повторный вход не повторяет вступление;
9. после завершения запись переходит в обычную ленту.

## 13. Критерии приёмки

- Для каждого поддерживаемого locale можно назначить один основной и несколько дополнительных каналов.
- Первый вход открывает основной канал языка, ручной выбор сохраняется и может быть сброшен в автоматический режим.
- Каждый канал имеет «Главная», «Плейлисты» и «Все видео».
- Публичные плейлисты импортируются автоматически, сортируются и скрываются из legacy-админки.
- Ожидаемая премьера показывает корректный countdown и локальное напоминание за 10 минут.
- Активная премьера показывает premium animation один раз на videoId, без autoplay и с reduced-motion fallback.
- Завершённая премьера становится обычной записью.
- YouTube API key отсутствует в мобильном bundle и публичном Firestore.
- Ошибка sync не удаляет последний рабочий каталог.
- Старые одиночные настройки продолжают работать как rollback fallback.
- Забракованный Admin 2 shell (`admin/v2/index.html`, `admin/v2/scripts/**`) и замороженная копия `admin/legacy.html` не изменены.
- Focused unit, function, admin и app tests проходят.

## 14. Не входит в задачу

- публикация или редактирование контента на YouTube;
- управление подписками пользователя на каналы;
- YouTube OAuth от имени пользователя;
- встроенный live chat;
- Shorts;
- autoplay;
- push-уведомления с сервера вместо выбранного локального напоминания;
- аналитика YouTube Studio;
- любые изменения Admin v2.
