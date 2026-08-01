import codecs

with codecs.open('app/daily_tasks.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 1912 is index 1911 (0-indexed)
old_line = lines[1911]
print('OLD:', repr(old_line))

# Replace single quotes with double quotes for descTr
if "descTr:'" in old_line:
    new_line = old_line.replace("descTr:'", 'descTr:"').replace("',", '",')
    lines[1911] = new_line
    print('NEW:', repr(new_line))
    
    with codecs.open('app/daily_tasks.ts', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print('Fixed!')
else:
    print('Pattern not found')
