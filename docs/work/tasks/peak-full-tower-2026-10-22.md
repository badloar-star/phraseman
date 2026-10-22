# Task packet: Peak scene back to full height with the whole tower visible (exception to the 46 % rule)

Governance-ID: TG-D9066484C74E
Status: Superseded — not shipped; replaced by today-poll-and-peak-tall-2026-10-22.md (TG-639E700458D3)
Owner: 3 · МАКЕТЫ (coordinator 22.10 ~13:20, owner's snapshot of 301e36d50)
Related epic/enabler: TG-1669267668FC (scenes 46 %), peak-scene-v2.html V2 (a6c8de7dd), 301e36d50 (Peak 46 %)

## Outcome

Owner on the 46 % Peak (tower cut at floor 11): «ВОТ ТУТ РАЗМЕР НЕ НАДО БЫЛО (СЦЕНЫ УМЕНЬШАТЬ) — Я ХОЧУ, ЧТОБЫ БАШНЯ ВСЯ БЫЛА».
The first answer kept the V2 scene height and fitted the whole tower into it, so the tower became small (floor numbers ~5.7 dp).
Before it was committed the owner answered by button «Сцена выше, башня крупнее»: the scene takes almost the whole screen, the tower is
whole AND large (not smaller than V2), «Комната недели» and the podium go below by scrolling, «Играть» stays pinned. That version, with
tappable avatars and the header fixes, is described and shipped under TG-639E700458D3.

## Scope

None shipped under this ID.

## Architecture

Kept from this attempt in the shipped version: word labels under floor numbers smaller than 4 dp are not drawn on the scene (rival rows
measure from the number, the number of people per floor is never lost at font 1.0); the scene window shows the tower from its crown
bound (league headroom, spire_tower_bounds) down to its base.

## Security and privacy

None: layout only.

## Technical debt

None left by this ID: the small-tower frame was never committed.

## Verification

See TG-639E700458D3: tests/spire_scene_layout.test.ts (tall frame) and tests/spire_scene_contract.test.ts.

## Rollback

Nothing to roll back.
