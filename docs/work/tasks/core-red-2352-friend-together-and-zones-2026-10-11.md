# Task packet: красные 23:52 — friend_together_sheet под «ты», зоны Codex и чужой eol-файл отмечены

Governance-ID: TG-5D511811312B
Status: In progress
Owner: 1 · ЯДРО
Related epic/enabler: red-sweep 2.0; переход интерфейса на «ты» (bb416e3cd/a54178f73)

## Outcome

`tests/friend_together_sheet.test.tsx` зелёный: ждёт актуальную подпись кнопки «Ты уже занимался(ась) сегодня»
(интерфейс переведён на «ты»). Зоны Codex (Шпиль — client_reports_delivery_contract; gustav_*) и чужой
незакоммиченный `tests/video_phrases_runtime_contract.test.ts` (eol-сторож) — только отметка в INBOX.

## Scope

In scope: одна строка ожидания в `tests/friend_together_sheet.test.tsx`; INBOX Ядра.
Out of scope: код FriendTogetherSheet (текст уже верный), Шпиль, gustav, video_phrases.

## Architecture

No architecture change: обновление ожидаемого текста.

## Security and privacy

Нет влияния.

## Technical debt

Pay now: устаревшее ожидание «Вы…». Остальное — у владельцев зон (Codex / автор video_phrases).

## Verification

Точечный прогон `friend_together_sheet.test.tsx` (rntl-конфиг jest).

## Rollback

`git revert`.
