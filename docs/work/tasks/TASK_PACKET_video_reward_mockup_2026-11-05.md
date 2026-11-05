# Task packet: mockup "+500 coins for full video view" (story + player moment + states)

Governance-ID: TG-469AC5B82F10
Governance-ID: TG-D83BA07C80F4
Governance-ID: TG-6ED57288D335
Status: In progress
Owner: 3 · МАКЕТЫ (coordinator relay of owner words 07:4x)
Related epic/enabler: MASTER row 35, letter Q

## Outcome
Interactive Artifact mockup on REAL app frames: (1) story/window "Видео просмотрено до конца: +500 монет"; (2) player end moment with instant reward icon and header coin counter +500 (optimistic); (3) states: already received, watched partially, offline. All active themes. Shown to owner by link; no code before owner OK.

## Scope
In scope: registry row, real frames (player, video list), mockup HTML/Artifact, owner questions. Out of scope: any app code.

## Architecture
No architecture change; static mockup built on real frames (rule: mockups only on real screens).

## Security and privacy
Frames from test-device account. Feature touches coins economy (server-side reward needed to prevent abuse) — noted as question for Ядро/owner; no data collection change in the mockup itself.

## Technical debt
Contain: anti-abuse rules (once per video, full-view detection, seek skipping) are open questions in OWNER_QUESTIONS.

## Verification
Headless run 0 errors; frames viewed; artifact opened by link.

## Rollback
Delete mockup folder.
