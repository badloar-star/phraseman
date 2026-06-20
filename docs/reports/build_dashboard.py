# -*- coding: utf-8 -*-
import json

b = json.load(open(r'C:\appsprojects\phraseman\docs\reports\audit_chart_bundle.json', encoding='utf-8'))
data_js = json.dumps(b, ensure_ascii=False)

sev_color = {'critical': '#A32D2D', 'high': '#D85A30', 'medium': '#EF9F27', 'low': '#639922'}
sev_ru = {'critical': 'критич.', 'high': 'высок.', 'medium': 'средн.', 'low': 'низк.'}


def sev_badge(s):
    return '<span class="sev" style="background:%s1f;color:%s">%s</span>' % (sev_color[s], sev_color[s], sev_ru[s])


ux_rows = ""
for p in b['topUx']:
    ux_rows += ('<div class="card"><div class="card-h"><span class="rank">%s</span>'
                '<span class="card-t">%s</span>%s</div><p class="why">%s</p>'
                '<p class="fix"><i class="ti ti-tool"></i> %s</p></div>') % (
        p['rank'], p['title'], sev_badge(p['severity']), p['why'], p['fix'])

mon_rows = ""
for p in b['topMon']:
    mon_rows += ('<div class="card"><div class="card-h"><span class="rank">%s</span>'
                 '<span class="card-t">%s</span>%s</div><p class="why">%s</p>'
                 '<p class="fix"><i class="ti ti-tool"></i> %s</p>'
                 '<p class="lift"><i class="ti ti-trending-up"></i> %s</p></div>') % (
        p['rank'], p['title'], sev_badge(p['severity']), p['why'], p['fix'], p.get('expectedLift', ''))

eff_ru = {'low': 'низкие', 'medium': 'средние', 'high': 'высокие'}
imp_ru = {'low': 'низкий', 'medium': 'средний', 'high': 'высокий'}
imp_c = {'high': '#1D9E75', 'medium': '#EF9F27', 'low': '#888780'}
lever_rows = ""
for l in sorted(b['levers'], key=lambda x: ({'high': 0, 'medium': 1, 'low': 2}[x['impact']],
                                            {'low': 0, 'medium': 1, 'high': 2}[x['effort']])):
    lever_rows += ('<tr><td>%s</td><td><span class="pill" style="background:%s1f;color:%s">%s</span></td>'
                   '<td>%s</td><td class="muted">%s</td></tr>') % (
        l['lever'], imp_c[l['impact']], imp_c[l['impact']], imp_ru[l['impact']],
        eff_ru[l['effort']], l['detail'])

worst_rows = ""
for w in b['worst']:
    worst_rows += ('<tr><td>%s</td><td><span class="cat-tag">%s</span></td>'
                   '<td class="num" style="color:#A32D2D">%s</td>'
                   '<td class="num" style="color:#A32D2D">%s</td>'
                   '<td class="muted">%s</td></tr>') % (
        w['name'], w['cat'], w['ux'], w['mon'], w['friction'])

ov = b['overall']

tpl = open(r'C:\appsprojects\phraseman\docs\reports\dashboard_template.html', encoding='utf-8').read()
html = (tpl
        .replace('__DATA__', data_js)
        .replace('__UXROWS__', ux_rows)
        .replace('__MONROWS__', mon_rows)
        .replace('__LEVERROWS__', lever_rows)
        .replace('__WORSTROWS__', worst_rows)
        .replace('__TOTUX__', str(ov['totUx']))
        .replace('__TOTMON__', str(ov['totMon']))
        .replace('__UXSIT__', str(ov['uxSit']))
        .replace('__MONSIT__', str(ov['monSit']))
        .replace('__SAT__', str(ov['sat']))
        .replace('__WTP__', str(ov['wtp']))
        .replace('__CHURN__', str(ov['churn']))
        .replace('__NMON__', str(len(b['topMon'])))
        .replace('__NUX__', str(len(b['topUx']))))

open(r'C:\appsprojects\phraseman\docs\reports\audit_dashboard.html', 'w', encoding='utf-8').write(html)
print('HTML written', len(html))
