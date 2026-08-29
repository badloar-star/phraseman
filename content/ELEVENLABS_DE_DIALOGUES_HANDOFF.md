# Озвучка немецких диалогов A1-A2 через ElevenLabs MCP — задание для новой сессии

## Контекст
Есть готовый видео-проект (CapCut) с 8 бытовыми диалогами на немецком уровня A1-A2
(героиня Лена + 8 разных сотрудников: пекарня, вокзал, аптека, магазин одежды,
библиотека, почта, прокат велосипедов, парикмахерская). Картинки и монтаж уже
готовы, озвучки нет — временные тишина-заглушки. Задача: создать 3 голоса в
ElevenLabs и озвучить весь текст, разложить mp3 по нужным папкам.

Источник (уже распакован на диске пользователя, НЕ трогать структуру):
`C:\Users\badlo\Downloads\PHRASEMAN_DE_DIALOGUES_A1_A2_FINAL_TIMELINE_IMAGES_MANUAL_ELEVENLABS_FLAT_V3.zip`

Внутри архива папка `PHRASEMAN_DE_DIALOGUES_ONE_VISUAL_PER_DIALOGUE_V3_FULL/`:
- `00_ПРОЧТИ_ПЕРЕД_ЗАПУСКОМ.txt` — общее описание проекта
- `CAPCUT_TEMPLATE/01_ELEVENLABS_VOICES_AND_SETTINGS_RU_DE.txt` — требования к голосам
- `CAPCUT_TEMPLATE/01_DIALOGUES_DE_RU_FULL.txt` — полный скрипт всех 88 реплик
- `CAPCUT_TEMPLATE/1..5/` — куда класть готовые mp3 (см. ниже)
- `РУЧНАЯ_ГЕНЕРАЦИЯ_11LABS/*.docx` — 11 готовых текстов для озвучки, один абзац = одна реплика
- у каждого DOCX есть `MAP.csv` с маппингом абзац → имя файла `Dxx_Lxx.mp3`

## Нужно ровно 3 голоса (не 5!)
Папки 3 и 4 — это НЕ отдельные голоса, а те же голоса 1 и 2, сгенерированные
повторно с параметром скорости ElevenLabs ~0.78-0.82 (slow). Не создавай для них
отдельные Voice ID.

### Голос 1 — Лена (папки 1 normal, 3 slow), промпт на НЕМЕЦКОМ:
```
Warme, freundliche erwachsene weibliche Stimme, Muttersprachlerin des Hochdeutschen,
etwa 28-35 Jahre alt. Klare, professionelle Aussprache, kein Dialekt, kein
regionaler Akzent, keine raue oder heisere Stimme, studioreine Rundfunkqualität.
Natürlicher, höflicher Alltagston — wie eine freundliche Kundin, die ruhig in
Geschäften, am Bahnhof, in der Apotheke, in der Bibliothek, bei der Post, beim
Fahrradverleih oder beim Friseur nach etwas fragt. Warm und zugänglich, niemals
monoton oder roboterhaft, niemals übertrieben theatralisch. Gleichbleibender
Tonfall und gleichmäßiges Tempo bei allen Sätzen, da dieselbe Stimme durchgehend
eine wiederkehrende Figur in einer ganzen Sprachlern-Videoserie spricht.
```

### Голос 2 — Мужской собеседник, все 8 сотрудников (папки 2 normal, 4 slow), промпт на НЕМЕЦКОМ:
```
Warme, freundliche erwachsene männliche Stimme, Muttersprachler des Hochdeutschen,
etwa 35-45 Jahre alt. Klare, professionelle Aussprache, kein Dialekt, kein
regionaler Akzent, studioreine Rundfunkqualität. Ruhiger, hilfsbereiter,
professioneller Kundenservice-Ton — wie ein Bäckereiverkäufer,
Fahrkartenschalter-Mitarbeiter, Apotheker, Verkaufsberater, Bibliothekar,
Postangestellter, Fahrradverleih-Mitarbeiter oder Friseur, der einer Kundin
höflich hilft. Natürlich und angenehm, niemals monoton oder roboterhaft, niemals
übertrieben theatralisch. Gleichbleibender Tonfall und gleichmäßiges Tempo bei
allen Sätzen, da dieselbe Stimme mehrere verschiedene Servicemitarbeiter-Figuren
in einer ganzen Sprachlern-Videoserie spricht.
```

### Голос 3 — Русский преподаватель/рассказчик (папка 5), промпт на РУССКОМ:
```
Тёплый, спокойный взрослый голос истинного билингва — свободно и абсолютно чисто
говорящего как на русском, так и на немецком языке на уровне носителя обоих
языков, без малейшего акцента ни в одном из них. Звучит как доброжелательный,
терпеливый преподаватель немецкого языка для русскоязычных взрослых учеников,
около 30-45 лет. Русская речь — безупречная, естественная, чёткая студийная
дикция, без регионального говора и без иностранного акцента. Немецкая речь
внутри того же текста — безупречный нейтральный Hochdeutsch, естественный темп
и интонация как у прирождённого немца, с идеально точными долгими и краткими
гласными, умлаутами (ä, ö, ü), увулярным немецким "r" и правильным ударением —
переключение между русским и немецким внутри одной фразы происходит плавно и
естественно, без малейшего замедления, запинки или "чтения по слогам" на
немецких словах. Ни русский текст не звучит с немецким акцентом, ни немецкие
вставки не звучат с русским акцентом — оба языка звучат как родные для этого
голоса. Умеренный темп примерно 110-120 слов в минуту, расслабленная и
педагогичная манера, тёплый и ободряющий тон, никогда не торопливый, никогда не
монотонный, никогда не чрезмерно драматичный.
```

## Модель генерации
Использовать `eleven_multilingual_v2` (или v3, если доступна и стабильнее) —
НЕ eleven_monolingual. Для голоса 3 (русский+немецкий вперемешку) при генерации
не просто скармливать сырой смешанный текст: там, где встречаются короткие
немецкие вставки внутри русской фразы, по возможности сегментировать текст по
языку (разбивать фразу на русский кусок + немецкий кусок как отдельные запросы
и склеивать аудио), если после первого теста будет заметен акцент на немецких
словах внутри русской озвучки. Сначала сгенерировать 2-3 тестовых фразы на
каждом голосе и явно прослушать/попросить пользователя подтвердить качество
ПЕРЕД массовой генерацией всех ~264 реплик (88 DE normal + 88 DE slow + 88 RU).

## Технические требования к каждому аудиофайлу
- Одна реплика = один аудиофайл (mp3).
- Без музыки и тишины в начале файла.
- Естественный хвост ~80-150 мс после последнего слова, не резать резко.
- Имя файла = как в MAP.csv соответствующего DOCX (`Dxx_Lxx.mp3`).
- Normal и slow генерируются отдельно через настройку скорости в ElevenLabs —
  НЕ ускорять/замедлять готовый аудиофайл программно постфактum.

## Куда класть результат
```
CAPCUT_TEMPLATE/1/  — голос Лены, normal
CAPCUT_TEMPLATE/2/  — голос собеседника, normal
CAPCUT_TEMPLATE/3/  — голос Лены, slow
CAPCUT_TEMPLATE/4/  — голос собеседника, slow
CAPCUT_TEMPLATE/5/  — русский преподаватель
```
(папки 6 и 7 — картинки, уже готовы, не трогать)

## После генерации аудио
Сообщить пользователю, что аудио готово и разложено, и что дальше нужно:
1. Закрыть CapCut.
2. Запустить `01_СОБРАТЬ_ПОСЛЕ_АУДИО_И_ВИЗУАЛОВ.bat` из корня распакованного проекта.

## Правило безопасности (важно!)
API-ключ ElevenLabs НЕ передавать через чат ни в каком виде. Он уже подключён
через `claude mcp add` в конфиге проекта — просто используй уже доступные MCP
инструменты `mcp__elevenlabs__*` напрямую.
