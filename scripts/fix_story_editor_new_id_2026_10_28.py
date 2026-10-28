# ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# fix_story_editor_new_id_2026_10_28.py — каждая публикация в редакторе историй админки = новая история рядом с прежними.
#
# README
# ЧТО ЧИНИТ. Владелец 28.10: «новая история ЗАМЕНЯЕТ предыдущую». Редактор историй встроен в admin/v2/legacy.html (base64 в
#   frame.srcdoc). В cloudCommand после успешной публикации currentId оставался равен id опубликованной истории, и следующая
#   «Опубликовать» без «+ Новая» уходила с тем же id — сервер (applyStoryCommand) ставил новый текст на место живой истории.
# ЧТО МЕНЯЕТ (5 замен внутри редактора, остальной файл байт-в-байт прежний):
#   1) заводит editingId — какую опубликованную историю человек ЯВНО открыл на правку из списка;
#   2) «+ Новая» сбрасывает и editingId;
#   3) «Опубликовать»: если текущий id уже опубликован и не открыт явно на правку — берётся новый id (история встаёт рядом);
#   4) после успешной публикации редактор начинает новую историю (currentId=null), текст остаётся как заготовка;
#   5) «изменить» в списке ставит editingId — только так обновляется уже опубликованная история.
#   Черновик публикуется под своим id (черновик не «опубликован», правило 3 его не трогает).
# КАК ЗАПУСКАТЬ (из корня репозитория):
#   python -I scripts/fix_story_editor_new_id_2026_10_28.py admin/v2/legacy.html --dry   # проверка: все 5 мест найдены по разу
#   python -I scripts/fix_story_editor_new_id_2026_10_28.py admin/v2/legacy.html         # применить
#   Повторный запуск после применения падает с «pattern count 0» — так и задумано (второй раз не применится).
# ПРОВЕРКА ПОСЛЕ: открыть «Истории» в админке, опубликовать две истории подряд без «+ Новая» — в списке обе живые;
#   «изменить» опубликованную → «Опубликовать» обновляет именно её. На сервере (после деплоя functions) строка
#   [STORY-POST] command покажет replacesLiveSameId=false для новой истории и true — только для явной правки.
# Автор: сессия «8 · Моменты», 28.10. Применяет хозяин admin/v2/legacy.html.
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import base64
import re
import sys

if len(sys.argv) < 2:
    sys.exit('usage: python -I scripts/fix_story_editor_new_id_2026_10_28.py <admin/v2/legacy.html> [--dry]')
path = sys.argv[1]
dry = '--dry' in sys.argv[2:]
text = open(path, 'rb').read().decode('utf-8')
m = re.search(r"(frame\.srcdoc=new TextDecoder\(\)\.decode\(Uint8Array\.from\(atob\(')([A-Za-z0-9+/=]+)('\))", text)
if not m:
    sys.exit('editor base64 not found (frame.srcdoc=…atob(…))')
html = base64.b64decode(m.group(2)).decode('utf-8')

REPLACEMENTS = [
    ("currentId=null,saved=[];", "currentId=null,editingId=null,saved=[];"),
    ("$('new').onclick=()=>{currentId=null;$('title').value='';",
     "$('new').onclick=()=>{currentId=null;editingId=null;$('title').value='';"),
    ("const id=idOverride||currentId||s.id;if(action!=='stop')currentId=id;",
     "let id=idOverride||currentId||s.id;if(action==='publish'&&!idOverride&&editingId!==id&&saved.find(x=>x.id===id)?.status==='published')id=crypto.randomUUID();if(action!=='stop')currentId=id;"),
    ("await refreshCloud();pendingCommand=null;if($('dialog').open)$('dialog').close();",
     "await refreshCloud();pendingCommand=null;if(action==='publish'){currentId=null;editingId=null;}if($('dialog').open)$('dialog').close();"),
    ("const row=saved.find(x=>x.id===el.dataset.edit);if(!row)return;currentId=row.id;",
     "const row=saved.find(x=>x.id===el.dataset.edit);if(!row)return;currentId=row.id;editingId=row.id;"),
]
for old, new in REPLACEMENTS:
    count = html.count(old)
    if count != 1:
        sys.exit(f'pattern count {count} (need 1): {old[:90]}')
    html = html.replace(old, new)

encoded = base64.b64encode(html.encode('utf-8')).decode('ascii')
patched = text[:m.start(2)] + encoded + text[m.end(2):]
if dry:
    print(f'dry ok: all {len(REPLACEMENTS)} patterns found once; editor base64 {len(m.group(2))} -> {len(encoded)} chars')
else:
    open(path, 'wb').write(patched.encode('utf-8'))
    print(f'patched {path}: {len(REPLACEMENTS)} replacements inside the story editor')
