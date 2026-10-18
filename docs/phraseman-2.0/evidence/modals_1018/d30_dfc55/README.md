# d30 после dfc55ea88 (СВЕРКА, 18.10 02:52) — 🔴 клетки календаря по-прежнему высотой 0
Холодный старт → dev_state moments=v3, тёмная тема (appearance=dark), es-интерфейс → /dev_moments_preview?state=streak&d=30. Кадры t4/t8/t14, полный журнал d30_full.txt. Тема кадра: ТЁМНАЯ (тёмно-синий градиент, isLight=false).
## [D30-CAL]
- row:layout {sinceMountMs:176, w:347, h:235, reduceMotion:false} — строка выложена на 347×235.
- cell:layout i=0 {sinceMountMs:176, w:42, **h:0, heightZero:true**, plannedEnterStartMs:0, durMs:300, style:{width:"12.2%", aspectRatio:1}}
- cell:layout i=29 {sinceMountMs:181, w:42, **h:0, heightZero:true**, plannedEnterStartMs:754, durMs:300, style: те же}
- enter:end i=0 {sinceMountMs:564, plannedEndMs:350, box:{x:32,y:432,w:42,**h:0**}, scaleZero:true}; enter:end i=29 {sinceMountMs:1294, plannedEndMs:1104, box:{x:81,y:456,w:42,**h:0**}, scaleZero:true}. Строк enter:start в журнале нет (ни у 0, ни у 29) — запуск входа клетки не логируется; конец опаздывает на 214 мс (i=0) и 190 мс (i=29) относительно плана.
- Причина видна по style: width 12,2 % (=42) при aspectRatio 1 даёт h=0 С ПЕРВОГО ЖЕ layout — то есть клетка не получает квадратную высоту ДО анимации; scaleZero:true означает, что масштаб входа не доходит до 1 (или клетка на нулевой высоте). Календарь на кадре не нарисован.
## [MOMENT-GLOW]
{scene:"streak-milestone-screen", top:"30%", color:"#56578C9E", own:0.6196, isLight:false, opacity:0.302, size:320, fadePx:147} — ореол есть; на кадре видно мягкое свечение вокруг пламени (на тёмной теме).
