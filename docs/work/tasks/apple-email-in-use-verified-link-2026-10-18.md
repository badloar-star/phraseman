# Task packet: Apple на iPhone — вход, когда почта Apple ID уже занята аккаунтом с Google (решение владельца «Входить само»)

Governance-ID: TG-C19688728548
Status: В работе
Owner: 5 · АВТОРИЗАЦИЯ (клиент); Ядро — серверная функция authAppleLinkByVerifiedEmail

## Outcome

Владелец на iPhone входит через Apple без ошибки и без вопросов: при `auth/email-already-in-use` (Apple ID с почтой, уже
занятой аккаунтом, где привязан Google, а Apple — нет) клиент отдаёт проверенный Apple ID token серверу, тот привязывает
apple.com к этому аккаунту и выдаёт custom token → signInWithCustomToken → дальше обычные ветки входа (правила 1–3 в силе).

## Scope

- app/auth_callable_fetch.ts: имя функции в AuthCallableName (файл Ядра — одно слово, согласовано через координатора).
- app/auth_provider.ts: вызов функции в ветке конфликта Apple + signInWithCustomToken вместо signInWithCredential; журнал
  [AUTH-APPLE] на каждой ветке; функции нет на сервере / отказ — прежний путь с причиной в журнале.
- tests: поведение (email-already-in-use → custom token, без signInWithCredential).

## Architecture

Факт (iPhone 13:05, .expo/metro-console.log 2779–2897): native ok (Apple) → link conflict auth/email-already-in-use →
updated_credential present=false → signInWithCredential тем же токеном → auth/unknown. Firebase «один аккаунт на почту» не
пускает Apple в аккаунт с той же почтой без привязки; повтор токеном бесполезен. Контракт (предлагаю Ядру):
запрос `{ idToken, rawNonce }` → ответ `{ customToken }`; ошибки — HttpsError. Регион — через invokeAuthCallable
(Европа, запасной путь на США только при not-found: вызов не идемпотентен).

## Security and privacy

Токен Apple уходит только на свою серверную функцию (как и в Firebase), в журнал — только метки h:xxxx и коды. Сервер обязан
проверить подпись Apple, aud, срок, email_verified и nonce. Новых собираемых данных нет (почта Apple уже приходит в Firebase).

## Technical debt

До выкладки функции Ядром путь не работает (прежняя ошибка). Интерфейс сверяется с Ядром.

## Verification

Точечные тесты через светофор; проверка на iPhone владельца после выкладки функции.

## Дополнение: интерфейс Ядра (76dace644, docs/work/tasks/auth-apple-link-by-email-2026-10-18.md)

Governance-ID: TG-33BAEE691B44

Custom token отклонён (контур учётной записи не принимает custom-сессию). Ответ: `{ ok:true, linked, retryCredential:true }` |
`{ ok:false, reason }`. Клиент: при ok+retryCredential — signInWithCredential тем же AppleAuthProvider.credential(idToken,
rawNonce); не принят — одно окно Apple ещё раз и вход новым пропуском (без ошибки); ok:false — прежний путь. Журнал
[AUTH-APPLE-LINK] на каждой ветке.

## Rollback

`git revert <hash>`.
