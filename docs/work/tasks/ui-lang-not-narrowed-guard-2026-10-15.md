# Task packet: сторож — «Сохранённое» и каталог сообщества получают полный язык интерфейса (R57 #9/#9b, после ffc854a0e)

Governance-ID: TG-8B8A5357CD8E
Status: In progress
Owner: сессия «Специалист по переводам» (координатор 15.10: «сторож: на каждом языке не кириллица там, где не ru/uk»)
Related epic/enabler: R57, R07

## Outcome

Регрессия «6 языков видят русский в Сохранённом и каталоге» не вернётся: тест проверяет, что экраны передают язык интерфейса,
а компоненты на en/es/pt-BR/vi/id/tr/pl выдают подписи без кириллицы.

## Scope

In scope: новый тест `tests/ui_lang_not_narrowed_contract.test.ts`. Out of scope: правки экранов (сделаны в ffc854a0e).

## Architecture

No architecture change: только сторож (проверка исходников + рендерящиеся функции строк не используются — компоненты сложные,
поэтому проверяются исходники: проп `lang` = `strLang`/`lang`, а не урезанный язык; тексты `triLang` в компонентах — без кириллицы для не-ru/uk).

## Security and privacy

Не применимо.

## Technical debt

- `CollectionGalleryView` остаётся вне сторожа (смешивает язык интерфейса и содержимого) — Contain: координатор/Дизайн; выход — отдельный проп.

## Verification

Тест зелёный на текущем HEAD; при возврате `hubCategoryLang` / `lang={cardContentLang}` — красный.

## Rollback

Удалить тест.
