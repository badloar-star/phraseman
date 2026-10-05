# Task packet: лайк набора — откат с тостом, а не молча

Governance-ID: TG-298024AEB01F
Status: In progress (аудит Optimistic UI d12746a8a, п.4 координатора: «тихий откат — нужен тост „Не удалось…“, как у
избранного видео»)
Owner: сессия 1 · ЯДРО

## Outcome

CommunityPackSocialBar.onLikePress: сердце и цифра меняются мгновенно; при исключении toggleCommunityPackLike откат
был тихим. Теперь откат + action_toast «Не удалось поставить лайк. Попробуй ещё раз» / «…убрать лайк…» на 9 языках.
Лог [PACK-LIKE] уже есть. Когда параллельное нажатие увело состояние (res.liked ≠ expected) — тоста нет: это не
ошибка, а сверка с правдой.

## Scope

app/community_packs/CommunityPackSocialBar.tsx — catch в onLikePress.

## Architecture

Не меняется.

## Security and privacy

Не затрагивает.

## Technical debt

Тексты тостов — короткие, на утверждение Дизайну при сверке; тот же паттерн стоит проверить у лайков комментариев.

## Verification

Синтаксис; сторожа социальной панели (pack_social / community_pack_*).

## Rollback

git revert коммита.
