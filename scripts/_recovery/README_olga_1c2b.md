# Восстановление аккаунта OlgaZ (#1c2b) — 2026-06-28

## Симптом
Bug-report с главного экрана: `OlgaZ #1c2b | Lv42 | 356374 XP | streak 8 | premium: false | days: 46`,
iOS 26.3.1, app v1.5.44, ru. Жалоба: «после обновы потеряла свой аккаунт», «хочу восстановить
полный доступ, с iPhone/Apple-аккаунта нет технической возможности; с Android могу».

## Диагноз
Её stable_id: `users/18274995-0d6b-4fe5-b92b-078f51ab1c2b` (короткий `#1c2b` = последние 4 hex
stable_id, см. `app/error_report.ts`).

- В облаке у этого дока `progress.user_total_xp = null` (пусто), но в bug-report XP=356374 —
  потому что поля XP/level/streak в репорте берутся из ЛОКАЛЬНОГО AsyncStorage телефона
  (`app/error_report.ts:87`), а не из облака.
- Облачный док был прибит к СТАРОЙ Firebase-сессии: `firebaseAuthUid = HJ9FV4kPHYag1nxsC2COKinkcmj2`.
- После обновления/переустановки её анонимный Firebase uid сменился. Новый uid != старого →
  - клиентский `cloud_sync.set()` блокируется `firestore.rules` (`userDocOwnerMatchesAuth` требует
    `firebaseAuthUid == request.auth.uid`);
  - server-side `authEnsureStableLink` → `assertStableOwner` (functions/src/auth_identity.ts:135)
    упирался в mismatch.
- Итог: её локальный прогресс (356374 XP) НЕ заливался в облако. VIP (`admin_vip`) уже был выдан
  ранее, но висел на пустом облачном доке.

## Лечение (применено)
`scripts/_recovery/fix_olga.js --execute` — стёр `firebaseAuthUid` (FieldValue.delete) в
`users/18274995-...-1c2b`. Ничего больше не трогал (progress/VIP/shards сохранены).

Почему работает: при пустом `firebaseAuthUid` функция `assertStableOwner`
(`functions/src/auth_identity.ts:152`) БЕЗУСЛОВНО разрешает перепривязку любой сессии. Версия
приложения 1.5.44 на старте безусловно зовёт `ensureStableAuthLink()` (`app/_layout.tsx:1624`) →
callable `authEnsureStableLink` (Admin SDK, в обход rules) перепривяжет её текущий auth.uid к
этому stable_id, после чего `syncToCloud()` (`app/_layout.tsx:1616`) зальёт локальные 356374 XP
в облако.

## Что нужно от пользователя
Открыть Phraseman на iPhone 1–2 раза с интернетом. Прогресс на телефоне НЕ трогать (он —
источник правды, заливается в облако). VIP сохранён.

## Проверка после
Запустить `node scripts/_recovery/find_olga.js` спустя время — у дока `#1c2b` должен появиться
непустой `progress.user_total_xp` (~356374) и новый `firebaseAuthUid`.

## Системный пробел (отдельная задача, не делалось здесь)
Нет UI самовосстановления для чисто-анонимных юзеров и нет account-linking (Apple+Google к одному
stable_id). Стоит добавить экран «я уже играл, восстановить прогресс» и привязку второго провайдера.

## Безопасность
`service-account.json` использовался локально и git-ignored. После работ КЛЮЧ СТОИТ ОТОЗВАТЬ
(Firebase Console → Service accounts) — он засветился в логе сессии. Бэкапы `backup_*.json`
содержат PII и добавлены в `.gitignore`.
