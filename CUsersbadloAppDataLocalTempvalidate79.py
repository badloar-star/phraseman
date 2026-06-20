import json

VALID_POS = {"verb","noun","pronoun","adjective","adverb","modifier","preposition","syntax","determiner","existential","article","to-be","conjunction","modal","phrasal_particle","other"}

draft = r'''{"planId":"gavan","dayIndex":79,"level":"A2","topic":{"ru":"Описываем, как готовить","uk":"Описуємо, як готувати","es":"Describir cómo cocinar"},"outcome":{"ru":"x","uk":"x","es":"x"},"prerequisiteLessons":[3,18],"intro":[{"kind":"concept"},{"kind":"explanation"},{"kind":"tip"}],"phrases":[{"id":"gavan_d79_p1","english":"First you cut the vegetables","words":[{"text":"First","partOfSpeech":"adverb","distractors":["Last","Soon","Often","Always","Never"]},{"text":"you","partOfSpeech":"pronoun","distractors":["we","they","he","she","it"]},{"text":"cut","partOfSpeech":"verb","distractors":["cuts","cutting","boil","wash","serve"]},{"text":"the","partOfSpeech":"article","distractors":["a","an","this","some","any"]},{"text":"vegetables","partOfSpeech":"noun","distractors":["vegetable","potatoes","minutes","knives","plates"]}]},{"id":"gavan_d79_p2","english":"Then you boil them in water","words":[{"text":"Then","partOfSpeech":"adverb","distractors":["First","Now","Here","There","Maybe"]},{"text":"you","partOfSpeech":"pronoun","distractors":["we","they","he","she","I"]},{"text":"boil","partOfSpeech":"verb","distractors":["boils","boiling","cut","wash","add"]},{"text":"them","partOfSpeech":"pronoun","distractors":["it","him","her","us","they"]},{"text":"in","partOfSpeech":"preposition","distractors":["on","at","to","of","by"]},{"text":"water","partOfSpeech":"noun","distractors":["waters","salt","rice","soup","milk"]}]},{"id":"gavan_d79_p3","english":"Wash the potatoes before you cook","words":[{"text":"Wash","partOfSpeech":"verb","distractors":["Washes","Washing","Boil","Cut","Serve"]},{"text":"the","partOfSpeech":"article","distractors":["a","an","some","any","this"]},{"text":"potatoes","partOfSpeech":"noun","distractors":["potato","vegetables","minutes","tables","spoons"]},{"text":"before","partOfSpeech":"preposition","distractors":["after","during","until","since","while"]},{"text":"you","partOfSpeech":"pronoun","distractors":["we","they","he","she","it"]},{"text":"cook","partOfSpeech":"verb","distractors":["cooks","cooking","eat","wash","boil"]}]},{"id":"gavan_d79_p4","english":"Add a little salt and pepper","words":[{"text":"Add","partOfSpeech":"verb","distractors":["Adds","Adding","Cut","Wash","Boil"]},{"text":"a","partOfSpeech":"article","distractors":["an","the","some","this","any"]},{"text":"little","partOfSpeech":"adjective","distractors":["much","many","few","big","small"]},{"text":"salt","partOfSpeech":"noun","distractors":["salts","water","rice","sugar","soup"]},{"text":"and","partOfSpeech":"conjunction","distractors":["or","but","so","with","for"]},{"text":"pepper","partOfSpeech":"noun","distractors":["peppers","salt","water","milk","rice"]}]},{"id":"gavan_d79_p5","english":"Cook the rice for ten minutes","words":[{"text":"Cook","partOfSpeech":"verb","distractors":["Cooks","Cooking","Wash","Add","Serve"]},{"text":"the","partOfSpeech":"article","distractors":["a","an","some","this","any"]},{"text":"rice","partOfSpeech":"noun","distractors":["rices","water","salt","soup","bread"]},{"text":"for","partOfSpeech":"preposition","distractors":["in","on","at","to","by"]},{"text":"ten","partOfSpeech":"determiner","distractors":["two","five","many","some","few"]},{"text":"minutes","partOfSpeech":"noun","distractors":["minute","hours","potatoes","plates","spoons"]}]},{"id":"gavan_d79_p6","english":"Finally you serve the warm soup","words":[{"text":"Finally","partOfSpeech":"adverb","distractors":["First","Soon","Often","Never","Always"]},{"text":"you","partOfSpeech":"pronoun","distractors":["we","they","he","she","it"]},{"text":"serve","partOfSpeech":"verb","distractors":["serves","serving","cook","wash","boil"]},{"text":"the","partOfSpeech":"article","distractors":["a","an","some","any","this"]},{"text":"warm","partOfSpeech":"adjective","distractors":["cold","hot","cool","big","small"]},{"text":"soup","partOfSpeech":"noun","distractors":["soups","rice","water","salt","bread"]}]}],"vocabulary":[{"word":"cut","partOfSpeech":"verb","example":"First you cut the vegetables."},{"word":"boil","partOfSpeech":"verb","example":"Then you boil them in water."},{"word":"wash","partOfSpeech":"verb","example":"Wash the potatoes before you cook."},{"word":"salt","partOfSpeech":"noun","example":"Add a little salt and pepper."},{"word":"rice","partOfSpeech":"noun","example":"Cook the rice for ten minutes."},{"word":"soup","partOfSpeech":"noun","example":"Finally you serve the warm soup."}]}'''

d = json.loads(draft)
issues = []

# intro count
print("intro count:", len(d["intro"]))
print("phrases count:", len(d["phrases"]))
print("vocab count:", len(d["vocabulary"]))
print()

for p in d["phrases"]:
    pid = p["id"]
    eng = p["english"]
    words = p["words"]
    # POS valid
    for w in words:
        if w["partOfSpeech"] not in VALID_POS:
            issues.append(f"{pid}: POS invalid '{w['partOfSpeech']}' for '{w['text']}'")
        if " " in w["text"].strip():
            issues.append(f"{pid}: words[].text has space: '{w['text']}'")
        # distractors count
        if len(w["distractors"]) != 5:
            issues.append(f"{pid}: word '{w['text']}' has {len(w['distractors'])} distractors (need 5)")
    # word count vs phrase tokens
    eng_tokens = eng.split()
    word_texts = [w["text"] for w in words]
    print(f"{pid}: phrase tokens={len(eng_tokens)} words[]={len(words)}")
    print(f"   phrase: {eng_tokens}")
    print(f"   words:  {word_texts}")
    # each phrase word in words[]
    word_texts_lower = [w.lower() for w in word_texts]
    for t in eng_tokens:
        if t.lower() not in word_texts_lower:
            issues.append(f"{pid}: phrase token '{t}' NOT in words[]")
    # each words[] in phrase
    for wt in word_texts:
        if wt.lower() not in [t.lower() for t in eng_tokens]:
            issues.append(f"{pid}: words[] entry '{wt}' NOT in phrase")
    print()

# vocab: word must appear in phrases same form
all_phrase_texts = []
for p in d["phrases"]:
    for w in p["words"]:
        all_phrase_texts.append(w["text"])
all_phrase_texts_lower_set = set(t.lower() for t in all_phrase_texts)

print("=== VOCAB CHECK ===")
for v in d["vocabulary"]:
    vw = v["word"]
    inphrase = vw.lower() in all_phrase_texts_lower_set
    print(f"vocab '{vw}' ({v['partOfSpeech']}): in phrase words = {inphrase}")
    if not inphrase:
        issues.append(f"vocab '{vw}' not in any phrase words[] same form")
    if v["partOfSpeech"] not in VALID_POS:
        issues.append(f"vocab '{vw}': POS invalid '{v['partOfSpeech']}'")

print()
print("=== COUNTS ===")
if len(d["intro"]) != 3:
    issues.append(f"intro count={len(d['intro'])} (need 3)")
if len(d["phrases"]) != 6:
    issues.append(f"phrases count={len(d['phrases'])} (need 6)")
if len(d["vocabulary"]) != 6:
    issues.append(f"vocab count={len(d['vocabulary'])} (need 6)")

print()
print("=== ISSUES ===")
if issues:
    for i in issues:
        print("ISSUE:", i)
else:
    print("NONE - clean")
