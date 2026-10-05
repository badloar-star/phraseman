# Task packet: system-005 — плашка «Снова в сети» (сперва лог переходов)

Governance-ID: TG-B7324F0089B5
Status: In progress (Дизайн/координатор 05.10: в макете system.html SYS-02 есть «Снова в сети», в приложении нет)
Owner: сессия 1 · ЯДРО

## Outcome

Сначала лог: каждый переход статуса сети (unknown/offline/online) в координаторе net_status и что с ним делает
OfflineBanner (был ли офлайн до этого, скрыт ли баннер, показали бы «Снова в сети»). После подтверждения переходов на
устройстве — плашка «Снова в сети» один раз за переход offline→online (не при старте unknown→online).

## Scope

app/net_status.ts: console.warn [NET-STATUS] transition {from, to} в setStatus (только на реальный переход).
components/OfflineBanner.tsx: console.warn [NET-BANNER] {online, wasOffline, dismissed, wouldShowBackOnline}.
Поведение не меняется.

## Architecture

Не меняется.

## Security and privacy

Только флаги статуса сети.

## Technical debt

Временная трассировка; затем сама плашка по макету и сторож «один показ на переход».

## Verification

Синтаксис (babel_check); тест net_status; воспроизведение (режим полёта вкл/выкл).

## Rollback

git revert коммита.
