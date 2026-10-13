# Task packet: шапка вторичных экранов редактора набора и контурный замок (Макеты cards-074, 13.10)

Governance-ID: TG-766D7C4F90B2
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по решению координатора (правим код под утверждённый cards-v2 edHead)

## Outcome

В экранах создания набора «Недоступно для правки», «Недоступно в этой сборке» и скелетон перед пейволом шапка такая же, как у основной формы: × слева, заголовок слева (`EditorHeader`), а не ← и заголовок по центру. Замок пустого состояния — контурный (`lock-closed-outline`), как в образце. Тексты, кнопки, `testID` `ugc-pack-back` не меняются.

## Scope

In scope: `app/community_pack_create.tsx` (локальная функция `renderHeader` и иконка замка), сторож.

Out of scope: основная форма набора (уже на `EditorHeader`), меню «⋯», лимиты, сохранение.

## Architecture

`renderHeader` делегирует общему `EditorHeader` из `app/community_packs/PackEditorV2.tsx` с теми же токенами стекла, что у основной формы; один компонент шапки вместо двух. Закрытие по-прежнему вызывает `goBack`.

## Security and privacy

Данных не касается.

## Technical debt

Remove: локальный `headerTitleStyle` и использование `CardsGlassRoundButton` для шапки в этом файле становятся лишними — убираются, если больше нигде не нужны.

## Verification

Точечный прогон сторожа шапки и смежных контрактов создания набора через test:one под светофором; кадры Сверки cards-074.

## Rollback

git revert коммита.
