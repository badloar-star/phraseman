# m22 «Энергия закончилась → Plus» — ПРАВКИ ПЕРЕВОДЧИКА (финальные строки, 9 языков)

Governance-ID: TG-2F6682B004EB

К паспорту `m22-no-energy-plus-sheet-2026-10-15.md` (сессия «Авторизация»). Отдельным файлом — потому что тот файл ещё не закоммичен
и правится в сессии Авторизации; чтобы не трогать чужую незакоммиченную работу, финальные строки лежат здесь.
Черновиков Авторизации в файле на момент сверки (15.10 ~08:40) не было — ниже финальный вариант с нуля. Русский — как дал координатор.
Плейсхолдеры `{t}` и `{price}` не тронуты. Порядок языков: ru, uk, en, es, pt-BR, vi, id, tr, pl.

## Строки

```ts
ctx:       ['Энергия', 'Енергія', 'Energy', 'Energía', 'Energia', 'Năng lượng', 'Energi', 'Enerji', 'Energia'],
title:     ['Энергия закончилась', 'Енергія закінчилась', 'Out of energy', 'Se acabó la energía', 'A energia acabou', 'Hết năng lượng', 'Energi habis', 'Enerji bitti', 'Energia się skończyła'],
sub:       ['Следующая — через {t}. С Plus — без ожидания.', 'Наступна — через {t}. З Plus — без очікування.', 'More energy in {t}. With Plus, no waiting.', 'La siguiente llega en {t}. Con Plus, sin esperas.', 'A próxima chega em {t}. Com o Plus, sem espera.', 'Năng lượng hồi lại sau {t}. Có Plus thì không cần chờ.', 'Energi berikutnya dalam {t}. Dengan Plus, tanpa menunggu.', 'Sıradaki enerji {t} sonra. Plus ile beklemek yok.', 'Następna za {t}. Z Plus — bez czekania.'],
benefit:   ['Энергия не кончается', 'Енергія не закінчується', 'Unlimited energy', 'Energía ilimitada', 'Energia ilimitada', 'Năng lượng không giới hạn', 'Energi tanpa batas', 'Sınırsız enerji', 'Energia bez limitu'],
cta:       ['Попробовать Plus', 'Спробувати Plus', 'Try Plus', 'Probar Plus', 'Testar o Plus', 'Dùng thử Plus', 'Coba Plus', 'Plus’ı dene', 'Wypróbuj Plus'],
fineTrial: ['пробный период из магазина · ≈ {price}/мес', 'пробний період із магазину · ≈ {price}/міс', 'trial via the store · ≈ {price}/mo', 'prueba en la tienda · ≈ {price}/mes', 'teste pela loja · ≈ {price}/mês', 'dùng thử qua cửa hàng · ≈ {price}/tháng', 'uji coba lewat toko · ≈ {price}/bln', 'mağaza üzerinden deneme · ≈ {price}/ay', 'okres próbny w sklepie · ≈ {price}/mies.'],
finePrice: ['≈ {price}/мес', '≈ {price}/міс', '≈ {price}/mo', '≈ {price}/mes', '≈ {price}/mês', '≈ {price}/tháng', '≈ {price}/bln', '≈ {price}/ay', '≈ {price}/mies.'],
wait:      ['Подожду 10 минут', 'Почекаю 10 хвилин', 'I’ll wait 10 minutes', 'Esperaré 10 minutos', 'Vou esperar 10 minutos', 'Tôi sẽ chờ 10 phút', 'Aku tunggu 10 menit', '10 dakika beklerim', 'Poczekam 10 minut'],
```

## Почему так

- **title** — один в один с существующим окном «Энергия закончилась» в приложении (те же 8 переводов), чтобы два окна про одно и то же
  не говорили по-разному.
- **sub** — «Следующая» в ru понятна из чипа «Энергия»; в en/vi/id/tr голое «next one» повисает, поэтому названа энергия
  («More energy in…», «Năng lượng hồi lại…», «Energi berikutnya…», «Sıradaki enerji…»). es/pt-BR — «llega/chega»: так живее, чем «la siguiente en».
- **benefit** — «не кончается» во всех языках, кроме uk/ru, естественнее звучит как «без ограничений» (Unlimited / ilimitada / không giới hạn / tanpa batas / sınırsız / bez limitu).
- **cta** — одна строка на 360 pt даже при ×1.15: самая длинная — «Wypróbuj Plus» / «Testar o Plus» (13 знаков).
  pt-BR «Testar» вместо «Experimentar» — короче и обычнее для кнопки. tr — типографский апостроф ’, как в «Plus’ı».
- **fineTrial** — ru не обещает «бесплатно», поэтому и переводы НЕ говорят free/grátis/gratis: пробный период оформляет магазин
  («написано = спишется»). Сокращения месяца — общепринятые: mo, mes, mês, tháng, bln, ay, mies., міс.
- **wait** — от первого лица, как ru. id — «Aku» (приложение говорит с человеком на «kamu», первое лицо в паре с ним — «aku», не формальное «saya»).

## Риск для Авторизации

- «Подожду **10 минут**» — число зашито в текст, а `{t}` в sub показывает настоящий отсчёт. Если до следующей энергии не 10 минут
  (например, 3:20), кнопка и подзаголовок разойдутся. Предложение: `wait` с плейсхолдером минут — `Подожду {m} мин` /
  `Почекаю {m} хв` / `I’ll wait {m} min` / `Esperaré {m} min` / `Vou esperar {m} min` / `Tôi sẽ chờ {m} phút` / `Aku tunggu {m} menit` /
  `{m} dakika beklerim` / `Poczekam {m} min` — или нейтральное «Подожду» без числа. Решать Авторизации/координатору; ru без согласия не меняю.
