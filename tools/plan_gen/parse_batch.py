# -*- coding: utf-8 -*-
# Reusable: parse a generation-workflow output into drafts + filtered fixes + summary.
# Usage: python tools/plan_gen/parse_batch.py <workflow_output_file> <out_prefix>
#   writes <prefix>_drafts.json, <prefix>_fix.json, <prefix>_summary.txt
import json, sys, io

OUTFILE = sys.argv[1]
PREFIX = sys.argv[2]

w = json.load(open(OUTFILE, encoding='utf-8'))
days = w['result'] if isinstance(w, dict) and 'result' in w else w

drafts = {str(r['dayIndex']): r['draft'] for r in days}
json.dump(drafts, open(PREFIX + '_drafts.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

POS_NOISE = ['partofspeech', 'part of speech', 'грам. термин-метка', 'грамтермин', 'метка класса', 'служебн',
             "pos='to-be'", "pos='existential'", 'тег to-be', 'тег existential']
def is_noise(it):
    where = (it.get('where','') or '').lower(); problem = (it.get('problem','') or '').lower()
    text = where + ' ' + problem
    strong = ['тоже правильн','правильный ответ','второй правильн','валидный ответ','синоним','дубл','duplicat','повтор',
              'prerequisite','не того класса','не одного класса','разнокалибер','разнобой','разного класса','не из ситуации',
              'неестественн','путает','путающ','кривой','ломан','неграмматичн','опечатк','надуман','ложное правило',
              'без вопросительной','не передаёт вопрос','смысл','перевод','копия','below the gate','above gate','выше gate',
              'выше урок','лишн','24 слов','эмодзи','numeral','wh-word','auxiliary','"phrase"','invalid pos','невалид',
              'диакрит','ударени','accent','тетер','hervidor','¿','5 слов','6 слов','6 фраз','5 дистрактор','vocab.word',
              'не встречается','seats','existential']
    if any(s in text for s in strong): return False
    if any(n in text for n in POS_NOISE): return True
    return False

fix = []
for r in sorted(days, key=lambda x: x['dayIndex']):
    crit = r['critiques']; issues = []
    for lens in ('sense','i18n','gate'):
        c = crit.get(lens) or {}
        for it in (c.get('issues') or []):
            if not is_noise(it):
                issues.append({'where': it.get('where',''), 'problem': it.get('problem',''), 'fix': it.get('fix','')})
    fix.append({'dayIndex': r['dayIndex'], 'topic': r['topic'], 'draft': r['draft'], 'fixIssues': issues})
json.dump(fix, open(PREFIX + '_fix.json', 'w', encoding='utf-8'), ensure_ascii=False)

L = [f"BATCH: {len(days)} days, {w.get('agentCount','?')} agents", f"logs: {w.get('logs')}", ""]
for r in sorted(days, key=lambda x: x['dayIndex']):
    di = r['dayIndex']; crit = r['critiques']
    rf = [f for f in fix if f['dayIndex'] == di][0]['fixIssues']
    L.append(f"===== DAY {di} [{r['topic']}] phrases={len(r['draft']['phrases'])} real_fixes={len(rf)} =====")
    for lens in ('sense','i18n','gate'):
        c = crit.get(lens) or {}; iss = c.get('issues') or []
        L.append(f"  [{lens}] verdict={c.get('verdict','?')} issues={len(iss)}")
        for it in iss:
            L.append(f"    - WHERE {it.get('where','')}")
            L.append(f"      PROB {it.get('problem','')}")
            L.append(f"      FIX  {it.get('fix','')}")
    L.append("")
io.open(PREFIX + '_summary.txt', 'w', encoding='utf-8').write("\n".join(L))
print('parsed', len(days), 'days; total real fixes', sum(len(f['fixIssues']) for f in fix))
