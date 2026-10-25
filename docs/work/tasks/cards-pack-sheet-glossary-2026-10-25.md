# Task packet: шторка «В какой набор?» — слово «набор» по глоссарию 9 языков (Переводчик, просьба 5 · ВХОД, 3ef4a2545)

Governance-ID: TG-4290F0A18D45
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

5 · ВХОД попросил вычитать новые `loadFailedText` / `retryText` в `app/flashcards/ExpandedCardV2.tsx` и разрешил править прямо в файле.
`retryText` верен. В `loadFailedText` слово «набор» взято из соседних строк шторки (`copyFor`: toPack/pickPack/noPacks/createPack),
но вся шторка расходится с глоссарием 9 языков (a00f814c8: en/es pack, pt-BR pacote, id/tr paket, pl zestaw, vi bộ thẻ) — её
пропустили при общей замене. В tr она и вовсе разнобойная: «Sete ekle», но «Paket oluştur». Правка — шторка целиком по глоссарию,
чтобы на одном экране было одно слово:
- es: A un pack / ¿A qué pack? / Aún no tienes packs / Crear un pack / No se pudieron cargar los packs;
- pt-BR: Para um pacote / Para qual pacote? / Você ainda não tem pacotes / Criar um pacote / Não foi possível carregar os pacotes;
- id: Ke paket / Ke paket mana? / Belum ada paket / Buat paket / Paket tidak dapat dimuat;
- tr: Pakete ekle / Hangi pakete? / Henüz paketin yok / Paket oluştur / Paketler yüklenemedi.
ru/uk/en/vi/pl — уже по глоссарию, без изменений.

## Scope

In scope: строки шторки в `ExpandedCardV2.tsx` (es/pt-BR/id/tr). Out of scope: логика шторки.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Те же расхождения вне шторки: `CollectionHeaderV2.tsx:254` tr «Seti bildir», `CollectionHeader.tsx:219` id «sebagai set» — следующим проходом.

## Verification

Тесты эти строки дословно не проверяют (поиск); разбор файла babel; `scan_untranslated_ui`.

## Rollback

`git revert <коммит>`.
