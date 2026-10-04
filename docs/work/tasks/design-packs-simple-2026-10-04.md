# Task packet: «Наборы сообщества» по packs-simple.html (замок packs-simple-001…004)

Governance-ID: TG-F42D1E0783A1
Status: In progress
Owner: сессия «2 · Дизайн» (контур 2, LANES.md: «Наборы сообщества — packs-simple.html (замок)»)
Related epic/enabler: гейт «приложение = макет»

## Outcome

Каталог наборов сообщества — список строк-карточек как в кадре 1 (название + «Топ», автор, ♥ · 👥 · 💬,
плашка числа карточек, стрелка), пустое состояние как в кадре 3 (плитка 61 + фраза 20/700), без строки-описания.

## Scope

In scope: `app/flashcards/FlashcardsCategoryHub.tsx` (тело каталога), `app/community_packs/CommunityPackSocialBar.tsx`
(новый вариант `list`; вариант `tile` утверждённого хаба «Карточек» не меняется).
Out of scope: общая шапка вкладки «Сообщество» (ждёт решения координатора), экран набора (кадр 4) — следующим
шагом, данные/чтения Firestore.

## Architecture

No architecture change: вид строки каталога; данные, долгое нажатие, открытие, правка своего набора — прежние.

## Security and privacy

Не затрагивает данные.

## Technical debt

- Accept temporarily: шапка «Шпиль · Друзья · Наборы» текстом + лупа + EN из кадра 1 не перенесена — общая шапка
  вкладки; владелец решения — координатор.

## Verification

Сторожа `flashcards*`/`community_pack*` по затронутым файлам, ratchet типографики, склейка «макет | эмулятор».

## Rollback

`git revert` коммита.
