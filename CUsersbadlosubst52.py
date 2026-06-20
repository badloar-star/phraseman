# -*- coding: utf-8 -*-
# Substitution test: for each word slot, build the sentence with each distractor
# substituted in place of the correct word. Flag distractors that ALSO produce a
# grammatically valid / correct English sentence (= BRAK distractor).

phrases = [
    ("echo_d52_p1", ["Can","I","have","a","towel","please"], {
        0:["May","Will","Could","Do","Should"],
        1:["me","my","you","we","he"],
        2:["has","had","get","take","having"],
        3:["an","the","one","some","my"],
        4:["soap","key","pillow","blanket","towels"],
        5:["thanks","sorry","kindly","now","okay"],
    }),
    ("echo_d52_p2", ["Can","I","have","my","key","please"], {
        0:["May","Will","Could","Do","Must"],
        1:["me","my","you","we","she"],
        2:["has","had","get","take","having"],
        3:["me","mine","your","the","a"],
        4:["card","towel","door","room","keys"],
        5:["thanks","sorry","kindly","now","okay"],
    }),
    ("echo_d52_p3", ["I","need","a","clean","towel","now"], {
        0:["me","my","you","we","he"],
        1:["want","needs","have","like","needed"],
        2:["an","the","one","some","my"],
        3:["dirty","new","dry","fresh","cleans"],
        4:["sheet","key","soap","pillow","towels"],
        5:["then","soon","today","here","later"],
    }),
    ("echo_d52_p4", ["Can","you","give","me","the","key"], {
        0:["May","Will","Could","Do","Would"],
        1:["I","me","we","they","he"],
        2:["get","gives","take","bring","gave"],
        3:["I","my","you","us","mine"],
        4:["a","an","this","my","one"],
        5:["card","towel","door","bag","keys"],
    }),
    ("echo_d52_p5", ["Do","you","have","an","extra","towel"], {
        0:["Does","Are","Can","Did","Is"],
        1:["I","me","we","they","he"],
        2:["has","had","get","got","having"],
        3:["a","the","one","some","any"],
        4:["more","spare","clean","new","extras"],
        5:["pillow","key","soap","blanket","towels"],
    }),
    ("echo_d52_p6", ["I","have","lost","my","room","key"], {
        0:["me","my","you","we","he"],
        1:["has","had","am","do","having"],
        2:["found","left","losing","loses","missed"],
        3:["me","mine","the","a","your"],
        4:["door","hotel","key","floor","rooms"],
        5:["card","lock","towel","bag","keys"],
    }),
]

for pid, words, dmap in phrases:
    print(f"\n===== {pid}: {' '.join(words)} =====")
    for idx, dlist in dmap.items():
        slot = words[idx]
        for d in dlist:
            cand = list(words)
            cand[idx] = d
            print(f"  slot[{idx}]={slot:8s} <- {d:8s} : {' '.join(cand)}")
