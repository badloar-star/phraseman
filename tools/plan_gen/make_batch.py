# -*- coding: utf-8 -*-
# Build a batch input JSON from inline ROWS. Edit ROWS per batch.
# Usage: python tools/plan_gen/make_batch.py <out.json>
import json, sys
OUT = sys.argv[1]

def gate(d): return max(8, min(32, 8 + int((d-1)*0.8)))

# Batch 10 (FINAL voyazh): days 78-84 (week 12: opinions/humour/apology/etiquette/toast/farewell + final review; B2)
ROWS = [
 (78,'B2',['conditionals','present-perfect'],[24,26],'Выразить мнение и вежливо не согласиться',"I see your point but I'd argue, культурный спор без конфликта."),
 (79,'B2',['relative-clauses','present-perfect'],[24,30],'Юмор и идиомы в дружеской беседе',"You're pulling my leg, понять и пошутить с местными."),
 (80,'B2',['present-perfect','conditionals'],[24,26],'Извиниться за оплошность и сгладить неловкость',"I'm so sorry I didn't realize, It won't happen again, восстановить отношения."),
 (81,'B2',['modals','passive-voice'],[10,23],'Культурные тонкости: этикет, чаевые, табу',"Is it expected to tip, You are not supposed to, разобраться в нормах."),
 (82,'B2',['complex-object','present-perfect'],[24,31],'Подарить и принять подарок, тост на встрече',"I would like to propose a toast, You shouldn't have, застольный этикет."),
 (83,'B2',['future-simple','present-perfect'],[13,24],'Прощание: тёплые слова и планы вернуться',"I will never forget this, I will definitely come back, эмоциональное прощание."),
 (84,'B2',['conditionals','reported-speech','present-perfect'],[24,26,27],'Повторение недели 12 и всего курса: отъезд и итоги поездки','Финальный review: мнения, юмор, извинения, этикет, прощание.'),
]
batch=[]
for d,level,cons,prereq,topic,note in ROWS:
    batch.append({'dayIndex':d,'level':level,'gateLessons':gate(d),'allowedConstructions':cons,'prereq':prereq,'topic':topic,'note':note})
json.dump(batch, open(OUT,'w',encoding='utf-8'), ensure_ascii=False)
print('batch days', [b['dayIndex'] for b in batch], 'gates', [b['gateLessons'] for b in batch])
