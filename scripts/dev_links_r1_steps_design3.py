# Ссылки и шаги, которых не хватало строкам Дизайна/Настроек (Дизайн 12.10, вечер). Подключается из scripts/dev_links_r1_generate.py.
#
# зачем: profile-015 «форма поддержки · отправлено» получала ссылку с support=fail и пометкой «снять: support=ok» — кадр выходил «не отправилось»,
# а не «Обращение отправлено». Подмена support=sent уже есть (settings-gap-023): ответ отправки подменяется, в облако ничего не уходит.
from dev_links_r1_steps import add

add('profile-015', ['tap:#support-report-input', 'type:Test', 'back', 'tap:#support-report-submit', 'wait:800'], 'plus=off&support=sent', '/support_report',
    unique=False, note='форма поддержки: «Обращение отправлено» без отправки (support=sent); тот же экран, что settings-gap-023')

