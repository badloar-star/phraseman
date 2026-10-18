#!/bin/bash
# Ночная цепочка (координатор 02:56): вариант 64k, затем 96k — каждый отдельным slot.sh run, ожидание слота до часа.
S=/c/Temp/claude/C--appsprojects-phraseman/129f91a4-53c5-416d-988a-0f73c489dfc8/scratchpad
cd /c/appsprojects/phraseman || exit 1
for k in 64 96; do
  echo "[VARIANTS] $(date +%H:%M:%S) в очередь: $k"
  bash .claude/semaphore/slot.sh run --wait=3600 "ядро: ночной вариант ${k}k вне рабочей копии" -- bash $S/prepare_variant.sh $k > $S/testlogs/variant_${k}k.slot.log 2>&1
  echo "[VARIANTS] $(date +%H:%M:%S) $k rc=$? $(grep -E '\[VARIANT-'$k'\] .*(набор|rc=[1-9])' $S/testlogs/variant_${k}k.log 2>/dev/null | tail -1)"
done
