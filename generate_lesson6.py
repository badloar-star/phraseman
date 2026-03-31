#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re
import sys

with open('C:/appsprojects/phraseman/lesson6_data.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

phrases = {}
i = 0
while i < len(lines):
    line = lines[i].rstrip('\n')
    stripped = line.strip()

    match = re.match(r'^(\d+)\.\s+(.+?)\s+/\s+(.+)$', stripped)
    if match:
        if i + 1 < len(lines) and lines[i+1].strip().startswith('EN:'):
            phrase_id = int(match.group(1))
            ru = match.group(2).strip()
            uk = match.group(3).strip()
            en = lines[i+1].strip()[4:].strip()

            words = []
            j = i + 2
            while j < len(lines):
                wline = lines[j].rstrip('\n').strip()
                if (re.match(r'^(\d+)\.\s+.+?\s+/\s+', wline) or 'Словарь' in wline):
                    break

                wmatch = re.match(r'^(\d+)\.\s+(.+)$', wline)
                if wmatch:
                    word_text = wmatch.group(2).strip()
                    correct = None
                    distractors = []

                    # Look ahead for correct answer and distractors on next non-empty lines
                    k = j + 1
                    found_correct = False
                    found_distractors = False

                    while k < min(j + 15, len(lines)) and not (found_correct and found_distractors):
                        kline = lines[k].strip()
                        if kline.startswith('Правильное:'):
                            correct = kline[len('Правильное:'):].strip()
                            found_correct = True
                        elif kline.startswith('Дистракторы:'):
                            dist_str = kline[len('Дистракторы:'):].strip()
                            distractors = [d.strip() for d in dist_str.split(',')]
                            found_distractors = True
                        elif kline.startswith('Правильное') is False and kline.startswith('Дистракторы') is False and kline != '' and re.match(r'^\d+\.', kline):
                            # Hit the next word, stop looking
                            break
                        k += 1

                    if correct:
                        words.append({'text': word_text, 'correct': correct, 'distractors': distractors})
                    j += 1
                else:
                    j += 1

            phrases[phrase_id] = {'russian': ru, 'ukrainian': uk, 'english': en, 'words': words}
    i += 1

vocab = {}
for line in lines:
    stripped = line.strip()
    if ' — ' in stripped and ' / ' in stripped and 'Словарь' not in stripped:
        parts = stripped.split(' — ')
        if len(parts) == 2:
            en_word = parts[0].strip()
            trans_part = re.sub(r'\d+\.\s+.*$', '', parts[1]).strip()
            trans_parts = trans_part.split(' / ')
            if len(trans_parts) == 2:
                vocab[en_word] = {'russian': trans_parts[0].strip(), 'ukrainian': trans_parts[1].strip()}

irregular_verbs = {}
seen_verbs = set()
for line in lines:
    stripped = line.strip()
    if ' (' in stripped and ') — ' in stripped and ' / ' in stripped:
        cleaned = re.sub(r'^(.+?\s/\s[^/]+).*$', r'\1', stripped)
        match = re.match(r'^(\w+)\s+\(([^,]+),\s+([^)]+)\)\s+—\s+(.+?)\s+/\s+(.+)$', cleaned)
        if match and match.group(1) not in seen_verbs:
            seen_verbs.add(match.group(1))
            irregular_verbs[match.group(1)] = {
                'past': match.group(2).strip(),
                'participle': match.group(3).strip(),
                'russian': match.group(4).strip(),
                'ukrainian': match.group(5).strip()
            }

with open('C:/appsprojects/phraseman/LESSON_6_OUTPUT.ts', 'w', encoding='utf-8') as f:
    f.write("// ==================== LESSON 6 ====================\n")
    f.write("// Lesson 6: Специальные вопросы (Special Questions)\n\n")
    f.write("const LESSON_6_INTRO_SCREENS: LessonIntroScreen[] = [\n")
    f.write("  {\n")
    f.write("    textRU: 'Пришла пора настоящего интерактива! Забудь о монологах. В реальной жизни люди задают вопросы и ждут ответов. Именно этому ты научишься в этом уроке!',\n")
    f.write("    textUK: 'Прийшла пора справжнього інтерактиву! Забудь про монологи. У реальному житті люди задають питання й чекають відповідей. Саме цьому ти навчишся у цьому уроці!',\n")
    f.write("  },\n")
    f.write("  {\n")
    f.write("    textRU: 'Сегодня: специальные вопросы (WHERE, WHEN, WHAT, WHY, HOW). Просто: подставляй нужное слово в начало фразы, и готово!',\n")
    f.write("    textUK: 'Сьогодні: спеціальні питання (WHERE, WHEN, WHAT, WHY, HOW). Просто: підстав потрібне слово на початок фрази й готово!',\n")
    f.write("  },\n")
    f.write("];\n\n")

    f.write("// Lesson 6 Vocabulary\n")
    f.write("export const LESSON_6_VOCABULARY = [\n")
    for word in sorted(vocab.keys()):
        v = vocab[word]
        f.write("  " + "{ english: '" + word + "', russian: '" + v['russian'] + "', ukrainian: '" + v['ukrainian'] + "' }},\n")
    f.write("];\n\n")

    f.write("// Lesson 6 Irregular Verbs\n")
    f.write("export const LESSON_6_IRREGULAR_VERBS = [\n")
    for verb in sorted(irregular_verbs.keys()):
        v = irregular_verbs[verb]
        f.write("  " + "{ verb: '" + verb + "', past: '" + v['past'] + "', participle: '" + v['participle'] + "', russian: '" + v['russian'] + "', ukrainian: '" + v['ukrainian'] + "' }},\n")
    f.write("];\n\n")

    f.write("// Lesson 6 Phrases (" + str(len(phrases)) + " phrases from raw data)\n")
    f.write("const LESSON_6_PHRASES: LessonPhrase[] = [\n")
    for phrase_id in sorted(phrases.keys()):
        p = phrases[phrase_id]
        f.write("  // Phrase " + str(phrase_id) + "\n")
        f.write("  {\n")
        f.write("    id: 'lesson6_phrase_" + str(phrase_id) + "',\n")
        f.write("    english: '" + p['english'] + "',\n")
        f.write("    russian: '" + p['russian'] + "',\n")
        f.write("    ukrainian: '" + p['ukrainian'] + "',\n")
        f.write("    words: [\n")
        for word in p['words']:
            f.write("      {\n")
            f.write("        text: '" + word['text'] + "',\n")
            f.write("        correct: '" + word['correct'] + "',\n")
            dist_list = ', '.join("'" + d + "'" for d in word['distractors'])
            f.write("        distractors: [" + dist_list + "],\n")
            f.write("      },\n")
        f.write("    ],\n")
        f.write("  },\n")
    f.write("];\n")

print("Generated LESSON_6_OUTPUT.ts")
print("Phrases: {}".format(len(phrases)))
print("Vocabulary: {}".format(len(vocab)))
print("Irregular verbs: {}".format(len(irregular_verbs)))
