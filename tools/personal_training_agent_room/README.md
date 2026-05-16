# Jesse Pinkman Personal Training Room

This room is the shared protocol for building diagnosis-based personal trainings.
Use it from any ChatGPT, Claude, or Codex session when the user asks to raise
the Jesse Pinkman room.

## Start Protocol

1. Read `tools/personal_training_agent_room/README.md`.
2. Read `tools/personal_training_agent_room/ROOM.md`.
3. Pick exactly one diagnosis id for the current session.
4. Run replacement sweep before creating or editing content.
5. Build or replace only `app/diagnosis_training_<id>.ts`.
6. Wire the training in `app/diagnosis_trainings.ts`.
7. Update any admin/manual manifest that lists personal trainings.
8. Run `npm run training:personal:sync-admin`.
9. Run `npm run training:personal:check`.
10. Report done only after both commands pass.

## Replacement Sweep

Before writing a training, search the current workspace:

```powershell
Get-ChildItem app -Filter "diagnosis_training_<id>*"
rg -n "<id>|diagnosis_training_<id>" app tests docs admin tools
```

If an active training for the same id already exists, replace that file in place.
Do not create `*_new`, `*_v2`, `*_draft`, `*_backup`, `*_old`, `*_tmp`, or
`*_candidate` files.

The final state must have:

- One app file: `app/diagnosis_training_<id>.ts`.
- The app file must contain the marker `JESSE_REWORKED_PERSONAL_TRAINING`.
- One import in `app/diagnosis_trainings.ts`.
- One `getDiagnosisTraining(id)` route.
- One id entry in `getAllDiagnosisTrainings()`.
- Zero inline fallback content for the same id.
- Zero stale same-id files.

## Reworked Marker

Jesse must never decide that a training is already rebuilt only because an app
file exists. A training counts as Jesse-reworked only when both are true:

- `app/diagnosis_training_<id>.ts` contains `JESSE_REWORKED_PERSONAL_TRAINING`.
- `app/personal_training_taxonomy.ts` lists the id with `jesseStatus: 'reworked'`
  through the taxonomy entry.

If the marker is missing, treat the existing file as legacy content. Replace it
in place, remove old imports/routes for that id, add the marker to the new file,
then run the required sync/check commands.

## Quality Gate

Run:

```powershell
npm run training:personal:sync-admin
npm run training:personal:check
```

For room-only hygiene while drafting, this narrower gate is also available:

```powershell
npm run training:jesse:check
```

If that script is not available in a different branch, run the equivalent tests:

```powershell
npx jest --runTestsByPath tests/personal_training_agent_room.test.ts tests/diagnosis_training_hygiene.test.ts tests/diagnosis_training_copy.test.ts --no-cache --runInBand
```

Never mark a training complete while replacement hygiene is failing.
Never publish or replace a training without refreshing the admin manifest first.
