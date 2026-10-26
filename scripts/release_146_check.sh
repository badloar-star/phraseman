#!/bin/bash
# Хранится в scripts/ (хендовер Ревизора 26.10). Запуск: bash scripts/release_146_check.sh <хэш> [номер_сборки=146]; CHEAP_ONLY=1 — только быстрые проверки без светофора.
# Ревизор: проверка хэша перед магазинной сборкой 2.0.3 (146) — слово владельца 26.10 «исправляй всё и выпускай новую версию».
# Как для 145 + утренние правки: банки экзамена всех выпущенных глав подключены, сторожа банков и «?», тесты, тронутые с b60fa6ea3,
# контракты пейвола (source settings_plus), tsc, экспорт iOS + Android на НАСТОЯЩЕЙ установке (npm ci) со средой production и dev-строки.
# Ничего не публикует и не собирает в EAS. Строки [REL-146] ✅ / 🔴, последняя — ВЕРДИКТ.
REV=${1:?хэш}; BUILD=${2:-146}; BASE=b60fa6ea3
R=/c/appsprojects/phraseman; H=/c/Temp/claude/rel146_head; O=/c/Temp/claude/rel146_$(date +%m%d_%H%M); mkdir -p $O
WR=$(cygpath -m $R); WH=$(cygpath -m $H); WO=$(cygpath -m $O)
FAIL=0; ok(){ echo "[REL-146] ✅ $*" | tee -a $O/verdict.txt; }; bad(){ echo "[REL-146] 🔴 $*" | tee -a $O/verdict.txt; FAIL=1; }
cd $R; FULL=$(git rev-parse "$REV^{commit}") || { echo "нет ревизии $REV"; exit 1; }
rm -rf $H; mkdir -p $H
git -c core.autocrlf=false -c core.eol=lf archive $FULL | tar -x -C $H
echo "[REL-146] ревизия $FULL (база $BASE) → $O" | tee $O/verdict.txt

# 1) версии
node -e "
const a=require('$WH/app.json').expo;const want={version:'2.0.3',runtimeVersion:'2.0.3',ios:'$BUILD',android:$BUILD};
const got={version:a.version,runtimeVersion:String(a.runtimeVersion),ios:a.ios&&a.ios.buildNumber,android:a.android&&a.android.versionCode};
const bad=Object.keys(want).filter(k=>String(got[k])!==String(want[k]));console.log(bad.length?'BAD '+JSON.stringify({want,got}):'OK '+JSON.stringify(got))" > $O/version.txt
grep -q '^OK' $O/version.txt && ok "версии: $(cut -c4- $O/version.txt)" || bad "версии: $(cut -c5- $O/version.txt)"

# 2) профиль production — ничего dev
node -e "
const p=require('$WH/eas.json').build.production;const e=p.env||{};const i=[];
if(p.developmentClient)i.push('developmentClient');if(p.extends)i.push('extends='+p.extends);if(p.channel!=='production')i.push('channel='+p.channel);
if(e.EXPO_PUBLIC_STORE_RELEASE!=='1')i.push('STORE_RELEASE='+e.EXPO_PUBLIC_STORE_RELEASE);
for(const k of Object.keys(e))if(/DEV|TESTFLIGHT|DISABLE_EXPO_UPDATES|PROOF|DEBUG/i.test(k))i.push(k+'='+e[k]);
console.log(i.length?'BAD '+i.join(', '):'OK env='+JSON.stringify(e))" > $O/eas.txt
grep -q '^OK' $O/eas.txt && ok "профиль production: $(cut -c4- $O/eas.txt)" || bad "профиль production: $(cut -c5- $O/eas.txt)"

# 3) флаги против эталона (exam v2 = true строго)
node -e "
const fs=require('fs');const base=JSON.parse(fs.readFileSync('$WR/docs/work/release/ota_flag_baseline_2026-10-25.json','utf8'));
const s=fs.readFileSync('$WH/app/remote_flags.ts','utf8');const i=s.indexOf('const DEFAULT_FLAGS');const j=s.indexOf('};',i);
const now={};for(const m of s.slice(i,j).matchAll(/^\s*([a-z0-9_]+)\s*:\s*(true|false)\s*,/gm))now[m[1]]=m[2]==='true';
const out=[];for(const [k,v] of Object.entries(base.defaults)){if(!(k in now))out.push('MISSING '+k);else if(now[k]!==v&&!(base.either||[]).includes(k))out.push('RED '+k+' '+v+'->'+now[k])}
for(const k of Object.keys(now))if(!(k in base.defaults))out.push('NEW '+k);
console.log(out.length?'BAD '+out.join('; '):'OK '+Object.keys(now).length+'/'+Object.keys(base.defaults).length+' exam_v2='+now.learning_chapter_exam_v2_enabled)" > $O/flags.txt
grep -q '^OK' $O/flags.txt && ok "флаги: $(cut -c4- $O/flags.txt)" || bad "флаги: $(cut -c5- $O/flags.txt)"
# 3б) слово владельца 07:13 / 07:15: пейвол М строго ВКЛ; четыре серверных флага ждём ВКЛ — выключенный печатаем, причина должна быть в коммите Ядра
node -e "
const s=require('fs').readFileSync('$WH/app/remote_flags.ts','utf8');const v=(k)=>{const m=s.match(new RegExp('^\\\\s*'+k+'\\\\s*:\\\\s*(true|false)','m'));return m?m[1]:'нет'};
const four=['dialogue_freeform_translate_enabled','account_delete_variant_b_ui_enabled','dialogue_coin_intent_host_enabled','spire_gold'];
const off=four.filter(k=>v(k)!=='true');console.log((v('paywall_m_enabled')==='true'?'OK':'BAD')+' paywall_m='+v('paywall_m_enabled')+' · четыре флага: '+(off.length?'выкл '+off.join(','):'все ВКЛ'))" > $O/flags146.txt
grep -q '^OK' $O/flags146.txt && ok "слово владельца по флагам: $(cut -c4- $O/flags146.txt)" || bad "слово владельца по флагам: $(cut -c5- $O/flags146.txt)"

# 4) банки экзамена: подключены ВСЕ главы выпущенных уроков (урок 1..последний в манифесте × 7 глав), без дублей
node -e "
const fs=require('fs'),path=require('path');const dir='$WH/modules/learning-v2/exam/banks';
const man=fs.readFileSync('$WH/modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated.ts','utf8');
const present=new Set();for(const m of man.matchAll(/lessonOrdinal\"?\s*:\s*(\d+)[\s\S]{0,200}?sessionOrdinal\"?\s*:\s*(\d+)/g))present.add(m[1]+':'+Math.ceil(+m[2]/8));const last=Math.max(...[...present].map(k=>+k.split(':')[0]));
const top=fs.readFileSync('$WH/modules/learning-v2/content/course_topology_v1.ts','utf8');const per=+top.match(/LEARNING_V2_LESSON_CHAPTER_COUNT_V1 = (\d+)/)[1];
const wiredFiles=fs.readdirSync(dir).filter(f=>/^registry_l\d\d_l\d\d\.ts$/.test(f)).flatMap(f=>[...fs.readFileSync(path.join(dir,f),'utf8').matchAll(/from '\.\/(chapter_exam_v2_l\d+_c\d+)'/g)].map(m=>m[1]+'.ts'));
const keys=wiredFiles.map(f=>{const s=fs.readFileSync(path.join(dir,f),'utf8');const l=s.match(/lessonOrdinal\s*:\s*(\d+)/),c=s.match(/chapterOrdinal\s*:\s*(\d+)/);return l&&c?l[1]+':'+c[1]:'?'+f});
const want=[...present].sort((a,b)=>{const[x,y]=a.split(':').map(Number),[u,v]=b.split(':').map(Number);return x-u||y-v});
const missing=want.filter(k=>!keys.includes(k)),dup=keys.filter((k,i)=>keys.indexOf(k)!==i),extra=keys.filter(k=>!want.includes(k));
console.log(!missing.length&&!dup.length?'OK '+(keys.length-extra.length)+'/'+want.length+' глав с занятиями в манифесте сборки (уроки 1–'+last+')'+(extra.length?' · заметка: подключены банки глав без занятий в этой сборке (безвредно) — '+extra.join(','):''):'BAD wired='+keys.length+'/'+want.length+' missing='+missing.slice(0,20).join(',')+(missing.length>20?'…(+'+(missing.length-20)+')':'')+' dup='+dup.join(',')+' extra='+extra.join(','))" > $O/banks.txt
grep -q '^OK' $O/banks.txt && ok "банки подключены: $(cut -c4- $O/banks.txt)" || bad "банки: $(cut -c5- $O/banks.txt)"
echo "[REL-146] дешёвые проверки готовы: FAIL=$FAIL" | tee -a $O/verdict.txt
[ -n "$CHEAP_ONLY" ] && exit "$FAIL"

# 5) настоящая установка + tsc + тесты + экспорт (всё тяжёлое — одним заходом светофора)
TESTS="tests/learning_v2_chapter_exam_v2_banks_rules.test.ts tests/owner_locks_exam_episode_words_2026_10_25.test.ts tests/learning_v2_chapter_exam_v2_app.test.ts tests/learning_v2_chapter_exam_v2.test.ts tests/chapter_exam_v2_ui_lang_gate_2026_10_25.test.ts tests/learning_v2_exam_chapter_credit_parity.test.ts tests/paywall_entry_callsite_registry_contract.test.ts tests/paywall_entry_contract.test.ts tests/paywall_entry_points_whitelist_contract.test.ts tests/paywall_entry_pipeline.test.ts"
CHANGED=$(git diff --name-only --diff-filter=AM $BASE $FULL -- 'tests/*.test.ts' 'tests/*.test.tsx' | tr '\n' ' ')
# зачем (владелец 26.10 07:13, координатор): пейвол М включён в 146 — денежный путь через окна М (покупка, восстановление, промокод,
# все source из контракта, пустые цены, dev-строки) проверяем ВСЕМИ тестами пейвола и окна Plus, не только тронутыми
PAYWALL=$(cd $H && ls tests/paywall*.test.ts tests/paywall*.test.tsx tests/premium*.test.ts tests/promo_code*.test.ts 2>/dev/null | tr '\n' ' ')
ALL=$(for t in $TESTS $CHANGED $PAYWALL; do [ -f "$H/$t" ] && echo $t; done | sort -u | tr '\n' ' ')
echo "$ALL" > $O/tests.txt
mkdir -p /c/Temp/claude/ota_tmp
bash $R/.claude/semaphore/slot.sh run --wait=7200 "revizor: 2.0.3 ($BUILD) full check $REV" -- bash -c "
  cd $H && export TMP='C:\Temp\claude\ota_tmp' TEMP='C:\Temp\claude\ota_tmp' CI=1
  npm ci --include=dev --no-audit --no-fund > $O/npm_ci.txt 2>&1; echo npm_exit=\$? >> $O/npm_ci.txt
  NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p . > $O/tsc.txt 2>&1; echo tsc_exit=\$? >> $O/tsc.txt
  NODE_OPTIONS=--max-old-space-size=4096 timeout 1500 npx jest --no-watchman --maxWorkers=2 --runTestsByPath $ALL > $O/jest.txt 2>&1; echo jest_exit=\$? >> $O/jest.txt
  node --test tests/paywall_v3_source_contract.test.mjs > $O/node_paywall.txt 2>&1; echo node_exit=\$? >> $O/node_paywall.txt
  for P in ios android; do
    EXPO_PUBLIC_STORE_RELEASE=1 EXPO_PUBLIC_AI_DIALOG_ENABLED=true EXPO_PUBLIC_EXPLAIN_ENABLED=true NODE_OPTIONS=--max-old-space-size=8192 npx expo export --platform \$P --output-dir dist-store-\$P --max-workers 1 --source-maps > $O/export_\$P.txt 2>&1; echo export_exit=\$? >> $O/export_\$P.txt
    node scripts/store_bundle_dev_strings_gate.mjs --dir dist-store-\$P > $O/devstrings_\$P.txt 2>&1; echo gate_exit=\$? >> $O/devstrings_\$P.txt
  done" >/dev/null 2>&1
[ "$(tail -1 $O/npm_ci.txt)" = "npm_exit=0" ] && ok "npm ci" || bad "npm ci: $(tail -3 $O/npm_ci.txt | tr '\n' ' ')"
TE=$(grep -c 'error TS' $O/tsc.txt); [ "$(tail -1 $O/tsc.txt)" = "tsc_exit=0" ] && ok "tsc: 0 ошибок всего" || bad "tsc: $TE ошибок ($(tail -1 $O/tsc.txt)) — $(grep 'error TS' $O/tsc.txt | head -3 | tr '\n' ' ' | cut -c1-300)"
JS=$(grep -E '^Tests:' $O/jest.txt | tail -1); [ "$(tail -1 $O/jest.txt)" = "jest_exit=0" ] && ok "тесты ($(wc -w < $O/tests.txt) наборов: банки, «?», экзамен, пейвол + тронутые с $BASE): $JS" || bad "тесты: $JS — $(grep -E '^FAIL ' $O/jest.txt | sort -u | tr '\n' ' ' | cut -c1-300)"
[ "$(tail -1 $O/node_paywall.txt)" = "node_exit=0" ] && ok "paywall_v3_source (node)" || bad "paywall_v3_source: $(grep -E '^# fail|not ok' $O/node_paywall.txt | head -3 | tr '\n' ' ')"
for P in ios android; do
  EX=$(tail -1 $O/export_$P.txt); GX=$(tail -1 $O/devstrings_$P.txt)
  M=$(find $H/dist-store-$P -name '*.hbc' -exec grep -c -a -E 'dev_vip_override|HUB-LIFECYCLE' {} \; 2>/dev/null | awk '{s+=$1} END {print (NR ? s : "?")}')
  if [ "$EX" = "export_exit=0" ] && [ "$GX" = "gate_exit=0" ] && [ "$M" = "0" ]; then ok "бандл $P (среда production): dev-модулей нет, маркеров 0"
  else bad "бандл $P: $EX $GX маркеров=$M — $(tail -4 $O/export_$P.txt | tr '\n' ' ' | cut -c1-240)"; fi
done
[ "$FAIL" = "0" ] && echo "[REL-146] ВЕРДИКТ ${REV:0:9}: 🟢 к магазинной сборке 2.0.3 ($BUILD)" | tee -a $O/verdict.txt || echo "[REL-146] ВЕРДИКТ ${REV:0:9}: 🔴 СТОП" | tee -a $O/verdict.txt
exit "$FAIL"
