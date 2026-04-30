import re
import sys

if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('app/lesson_data_9_16.ts', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"ukrainian:\s*'([^']+)'"
matches = re.findall(pattern, content)

print(f"Total ukrainian fields: {len(matches)}\n")

# Ищем более специфичные русские слова и окончания
errors = []

# Российские глаголы и их формы
russian_verbs = ['находится', 'является', 'стоит', 'сидит', 'лежит', 'висит', 'ходит', 
                 'живет', 'работает', 'учится', 'любит', 'знает', 'понимает', 'помнит',
                 'хочет', 'может', 'должен', 'нужно', 'надо']

# Русские наречия и союзы
russian_adverbs = ['здесь', 'там', 'где', 'когда', 'почему', 'зачем', 'как', 'потом',
                   'сейчас', 'вчера', 'завтра', 'никогда', 'всегда', 'иногда',
                   'очень', 'совсем', 'совсем не', 'совершенно']

# Русские предлоги
russian_preps = ['без', 'до', 'для', 'из', 'из-за', 'из-под', 'кроме', 'между', 
                 'около', 'перед', 'по', 'при', 'после', 'среди', 'у', 'через']

# Русские окончания прилагательных (-ый, -ий)
for i, text in enumerate(matches, 1):
    # Проверка окончаний -ый, -ий (русские)
    if re.search(r'\b\w+(ый|ий|ой)\s+([\w\d]+|$)', text):
        # Но в украинском тоже могут быть похожие, проверим точнее
        # Украинские окончания: -ий, -ый, -ій (для м.р.), -а, -е, -я (для ж.р.), -е, -о (для с.р.), -і, -е (для м.р. мн.)
        # Нужна контекстуальная проверка
        pass
    
    # Проверка буквы 'ш' в окончании -ши (русские деепричастия)
    if re.search(r'\b\w+ши\b', text):
        errors.append((i, text, "Possible Russian participle ending -shi"))

# Ищем явные русские конструкции вроде "я хочу" (русские глаголы в 1 лице)
for i, text in enumerate(matches, 1):
    if re.search(r'\bпотом\b', text, re.IGNORECASE):
        errors.append((i, text, "Russian word 'potom' (then)"))
    
    if re.search(r'\bсовсем\b', text, re.IGNORECASE):
        errors.append((i, text, "Russian word 'sovsem' (completely)"))

if errors:
    print(f"Possible issues found: {len(errors)}")
    for line_num, text, reason in errors:
        text_preview = text[:70] if len(text) > 70 else text
        print(f"LINE {line_num}: {text_preview} - {reason}")
else:
    print("No typical Russian words or constructions found!")

# Дополнительная проверка: показываем примеры текстов по категориям
print("\n--- Sample texts from different parts ---")
print(f"First field: {matches[0]}")
print(f"Middle field (#{len(matches)//2}): {matches[len(matches)//2]}")
print(f"Last field: {matches[-1]}")

