# Что выложить и в каком порядке — релиз Phraseman 2.0.0

Для владельца. Собрано «Ядром» 11.10.2026 по поручению координатора. Это короткий маршрут, а подробности — в двух
файлах, на которые он ссылается:
- [DEPLOY_NOW.md](DEPLOY_NOW.md) — серверные функции, правила и индексы базы;
- [RELEASE_BUILD_E4.md](RELEASE_BUILD_E4.md) — сборка и отправка в магазины.

Все команды запускаются в терминале из корня проекта. Значения ключей и паролей здесь не приводятся.

> ⚠️ **Перед ЛЮБОЙ выкладкой функций:** `firebase deploy` берёт код из рабочей папки, а не из последнего коммита. Если
> там лежат чужие незакоммиченные правки в `functions/`, они уедут в облако. Сначала проверить:
> `git status --short functions/`. Должно быть пусто или только то, что вы готовы выложить.
>
> Выкладывать функции **только поимённо** (`--only functions:A,functions:B`). Полный `firebase deploy` удалит
> функции, которые ещё нужны сборке 1.6.24. На вопрос «delete functions?» отвечать **No**.

---

## 1. Серверные функции — по порядку

### 1.1. База: индексы и правила (можно сразу)

```bash
firebase deploy --only firestore:indexes --project phraseman-ea0b3
```

```bash
firebase deploy --only firestore:rules --project phraseman-ea0b3
```

Без них экраны 2.0 не смогут читать свои данные. Для 1.6.24 безопасно. Подробности — [DEPLOY_NOW.md](DEPLOY_NOW.md),
шаги 0 и 0б.

### 1.2. Новые функции 2.0 (можно сразу, 1.6.24 их не вызывает)

Пять команд по группам из [DEPLOY_NOW.md](DEPLOY_NOW.md), раздел «Шаг 1 → Команды»:
1. Диалоги V2.
2. Шпиль.
3. Озвучка карточек, видео и прочее.
4. Письма сайта.
5. Сторож почты.

Проверка: в 2.0 «Диалоги» открывают разговор, а не только каталог.

### 1.3. Сегодняшние пакеты экономии и приватности (можно сразу, для 1.6.24 безопасно)

**а) Приватность журналов и оповещений в Telegram**

```bash
firebase deploy --only functions:submitClientReport,functions:adminAlertOnCriticalError,functions:adminAlertDispatchOnCreate,functions:adminAlertRecoveryCron,functions:adminGetAlertDiagnostics --project phraseman-ea0b3
```

- Что даёт:
  - в журнал сбоев не пишется имя;
  - оповещение о сбое приходит без ника и номера пользователя;
  - почта и телефон в тексте любых оповещений скрываются.
- Как проверить:
  - следующее оповещение о сбое в Telegram — без строки «Пользователь»;
  - в новых записях `app_errors` нет поля `userName`.

**б) Пакет A+B+D — «Мои ошибки» и «Друзья» дешевле**

```bash
firebase deploy --only functions:mistakePracticeSyncEvents,functions:friendsGetProfiles --project phraseman-ea0b3
```

- Как проверить:
  - на новом телефоне «Мои ошибки» восстанавливаются;
  - во «Друзьях» видны профили;
  - в логах функции нет `list:target_filter_unavailable`.

**в) Пакет K — каталог YouTube не перезаписывается без изменений**

```bash
firebase deploy --only functions:youtubeCatalogSyncCron,functions:adminRefreshYoutubeCatalog --project phraseman-ea0b3
```

- Как проверить: в логах крона чаще `[YT-CATALOG] publish:skipped {"reason":"unchanged"}`, а при новом ролике —
  `publish:decided`.
- Первый запуск после выкладки опубликует каталог как обычно.

### 1.4. Отдельно и осознанно (не обязательно для релиза)

- **Наборы «Из видео»:** выложить `adminBackfillVideoPacks` и `adminPublishVideoPhrases`, затем Админка → «Видео-фразы»
  → «🃏 Собрать наборы карточек». Подробности — [DEPLOY_NOW.md](DEPLOY_NOW.md), шаг 1в.
- **Оплата на сайте** (`stripeWebhook`, `paypalOrderCapture`) — только после тестовой покупки на сайте.
  [DEPLOY_NOW.md](DEPLOY_NOW.md), шаг 1б.

### 1.5. В день выхода 2.0 в магазинах (до этого — НЕЛЬЗЯ, сломает 1.6.24)

1. **Первой** — `levelSpinStarGrant` (новый кошелёк монет).
2. Остальные изменённые функции из [DEPLOY_NOW.md](DEPLOY_NOW.md), шаг 2:
   - награда за жалобу (`report_replies` / `admin_reports_center`);
   - опрос осколков ×4;
   - `progressSubmitEvent`;
   - `coinReconcileV1`.
3. `authConfirmRecoveryCode` — **вместе с пакетом сессии Авторизации**, не отдельно: в этом файле есть её изменения.
4. `jarvisDailyDepartmentsCron` — вместе с изменениями Джарвиса.
5. Админка (сайт админки):

```bash
firebase deploy --only hosting:admin --project phraseman-ea0b3
```

---

## 2. Переменные сборки EAS (профиль production)

Значения живут в EAS, сюда не пишутся. Проверить, что все на месте:

```bash
eas env:list --environment production
```

Должны быть заданы (подробности — [RELEASE_BUILD_E4.md](RELEASE_BUILD_E4.md)):
1. `EXPO_PUBLIC_RC_IOS` — начинается с `appl_`.
2. `EXPO_PUBLIC_RC_ANDROID` — начинается с `goog_`.
3. `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — оканчивается на `.apps.googleusercontent.com`.
4. `EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID` — Services ID для входа через Apple на Android.
5. `EXPO_PUBLIC_APPLE_ANDROID_REDIRECT_URI` — адрес возврата `https://…`. Он же должен быть вписан в Apple Developer
   в настройках этого Services ID (Return URLs).
6. `EXPO_PUBLIC_APPLE_ANDROID_APP_CALLBACK_URI` — адрес вида `схема://` (обычно `phraseman://apple-auth`).

Не должно быть: `EXPO_PUBLIC_ENABLE_DEV_TOOLS=1` — сборка упадёт на воротах ключей.

Необязательный рычаг владельца: `PARITY_GATE_WAIVER`, если решите собрать до полной сверки макетов. Как включить
и снять — [RELEASE_BUILD_E4.md](RELEASE_BUILD_E4.md), раздел 0а.

---

## 3. Патчи для Codex (накладывает Codex в своих зонах — до коммита и сборки)

Все лежат в `docs/work/tasks/`. На 11.10 каждый проверен `git apply --check` на текущей рабочей папке: накладываются.
Сначала проверка, потом наложение:

```bash
git apply --check docs/work/tasks/learning-v2-gate-store-skip.patch
```

```bash
git apply docs/work/tasks/learning-v2-gate-store-skip.patch
```

1. **[learning-v2-gate-store-skip.patch](../work/tasks/learning-v2-gate-store-skip.patch)** — ворота «исходник = выпуск
   Learning V2» пропускаются в стор-сборке, где Learning V2 вырезан.
   🔴 **Обязателен до того, как Codex закоммитит свою правку `package.json`.** Там этот шаг стоит в
   `eas-build-post-install`, и без патча сборка EAS упадёт после установки.
2. **[system-modals-typography-and-triLang.patch](../work/tasks/system-modals-typography-and-triLang.patch)** — шрифты
   в 6 системных окнах, три языка в окне обновления, токены окна уведомлений.
   ⚠️ Он **уже включает**
   [codex-notification-modal-tokens.patch](../work/tasks/codex-notification-modal-tokens.patch): эти два патча
   конфликтуют, второй отдельно **не накладывать**.
3. **[aa-settings-forced-switch-recovery.patch](../work/tasks/aa-settings-forced-switch-recovery.patch)** —
   восстановление после принудительной смены аккаунта в Настройках (сессия Авторизации). Накладывать по решению
   координатора.

Те же две команды (`--check`, затем без него) — для каждого файла.

---

## 4. Шпиль и рубильники — порядок включения

Только после того, как выложены функции Шпиля (п. 1.2) и 2.0 вышла в магазинах:
1. Админка → «Пульт» → раздел «Шпиль» → включить игру. Это пишет `config/spire_v1.enabled`, документ создастся сам.
2. Показать вкладку «Шпиль» игрокам. Отдельного рубильника в админке нет:
   - Firebase Console → Firestore → `remote_config` → документ `app` → поле `bools` → ключ `spire_tab_enabled` =
     `true`;
   - клиенты подхватят при запуске или возврате, не позднее ~5 минут.
3. Проверить на телефоне: вкладка «Шпиль» видна, можно войти в комнату.

Ещё два пункта:
- Флаги Account V2 (`accounts_v2_client_enabled` и выключатель старой синхронизации) — **не трогать**, у них свой план.
- Рекомендация: Админка → «Пульт» → «📺 YouTube-канал» → **«↩️ Вернуть PHRASEMAN»**.
  - Там сейчас вписан тот же канал, что по умолчанию, но эта запись выключает встроенный запасной список роликов.
  - В «YouTube-каталог» проверить, что у канала с языком `en` указан YouTube id `UCIr8fwZjbDtcUlQ-IKIbndg`.

---

## 5. Политика конфиденциальности

**Уже в коде, осталось опубликовать на сайте** (`legal:sync` уже выполнен):
- раздел 3 — прогресс гостя привязан к установке (`a350f04ba`);
- раздел 20 — удаление гостевого аккаунта (`0af36379f`);
- раздел 5 — недельная сумма монет в комнате Шпиля (`472f8715e`).

```bash
firebase deploy --only hosting:knowlywww --project phraseman-ea0b3
```

Копия политики в приложении уедет со сборкой. Копия в админке уедет с выкладкой админки (п. 1.5.5).

**Нужно ваше решение — раздел 13 (голосовые звонки MAX).** Раздел удалён, но данные о звонках хранятся и стираются
при удалении аккаунта. Сейчас текст говорит только о расшифровке речи, а не о передаче голоса. Предлагаемый абзац
в конец раздела 13:

> Earlier versions of the App offered real-time AI voice calls. During such a call, your voice audio was streamed to
> the AI provider to generate spoken replies. This feature has been discontinued. Records related to it (call
> feedback, call reviews, and voice minute balances) are retained as described in Retention and are deleted when you
> delete your account.

Если одобряете — вписать в [privacy_policy_en.json](../../legal/privacy_policy_en.json) и
[privacy_policy_en_ios.json](../../legal/privacy_policy_en_ios.json), затем:

```bash
npm run legal:sync
```

И снова опубликовать сайт (команда выше).

---

## 6. Ручные проверки на настоящем телефоне (после сборки, до отправки на проверку магазина)

1. **Холодный старт:** закрыть приложение полностью и открыть. Главная появляется сразу, видео на Главной видны.
2. **Вход Google** — с нуля и повторный.
3. **Вход Apple** — на iPhone и на Android, через Services ID.
4. **Гость:**
   - «Позже» → пройти урок → войти;
   - прогресс сохранился;
   - смена аккаунта и обратно — каждый видит своё.
5. **Покупка в тестовом режиме** (тестовый аккаунт Google Play / песочница Apple):
   - Plus включился сразу;
   - после перезапуска остался;
   - «Восстановить покупки» работает.
6. **Push:**
   - разрешение;
   - тестовая рассылка из админки приходит;
   - нажатие открывает нужный экран.
7. **Диалоги:** разговор стартует и отвечает. **Карточки:** тренировка. **Мои ошибки:** открываются.
8. **Без сети:** открыть приложение в режиме полёта — разделы показывают сохранённое, без вечных загрузок.

---

## 7. После релиза

1. Снять `PARITY_GATE_WAIVER`, если задавали.
2. После того как минимальная версия станет ≥ 2.0 — удалить старые облачные функции из
   [DEPLOY_NOW.md](DEPLOY_NOW.md), шаг 2: `friendsTogetherClaimLevel`, `videoWatchRunesClaim`, 14 функций без кода.
   **По одной**, с проверкой логов за 7 дней.
3. **Подарочный доступ** — хранить проверенный срок подарка на телефоне. Тогда получатель видит доступ сразу, а не через
   ~4 с. Плюс узнавать подарок из того же чтения профиля на старте (`cloud_sync.ts`). После этого — потолок облачной
   проверки 3 с. Код денег: тесты и ревью обязательны (INBOX §CORE-0165).
4. **Экономия Firebase** (отчёт [core-firebase-cost-audit-2026-10-11.md](../work/tasks/core-firebase-cost-audit-2026-10-11.md)):
   - C — наборы «Из видео» по версии каталога (имеет смысл после пакета K);
   - E — серия друга в публичном профиле должна обновляться на сервере, тогда пересчёт профиля на каждом запуске не
     нужен;
   - F — входящие продавца звать только у тех, кто отправлял набор;
   - G — счётчики наборов без чтения на каждую плитку;
   - H — фраза дня из суточного кэша;
   - I — лента Главной для не-английских языков на диске;
   - J — каталог курса на вкладке «Уроки» (зона Codex).
5. Снять временную трассировку `[HOME-COLD]` и `[PREMIUM-RESOLVE]`, оставив логи ранних выходов и ошибок — после
   вердикта Сверки.
6. События Learning V2 в SQL склада аналитики (INBOX §CORE-0002).
