import sys
sys.stdout.reconfigure(encoding='utf-8')

path = 'C:/appsprojects/phraseman/app/lesson_data_all.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = 0

def rep(old, new):
    global content, replacements
    if old not in content:
        print(f'NOT FOUND: {repr(old[:100])}')
        return
    content = content.replace(old, new, 1)
    replacements += 1

# ===== L1_RU fixes =====
rep(
    "  { russian: 'Кто он?', english: 'Who is he', level: 'A2' },",
    "  { russian: 'Он гражданский инженер.', english: 'He is a civil engineer', level: 'A2' },"
)
rep(
    "  { russian: 'Что это?', english: 'What is this', level: 'A2' },",
    "  { russian: 'Это важное совещание.', english: 'It is an important meeting', level: 'A2' },"
)
rep(
    "  { russian: 'Где она?', english: 'Where is she', level: 'A2' },",
    "  { russian: 'Она хирург.', english: 'She is a surgeon', level: 'A2' },"
)
rep(
    "  { russian: 'Как они?', english: 'How are they', level: 'A2' },",
    "  { russian: 'Они наши новые клиенты.', english: 'They are our new clients', level: 'A2' },"
)
rep(
    "  { russian: '\u042f \u043d\u0435 \u0432\u0430\u0448 \u043c\u0435\u043d\u0435\u0434\u0436\u0435\u0440.', english: 'I am not your manager', level: 'A2' },\n];\n\nconst L1_UK",
    "  { russian: '\u042f \u0441\u0442\u0430\u0440\u0448\u0438\u0439 \u0430\u043d\u0430\u043b\u0438\u0442\u0438\u043a.', english: 'I am a senior analyst', level: 'A2' },\n];\n\nconst L1_UK"
)

# ===== L1_UK fixes =====
rep(
    "  { russian: '\u0425\u0442\u043e \u0432\u0456\u043d?', english: 'Who is he', level: 'A2' },",
    "  { russian: '\u0412\u0456\u043d \u0446\u0438\u0432\u0456\u043b\u044c\u043d\u0438\u0439 \u0456\u043d\u0436\u0435\u043d\u0435\u0440.', english: 'He is a civil engineer', level: 'A2' },"
)
rep(
    "  { russian: '\u0429\u043e \u0446\u0435?', english: 'What is this', level: 'A2' },",
    "  { russian: '\u0426\u0435 \u0432\u0430\u0436\u043b\u0438\u0432\u0430 \u043d\u0430\u0440\u0430\u0434\u0430.', english: 'It is an important meeting', level: 'A2' },"
)
rep(
    "  { russian: '\u0414\u0435 \u0432\u043e\u043d\u0430?', english: 'Where is she', level: 'A2' },",
    "  { russian: '\u0412\u043e\u043d\u0430 \u0445\u0456\u0440\u0443\u0440\u0433.', english: 'She is a surgeon', level: 'A2' },"
)
rep(
    "  { russian: '\u042f\u043a \u0432\u043e\u043d\u0438?', english: 'How are they', level: 'A2' },",
    "  { russian: '\u0412\u043e\u043d\u0438 \u043d\u0430\u0448\u0456 \u043d\u043e\u0432\u0456 \u043a\u043b\u0456\u0454\u043d\u0442\u0438.', english: 'They are our new clients', level: 'A2' },"
)
rep(
    "  { russian: '\u042f \u043d\u0435 \u0432\u0430\u0448 \u043c\u0435\u043d\u0435\u0434\u0436\u0435\u0440.', english: 'I am not your manager', level: 'A2' },\n];\n\nconst L2_RU",
    "  { russian: '\u042f \u0441\u0442\u0430\u0440\u0448\u0438\u0439 \u0430\u043d\u0430\u043b\u0456\u0442\u0438\u043a.', english: 'I am a senior analyst', level: 'A2' },\n];\n\nconst L2_RU"
)

# ===== L12 fixes =====
rep(
    "  { russian: '\u042f \u0441\u043b\u044b\u0448\u0430\u043b \u043e\u0431 \u044d\u0442\u043e\u0439 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0438 \u0440\u0430\u043d\u044c\u0448\u0435.', english: 'I had heard about this company before', level: 'B1' },",
    "  { russian: '\u042f \u0441\u043b\u044b\u0448\u0430\u043b \u043e\u0431 \u044d\u0442\u043e\u0439 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0438 \u0440\u0430\u043d\u044c\u0448\u0435.', english: 'I heard about this company before', level: 'B1' },"
)
rep(
    "  { russian: '\u041e\u043d\u0438 \u043f\u0440\u043e\u0432\u0435\u043b\u0438 \u0430\u0443\u0434\u0438\u0442.', english: 'They carried out an audit', level: 'B2' },\n  { russian: '\u042f \u0434\u0435\u0440\u0436\u0430\u043b \u0441\u043b\u043e\u0432\u043e",
    "  { russian: '\u041e\u043d\u0438 \u043f\u0440\u043e\u0432\u0435\u043b\u0438 \u0430\u0443\u0434\u0438\u0442.', english: 'They held an audit', level: 'B2' },\n  { russian: '\u042f \u0434\u0435\u0440\u0436\u0430\u043b \u0441\u043b\u043e\u0432\u043e"
)
rep(
    "  { russian: '\u042f \u0447\u0443\u0432 \u043f\u0440\u043e \u0446\u044e \u043a\u043e\u043c\u043f\u0430\u043d\u0456\u044e \u0440\u0430\u043d\u0456\u0448\u0435.', english: 'I had heard about this company before', level: 'B1' },",
    "  { russian: '\u042f \u0447\u0443\u0432 \u043f\u0440\u043e \u0446\u044e \u043a\u043e\u043c\u043f\u0430\u043d\u0456\u044e \u0440\u0430\u043d\u0456\u0448\u0435.', english: 'I heard about this company before', level: 'B1' },"
)
rep(
    "  { russian: '\u0412\u043e\u043d\u0438 \u043f\u0440\u043e\u0432\u0435\u043b\u0438 \u0430\u0443\u0434\u0438\u0442.', english: 'They carried out an audit', level: 'B2' },",
    "  { russian: '\u0412\u043e\u043d\u0438 \u043f\u0440\u043e\u0432\u0435\u043b\u0438 \u0430\u0443\u0434\u0438\u0442.', english: 'They held an audit', level: 'B2' },"
)

# ===== L15_RU fixes (21 phrases) =====
rep(
    "  { russian: '\u042d\u0442\u043e \u043c\u043e\u044f \u043a\u043d\u0438\u0433\u0430.', english: 'This is my book', level: 'A2' },",
    "  { russian: '\u042d\u0442\u0430 \u043a\u043d\u0438\u0433\u0430 \u043c\u043e\u044f.', english: 'This book is mine', level: 'A2' },"
)
rep(
    "  { russian: '\u0423\u0441\u043f\u0435\u0445 \u043f\u0440\u0438\u043d\u0430\u0434\u043b\u0435\u0436\u0438\u0442 \u0432\u0441\u0435\u0439 \u043a\u043e\u043c\u0430\u043d\u0434\u0435.', english: 'The success belongs to our team', level: 'B1' },",
    "  { russian: '\u042d\u0442\u043e\u0442 \u0443\u0441\u043f\u0435\u0445 \u043d\u0430\u0448.', english: 'This success is ours', level: 'B1' },"
)
rep(
    "  { russian: '\u042d\u0442\u043e \u043c\u043e\u0439 \u043f\u0440\u043e\u0435\u043a\u0442.', english: 'This is my project', level: 'A2' },",
    "  { russian: '\u042d\u0442\u043e\u0442 \u043f\u0440\u043e\u0435\u043a\u0442 \u043c\u043e\u0439.', english: 'This project is mine', level: 'A2' },"
)
rep(
    "  { russian: '\u042d\u0442\u043e \u043d\u0430\u0448 \u043a\u043b\u0438\u0435\u043d\u0442.', english: 'This is our client', level: 'A2' },",
    "  { russian: '\u042d\u0442\u043e\u0442 \u043a\u043b\u0438\u0435\u043d\u0442 \u043d\u0430\u0448.', english: 'This client is ours', level: 'A2' },"
)
rep(
    "  { russian: '\u042d\u0442\u043e \u0435\u0451 \u043e\u0442\u0434\u0435\u043b.', english: 'This is her department', level: 'A2' },",
    "  { russian: '\u042d\u0442\u043e\u0442 \u043e\u0442\u0434\u0435\u043b \u0435\u0451.', english: 'This department is hers', level: 'A2' },"
)
rep(
    "  { russian: '\u042d\u0442\u043e \u0438\u0445 \u043e\u0444\u0438\u0441.', english: 'This is their office', level: 'A2' },",
    "  { russian: '\u042d\u0442\u043e\u0442 \u043e\u0444\u0438\u0441 \u0438\u0445.', english: 'This office is theirs', level: 'A2' },"
)
rep(
    "  { russian: '\u042d\u0442\u043e \u043d\u0430\u0448 \u0434\u043e\u0433\u043e\u0432\u043e\u0440.', english: 'This is our agreement', level: 'A2' },",
    "  { russian: '\u042d\u0442\u043e\u0442 \u0434\u043e\u0433\u043e\u0432\u043e\u0440 \u043d\u0430\u0448.', english: 'This agreement is ours', level: 'A2' },"
)
rep(
    "  { russian: '\u042d\u0442\u043e\u0442 \u043e\u0442\u0447\u0451\u0442 \u2014 \u0435\u0451 \u0440\u0430\u0431\u043e\u0442\u0430.', english: 'This report is her work', level: 'B1' },",
    "  { russian: '\u042d\u0442\u043e\u0442 \u043e\u0442\u0447\u0451\u0442 \u0435\u0451.', english: 'This report is hers', level: 'B1' },"
)
rep(
    "  { russian: '\u042d\u0442\u043e \u0432\u0430\u0448 \u0437\u0430\u043f\u0440\u043e\u0441.', english: 'This is your request', level: 'A2' },",
    "  { russian: '\u042d\u0442\u043e\u0442 \u0437\u0430\u043f\u0440\u043e\u0441 \u0432\u0430\u0448.', english: 'This request is yours', level: 'A2' },"
)
rep(
    "  { russian: '\u041c\u043e\u0439 \u0442\u0435\u043b\u0435\u0444\u043e\u043d \u0440\u0430\u0437\u0440\u044f\u0434\u0438\u043b\u0441\u044f.', english: 'My phone is dead', level: 'A2' },",
    "  { russian: '\u042d\u0442\u043e\u0442 \u0442\u0435\u043b\u0435\u0444\u043e\u043d \u043c\u043e\u0439.', english: 'This phone is mine', level: 'A2' },"
)
rep(
    "  { russian: '\u042d\u0442\u043e \u0435\u0451 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0435\u0435 \u0441\u043b\u043e\u0432\u043e.', english: 'This is her final word', level: 'B1' },",
    "  { russian: '\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0435\u0435 \u0441\u043b\u043e\u0432\u043e \u0435\u0451.', english: 'The final word is hers', level: 'B1' },"
)
rep(
    "  { russian: '\u042d\u0442\u043e\u0442 \u043a\u043e\u043d\u0442\u0440\u0430\u043a\u0442 \u043f\u0440\u0438\u043d\u0430\u0434\u043b\u0435\u0436\u0438\u0442 \u043d\u0430\u043c.', english: 'This contract belongs to us', level: 'B1' },",
    "  { russian: '\u042d\u0442\u043e\u0442 \u043a\u043e\u043d\u0442\u0440\u0430\u043a\u0442 \u043d\u0430\u0448.', english: 'This contract is ours', level: 'B1' },"
)
rep(
    "  { russian: '\u042d\u0442\u043e \u0442\u0432\u043e\u0439 \u0437\u0432\u043e\u043d\u043e\u043a.', english: 'This is your call', level: 'B1' },",
    "  { russian: '\u042d\u0442\u043e\u0442 \u0432\u044b\u0431\u043e\u0440 \u0442\u0432\u043e\u0439.', english: 'This choice is yours', level: 'B1' },"
)
rep(
    "  { russian: '\u042d\u0442\u043e \u0438\u0445 \u0434\u0435\u043b\u043e.', english: 'This is their business', level: 'B1' },",
    "  { russian: '\u042d\u0442\u043e\u0442 \u0431\u0438\u0437\u043d\u0435\u0441 \u0438\u0445.', english: 'This business is theirs', level: 'B1' },"
)
rep(
    "  { russian: '\u041c\u043e\u0439 \u0432\u0430\u0440\u0438\u0430\u043d\u0442 \u043b\u0443\u0447\u0448\u0435.', english: 'My option is better', level: 'A2' },",
    "  { russian: '\u042d\u0442\u043e\u0442 \u0432\u0430\u0440\u0438\u0430\u043d\u0442 \u043c\u043e\u0439.', english: 'This option is mine', level: 'A2' },"
)
rep(
    "  { russian: '\u042d\u0442\u043e \u043d\u0430\u0448\u0430 \u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u0441\u0442\u044c.', english: 'This is our responsibility', level: 'B1' },",
    "  { russian: '\u042d\u0442\u0430 \u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u0441\u0442\u044c \u043d\u0430\u0448\u0430.', english: 'This responsibility is ours', level: 'B1' },"
)
rep(
    "  { russian: '\u042d\u0442\u043e \u0435\u0451 \u0434\u043e\u0441\u0442\u0438\u0436\u0435\u043d\u0438\u0435.', english: 'This is her achievement', level: 'B1' },",
    "  { russian: '\u042d\u0442\u043e \u0434\u043e\u0441\u0442\u0438\u0436\u0435\u043d\u0438\u0435 \u0435\u0451.', english: 'This achievement is hers', level: 'B1' },"
)
rep(
    "  { russian: '\u042d\u0442\u043e \u043c\u043e\u0439 \u043f\u0435\u0440\u0432\u044b\u0439 \u043f\u0440\u043e\u0435\u043a\u0442.', english: 'This is my first project', level: 'A2' },",
    "  { russian: '\u042d\u0442\u043e\u0442 \u043f\u0435\u0440\u0432\u044b\u0439 \u043f\u0440\u043e\u0435\u043a\u0442 \u043c\u043e\u0439.', english: 'This first project is mine', level: 'A2' },"
)
rep(
    "  { russian: '\u042d\u0442\u043e \u043d\u0430\u0448 \u0448\u0430\u043d\u0441.', english: 'This is our chance', level: 'B1' },",
    "  { russian: '\u042d\u0442\u043e\u0442 \u0448\u0430\u043d\u0441 \u043d\u0430\u0448.', english: 'This chance is ours', level: 'B1' },"
)
rep(
    "  { russian: '\u042f \u0434\u0430\u043b \u0435\u043c\u0443 \u0441\u0432\u043e\u0439 \u0441\u043e\u0432\u0435\u0442.', english: 'I gave him my advice', level: 'B1' },",
    "  { russian: '\u042f \u0434\u0430\u043b \u0435\u043c\u0443 \u043c\u043e\u0451.', english: 'I gave him mine', level: 'B1' },"
)
rep(
    "  { russian: '\u042d\u0442\u043e \u0435\u0451 \u043b\u0443\u0447\u0448\u0438\u0439 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442.', english: 'This is her best result', level: 'B1' },",
    "  { russian: '\u042d\u0442\u043e\u0442 \u043b\u0443\u0447\u0448\u0438\u0439 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0435\u0451.', english: 'This best result is hers', level: 'B1' },"
)

# ===== L15_UK fixes (21 phrases) =====
rep(
    "  { russian: '\u0426\u0435 \u043c\u043e\u044f \u043a\u043d\u0438\u0433\u0430.', english: 'This is my book', level: 'A2' },",
    "  { russian: '\u0426\u044f \u043a\u043d\u0438\u0433\u0430 \u043c\u043e\u044f.', english: 'This book is mine', level: 'A2' },"
)
rep(
    "  { russian: '\u0423\u0441\u043f\u0456\u0445 \u043d\u0430\u043b\u0435\u0436\u0438\u0442\u044c \u0432\u0441\u0456\u0439 \u043a\u043e\u043c\u0430\u043d\u0434\u0456.', english: 'The success belongs to our team', level: 'B1' },",
    "  { russian: '\u0426\u0435\u0439 \u0443\u0441\u043f\u0456\u0445 \u043d\u0430\u0448.', english: 'This success is ours', level: 'B1' },"
)
rep(
    "  { russian: '\u0426\u0435 \u043c\u0456\u0439 \u043f\u0440\u043e\u0435\u043a\u0442.', english: 'This is my project', level: 'A2' },",
    "  { russian: '\u0426\u0435\u0439 \u043f\u0440\u043e\u0435\u043a\u0442 \u043c\u0456\u0439.', english: 'This project is mine', level: 'A2' },"
)
rep(
    "  { russian: '\u0426\u0435 \u043d\u0430\u0448 \u043a\u043b\u0456\u0454\u043d\u0442.', english: 'This is our client', level: 'A2' },",
    "  { russian: '\u0426\u0435\u0439 \u043a\u043b\u0456\u0454\u043d\u0442 \u043d\u0430\u0448.', english: 'This client is ours', level: 'A2' },"
)
rep(
    "  { russian: '\u0426\u0435 \u0457\u0457 \u0432\u0456\u0434\u0434\u0456\u043b.', english: 'This is her department', level: 'A2' },",
    "  { russian: '\u0426\u0435\u0439 \u0432\u0456\u0434\u0434\u0456\u043b \u0457\u0457.', english: 'This department is hers', level: 'A2' },"
)
rep(
    "  { russian: '\u0426\u0435 \u0457\u0445\u043d\u0456\u0439 \u043e\u0444\u0456\u0441.', english: 'This is their office', level: 'A2' },",
    "  { russian: '\u0426\u0435\u0439 \u043e\u0444\u0456\u0441 \u0457\u0445\u043d\u0456\u0439.', english: 'This office is theirs', level: 'A2' },"
)
rep(
    "  { russian: '\u0426\u0435 \u043d\u0430\u0448 \u0434\u043e\u0433\u043e\u0432\u0456\u0440.', english: 'This is our agreement', level: 'A2' },",
    "  { russian: '\u0426\u0435\u0439 \u0434\u043e\u0433\u043e\u0432\u0456\u0440 \u043d\u0430\u0448.', english: 'This agreement is ours', level: 'A2' },"
)
rep(
    "  { russian: '\u0426\u0435\u0439 \u0437\u0432\u0456\u0442 \u2014 \u0457\u0457 \u0440\u043e\u0431\u043e\u0442\u0430.', english: 'This report is her work', level: 'B1' },",
    "  { russian: '\u0426\u0435\u0439 \u0437\u0432\u0456\u0442 \u0457\u0457.', english: 'This report is hers', level: 'B1' },"
)
rep(
    "  { russian: '\u0426\u0435 \u0432\u0430\u0448 \u0437\u0430\u043f\u0438\u0442.', english: 'This is your request', level: 'A2' },",
    "  { russian: '\u0426\u0435\u0439 \u0437\u0430\u043f\u0438\u0442 \u0432\u0430\u0448.', english: 'This request is yours', level: 'A2' },"
)
rep(
    "  { russian: '\u041c\u0456\u0439 \u0442\u0435\u043b\u0435\u0444\u043e\u043d \u0440\u043e\u0437\u0440\u044f\u0434\u0438\u0432\u0441\u044f.', english: 'My phone is dead', level: 'A2' },",
    "  { russian: '\u0426\u0435\u0439 \u0442\u0435\u043b\u0435\u0444\u043e\u043d \u043c\u0456\u0439.', english: 'This phone is mine', level: 'A2' },"
)
rep(
    "  { russian: '\u0426\u0435 \u0457\u0457 \u043e\u0441\u0442\u0430\u043d\u043d\u0454 \u0441\u043b\u043e\u0432\u043e.', english: 'This is her final word', level: 'B1' },",
    "  { russian: '\u041e\u0441\u0442\u0430\u043d\u043d\u0454 \u0441\u043b\u043e\u0432\u043e \u0457\u0457.', english: 'The final word is hers', level: 'B1' },"
)
rep(
    "  { russian: '\u0426\u0435\u0439 \u043a\u043e\u043d\u0442\u0440\u0430\u043a\u0442 \u043d\u0430\u043b\u0435\u0436\u0438\u0442\u044c \u043d\u0430\u043c.', english: 'This contract belongs to us', level: 'B1' },",
    "  { russian: '\u0426\u0435\u0439 \u043a\u043e\u043d\u0442\u0440\u0430\u043a\u0442 \u043d\u0430\u0448.', english: 'This contract is ours', level: 'B1' },"
)
rep(
    "  { russian: '\u0426\u0435 \u0442\u0432\u043e\u0454 \u0440\u0456\u0448\u0435\u043d\u043d\u044f.', english: 'This is your call', level: 'B1' },",
    "  { russian: '\u0426\u0435\u0439 \u0432\u0438\u0431\u0456\u0440 \u0442\u0432\u0456\u0439.', english: 'This choice is yours', level: 'B1' },"
)
rep(
    "  { russian: '\u0426\u0435 \u0457\u0445\u043d\u044f \u0441\u043f\u0440\u0430\u0432\u0430.', english: 'This is their business', level: 'B1' },",
    "  { russian: '\u0426\u0435\u0439 \u0431\u0456\u0437\u043d\u0435\u0441 \u0457\u0445\u043d\u0456\u0439.', english: 'This business is theirs', level: 'B1' },"
)
rep(
    "  { russian: '\u041c\u0456\u0439 \u0432\u0430\u0440\u0456\u0430\u043d\u0442 \u043a\u0440\u0430\u0449\u0438\u0439.', english: 'My option is better', level: 'A2' },",
    "  { russian: '\u0426\u0435\u0439 \u0432\u0430\u0440\u0456\u0430\u043d\u0442 \u043c\u0456\u0439.', english: 'This option is mine', level: 'A2' },"
)
rep(
    "  { russian: '\u0426\u0435 \u043d\u0430\u0448\u0430 \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u0430\u043b\u044c\u043d\u0456\u0441\u0442\u044c.', english: 'This is our responsibility', level: 'B1' },",
    "  { russian: '\u0426\u044f \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u0430\u043b\u044c\u043d\u0456\u0441\u0442\u044c \u043d\u0430\u0448\u0430.', english: 'This responsibility is ours', level: 'B1' },"
)
rep(
    "  { russian: '\u0426\u0435 \u0457\u0457 \u0434\u043e\u0441\u044f\u0433\u043d\u0435\u043d\u043d\u044f.', english: 'This is her achievement', level: 'B1' },",
    "  { russian: '\u0426\u0435 \u0434\u043e\u0441\u044f\u0433\u043d\u0435\u043d\u043d\u044f \u0457\u0457.', english: 'This achievement is hers', level: 'B1' },"
)
rep(
    "  { russian: '\u0426\u0435 \u043c\u0456\u0439 \u043f\u0435\u0440\u0448\u0438\u0439 \u043f\u0440\u043e\u0435\u043a\u0442.', english: 'This is my first project', level: 'A2' },",
    "  { russian: '\u0426\u0435\u0439 \u043f\u0435\u0440\u0448\u0438\u0439 \u043f\u0440\u043e\u0454\u043a\u0442 \u043c\u0456\u0439.', english: 'This first project is mine', level: 'A2' },"
)
rep(
    "  { russian: '\u0426\u0435 \u043d\u0430\u0448 \u0448\u0430\u043d\u0441.', english: 'This is our chance', level: 'B1' },",
    "  { russian: '\u0426\u0435\u0439 \u0448\u0430\u043d\u0441 \u043d\u0430\u0448.', english: 'This chance is ours', level: 'B1' },"
)
rep(
    "  { russian: '\u042f \u0434\u0430\u0432 \u0439\u043e\u043c\u0443 \u0441\u0432\u043e\u044e \u043f\u043e\u0440\u0430\u0434\u0443.', english: 'I gave him my advice', level: 'B1' },",
    "  { russian: '\u042f \u0434\u0430\u0432 \u0439\u043e\u043c\u0443 \u043c\u043e\u0454.', english: 'I gave him mine', level: 'B1' },"
)
rep(
    "  { russian: '\u0426\u0435 \u0457\u0457 \u043d\u0430\u0439\u043a\u0440\u0430\u0449\u0438\u0439 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442.', english: 'This is her best result', level: 'B1' },",
    "  { russian: '\u0426\u0435\u0439 \u043d\u0430\u0439\u043a\u0440\u0430\u0449\u0438\u0439 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0457\u0457.', english: 'This best result is hers', level: 'B1' },"
)

# ===== L16 fixes =====
rep(
    "  { russian: '\u041e\u043d \u043f\u043e\u0441\u0442\u0435\u043f\u0435\u043d\u043d\u043e \u043f\u0440\u0438\u0432\u044b\u043a \u043a \u043d\u043e\u0432\u043e\u0439 \u0440\u043e\u043b\u0438.', english: 'He gradually got used to the new role', level: 'C1' },",
    "  { russian: '\u041e\u043d \u043f\u043e\u0434\u043d\u044f\u043b\u0441\u044f \u0434\u043e \u0443\u0440\u043e\u0432\u043d\u044f \u0437\u0430\u0434\u0430\u0447\u0438.', english: 'He stepped up to the challenge', level: 'C1' },"
)
rep(
    "  { russian: '\u0412\u0456\u043d \u043f\u043e\u0441\u0442\u0443\u043f\u043e\u0432\u043e \u0437\u0432\u0438\u043a \u0434\u043e \u043d\u043e\u0432\u043e\u0457 \u0440\u043e\u043b\u0456.', english: 'He gradually got used to the new role', level: 'C1' },",
    "  { russian: '\u0412\u0456\u043d \u043f\u0456\u0434\u043d\u044f\u0432\u0441\u044f \u0434\u043e \u0440\u0456\u0432\u043d\u044f \u0437\u0430\u0432\u0434\u0430\u043d\u043d\u044f.', english: 'He stepped up to the challenge', level: 'C1' },"
)

# ===== L31 fixes =====
rep(
    "  { russian: '\u041a\u043b\u0438\u0435\u043d\u0442 \u0442\u0440\u0435\u0431\u0443\u0435\u0442, \u0447\u0442\u043e\u0431\u044b \u043c\u044b \u0438\u0441\u043f\u0440\u0430\u0432\u0438\u043b\u0438 \u043e\u0448\u0438\u0431\u043a\u0443.', english: 'The client demands us to correct the mistake', level: 'C1' },",
    "  { russian: '\u041a\u043b\u0438\u0435\u043d\u0442 \u043f\u043e\u0442\u0440\u0435\u0431\u043e\u0432\u0430\u043b \u043e\u0442 \u043d\u0430\u0441 \u0438\u0441\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043e\u0448\u0438\u0431\u043a\u0443.', english: 'The client required us to correct the mistake', level: 'C1' },"
)
rep(
    "  { russian: '\u0420\u0443\u043a\u043e\u0432\u043e\u0434\u0441\u0442\u0432\u043e \u0445\u043e\u0447\u0435\u0442 \u0432\u0438\u0434\u0435\u0442\u044c \u0438\u0437\u043c\u0435\u0440\u0438\u043c\u044b\u0435 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b.', english: 'Management wants to see measurable results', level: 'C1' },",
    "  { russian: '\u0420\u0443\u043a\u043e\u0432\u043e\u0434\u0441\u0442\u0432\u043e \u0445\u043e\u0447\u0435\u0442, \u0447\u0442\u043e\u0431\u044b \u043c\u044b \u043f\u043e\u043a\u0430\u0437\u0430\u043b\u0438 \u0438\u0437\u043c\u0435\u0440\u0438\u043c\u044b\u0435 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b.', english: 'Management wants us to show measurable results', level: 'C1' },"
)
rep(
    "  { russian: '\u041a\u043b\u0456\u0454\u043d\u0442 \u0432\u0438\u043c\u0430\u0433\u0430\u0454, \u0449\u043e\u0431 \u043c\u0438 \u0432\u0438\u043f\u0440\u0430\u0432\u0438\u043b\u0438 \u043f\u043e\u043c\u0438\u043b\u043a\u0443.', english: 'The client demands us to correct the mistake', level: 'C1' },",
    "  { russian: '\u041a\u043b\u0456\u0454\u043d\u0442 \u0432\u0438\u043c\u0430\u0433\u0430\u0432 \u0432\u0456\u0434 \u043d\u0430\u0441 \u0432\u0438\u043f\u0440\u0430\u0432\u0438\u0442\u0438 \u043f\u043e\u043c\u0438\u043b\u043a\u0443.', english: 'The client required us to correct the mistake', level: 'C1' },"
)
rep(
    "  { russian: '\u041a\u0435\u0440\u0456\u0432\u043d\u0438\u0446\u0442\u0432\u043e \u0445\u043e\u0447\u0435 \u0431\u0430\u0447\u0438\u0442\u0438 \u0432\u0438\u043c\u0456\u0440\u044e\u0432\u0430\u043d\u0456 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u0438.', english: 'Management wants to see measurable results', level: 'C1' },",
    "  { russian: '\u041a\u0435\u0440\u0456\u0432\u043d\u0438\u0446\u0442\u0432\u043e \u0445\u043e\u0447\u0435, \u0449\u043e\u0431 \u043c\u0438 \u043f\u043e\u043a\u0430\u0437\u0430\u043b\u0438 \u0432\u0438\u043c\u0456\u0440\u044e\u0432\u0430\u043d\u0456 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u0438.', english: 'Management wants us to show measurable results', level: 'C1' },"
)

print(f'Total replacements: {replacements}')
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('File written successfully')
