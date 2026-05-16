# Referral Invite Audit — 2026-05-13

## Что было сломано

1. iOS экран `settings_invite_friend` был фактически отключен: при `Platform.OS === 'ios'` код делал redirect во вкладку Friends и возвращал `null`. Поэтому CTA "Отправить приглашение" на iOS не мог работать.

2. Опубликованная invite-ссылка не существовала. На момент проверки:
   - `https://badloar-star.github.io/phraseman/invite?ref=TEST12` -> 404.
   - `https://badloar-star.github.io/.well-known/assetlinks.json` -> 404.
   - `https://badloar-star.github.io/.well-known/apple-app-site-association` -> 404.
   - `https://knowlyapps.com/phraseman/invite?ref=TEST12` -> 404.
   - `https://knowlyapps.com/.well-known/assetlinks.json` -> 200, но опубликованный fingerprint отличался от локального корректного `6B:2E:...:B0`.

3. Android share отправлял только Google Play URL с `referrer=ref=CODE`. Это покрывает новую установку через Play, но не покрывает друга, у которого приложение уже установлено: код не попадал в `Linking`, pending referral не создавался.

4. `+native-intent` не обрабатывал invite route как валидный route приложения. Ссылки вида `phraseman://invite?ref=CODE` или `/phraseman/invite?ref=CODE` могли попасть в несуществующий `/invite`.

5. Ручной ввод кода во вкладке Friends находил владельца `referral_codes`, но не вызывал referral apply. Поэтому iOS fallback "введи код" не создавал `referral_attributions` и не мог начислить бонус.

6. Сервер начислял бонус только когда после создания attribution менялся `users/{stableId}.progress.unlocked_lessons` и там появлялся `2`. Если пользователь уже прошел урок 1 до применения кода, attribution оставался `pending` без награды.

7. iOS Universal Links не настроены полностью: в app config не было associated domains, а опубликованный AASA на `knowlyapps.com` сейчас пустой (`details: []`). Для настоящих Universal Links нужен AASA с Apple Team ID и `app.phraseman`.

## Что исправлено в коде

1. iOS экран приглашения включен обратно, CTA доступен на iOS и Android.

2. `app/+native-intent.tsx` мапит invite links на `/home?ref=...`, чтобы приложение не падало в unmatched route.

3. Share flow теперь использует web invite как основной URL: `https://knowlyapps.com/phraseman/invite?ref=CODE`. Google Play URL с install referrer остается fallback для Android-установки.

4. Добавлен hosting fallback:
   - `knowly-www/phraseman/invite/index.html`
   - `invite/index.html`

   Страница пробует открыть `phraseman://invite?ref=CODE`, показывает код и отправляет Android в Google Play с install referrer.

5. Добавлен корректный `knowly-www/.well-known/assetlinks.json` с fingerprint из локального `.well-known/assetlinks.json`.

6. `firebase.json` для `knowlywww` больше не игнорирует `.well-known`, чтобы assetlinks мог быть задеплоен.

7. `app.json` и `android/app/src/main/AndroidManifest.xml` добавили `knowlyapps.com/phraseman/invite` в App Links; iOS получил `associatedDomains: ["applinks:knowlyapps.com"]`.

8. Ручной ввод referral-кода в Friends теперь сохраняет pending referral и запускает best-effort apply.

9. `functions/src/referral.ts` теперь переиспользует один idempotent reward path и вызывает его сразу после `referralApply`, если пользователь уже квалифицирован.

## Что нужно задеплоить

1. Hosting: `firebase deploy --only hosting:knowlywww`

2. Functions: `firebase deploy --only functions:referralApply,functions:referralOnUserProgressUpdated`

3. OTA update для JS-части, чтобы share URL и route normalization дошли до пользователей.

4. Native rebuild для Android/iOS, чтобы новые App Links / associated domains попали в бинарники.

5. Для iOS Universal Links отдельно добавить валидный `/.well-known/apple-app-site-association` на `knowlyapps.com` с Apple Team ID. Без этого iOS будет работать через fallback/custom scheme/manual code, но не как настоящий Universal Link.

## Проверки

- `npx jest --runTestsByPath tests/native_intent_referral.test.ts tests/friend_code.test.ts --no-cache` — passed.
- `npm --prefix functions run build` — passed.
- `npx tsc --noEmit --pretty false` — blocked by unrelated JSX syntax errors in `app/_admin_settings_testers.tsx`.
