# Глоссарий PhraseMan × 9 языков (Переводчик, 25.10)

Источник — то, что реально стоит в подписях вкладок и заголовках экранов (файл и строка указаны). Если текст где-то
расходится с этой таблицей, прав глоссарий. Новый термин или спор — к координатору, затем строка здесь.
Порядок: ru · uk · en · es · pt-BR · vi · id · tr · pl.

## Вкладки (`app/(tabs)/_layout.tsx`, TABS)

| Вкладка | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| Главная | Главная | Головна | Home | Inicio | Início | Trang chủ | Beranda | Ana sayfa | Start |
| Обучение (уроки, сезон) | Обучение | Навчання | Learn | Aprender | Aprender | Học | Belajar | Öğren | Nauka |
| Видео | Видео | Відео | Videos | Videos | Vídeos | Video | Video | Videolar | Filmy |
| Сообщество | Сообщество | Спільнота | Community | Comunidad | Comunidade | Cộng đồng | Komunitas | Topluluk | Społeczność |
| Настройки | Настройки | Параметри ⚠ | Settings | Ajustes | Ajustes | Cài đặt | Setelan | Ayarlar | Ustawienia |

⚠ uk: вкладка подписана «Параметри», а в текстах («в налаштуваннях», «Налаштування» в Видео) — «налаштування». Обычное слово
— «Налаштування». Решение за владельцем: либо вкладку переименовать в «Налаштування», либо оставить как есть. Пока в текстах
пишем «у налаштуваннях», когда речь о настройках вообще.

## Разделы и экраны

| Раздел | ru | uk | en | es | pt-BR | vi | id | tr | pl | Источник |
|---|---|---|---|---|---|---|---|---|---|---|
| Уроки | Уроки | Уроки | Lessons | Lecciones | Lições | Bài học | Pelajaran | Dersler | Lekcje | `app/achievements_screen.tsx:174` |
| Карточки | Карточки | Картки | Cards | Tarjetas | Cartões | Thẻ | Kartu | Kartlar | Karty | `app/flashcards/FlashcardsHubScreen.tsx:327` |
| Диалоги | Диалоги | Діалоги | Dialogues | Diálogos | Diálogos | Hội thoại | Dialog | Diyaloglar | Dialogi | `components/dialogs/scene/dialogs_scene_copy.ts` |
| Друзья | Друзья | Друзі | Friends | Amigos | Amigos | Bạn bè | Teman | Arkadaşlar | Znajomi | `app/(tabs)/community.tsx:110` |
| Пик | Пик | Пік | Peak | Pico | Pico | Đỉnh | Puncak | Zirve | Szczyt | `app/(tabs)/community.tsx:108` |
| Мастерская фраз | Мастерская фраз | Майстерня висловів | Phrase workshop | Taller de frases | Oficina de frases | Xưởng ghép câu | Bengkel frasa | İfade atölyesi | Warsztat fraz | `components/learning-v2/workshop/phrase_workshop_copy.ts` |
| Экзамен главы | Экзамен главы {n} | Іспит розділу {n} | Chapter {n} exam | Examen del capítulo {n} | Exame do capítulo {n} | Bài thi chương {n} | Ujian bab {n} | {n}. ünite sınavı | Egzamin rozdziału {n} | `components/learning-v2/learning_v2_chapter_exam_copy.ts:10` |
| Plus | Plus | Plus | Plus | Plus | Plus | Plus | Plus | Plus | Plus | везде латиницей; не «Плюс», не «Pro» |

## Игровые слова

| Термин | ru | uk | en | es | pt-BR | vi | id | tr | pl | Источник |
|---|---|---|---|---|---|---|---|---|---|---|
| ступень | ступень | сходинка | step | escalón | degrau | bậc | anak tangga | basamak | stopień | `components/spire/spire_game_strings.ts:30` |
| этаж | этаж | поверх | floor | piso | andar | tầng | lantai | kat | piętro | там же, `floorCleared` |
| лига | лига | ліга | league | liga | liga | hạng ¹ | liga | lig | liga | `components/spire/moments/moments_strings.ts:45` |
| энергия | энергия | енергія | energy | energía | energia | năng lượng | energi | enerji | energia | |
| монеты | монеты | монети | coins | monedas | moedas | xu | koin | jeton(lar) ² | monety | `app/runes_wallet.tsx:102` |
| серия (дни подряд) | серия | серія | streak | racha | sequência | chuỗi | rangkaian | seri | seria | `app/streak_stats.tsx:1441` |
| фраза | фраза | вислів | phrase | frase | frase | cụm từ / câu | frasa | ifade | zwrot | |
| урок / занятие ³ | урок, занятие | урок, заняття | lesson | lección | lição | bài học | pelajaran | ders | lekcja | |

¹ vi: в строках про подъём/спуск «hạng» читается естественнее, чем калька «giải đấu»; название лиги стоит рядом.
² tr: «Jeton» после числа, «Jetonlar» — в заголовке экрана; оба правильные.
³ «session / sesión / sessão / sesi / oturum / sesja» в интерфейсе не используем — это кухня; вместо него слово урока.

## Запрещённые синонимы (сторож голоса ловит часть из них)

- ru: «цепочка», «стрик» → «серия»; «Плюс» → «Plus»; «Шпиль» в видимых строках → «Пик»; «руны», «осколки» → «монеты».
- uk: «стрік», «ланцюжок» → «серія»; «фраза» в значении учебной единицы → «вислів».
- en: «Flashcards» как название раздела → «Cards»; «Spire» → «Peak».
- vi: «Thẻ học» как название раздела → «Thẻ».
- id: «Runtunan» → «Rangkaian».
- pl: «Przyjaciele» → «Znajomi» (вкладка).

## Сверка строк после 2.0.2 (git diff 009c40c97..HEAD, 329 файлов)

Найдено и исправлено в свободных файлах (коммит ниже):

| Файл | Было | Стало |
|---|---|---|
| `app/achievements_screen.tsx` | категория «Цепочка / Ланцюжок / Chuỗi ngày»; комбо «Серии / Серії» | «Серия / Серія / Chuỗi»; комбо «Комбо» (иначе две «серии» с разным смыслом) |
| `app/streak_stats.tsx` | en «Flashcards saved»; «Цепочки и результаты / Стріки та результати»; «дни цепочки» | «Cards saved»; «Серия и результаты / Серія та результати»; «дни серии» |
| `components/home/v2/scene/home_scene_copy.ts`, `home_scene_special_copy.ts`, `app/home_continue_mark.ts`, `app/vip_survey_content.ts` | vi «Thẻ học» | vi «Thẻ» |
| `components/friends_together/FriendTogetherSheet.tsx` | pl «Przyjaciele» | pl «Znajomi» |

Остальные совпадения в сверке — служебные логи («сеть Шпиля»), их не видит человек; не трогаем.
Занятых файлов с расхождениями в сверке не оказалось.
