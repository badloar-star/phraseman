# HANDOVER — админ-фичи Phraseman (2026-07-03)

Передача другой сессии. Предыдущая сессия реализовала пачку фич, часть задеплоена,
но остались **2 живых бага** и **1 новая задача**. Ниже — точное состояние.

Проект: `C:\appsprojects\phraseman`, ветка `master`. Firebase project `phraseman-ea0b3`.
Правило пользователя: работать в одном дереве, коммитить атомарно ТОЛЬКО свои файлы
(в `git status` много чужих изменений от параллельных сессий — НЕ трогать их).
Максимальная экономия (дешёвые модели ИИ, без лишних вызовов). Все отчёты — по-русски.

---

## ЧТО УЖЕ СДЕЛАНО И ЗАДЕПЛОЕНО (работает)

Все коммиты в `master` (см. `git log`), НЕ запушено (`git push` — за пользователем).

1. **`/spec` `/build` `/review`** — 3 навыка Claude Code в `~/.claude/skills/`. Готовы.
2. **Напоминание «Plus истекает через 3 дня»** — `functions/src/premium_expiry_reminder.ts`
   + крон `premiumExpiryReminderCron` (index.ts, `0 9 * * *`). ЗАДЕПЛОЕНО. 20 тестов.
3. **A/B стат-значимость** (admin, вкладка Paywall A/B), **предиктор оттока** (Cancel
   surveys) — в `admin/index.html`. ЗАДЕПЛОЕНО (hosting:admin).
4. **Почта поддержки** (`support.phraseman@gmail.com`) — `functions/src/support_inbox.ts`
   (IMAP забор + ИИ-черновики + SMTP-отправка) + вкладка «📧 Почта поддержки». 6 callable +
   крон `gmailSupportPullCron` (`0 8 * * *`). ЗАДЕПЛОЕНО. Секрет `GMAIL_SUPPORT_APP_PASSWORD`
   УЖЕ УСТАНОВЛЕН (пароль `onafinrqdllcyuvn`). IMAP проверен вживую (работает).
   Фильтр `isHumanEmail` (только письма от людей, отсев noreply/List-Unsubscribe/Google) —
   реализован, задеплоен, 22 теста. Мусор из коллекции `support_inbox` вычищен (удалено 20).
5. **ИИ-дайджест** — `functions/src/admin_daily_digest.ts` + callable `adminGenerateDailyDigest`
   + вкладка «🌅 Дайджест». ЗАДЕПЛОЕНО. НО СЛОМАН — см. БАГ 1.
6. **Compliance-радар** — вкладка «🛡 Compliance» в admin. ЗАДЕПЛОЕНО.
7. Фикс: новые вкладки (`gmail-support`,`daily-digest`,`compliance-radar`) добавлены в
   `ADMIN_TAB_KEYS` (admin/index.html:14028) — иначе `switchTab` их игнорировал.

Деплой-команды, которые использовались:
- `firebase deploy --only hosting:admin` (для admin/index.html)
- `firebase deploy --only functions:ИМЯ1,functions:ИМЯ2` (для функций)
- Секрет: `printf 'VALUE' | firebase functions:secrets:set NAME --data-file -`
- Очистка коллекций: одноразовый .mjs-скрипт в `functions/` с `require('../service-account.json')`
  (service-account.json ЕСТЬ в корне проекта).

---

## БАГ 1 — ДАЙДЖЕСТ ПАДАЕТ (в работе, почти готов)

**Симптом:** кнопка «Сгенерировать за сутки» → `3 INVALID_ARGUMENT: Property facts
contains an invalid nested entity.`

**Причина:** Firestore НЕ хранит массив массивов. В `admin_daily_digest.ts` поле
`facts.reports.topScreens` было `Array<[string, number]>` (массив кортежей = массив
массивов) → падение при записи в `admin_digests/{dayKey}`.

**Статус:** `admin_daily_digest.ts` УЖЕ ПОПРАВЛЕН (не закоммичен): `topScreens` теперь
`Array<{screen, count}>`, `topN()` возвращает объекты. ЭТО ВЕРНО.

**Что осталось доделать:**
1. Проверить, нет ли в `DigestFacts` ДРУГИХ вложенных массивов (по идее нет, но
   перепроверь `byCategory`/`byReason` — это Record, ок).
2. Обновить тест `admin_daily_digest.test.ts` — там ассерт на старый формат
   `topScreens[0]` как `['lesson', 3]`; переделать под `{screen:'lesson', count:3}`.
3. Обновить рендер в `admin/index.html` (функция `renderDigestDoc`, ищи `topScreens`) —
   если он читает старый формат `[screen, count]`, переделать под `.screen/.count`.
   (ВНИМАНИЕ: admin/index.html уже с незакоммиченными правками — проверь, не сделал ли
   их уже пользователь/линтер.)
4. `cd functions && npx tsc --noEmit` (0 ошибок) + `npx jest admin_daily_digest` (зелёные).
5. Собрать `npm run build`, задеплоить `firebase deploy --only functions:adminGenerateDailyDigest`.
6. Закоммитить `admin_daily_digest.ts` + `admin_daily_digest.test.ts` + `admin/index.html`
   (ТОЛЬКО эти файлы). Проверить кнопкой в админке (Ctrl+Shift+R сначала).

---

## БАГ/ЗАДАЧА 2 — НЕТ КНОПОК «В АРХИВ ВСЕ» / «ОЧИСТИТЬ ВСЕ» (новое, НЕ начато)

**Запрос пользователя (дословно):** «некоторые разделы не хватает кнопки просмотрено все
или очистить все, там где копится информация: Compliance, Safety и т.д. Нет кнопки все в
архив отправить или отдельно архив для каждой».

**Что нужно:** в разделах, где копятся записи, добавить массовые действия:
- **Safety** (вкладка `safety-flags`, коллекция `safety_flags`, поле `handled:bool`,
  функция `loadSafetyFlags`/`filterSafetyFlags`/`renderSafetyFlags` в admin/index.html ~25452):
  кнопка «Пометить все обработанными» (проставить `handled:true` всем открытым в фильтре) +
  на каждой карточке кнопка «Обработано»/«В архив». Сейчас пометка одиночная через
  `updateDoc(doc(db,'safety_flags',id),{handled:true,handledAt})` (~25511).
- **Compliance** (вкладка `compliance-radar`) — это read-only СВОДКА (светофор), там копить
  нечего, архивировать нечего. Пользователю объяснить ИЛИ трактовать «Compliance» как
  «Safety» (он их рядом упомянул). УТОЧНИТЬ у пользователя, но скорее всего он про Safety +
  прочие очереди.
- Другие разделы-очереди, где логично «в архив всё»: `explain-reports` (жалобы на
  объяснения), `user-reports`, `website-inbox`, `reports`. Уже частично есть массовые
  действия у reports («Пофиксить все»). Пройтись и добавить единообразно где нет.

**Как делать безопасно:**
- Массовое действие — только по ТЕКУЩЕМУ ФИЛЬТРУ (не по всей базе вслепую), с confirm().
- Батч-запись Firestore (writeBatch, чанки по 400).
- Идемпотентно, чистые хелперы отбора — если пишешь серверную функцию.
- Экономия: если записей мало — можно клиентским `writeBatch` прямо из админки (правила
  Firestore уже разрешают админу писать в эти коллекции — проверь `firestore.rules`).
- НО: смотри есть ли уже callable для массовых действий, не дублируй.

**Рекомендация по процессу:** это НОВАЯ фича → прогони через `/spec` (быстрый интервью:
какие именно разделы, «архив» = отдельный статус или удаление, нужен ли отдельный
просмотр архива) → `/build` → `/review`. Пользователь любит этот цикл.

---

## ВАЖНЫЕ ГРАБЛИ (проверено на своей шкуре)

1. **Деплой admin ≠ деплой functions.** admin/index.html раздаётся через
   `firebase deploy --only hosting:admin`. Функции — отдельно. Легко забыть одно из двух →
   «раздел не появился» / «internal». ВСЕГДА деплой обе части и напоминай Ctrl+Shift+R.
2. **Новую вкладку мало добавить** (кнопка+панель+loader+lazy-load) — надо ЕЩЁ вписать её
   ключ в `ADMIN_TAB_KEYS` (admin/index.html:14028), иначе `isAdminSwitchableTab` её
   отвергнет и `switchTab` молча уйдёт на дефолт. Это была причина «вкладки мёртвые».
3. **Firestore не хранит массив массивов** — только массив объектов/скаляров. Причина БАГа 1.
4. **admin/index.html — single-file 37k строк.** Проверка синтаксиса JS:
   извлечь `<script type="module">`, закомментить import-строки с https, `node --check`.
   Хелперы в файле: `db`, `getDocs/collection/query/where/orderBy/limit/doc/getDoc/setDoc/
   updateDoc/writeBatch`, `escapeHtml`, `showToast`, `httpsCallable(functionsUs,'ИМЯ')`.
5. **Preview не проходит Google-авторизацию** — можно проверить только структуру DOM/JS,
   не живые данные. Живой прогон — за пользователем.
6. **OpenAI job-тюнинг:** `openai_jobs_config.ts` — типы джобов в 3 местах (union, массив,
   JOB_DEFAULTS). Добавлены `digest` (gpt-4.1-mini) и `support` (gpt-4o-mini).
7. **Секрет OPENAI_API_KEY** уже есть у проекта; при добавлении новой функции с ИИ —
   указать `secrets:[OPENAI_API_KEY]` в onCall и НЕ обрезать ключ (`.trim()` только).

## ПОЛНЫЙ СПИСОК МОИХ ФАЙЛОВ (чтобы не задеть чужое при коммите)
Новые: `functions/src/premium_expiry_reminder.ts`(+.test), `functions/src/admin_daily_digest.ts`(+.test),
`functions/src/support_inbox.ts`(+.test), `specs/gmail-support-inbox.md`, три `~/.claude/skills/{spec,build,review}/SKILL.md`.
Правленые: `functions/src/index.ts`, `functions/src/openai_jobs_config.ts`, `functions/package.json`,
`functions/package-lock.json`, `admin/index.html`.

## СЛЕДУЮЩИЙ ШАГ ДЛЯ НОВОЙ СЕССИИ
1. Закрыть БАГ 1 (дайджест) — код почти готов, доделать тест+рендер+деплой (см. выше).
2. Сделать БАГ/ЗАДАЧУ 2 (массовые «в архив/обработано») через /spec→/build→/review.
3. НЕ коммитить чужие файлы. НЕ пушить (это делает пользователь).
