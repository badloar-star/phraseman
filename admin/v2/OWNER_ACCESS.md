# ⛔ ДОСТУП В АДМИНКУ — ЗАКОН, НЕ ТРОГАТЬ

**badloar@gmail.com — владелец админки. Он входит ВСЕГДА.**

uid владельца в проекте `phraseman-ea0b3`: `mmk1YSI3bjRLNoce8n4sMBiFeIK2`

## Что запрещено абсолютно

Никто — ни человек, ни агент, ни скрипт, ни функция — **не имеет права менять
логику входа в админку**. Это касается:

- проверки claim в `admin/v2/legacy.html` (`onAuthStateChanged` → `tr.claims.admin !== true`);
- `signInWithPopup` / `signInWithRedirect` / `getRedirectResult` / `setPersistence`;
- `scripts/set_admin_claim.mjs` и `scripts/set_admin_claim.js`;
- custom claims аккаунта владельца в Firebase Auth.

**НИКОГДА не вызывать `setCustomUserClaims` для владельца без `...user.customClaims`.**
Этот вызов перезаписывает объект claims целиком. Один такой вызов — и владелец
заблокирован снаружи своей же админки.

## История инцидентов

**2026-08-16.** Владелец не смог войти: ни автовходом, ни вручную. Экран показывал
«У этого Google-аккаунта нет доступа к админке».

Причина: у `badloar@gmail.com` custom claims были **пустые — `{}`**. Аккаунт живой,
не заблокирован, Google-провайдер на месте. Код `legacy.html` отработал корректно —
он честно отказал аккаунту без метки `admin`.

Claim стёрли снаружи: продовый код claims не пишет нигде (проверено grep по всему
репозиторию — только два ручных скрипта). Значит это был либо запуск скрипта,
либо ручное действие в консоли Firebase.

Вывод: **виноват был не код входа, а пропавший claim.** Правка `legacy.html` в такой
ситуации бесполезна и опасна — она ломает работающую защиту, не решая проблему.

## Если владелец не может войти — порядок действий

Сначала **проверить claim**, и только потом смотреть код:

```bash
node -e "const a=require('firebase-admin');process.env.GOOGLE_APPLICATION_CREDENTIALS='C:/appsprojects/phraseman/service-account.json';a.initializeApp({credential:a.credential.applicationDefault()});a.auth().getUserByEmail('badloar@gmail.com').then(u=>{console.log('claims:',JSON.stringify(u.customClaims||{}),'disabled:',u.disabled);process.exit(0)})"
```

Если вернулось `{}` или `admin` не `true` — вернуть доступ:

```bash
GOOGLE_APPLICATION_CREDENTIALS=C:/appsprojects/phraseman/service-account.json node scripts/set_admin_claim.mjs badloar@gmail.com owner --grant
```

После этого владелец обновляет страницу админки. Токен перевыпускается сам:
`legacy.html` при отсутствии claim делает `getIdTokenResult(true)` — принудительный
рефреш. Выходить и заходить заново не нужно.

## Сторож

`tests/admin_owner_access_contract.test.ts` — держит и логику входа, и этот файл.
Тест падает, если из `legacy.html` пропала проверка claim, принудительный рефреш
токена, восстановление redirect-входа или сохранение сессии.

**Сторож ломается — чинить вход, а не удалять проверку.**
