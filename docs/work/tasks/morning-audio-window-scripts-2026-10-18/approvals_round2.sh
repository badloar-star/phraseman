#!/bin/bash
# Второй заход одобрения звука (координатор 18.10) одной командой: снимок HEAD → строгое одобрение → ворота паритета.
# Запуск: bash approvals_round2.sh [--dry]   (без --dry пишет scripts/learning_v2_owner_approved_audio_evidence.v1.json)
S=/c/Temp/claude/C--appsprojects-phraseman/129f91a4-53c5-416d-988a-0f73c489dfc8/scratchpad
cd /c/appsprojects/phraseman || exit 1
SNAP=$S/snap_head; rm -rf $SNAP; mkdir -p $SNAP
echo "[APPROVALS-R2] HEAD $(git rev-parse --short HEAD)"
git -c core.autocrlf=false archive HEAD content/learning-v2-course/release/en modules/learning-v2/content/factory_native/generated_release/en app/learning_v2_factory_silent_audio_v1.json app/learning_v2_bootstrap_audio_assets_v1.generated.ts app/learning_v2_factory_single_voice_v1.generated.ts assets/audio/learning-v2/factory-production-v1/manifest.json | tar -x -C $SNAP || { echo "[APPROVALS-R2] снимок не снят"; exit 1; }
git diff --quiet -- scripts/learning_v2_owner_approved_audio_evidence.v1.json || { echo "[APPROVALS-R2] файл одобрения изменён в рабочей копии — стоп"; exit 1; }
node $S/extend_owner_approvals_strict.cjs --snap $SNAP --require-range "$@" || exit 1
[ "$1" = "--dry" ] && exit 0
node scripts/learning_v2_release_parity_gate.mjs > $S/testlogs/parity_round2.log 2>&1; rc=$?
grep -E "BLOCKED|PASS" $S/testlogs/parity_round2.log | cut -c1-200
echo "[APPROVALS-R2] ворота паритета rc=$rc; numstat: $(git diff --numstat -- scripts/learning_v2_owner_approved_audio_evidence.v1.json)"
