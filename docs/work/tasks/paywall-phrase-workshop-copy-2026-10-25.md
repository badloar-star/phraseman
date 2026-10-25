# Task packet: пейвол phrase_workshop — вычитка 9 языков (Переводчик → 1 · ЯДРО, координатор 25.10)

Governance-ID: TG-C2AB42310B8E
Status: Done — Переводчик внёс сам после коммита Ядра c161d894a (uk, tr; pl оставлен), см. paywall-workshop-server-refused-review-2026-10-25.md
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Черновик Ядра `phrase_workshop` (заголовок, подзаголовок, плашка) вычитан. Верны: ru, en, es, pt-BR, vi, id. Заменить три языка:

```ts
uk: t('Майстерня висловів у Plus', 'Складай вислови з пройдених уроків і закріплюй їх, скільки хочеш.', 'Майстерня висловів до кожного уроку'),
tr: t('Plus ile ifade atölyesi', 'Bitirdiğin derslerden ifadeler kur ve istediğin kadar pekiştir.', 'Her ders için ifade atölyesi'),
pl: t('Warsztat fraz w Plus', 'Składaj zwroty z ukończonych lekcji i utrwalaj je, ile chcesz.', 'Warsztat fraz do każdej lekcji'),
```

Почему: uk — «фраза» = «вислів» во всём украинском интерфейсе (слово владельца 12.10, 41443be48; кнопка режима
«Майстерня висловів», ccdbbc553); tr — «фраза» = «ifade» («Günün ifadesi», кнопка «İfade atölyesi», 300071e1d);
pl — «przerobionych» звучит как «переделанных», нужно «ukończonych» (пройденных). После вставки пометку
«⚠ ЖДЁТ УТВЕРЖДЕНИЯ ПЕРЕВОДЧИКА» снять.

## Scope

In scope: тексты контекста phrase_workshop. Out of scope: логика пейвола.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Прямые сообщения Ядру и координатору 25.10 не доставлены (сессии держат входящие) — поэтому правки записаны здесь.

## Verification

После вставки Ядром: `tests/paywall_context_headline_contract*` и `dev_hub_paywall_contexts_contract`.

## Rollback

Не применимо — документ.
