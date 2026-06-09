# -*- coding: utf-8 -*-
# Reusable: emit TS for a fixed batch JSON and splice into plan_content_voyazh.ts.
# Usage: python tools/plan_gen/emit_and_splice.py <fixed.json> <order_csv> <max_day_in_array>
#   order_csv: "22,23,24,25,26,27,28"
#   max_day_in_array: rebuild VOYAZH_CONTENT_DAYS = [DAY_1..DAY_<max>]
import json, sys
SRC = sys.argv[1]
ORDER = [int(x) for x in sys.argv[2].split(',')]
MAXDAY = int(sys.argv[3])
FILE = r'C:\appsprojects\phraseman\app\plan_content_voyazh.ts'

d = json.load(open(SRC, encoding='utf-8'))
def js(s): return "'" + s.replace('\\','\\\\').replace("'","\\'") + "'"
def loc(o): return "{ ru: %s, uk: %s, es: %s }" % (js(o['ru']), js(o['uk']), js(o['es']))

def emit_day(day):
    n=day['dayIndex']; L=[]
    L.append(f"export const VOYAZH_DAY_{n}: PlanContentDay = {{")
    L.append(f"  planId: 'voyazh',")
    L.append(f"  dayIndex: {n},")
    L.append(f"  topic: {loc(day['topic'])},")
    L.append(f"  outcome: {{")
    L.append(f"    ru: {js(day['outcome']['ru'])},")
    L.append(f"    uk: {js(day['outcome']['uk'])},")
    L.append(f"    es: {js(day['outcome']['es'])},")
    L.append(f"  }},")
    L.append(f"  level: {js(day['level'])},")
    L.append(f"  prerequisiteLessons: [{', '.join(str(x) for x in day['prerequisiteLessons'])}],")
    L.append(f"  intro: [")
    for sc in day['intro']:
        L.append(f"    {{")
        L.append(f"      kind: {js(sc['kind'])},")
        L.append(f"      title: {loc(sc['title'])},")
        L.append(f"      body: {{")
        L.append(f"        ru: {js(sc['body']['ru'])},")
        L.append(f"        uk: {js(sc['body']['uk'])},")
        L.append(f"        es: {js(sc['body']['es'])},")
        L.append(f"      }},")
        if sc.get('examples'):
            L.append(f"      examples: [")
            for ex in sc['examples']:
                L.append(f"        {{ en: {js(ex['en'])}, gloss: {loc(ex['gloss'])} }},")
            L.append(f"      ],")
        L.append(f"    }},")
    L.append(f"  ],")
    L.append(f"  phrases: [")
    for p in day['phrases']:
        L.append(f"    {{")
        L.append(f"      id: {js(p['id'])},")
        L.append(f"      english: {js(p['english'])},")
        L.append(f"      meaning: {loc(p['meaning'])},")
        L.append(f"      constructions: [{', '.join(js(c) for c in p['constructions'])}],")
        ex=p['explanation']
        L.append(f"      explanation: {{")
        L.append(f"        title: {loc(ex['title'])},")
        L.append(f"        rule: {loc(ex['rule'])},")
        L.append(f"        why: {loc(ex['why'])},")
        L.append(f"        commonMistake: {loc(ex['commonMistake'])},")
        L.append(f"      }},")
        L.append(f"      words: [")
        for w in p['words']:
            ds=', '.join(js(x) for x in w['distractors'])
            L.append(f"        {{ text: {js(w['text'])}, partOfSpeech: {js(w['partOfSpeech'])}, distractors: [{ds}] }},")
        L.append(f"      ],")
        L.append(f"    }},")
    L.append(f"  ],")
    L.append(f"  vocabulary: [")
    for v in day['vocabulary']:
        L.append(f"    {{ word: {js(v['word'])}, partOfSpeech: {js(v['partOfSpeech'])}, translation: {loc(v['translation'])}, example: {js(v['example'])} }},")
    L.append(f"  ],")
    L.append(f"}};")
    return "\n".join(L)

emit = "\n\n".join(emit_day(d[str(n)]) for n in ORDER) + "\n"
src = open(FILE, encoding='utf-8').read()
marker = 'export const VOYAZH_CONTENT_DAYS'
head, _ = src.split(marker, 1)
arr = "export const VOYAZH_CONTENT_DAYS: PlanContentDay[] = [\n" + ''.join(f"  VOYAZH_DAY_{i},\n" for i in range(1, MAXDAY+1)) + "];\n"
open(FILE, 'w', encoding='utf-8').write(head + emit + "\n" + arr)
print('spliced', ORDER, '-> array 1..%d' % MAXDAY)
