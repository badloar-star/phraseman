import re

with open('app/lesson_data_9_16.ts', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"ukrainian:\s*'([^']+)'"
matches = re.findall(pattern, content)

# Ищем окончания -ой (русское)
russian_oy = []
for i, text in enumerate(matches, 1):
    if re.search(r'\b\w+ой\b', text):
        russian_oy.append((i, text))

print(f"Total ukrainian fields checked: {len(matches)}")
print(f"Fields with -oy ending (Russian style): {len(russian_oy)}")

if russian_oy:
    print("\nPossible Russian words with -oy ending:")
    for line, text in russian_oy[:10]:
        print(f"LINE {line}: {text}")

