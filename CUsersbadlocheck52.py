# -*- coding: utf-8 -*-
import re

phrases = [
    {
        "id":"echo_d52_p1","english":"Can I have a towel please?",
        "words":[
            {"text":"Can","distractors":["May","Will","Could","Do","Should"]},
            {"text":"I","distractors":["me","my","you","we","he"]},
            {"text":"have","distractors":["has","had","get","take","having"]},
            {"text":"a","distractors":["an","the","one","some","my"]},
            {"text":"towel","distractors":["soap","key","pillow","blanket","towels"]},
            {"text":"please","distractors":["thanks","sorry","kindly","now","okay"]},
        ],
        "rule_ru":"Начни с can I have, назови предмет, добавь please — получится мягкая вежливая просьба.",
        "why_ru":"Так просят вещь в отеле: понятно и вежливо. Пример: Can I have a towel please.",
    },
    {
        "id":"echo_d52_p2","english":"Can I have my key please?",
        "words":[
            {"text":"Can","distractors":["May","Will","Could","Do","Must"]},
            {"text":"I","distractors":["me","my","you","we","she"]},
            {"text":"have","distractors":["has","had","get","take","having"]},
            {"text":"my","distractors":["me","mine","your","the","a"]},
            {"text":"key","distractors":["card","towel","door","room","keys"]},
            {"text":"please","distractors":["thanks","sorry","kindly","now","okay"]},
        ],
        "rule_ru":"Слово my перед предметом значит «мой». Поставь его перед key, чтобы попросить свой ключ.",
        "why_ru":"На ресепшене так просят именно свой ключ от номера. Пример: Can I have my key please.",
    },
    {
        "id":"echo_d52_p3","english":"I need a clean towel now",
        "words":[
            {"text":"I","distractors":["me","my","you","we","he"]},
            {"text":"need","distractors":["want","needs","have","like","needed"]},
            {"text":"a","distractors":["an","the","one","some","my"]},
            {"text":"clean","distractors":["dirty","new","dry","fresh","cleans"]},
            {"text":"towel","distractors":["sheet","key","soap","pillow","towels"]},
            {"text":"now","distractors":["then","soon","today","here","later"]},
        ],
        "rule_ru":"Слово need значит «нужно». Скажи I need и назови предмет — это понятная просьба.",
        "why_ru":"Если полотенце грязное, так просят чистое прямо сейчас. Пример: I need a clean towel now.",
    },
    {
        "id":"echo_d52_p4","english":"Can you give me the key?",
        "words":[
            {"text":"Can","distractors":["May","Will","Could","Do","Would"]},
            {"text":"you","distractors":["I","me","we","they","he"]},
            {"text":"give","distractors":["get","gives","take","bring","gave"]},
            {"text":"me","distractors":["I","my","you","us","mine"]},
            {"text":"the","distractors":["a","an","this","my","one"]},
            {"text":"key","distractors":["card","towel","door","bag","keys"]},
        ],
        "rule_ru":"Can you give me... значит «можете дать мне». Так просишь действие у работника отеля.",
        "why_ru":"Когда ключ у администратора, просишь его дать тебе. Пример: Can you give me the key.",
    },
    {
        "id":"echo_d52_p5","english":"Do you have an extra towel?",
        "words":[
            {"text":"Do","distractors":["Does","Are","Can","Did","Is"]},
            {"text":"you","distractors":["I","me","we","they","he"]},
            {"text":"have","distractors":["has","had","get","got","having"]},
            {"text":"an","distractors":["a","the","one","some","any"]},
            {"text":"extra","distractors":["more","spare","clean","new","extras"]},
            {"text":"towel","distractors":["pillow","key","soap","blanket","towels"]},
        ],
        "rule_ru":"Вопрос про наличие начинай с do you have: «у вас есть...?». Дальше назови предмет.",
        "why_ru":"Так узнаёшь про лишнее полотенце на ресепшене. Пример: Do you have an extra towel.",
    },
    {
        "id":"echo_d52_p6","english":"I have lost my room key",
        "words":[
            {"text":"I","distractors":["me","my","you","we","he"]},
            {"text":"have","distractors":["has","had","am","do","having"]},
            {"text":"lost","distractors":["found","left","losing","loses","missed"]},
            {"text":"my","distractors":["me","mine","the","a","your"]},
            {"text":"room","distractors":["door","hotel","key","floor","rooms"]},
            {"text":"key","distractors":["card","lock","towel","bag","keys"]},
        ],
        "rule_ru":"I have lost значит «я потерял». Дальше назови предмет: my room key — ключ от номера.",
        "why_ru":"Так спокойно сообщаешь о потере ключа на ресепшене. Пример: I have lost my room key.",
    },
]

def count_words(s):
    return len(s.split())

print("=== WORD COUNTS (rule/why, limit 24) ===")
for p in phrases:
    rc = count_words(p["rule_ru"])
    wc = count_words(p["why_ru"])
    flag_r = " <<< OVER" if rc > 24 else ""
    flag_w = " <<< OVER" if wc > 24 else ""
    print(f"{p['id']}: rule={rc}{flag_r}  why={wc}{flag_w}")

print()
print("=== MULTI-WORD TOKENS in words[].text ===")
for p in phrases:
    for w in p["words"]:
        if " " in w["text"].strip():
            print(f"{p['id']}: '{w['text']}' MULTIWORD")
print("(none if no lines above)")
