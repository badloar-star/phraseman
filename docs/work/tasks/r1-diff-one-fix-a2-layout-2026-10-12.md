# Task packet: корзина a2 «вёрстка ±px» — разбор 34 свежих строк реестра и правки только с доказанной причиной

Governance-ID: TG-94BBD5F2C379
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10): корзина `a2_layout_candidate`, только кадры, снятые ПОСЛЕ последней правки файлов экрана
Related epic/enabler: docs/phraseman-2.0/R1_DIFF_ONE_FIX.md, гейт «приложение = макет»

## Outcome

1. Для каждой свежей строки: замер по склейке, причина в коде, правка — только если причина доказана; без доказанной причины код не трогаем.
2. Список «проверено — причина / нет причины» записан в R1_DIFF_ONE_FIX.md.
3. Первая доказанная правка: каталог наборов — «назад» на круглой плашке как в макете (cards-section-022/023, cards-v2-025/026).

## Scope

In scope: app/flashcards_packs.tsx (шапка), docs/phraseman-2.0/R1_DIFF_ONE_FIX.md, тест-сторож.
Out of scope: шкала шрифтов D145, вопрос «EN ⌄» (решает владелец), строки Шпиля (Темы), расхождения данных/состояния.

## Architecture

No architecture change: готовый PackRoundButton из components/packs/PackScreenKit.

## Security and privacy

Данных не касается.

## Technical debt

Pay now: голая стрелка против макета.

## Verification

Тест-сторож по исходнику, срез типов, повторная съёмка за Сверкой.

## Rollback

Откат коммита.
