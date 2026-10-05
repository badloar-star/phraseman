# Task packet: убрать временную трассу [VIDEO-SCROLL] (0663087ec)

Governance-ID: TG-C94BBC23FCDF
Status: In progress (координатор 05.10: «VIDEO-SCROLL закрыт: video-001 больше не воспроизводится; трассу 0663087ec
можно убрать»)
Owner: сессия 1 · ЯДРО

## Outcome

Убрать временную трассировку прокрутки вкладки «Видео»: header_layout, scroll, onScroll/onScrollBeginDrag и обёртку
шапки в View с onLayout. Шапка списка снова фрагмент — как до трассы. Ранних выходов и catch там не было — убирать
нечего из постоянного.

## Scope

app/lingman_videos.tsx.

## Architecture

Возврат к виду до 0663087ec.

## Security and privacy

Не затрагивает.

## Technical debt

Нет.

## Verification

Синтаксис; сторожа видео (lingman_videos_catalog_contract, video_tab_liquid_glass, lingman_misc_no_loading).

## Rollback

git revert коммита.
