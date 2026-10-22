# Task packet: compact-height scenes mockup for the owner (all scenes, three heights each)

Governance-ID: TG-9EF30BD911CB
Governance-ID: TG-6CF595FC8D2D
Status: Done (page ready, owner choice pending)
Owner: 3 · МАКЕТЫ (coordinator 22.10, owner's words: "scenes must not be so huge with lots of empty space; show new mockups of all scenes with reduced height")
Related epic/enabler: approved scene etalons (home-new-concepts A, today-scene-concepts A, dialogs-scene-concepts, peak-scene-v2 V2, course-hybrid-1-4 method 2)

## Outcome

One page docs/design/v2-app/scenes-compact.html: Home, Today, Dialogs, Peak and Learning/Season scenes in a 390 x 844 phone, each in three compact heights (about 38, 46 and 54 percent of the screen, 8-dp grid) side by side, with the real content that follows below the scene (Home: Today panel, the four-button ribbon Lessons / Cards / Dialogs / Peak, phrase of the day; other screens: their own panels). The scene runs under the status bar to the very top; the ribbon has no dark edge shading. Dark appearance by default, light on a switch. Each variant has a numbered button; the owner's picks are summarised at the top.

## Scope

In scope: the new mockup page only (plus this packet).

Out of scope: application code, the locked etalons, the Home 1:1 transfer and the ribbon shadow fix in code (next tasks).

## Architecture

No architecture change: a static mockup page reusing etalon assets (assets/v2art, coin images, Ionicons font, Inter) and the same scene colour recipe as the approved etalons.

## Security and privacy

No user data, network services or permissions: a local design page with sample texts taken from the approved etalons.

## Technical debt

- Accept temporarily: Peak tower is shown with the tile art instead of the tower renderer; owner 3 · МАКЕТЫ, review when the chosen height goes to code; impact limited to the comparison page.

## Verification

Headless capture of the page in both appearances; visual check that nothing overlaps at each height and the status bar band has the scene colour.

## Rollback

Delete the page; nothing else depends on it.
