# Replacement Checklist

Use this checklist for every new or rebuilt personal training.

- [ ] Diagnosis id is exactly one focused mistake category.
- [ ] Searched `app` for `diagnosis_training_<id>*`.
- [ ] Searched repo references for `<id>` and `diagnosis_training_<id>`.
- [ ] Replaced `app/diagnosis_training_<id>.ts` in place if it already existed.
- [ ] Added `JESSE_REWORKED_PERSONAL_TRAINING` to the published app file.
- [ ] Removed stale same-id variants: `_new`, `_v2`, `_draft`, `_backup`,
      `_old`, `_tmp`, `_candidate`.
- [ ] Registry import exists exactly once.
- [ ] `getDiagnosisTraining()` route exists exactly once.
- [ ] `getAllDiagnosisTrainings()` id entry exists exactly once.
- [ ] No inline fallback copy for this id exists in `DIAGNOSIS_TRAININGS`.
- [ ] `app/personal_training_taxonomy.ts` marks this id as Jesse-reworked.
- [ ] Admin/manual lists point to the current registry path.
- [ ] Ran `npm run training:personal:sync-admin`.
- [ ] Ran `npm run training:personal:check`.
