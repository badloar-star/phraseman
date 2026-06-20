import json

draft = {"planId":"echo","dayIndex":48,"level":"A1","topic":{"ru":"x"},"phrases":[
{"id":"echo_d48_p1","english":"What is your phone number?","words":[{"text":"What","partOfSpeech":"adverb","distractors":["Where","When","How","Who","Why"]},{"text":"is","partOfSpeech":"to-be","distractors":["are","was","be","am","were"]},{"text":"your","partOfSpeech":"pronoun","distractors":["my","his","her","our","their"]},{"text":"phone","partOfSpeech":"noun","distractors":["home","work","office","house","room"]},{"text":"number","partOfSpeech":"noun","distractors":["name","address","email","age","city"]}]},
{"id":"echo_d48_p2","english":"Could you give me your number?","words":[{"text":"Could","partOfSpeech":"modal","distractors":["Can","Will","Would","Should","Must"]},{"text":"you","partOfSpeech":"pronoun","distractors":["he","she","we","they","I"]},{"text":"give","partOfSpeech":"verb","distractors":["take","send","show","tell","bring"]},{"text":"me","partOfSpeech":"pronoun","distractors":["him","her","us","them","you"]},{"text":"your","partOfSpeech":"pronoun","distractors":["my","his","her","our","their"]},{"text":"number","partOfSpeech":"noun","distractors":["name","address","email","age","city"]}]},
{"id":"echo_d48_p3","english":"Can I have your phone number?","words":[{"text":"Can","partOfSpeech":"modal","distractors":["Could","Will","Would","Should","Must"]},{"text":"I","partOfSpeech":"pronoun","distractors":["You","He","She","We","They"]},{"text":"have","partOfSpeech":"verb","distractors":["take","get","give","want","need"]},{"text":"your","partOfSpeech":"pronoun","distractors":["my","his","her","our","their"]},{"text":"phone","partOfSpeech":"noun","distractors":["home","work","office","house","room"]},{"text":"number","partOfSpeech":"noun","distractors":["name","address","email","age","city"]}]},
{"id":"echo_d48_p4","english":"Is this your new number?","words":[{"text":"Is","partOfSpeech":"to-be","distractors":["Are","Was","Be","Am","Were"]},{"text":"this","partOfSpeech":"pronoun","distractors":["that","these","those","it","there"]},{"text":"your","partOfSpeech":"pronoun","distractors":["my","his","her","our","their"]},{"text":"new","partOfSpeech":"adjective","distractors":["old","real","main","right","first"]},{"text":"number","partOfSpeech":"noun","distractors":["name","address","email","age","city"]}]},
{"id":"echo_d48_p5","english":"Please call me this evening.","words":[{"text":"Please","partOfSpeech":"other","distractors":["Thanks","Sorry","Maybe","Yes","Now"]},{"text":"call","partOfSpeech":"verb","distractors":["text","email","visit","meet","ask"]},{"text":"me","partOfSpeech":"pronoun","distractors":["him","her","us","them","you"]},{"text":"this","partOfSpeech":"pronoun","distractors":["that","these","those","it","the"]},{"text":"evening","partOfSpeech":"noun","distractors":["morning","afternoon","weekend","week","day"]}]},
{"id":"echo_d48_p6","english":"What is the best number?","words":[{"text":"What","partOfSpeech":"adverb","distractors":["Where","When","How","Who","Why"]},{"text":"is","partOfSpeech":"to-be","distractors":["are","was","be","am","were"]},{"text":"the","partOfSpeech":"article","distractors":["a","an","this","that","my"]},{"text":"best","partOfSpeech":"adjective","distractors":["new","old","main","right","first"]},{"text":"number","partOfSpeech":"noun","distractors":["name","address","email","age","city"]}]}
],"vocabulary":[
{"word":"number","partOfSpeech":"noun","example":"What is your phone number?"},
{"word":"phone","partOfSpeech":"noun","example":"Can I have your phone number?"},
{"word":"give","partOfSpeech":"verb","example":"Could you give me your number?"},
{"word":"call","partOfSpeech":"verb","example":"Please call me this evening."},
{"word":"evening","partOfSpeech":"noun","example":"Please call me this evening."},
{"word":"your","partOfSpeech":"pronoun","example":"Is this your new number?"}
]}

VALID_POS = {"verb","noun","pronoun","adjective","adverb","modifier","preposition","syntax","determiner","existential","article","to-be","conjunction","modal","phrasal_particle","other"}

issues = []

# intro count
intro_count = 3  # how, how, tip
print("intro count:", intro_count)

# phrases count
print("phrases count:", len(draft["phrases"]))

# vocab count
print("vocab count:", len(draft["vocabulary"]))

import re
def tokens(s):
    return re.findall(r"[A-Za-z']+", s.lower())

for p in draft["phrases"]:
    pid = p["id"]
    eng = p["english"]
    toks = tokens(eng)
    words = p["words"]
    print(f"\n{pid}: '{eng}'  english_tokens={toks}")
    print(f"  word count: {len(words)}")
    for w in words:
        t = w["text"]
        pos = w["partOfSpeech"]
        ds = w["distractors"]
        # POS valid
        if pos not in VALID_POS:
            print(f"    !! INVALID POS '{pos}' for '{t}'")
        # distractor count
        if len(ds) != 5:
            print(f"    !! '{t}' has {len(ds)} distractors")
        # space in text
        if " " in t:
            print(f"    !! '{t}' has space")
        # word in phrase
        if t.lower() not in toks:
            print(f"    !! word '{t}' NOT in phrase tokens {toks}")
