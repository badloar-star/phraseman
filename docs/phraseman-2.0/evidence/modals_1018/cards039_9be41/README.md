# cards-039 на 9be415d23 (R143, Дизайн) — ✅ ошибка загрузки появляется на ≈12,3 с (СВЕРКА, 18.10 06:03; cards=empty&fail=saved_load, тёмная, es; бандл с рабочей копией — незакоммиченное R137 этап 2 в дереве)
Кадры t4/t9/t13/t16 (+retry_a/b/c), журналы load_log.txt, retry_log.txt.
## Хронология (t=0 в момент ссылки; метки по журналу 06:03:14.85 = старт)
- 0 с: state:render drawn=skeleton, loadError=true, gateStatus=error; branch=state «ошибка загрузки», loading=false; тихий скелетон.
- +1,0 с: [LOAD-GATE:fc-saved] тихий повтор attempt 1 (waitedMs 1000) → retrying=true → retry:settled ok → снова error.
- +4,1 с: attempt 2 (waitedMs 3000).
- +12,2 с: attempt 3 (waitedMs 8000), затем «повторы исчерпаны → «Сейчас недоступно»» {attempts: 3} и state:render drawn=unavailable, gateExhausted=true, deviceOffline=false.
=> «Сейчас недоступно» появилось на 12,3 секунде (ожидалось ≈12). Паузы 1/3/8 с соблюдены. Вечного скелетона нет.
## Кадры
t4, t9, t13 (до исчерпания) — скелетон из 4 карточек; t16 (≈22 с по часам скрипта): «Guardadas 0», облако с перечёркнутой чертой, «No disponible ahora / Revisa tu conexión», мятная кнопка «Intentar de nuevo».
## «Попробовать снова» ×2 подряд (retry_a.png, retry_log.txt)
Два быстрых тапа подряд: в журнале ОДИН [LOAD-GATE:fc-saved] «повтор после «Сейчас недоступно»» {source: tap} — дубля нет. Реакция мгновенная: load:start 5 мс после тапа, state:render drawn=skeleton retrying=true на 62 мс; load:ok 88 мс; затем снова цепочка тихих повторов attempt 1/2/3 (1/3/8 с), то есть кнопка возвращает в тот же цикл и экран снова приходит к «Сейчас недоступно» (кадр retry_a — скелетон, retry_c — через 5 с скелетон на втором тихом повторе).
Офлайн-ветку (самолёт, reason=offline_first_fail) не снимала — требует выключения сети эмулятора, нет слова владельца.
