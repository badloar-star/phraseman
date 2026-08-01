import re
fpath = r'C:/appsprojects/phraseman/admin/v2/scripts/admin-core.js'
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

fn = """function renderEnglishTestAnalytics() {
  if (typeof globalThis.loadEnglishTestAnalytics === 'function') {
    globalThis.loadEnglishTestAnalytics();
    return '';
  }
  return '<div class="notice">Загрузка аналитики...</div>';
}

"""

content = content.replace('function renderAnalytics() {', fn + 'function renderAnalytics() {', 1)

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
