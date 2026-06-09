# -*- coding: utf-8 -*-
# Build a batch input JSON from inline ROWS. Edit ROWS per batch.
# Usage: python tools/plan_gen/make_batch.py <out.json>
import json, sys
OUT = sys.argv[1]

def gate(d): return max(8, min(32, 8 + int((d-1)*0.8)))

# MITAP Batch 2: days 8-14 (week 2, A2: meeting the team — introduce/role/timezone/name+title/contacts + review)
ROWS = [
 (8,'A2',['present-simple','to-have'],[3,7],'Представиться команде: роль и стаж',"I'm on the design team. I have two years here. рассказать о себе."),
 (9,'A2',['present-simple','present-simple-questions'],[3,5],'Рассказать, чем именно занимаешься',"I work on the mobile app. описать свою работу."),
 (10,'A2',['wh-questions','present-simple'],[5,6],'Спросить про роль коллеги',"What do you do here? узнать, чем занимается собеседник."),
 (11,'A2',['present-simple-questions','prepositions-time'],[5,8],'Откуда ты и какой часовой пояс',"Where are you based? What time is it for you? страна и время."),
 (12,'A2',['wh-questions','to-have'],[6,7],'Уточнить имя и должность собеседника',"Sorry, what's your name again? переспросить имя и роль."),
 (13,'A2',['present-simple','imperative'],[3,18],'Обменяться контактами в чате',"I will send my email. Drop yours in the chat. обмен контактами."),
 (14,'A2',['present-simple','wh-questions','to-have'],[6,7],'Повторение недели 2: знакомство с командой','Review-диалог: представиться, роль, часовой пояс, контакты.'),
]
batch=[]
for d,level,cons,prereq,topic,note in ROWS:
    batch.append({'dayIndex':d,'level':level,'gateLessons':gate(d),'allowedConstructions':cons,'prereq':prereq,'topic':topic,'note':note})
json.dump(batch, open(OUT,'w',encoding='utf-8'), ensure_ascii=False)
print('batch days', [b['dayIndex'] for b in batch], 'gates', [b['gateLessons'] for b in batch])
