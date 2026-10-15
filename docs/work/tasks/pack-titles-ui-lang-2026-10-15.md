# Task packet: названия системных наборов на языке интерфейса; «К ошибкам» — живее (решение координатора 15.10)

Governance-ID: TG-91CDCF63E1B4
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: R57/R07 — правило координатора: системные наборы — на языке интерфейса, наборы сообщества — как написал автор

## Outcome

В «Моих наборах», выборе колоды, на экране набора и в превью набора сообщества название берётся по языку интерфейса, а не по урезанному
ru/uk/es. Итог для каждого вида набора:
- **системный набор с сервера:** `titlePtBr` / `titleVi` / `titleId` / `titleTr` / `titlePl`, если сервер их прислал; иначе кодовое название набора, но не русское;
- **набор сообщества:** как написал автор (`communityPackAuthoredTitle`) — без перевода;
- **набор ролика:** заголовок видео — без перевода.

## Scope

In scope: `app/flashcards/deck_options.ts:79`, `app/flashcards_my_packs.tsx` (~892), `app/flashcards_collection.tsx` (4 вызова
`packTitleForInterface`), `app/flashcards/CommunityPackPreview.tsx:79` — язык названия = язык интерфейса; `app/mistake_detail.tsx` —
`toMistakes` en/es/pt-BR/id живее. Out of scope: `packTitleForInterface` для en (сводит к ru — английских названий в данных нет; вопрос
координатору/Ядру), данные названий на сервере.

## Architecture

No architecture change: `packTitleForInterface` уже понимает все 9 языков и правило UGC/официальных; экраны передавали урезанный язык.

## Security and privacy

Не применимо.

## Technical debt

- Английских названий системных наборов нет в данных (`titleEn`) — en видит русское: Accept temporarily, владелец — Ядро/контент.

## Verification

Тесты карточек/наборов, сторож `ui_lang_not_narrowed_contract`, сторожа i18n — через slot.sh.

## Rollback

`git revert` коммита.
