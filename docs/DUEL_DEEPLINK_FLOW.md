# Дуэльные ссылки — полная логика

## Как работает приглашение на дуэль

### 1. Генерация ссылки
`app/arena_lobby.tsx` — константа `DEEPLINK_BASE = 'https://badloar-star.github.io/phraseman/duel'`

Ссылка выглядит так: `https://badloar-star.github.io/phraseman/duel/262RlLL`
roomId генерируется функцией `genRoomId()` — 7 случайных символов base36 в верхнем регистре.

Комната живёт **10 минут** (`expiresAt: Date.now() + 10 * 60 * 1000`) в Firestore коллекции `arena_rooms`.

---

### 2. Когда приложение УЖЕ установлено

Android перехватывает ссылку через `intentFilters` в `app.json`:
```json
{ "scheme": "https", "host": "badloar-star.github.io", "pathPrefix": "/phraseman/duel" }
```

Верификация домена: `gh-pages` ветка репозитория содержит `.well-known/assetlinks.json` с SHA256 fingerprint APK.

`app/_layout.tsx` слушает `Linking.getInitialURL()` и `Linking.addEventListener('url')`.
Паттерн: `/duel/([A-Z0-9]+)/i` → навигация на `/arena_join?roomId=ROOMID`.

---

### 3. Когда приложение НЕ установлено (deferred deep linking)

**GitHub Pages `404.html`** (ветка `gh-pages`, корень репозитория):
- GitHub Pages отдаёт `404.html` для любого несуществующего пути
- Скрипт извлекает roomId из URL: `/duel/([A-Za-z0-9]+)`
- Пробует открыть приложение: `phraseman://duel/ROOMID`
- Через 1.5 сек редирект на Google Play **с referrer**: `&referrer=duel_ROOMID`

**После установки** — при первом запуске приложения:
`app/_layout.tsx` → функция `init()`:
1. Читает `AsyncStorage.getItem('onboarding_done')`
2. Если онбординг НЕ пройден + Android + не Expo Go → вызывает `PlayInstallReferrer.getInstallReferrerInfo()`
3. Если referrer совпадает с паттерном `duel_[A-Za-z0-9]+` → пропускает онбординг, сохраняет `onboarding_done = '1'`, навигирует на `/arena_join?roomId=ROOMID`

Библиотека: `react-native-play-install-referrer` v1.1.9 (callback-based API, не Promise).

---

### 4. Экран присоединения к комнате

`app/arena_join.tsx`:
- Читает `roomId` из `useLocalSearchParams()`
- Проверяет документ в `arena_rooms/{roomId}` в Firestore
- Если `expiresAt < Date.now()` → показывает "истекла"
- Если документ не найден → "не найдена"
- Если всё ок → показывает имя хоста, кнопка "Присоединиться"
- При нажатии: обновляет документ `{ guestId, guestName, status: 'matched' }`, переходит на `/arena_game?sessionId=ROOMID&userId=UID`

---

### 5. Файлы на GitHub Pages (ветка `gh-pages`)

| Файл | Назначение |
|------|-----------|
| `404.html` | Перехватывает все 404, обрабатывает `/duel/ROOMID` |
| `duel/index.html` | Резервная страница если браузер зашёл напрямую |
| `.well-known/assetlinks.json` | Верификация Android App Links |
| `.nojekyll` | Разрешает GitHub Pages отдавать `.well-known/` |

---

### 6. Ключевые файлы в приложении

| Файл | Роль |
|------|------|
| `app/arena_lobby.tsx` | Создаёт комнату, генерирует и шарит ссылку |
| `app/arena_join.tsx` | Экран присоединения по ссылке |
| `app/arena_game.tsx` | Сам игровой экран дуэли |
| `app/_layout.tsx` | Deeplink listener + deferred deep link при старте |
| `app.json` | `intentFilters` для перехвата HTTPS ссылок Android |

---

### 7. Ограничения

- **iOS**: deferred deep linking НЕ реализован (Play Install Referrer — только Android). При переходе с iOS без приложения — просто редирект на App Store без сохранения roomId.
- **Время жизни комнаты**: 10 минут. Если установка + открытие займут больше — комната истечёт.
- **Play Install Referrer** читается только при **первой** установке. При повторной установке referrer может быть пустым.
