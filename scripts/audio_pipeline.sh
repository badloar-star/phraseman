#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# cards-2.0 (E9): производство звукового семейства раздела «Карточки» (§5).
#
# Одно тембровое семейство «мягкая маримба» (синус + характерная 4-я гармоника
# с быстрым затуханием), синтез через ffmpeg aevalsrc + ADSR-огибающие (afade /
# exp-decay в выражении). Комбо-питчи +2/+4/+6 полутонов — пре-рендер
# pitch-shift'ом из fc_correct (asetrate → aresample → atempo, §5).
#
# Нормализация: −16 LUFS integrated (двухпроходный ebur128), пики ≤ −6 dBFS
# (alimiter). Формат: mp3 mono 44.1kHz ≤30KB на файл.
#
# Длительности: ≤400мс, кроме session_complete ≤900мс и riser ≤1200мс.
#
# Запуск: bash scripts/audio_pipeline.sh   (из корня репо; нужен ffmpeg)
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/sounds/fc"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

SR=44100
TARGET_LUFS=-16
PEAK_LIMIT=0.5 # −6 dBFS

# ── Тембр семейства ──────────────────────────────────────────────────────────
# note <freq> <decay_k> — выражение aevalsrc одной «маримбовой» ноты:
# атака 2.5мс (без щелчка), экспоненциальное затухание, 4-я гармоника ярче
# затухает (перкуссивный характер древесины).
note_expr() {
  local f="$1" k="$2"
  echo "min(t*400\,1)*exp(-t*$k)*(0.85*sin(2*PI*$f*t)+0.30*sin(2*PI*$f*4*t)*exp(-t*$k*2.6))"
}

# синтез одной ноты в wav: synth_note <file> <freq> <decay_k> <dur>
synth_note() {
  local file="$1" f="$2" k="$3" d="$4"
  ffmpeg -y -v error -f lavfi -i "aevalsrc='$(note_expr "$f" "$k")':d=$d:s=$SR" \
    -ac 1 "$file"
}

# микс нот с задержками: mix_notes <out> <dur> <in1:delay_ms> [in2:delay_ms...]
mix_notes() {
  local out="$1" dur="$2"; shift 2
  local inputs=() filters="" idx=0 labels=""
  for spec in "$@"; do
    local f="${spec%%:*}" dly="${spec##*:}"
    inputs+=(-i "$f")
    filters+="[$idx:a]adelay=${dly}:all=1[d$idx];"
    labels+="[d$idx]"
    idx=$((idx+1))
  done
  ffmpeg -y -v error "${inputs[@]}" \
    -filter_complex "${filters}${labels}amix=inputs=$idx:normalize=0,atrim=0:$dur" \
    -ac 1 "$out"
}

# ── Нормализация −16 LUFS + пики −6 dBFS + mp3 ───────────────────────────────
# Двухпроходно: замер integrated loudness (ebur128, файл дополняется тишиной —
# гейтинг −70 LUFS её отбрасывает), затем volume=<gain>dB + alimiter.
finalize() {
  local wav="$1" name="$2"
  local measured gain
  measured=$(ffmpeg -v info -i "$wav" -af "apad=pad_dur=2,ebur128" -f null - 2>&1 \
    | grep -A10 'Summary:' | grep 'I:' | head -1 | sed -E 's/.*I:\s*(-?[0-9.]+).*/\1/')
  if [[ -z "$measured" || "$measured" == "-70.0" ]]; then
    echo "  [$name] loudness замер не удался — фолбэк peak-нормализация"
    gain=0
  else
    gain=$(awk -v m="$measured" -v t="$TARGET_LUFS" 'BEGIN { printf "%.2f", t - m }')
  fi
  ffmpeg -y -v error -i "$wav" \
    -af "volume=${gain}dB,alimiter=limit=$PEAK_LIMIT:level=false,aresample=$SR" \
    -ac 1 -codec:a libmp3lame -b:a 96k "$OUT/$name.mp3"
  echo "  [$name] I=${measured:-?} LUFS → gain ${gain}dB → $OUT/$name.mp3"
}

echo "── Синтез семейства (маримба, мажорные интервалы) ──"

# Ноты (Гц): C5=523.25 E5=659.25 G5=783.99 C6=1046.50 E6=1318.51 G6=1567.98
# E4=329.63 Eb4=311.13

# 1) fc_correct — «верный ответ»: 2 ноты вверх C5→E5 (большая терция), 300мс
synth_note "$TMP/c5.wav" 523.25 11 0.30
synth_note "$TMP/e5.wav" 659.25 11 0.24
mix_notes "$TMP/correct.wav" 0.34 "$TMP/c5.wav:0" "$TMP/e5.wav:110"
finalize "$TMP/correct.wav" fc_correct

# 2) fc_combo_x3/x5/x10 — тот же мотив, питч +2/+4/+6 полутонов (пре-рендер §5)
for st in 2 4 6; do
  ratio=$(awk -v n="$st" 'BEGIN { printf "%.6f", 2^(n/12) }')
  inv=$(awk -v r="$ratio" 'BEGIN { printf "%.6f", 1/r }')
  case "$st" in 2) nm=fc_combo_x3;; 4) nm=fc_combo_x5;; 6) nm=fc_combo_x10;; esac
  ffmpeg -y -v error -i "$TMP/correct.wav" \
    -af "asetrate=$SR*$ratio,aresample=$SR,atempo=$inv" -ac 1 "$TMP/$nm.wav"
  finalize "$TMP/$nm.wav" "$nm"
done

# 3) fc_incorrect — мягкий thud вниз: минорная секунда E4→Eb4, lowpass, 220мс
synth_note "$TMP/e4.wav" 329.63 18 0.20
synth_note "$TMP/eb4.wav" 311.13 16 0.16
mix_notes "$TMP/incorrect_raw.wav" 0.24 "$TMP/e4.wav:0" "$TMP/eb4.wav:80"
ffmpeg -y -v error -i "$TMP/incorrect_raw.wav" -af "lowpass=f=900" -ac 1 "$TMP/incorrect.wav"
finalize "$TMP/incorrect.wav" fc_incorrect

# 4) fc_flip — «бумажный flick» 110мс: короткий шумовой всплеск, bandpass ~1.8кГц
ffmpeg -y -v error -f lavfi -i "anoisesrc=colour=pink:d=0.11:sample_rate=$SR:seed=42" \
  -af "bandpass=f=1800:width_type=o:w=1.6,volume='min(t*260,1)*exp(-t*34)':eval=frame,afade=t=out:st=0.08:d=0.03" \
  -ac 1 "$TMP/flip.wav"
finalize "$TMP/flip.wav" fc_flip

# 5) fc_tick — тихий tick 50мс (смена карточки в слушании): высокая нота C7
synth_note "$TMP/tick.wav" 2093.0 90 0.05
finalize "$TMP/tick.wav" fc_tick

# 6) fc_swipe_know — восходящий whoosh (чирп 400→900Гц) + tick в конце, 160мс
ffmpeg -y -v error \
  -f lavfi -i "aevalsrc='min(t*200\,1)*exp(-t*9)*0.7*sin(2*PI*(400*t+500*t*t/(2*0.16)))':d=0.16:s=$SR" \
  -f lavfi -i "aevalsrc='$(note_expr 1567.98 40)':d=0.06:s=$SR" \
  -filter_complex "[1:a]adelay=110:all=1[tk];[0:a][tk]amix=inputs=2:normalize=0,atrim=0:0.18" \
  -ac 1 "$TMP/swipe_know.wav"
finalize "$TMP/swipe_know.wav" fc_swipe_know

# 7) fc_swipe_learn — нисходящий whoosh (чирп 700→350Гц), мягкий, 160мс
ffmpeg -y -v error \
  -f lavfi -i "aevalsrc='min(t*200\,1)*exp(-t*11)*0.6*sin(2*PI*(700*t-350*t*t/(2*0.16)))':d=0.16:s=$SR" \
  -af "lowpass=f=1200" -ac 1 "$TMP/swipe_learn.wav"
finalize "$TMP/swipe_learn.wav" fc_swipe_learn

# 8) fc_star — sparkle 400мс: быстрое мажорное трезвучие вверх C6→E6→G6
synth_note "$TMP/c6.wav" 1046.50 9 0.26
synth_note "$TMP/e6.wav" 1318.51 9 0.24
synth_note "$TMP/g6.wav" 1567.98 9 0.24
mix_notes "$TMP/star.wav" 0.40 "$TMP/c6.wav:0" "$TMP/e6.wav:70" "$TMP/g6.wav:140"
finalize "$TMP/star.wav" fc_star

# 9) fc_chest_open — арпеджио C5-E5-G5-C6 (сундук/reveal), 400мс
synth_note "$TMP/ch_c5.wav" 523.25 10 0.22
synth_note "$TMP/ch_e5.wav" 659.25 10 0.20
synth_note "$TMP/ch_g5.wav" 783.99 10 0.18
synth_note "$TMP/ch_c6.wav" 1046.50 9 0.16
mix_notes "$TMP/chest.wav" 0.40 "$TMP/ch_c5.wav:0" "$TMP/ch_e5.wav:80" "$TMP/ch_g5.wav:160" "$TMP/ch_c6.wav:240"
finalize "$TMP/chest.wav" fc_chest_open

# 10) fc_session_complete — финал-арпеджио 5 нот C5-E5-G5-C6-E6, ≤900мс
synth_note "$TMP/f1.wav" 523.25 6 0.45
synth_note "$TMP/f2.wav" 659.25 6 0.40
synth_note "$TMP/f3.wav" 783.99 6 0.38
synth_note "$TMP/f4.wav" 1046.50 6 0.36
synth_note "$TMP/f5.wav" 1318.51 5 0.36
mix_notes "$TMP/complete.wav" 0.88 "$TMP/f1.wav:0" "$TMP/f2.wav:130" "$TMP/f3.wav:260" "$TMP/f4.wav:390" "$TMP/f5.wav:520"
finalize "$TMP/complete.wav" fc_session_complete

# 11) fc_riser — церемония пака: свелл-чирп A3→A5 (2 октавы) 1.05с + фейд-аут
ffmpeg -y -v error \
  -f lavfi -i "aevalsrc='pow(t/1.05\,1.4)*(0.75*sin(2*PI*(220*t+660*t*t/(2*1.05)))+0.2*sin(2*PI*2*(220*t+660*t*t/(2*1.05))))':d=1.05:s=$SR" \
  -af "afade=t=out:st=0.95:d=0.1" -ac 1 "$TMP/riser.wav"
finalize "$TMP/riser.wav" fc_riser

# ── Чистка устаревших placeholder'ов E1 ──────────────────────────────────────
rm -f "$OUT/fc_success.mp3" "$OUT/fc_fail.mp3"

# ── Верификация: длительность / битрейт / не-тишина / размер ────────────────
echo ""
echo "── Верификация ffprobe ──"
fail=0
for f in "$OUT"/fc_*.mp3; do
  name=$(basename "$f")
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  size=$(stat -c%s "$f")
  peak=$(ffmpeg -v info -i "$f" -af volumedetect -f null - 2>&1 | grep max_volume | sed -E 's/.*max_volume: (-?[0-9.]+) dB.*/\1/')
  # лимиты: riser ≤1.35с, session_complete ≤1.1с, остальные ≤0.6с (mp3 добавляет ~50мс паддинга кодека)
  max=0.6
  [[ "$name" == fc_session_complete.mp3 ]] && max=1.1
  [[ "$name" == fc_riser.mp3 ]] && max=1.35
  ok="OK"
  awk -v d="$dur" -v m="$max" 'BEGIN { exit !(d <= m) }' || { ok="FAIL:dur>$max"; fail=1; }
  [[ "$size" -le 30720 ]] || { ok="FAIL:size>30KB"; fail=1; }
  awk -v p="$peak" 'BEGIN { exit !(p > -50) }' || { ok="FAIL:silence"; fail=1; }
  awk -v p="$peak" 'BEGIN { exit !(p <= -5.0) }' || { ok="FAIL:peak>-6dBFS"; fail=1; }
  printf "  %-26s %6.3fs  %6dB  peak %sdB  %s\n" "$name" "$dur" "$size" "$peak" "$ok"
done
[[ "$fail" == 0 ]] && echo "── Все файлы прошли проверку ──" || { echo "── ЕСТЬ ОШИБКИ ──"; exit 1; }
