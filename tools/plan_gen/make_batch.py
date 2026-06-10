# -*- coding: utf-8 -*-
# Build a batch input JSON from inline ROWS. Edit ROWS per batch.
# Usage: python tools/plan_gen/make_batch.py <out.json>
import json, sys
OUT = sys.argv[1]

def gate(d): return max(8, min(32, 8 + int((d-1)*0.8)))

# MITAP Batch 8: days 50-56 (week 8, B1: opinions & constructive debate — opine/agree-with-caveat/disagree/alternative/support/neutral + review)
ROWS = [
 (50,'B1',['present-simple','gerund'],[3,22],'Высказать своё мнение',"I think we should ship it. чётко озвучить позицию."),
 (51,'B1',['present-perfect','modals'],[24,10],'Мягко согласиться с оговоркой',"I agree, but with one caveat. согласие с условием."),
 (52,'B1',['conditionals','modals'],[26,10],'Вежливо возразить',"I see your point, but I disagree. корректное несогласие."),
 (53,'B1',['conditionals','future-simple'],[26,13],'Предложить альтернативу',"What if we tried another way? предложить другой путь."),
 (54,'B1',['present-perfect','comparatives'],[24,14],'Поддержать чужую идею и дополнить',"That is a great point. I would add. развить чужую мысль."),
 (55,'B1',['gerund','modals'],[22,10],'Остаться нейтральным в споре',"I can see both sides here. не принимать сторону."),
 (56,'B1',['conditionals','present-perfect','modals'],[26,24],'Повторение недели 8: спорим конструктивно','Review-диалог: мнение, согласие, возражение, альтернатива.'),
]
batch=[]
for d,level,cons,prereq,topic,note in ROWS:
    batch.append({'dayIndex':d,'level':level,'gateLessons':gate(d),'allowedConstructions':cons,'prereq':prereq,'topic':topic,'note':note})
json.dump(batch, open(OUT,'w',encoding='utf-8'), ensure_ascii=False)
print('batch days', [b['dayIndex'] for b in batch], 'gates', [b['gateLessons'] for b in batch])
