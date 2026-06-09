# -*- coding: utf-8 -*-
# Build a batch input JSON from inline ROWS. Edit ROWS per batch.
# Usage: python tools/plan_gen/make_batch.py <out.json>
import json, sys
OUT = sys.argv[1]

def gate(d): return max(8, min(32, 8 + int((d-1)*0.8)))

# MITAP Batch 6: days 36-42 (week 6, B1: facilitating by agenda — open/agenda/timing/hand-over/refocus/summarize + review)
ROWS = [
 (36,'B1',['present-perfect','future-simple'],[24,13],'Открыть встречу как ведущий',"Thanks for joining. Let us get started. начало встречи."),
 (37,'B1',['future-simple','gerund'],[13,22],'Озвучить повестку встречи',"Today we will cover three things. план встречи."),
 (38,'B1',['future-simple','prepositions-time'],[13,8],'Назначить тайминг пунктов',"Let us spend ten minutes on this. тайминг обсуждения."),
 (39,'B1',['modals','imperative'],[10,18],'Передать слово коллеге',"Over to you, Mark. Please go ahead. дать слово."),
 (40,'B1',['present-continuous','modals'],[17,10],'Вернуть фокус к теме встречи',"Let us get back on track. вернуть фокус."),
 (41,'B1',['present-perfect','gerund'],[24,22],'Подвести итог пункта',"So, to sum up this point. итог обсуждения."),
 (42,'B1',['present-perfect','future-simple','gerund'],[24,22],'Повторение недели 6: ведём по повестке','Review-диалог: открыть, повестка, тайминг, фокус, итог.'),
]
batch=[]
for d,level,cons,prereq,topic,note in ROWS:
    batch.append({'dayIndex':d,'level':level,'gateLessons':gate(d),'allowedConstructions':cons,'prereq':prereq,'topic':topic,'note':note})
json.dump(batch, open(OUT,'w',encoding='utf-8'), ensure_ascii=False)
print('batch days', [b['dayIndex'] for b in batch], 'gates', [b['gateLessons'] for b in batch])
