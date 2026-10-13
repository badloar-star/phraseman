# Task packet: значки — «Полтысячи» без 'crown' и награда рассылки значком, а не текстом 'cube' (координатор 13.10 ~08:15)

Governance-ID: TG-8A4B1EE229F0
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ (координатор: Ядро и Дизайн заняты, файлы ничьи на сегодня)

## Outcome

1. `constants/achievementIcons.ts:36` — у достижения `streak_500` («Полтысячи») стоит `'crown'`, которого нет в glyphmap Ionicons:
   на экране вместо значка «?». Теперь стоит `'podium'` (пьедестал). Такой значок ни у одного достижения больше не стоит:
   `trophy` занят сериями 750/1000, `ribbon` — 30/60.
2. `components/GlobalBroadcastModal.tsx:158` — награда «пробный набор на 48 часов» выводила имя значка `cube` ТЕКСТОМ (`<Text>{reward.icon}</Text>`),
   хотя тип `GlobalBroadcastRewardIconName` и комментарий в `app/global_broadcast_modal.ts:160-162` требуют `<Ionicons>`.
   Теперь: `'rune'` рисуется через `RuneGlyph`, остальные имена — через `<Ionicons name={reward.icon}>`.
3. Там же английский интерфейс брал подпись награды из русского текста (`en: reward.labelRu`) → добавлен `labelEn`.

## Scope

In scope:
- одна строка таблицы значков;
- отрисовка значка и подпись EN в окне рассылки;
- поле `labelEn` в `getGlobalBroadcastRewardBadge`;
- сторож-тест.

Out of scope:
- арт достижений;
- остальные значения `GlobalBroadcastRewardIconName`;
- серверная рассылка.

## Architecture

Значки — только имена из glyphmap Ionicons; `'rune'` — собственный `RuneGlyph`.
Сторож проверяет оба файла по glyphmap из `node_modules/@expo/vector-icons`.

## Security and privacy

Только вид и тексты.

## Technical debt

- Contain: значки достижений — стандартные Ionicons до появления арта (решение владельца 01.10). Сторож держит имена валидными.

## Verification

- Тест `tests/icon_names_in_ionicons_glyphmap.test.ts`:
  - все имена `ACHIEVEMENT_ICON` есть в glyphmap;
  - все `GlobalBroadcastRewardIconName`, кроме `rune`, есть в glyphmap;
  - модалка рисует `<Ionicons name={reward.icon}`, а не текст;
  - у бейджа есть `labelEn`.
- Тесты окна рассылки зелёные.

## Rollback

git revert коммита.
