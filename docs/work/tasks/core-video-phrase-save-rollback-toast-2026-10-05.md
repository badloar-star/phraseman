# Task packet: сохранение фразы из видео — откат с понятным сообщением по причине

Governance-ID: TG-298024AEB01F
Status: In progress (аудит Optimistic UI d12746a8a, п.5 координатора: «откат без сообщения — текст по причине из
журнала, например лимит карточек»)
Owner: сессия 1 · ЯДРО

## Outcome

YoutubeVideoPhrases.save: закладка ставится мгновенно, но при отказе (addFlashcard → 'limit_reached' / 'stale' /
исключение) молча откатывалась. Теперь откат + тост action_toast по причине (как у избранного видео):
- limit_reached → «Место для карточек закончилось — освободи немного в «Карточках»»;
- stale (смена аккаунта/цели во время записи) и ошибка → «Не удалось сохранить фразу. Попробуй ещё раз».
Причина уже пишется в лог [VIDEO-PHRASE-SAVE] rollback (добавлен другой сессией); здесь только тост.

## Scope

components/youtube/YoutubeVideoPhrases.tsx — ветки отката в save().

## Architecture

Не меняется; тост — существующее событие action_toast.

## Security and privacy

Не затрагивает.

## Technical debt

Тексты — короткие, на утверждение Дизайну при сверке.

## Verification

Синтаксис; сторожа видео/кампаний (campaign_overlays — известный чужой красный по контуру кнопки).

## Rollback

git revert коммита.
