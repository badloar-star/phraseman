import re
import sys

# Set UTF-8 output
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Читаем файл
with open('app/lesson_data_9_16.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Ищем все поля ukrainian:
pattern = r"ukrainian:\s*'([^']+)'"
matches = re.findall(pattern, content)

print(f"Total ukrainian fields: {len(matches)}")

# Признаки русского
errors = []
for i, text in enumerate(matches, 1):
    # Проверка букв ы, э, ъ
    if 'ы' in text or 'э' in text or 'ъ' in text:
        errors.append((i, text, "Cyrillic y/e/hard-sign"))
    
    # Типичные русские слова
    russian_words = ['нет', 'все', 'это', 'очень', 'только', 'также', 'сейчас', 
                     'хорошо', 'можно', 'нельзя']
    
    for word in russian_words:
        if re.search(rf'\b{word}\b', text, re.IGNORECASE):
            errors.append((i, text, f"Russian word '{word}'"))
            break

if errors:
    print(f"\nErrors found: {len(errors)}")
    for line_num, text, reason in errors[:50]:
        text_preview = text[:70] if len(text) > 70 else text
        print(f"LINE {line_num}: {text_preview} - {reason}")
else:
    print("\nNo errors found!")

print(f"\nTotal errors: {len(errors)} out of {len(matches)} ukrainian fields")

