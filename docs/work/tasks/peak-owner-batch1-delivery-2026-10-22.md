# Task packet: deliver Peak owner batch part 1 and hand the tabs inset to 5 · ВХОД

Governance-ID: TG-0F44F864E6AC
Status: In progress
Owner: 3 · МАКЕТЫ (coordinator 22.10 ~15:10 Peak batch; 5 · ВХОД 3c9534e8b common back on the Peak)
Related epic/enabler: TG-110070F4C93E (Peak batch), 8321305c7 (no floor numbers), 3c9534e8b (5 · ВХОД back on Community)

## Outcome

The checked Peak batch part 1 (no «+10» chips, own coin without rings, no clouds / halo / «НАД ОБЛАКАМИ», stars over the whole scene,
logs of why the tower is hidden, SpireSceneHeaderLayer tabsInset) lands in a code window with only own hunks (the moments files of
another session stay out); 5 · ВХОД gets the hash and passes tabsInset={backInset} so the drawn tabs and the fingers stay aligned under
the common back; the coordinator and 6 · СВЕРКА get the hash and frames. Part 2 (tower and scene palette in theme shades) follows.

## Scope

In scope: commit of components/spire/SpireTower.tsx, SpireTowerSvg.tsx, scene/SpireScene.tsx, scene/spire_scene_header.tsx,
tests/spire_scene_contract.test.ts and the packets; messages. Out of scope: community.tsx (5 · ВХОД), moments files (another session).

## Architecture

No architecture change in this step: delivery of checked view changes and an optional prop.

## Security and privacy

None: drawing only.

## Technical debt

- Accept temporarily: the cause of «башни нет» while searching is not proven yet — the new logs collect it; the fix follows the logs
  (owner rule «сперва логи»). Owner of the follow-up: 3 · МАКЕТЫ after Сверка's capture.

## Verification

Types for the Peak files and the Peak / tower / header guards through the slot; numstat of the dry run equals own changes only.

## Rollback

Revert the commit: chips, ring, clouds and halo come back; tabsInset is optional, community.tsx keeps working without it.
