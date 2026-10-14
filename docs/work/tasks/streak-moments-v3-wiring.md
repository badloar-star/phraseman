# Task packet: моменты серии и кольца «Сегодня» — звуки sound_v2, кольца в блоке за флагом, кадры для Макетов

Governance-ID: TG-0FF956ABFC64
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: ETALON_MOMENTS_V3_TRANSFER.md (m11, m19, d1…d1000); продолжение `streak-moments-v3-port.md`; звуки — коммит 0fbf2ef9a (sound_v2, флаг выключен)

## Outcome

Рубежи серии и кольца дня играют события sound_v2 по тайм-листу образца (малый — streak_small + tap, средний — streak_mid, большой — streak_big, «Год» — streak_year, «Легенда» — streak_legend + correct, кольцо — ring, «День выполнен» — day_done); при выключенном sound_v2 — старые fc_*. Кольца дня стоят в блоке «Сегодня» Главной за флагом moments_v3 (выключен), отметка выполненной строки красится в цвет её кольца. Превью `/dev_moments_preview?state=streak&d=N` и `?state=rings&p=1,3,10` даёт кадры для гейта паритета.

## Scope

In scope: `components/streak/moments/*` (звук, флаг-хук, слот колец), `components/home/v2/HomeV2TodayCard.tsx` (кольца и цвет отметок за флагом), `app/dev_moments_preview.tsx`, тесты.

Out of scope: `app/(tabs)/home.tsx` (правит другая сессия), выдача рубежей и ачивок, сведение каталога 60/750 vs 730.

## Architecture

Звук — ленивые require движка и запасного проигрывателя, любой отказ пишет причину. Флаг читается из того же кэша remote_config, что sound_v2 и окно Пика: новых чтений Firestore нет, до прогрева кэша флаг выключен. Слот колец при выключенном флаге возвращает null и не подписывается на монету и язык.

## Security and privacy

Только вид и звук; данные не собираются, не передаются, не пишутся.

## Technical debt

Contain: список импортёров `components/streak/moments` явный и охраняется тестом; новые импортёры — решение Ядра.

## Verification

Точечные прогоны: сторож рубежей (104 проверки), слот колец, тексты блока «Сегодня», релизный сторож превью. Кадры — с `/dev_moments_preview` для Макетов.

## Rollback

git revert коммита: звуки возвращаются к заглушкам, кольца из блока «Сегодня» исчезают.
