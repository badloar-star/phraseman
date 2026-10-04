# Task packet: «Набор до добавления» по packs-simple.html кадр 4

Governance-ID: TG-B42B23100139
Status: In progress
Owner: сессия «2 · Дизайн» (контур 2); указание координатора 04.10 — отдельный компонент, минимальная развилка
Related epic/enabler: гейт «приложение = макет»

## Outcome

Экран набора в режиме просмотра (ещё не добавлен) выглядит как кадр 4: «назад» и «⋮», заголовок 34/40, автор и
♥·👥·💬, «Карточки N», строки слов, нижняя кнопка «Добавить себе» на акценте. Свой набор и CARDS_LOCKED не меняются.

## Scope

In scope: новый `app/flashcards/CommunityPackPreview.tsx`; `CommunityPackSocialBar.tsx` (варианты `previewMeta`,
`previewCta`); в `app/flashcards_collection.tsx` — только развилка `previewMode && currentMarketPack`.
Out of scope: вид своего набора, `CollectionHeader`, логика добавления/покупки/жалобы/обсуждения (переиспользуются).

## Architecture

No architecture change: те же данные и обработчики экрана набора, новый слой вида.

## Security and privacy

Не затрагивает данные.

## Technical debt

- Accept temporarily: счётчики справа от автора — значок над числом, как на кадре 4 (в макете это перенос строки).

## Verification

typecheck, сторожа `community_pack_*`, `fc_*`; склейка сессии «6 · Сверка» и «принято» координатора до коммита.

## Rollback

`git revert` коммита.
