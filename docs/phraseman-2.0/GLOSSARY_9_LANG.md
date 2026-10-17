# Глоссарий терминов PhraseMan 2.0 — 9 языков интерфейса

Владелец документа: «Специалист по переводам». Создан 15.10.2026.
**Правило:** один термин = один перевод во всём приложении. Новые тексты пишутся только этими словами.
Отступить можно лишь там, где грамматика требует другой формы (падеж, число), а не другого слова.
Русский — голос владельца, его не трогаем; остальные 8 языков приводятся к ru по смыслу.

Статусы:
- ✅ — закреплено, в коде уже так.
- 🟡 — предложение переводчика. Нужно «да» координатора/владельца, после него переводчик приводит код к термину.

## 1. Термины

| ru | uk | en | es | pt-BR | vi | id | tr | pl | статус |
|---|---|---|---|---|---|---|---|---|---|
| монеты | монети | coins | monedas | moedas | xu | koin | jeton | monety | ✅ (кроме хвостов — §2) |
| ранг (монеты) | ранг | rank | rango | rank (м. р., «o rank») | **cấp** | **pangkat** | rütbe | ranga | 🟡 vi/id/pt-BR |
| место (в таблице: «3 место») | місце | place | puesto | posição | hạng | peringkat | sıra («3. sıra») | miejsce | ✅ |
| серия (дни подряд) | серія | streak | racha | sequência | chuỗi | **runtunan** | seri | seria | 🟡 id |
| Пик | Пік | Peak | Pico | Pico | Đỉnh | Puncak | Zirve | Szczyt | ✅ |
| этаж | поверх | floor | piso | andar | tầng | lantai | kat | piętro | ✅ |
| ступень | сходинка | step | escalón | degrau | bậc | anak tangga | basamak | stopień | ✅ |
| лига (каменная: Гранит…) | ліга | league | liga | liga | **giải** | liga | lig | liga | 🟡 vi |
| энергия | енергія | energy | energía | energia | năng lượng | energi | enerji | energia | ✅ |
| Plus | Plus | Plus | Plus | Plus | Plus | Plus | Plus | Plus | ✅ латиницей, без «Premium» |
| карточки | картки | cards | tarjetas | cartões | thẻ | kartu | kartlar | **karty** | 🟡 pl |
| набор (карточек) | набір | pack | pack | pacote | bộ thẻ | paket | paket | zestaw | 🟡 все, кроме uk |
| набор заданий (в Пике: «другой набор») | набір | set | conjunto | conjunto | bộ | set | set | zestaw | ✅ отдельный термин, не «пакет» |
| диалоги | діалоги | dialogues | diálogos | diálogos | **hội thoại** | dialog | diyaloglar | dialogi | 🟡 vi, en |
| уроки | уроки | lessons | lecciones | lições | bài học | pelajaran | dersler | lekcje | 🟡 pt-BR, es |
| «Сегодня» (блок) | Сьогодні | Today | Hoy | Hoje | Hôm nay | Hari ini | Bugün | Dziś | ✅ |
| Восстановить покупки | Відновити покупки | Restore purchases | Restaurar compras | Restaurar compras | Khôi phục giao dịch | Pulihkan pembelian | Satın alımları geri yükle | Przywróć zakupy | ✅ |

### Почему выбраны предложения 🟡

- **vi ранг → «cấp», лига → «giải».** Сейчас «hạng» означает сразу три вещи: место «Hạng 3», ранг монеты «Hạng đồng xu»
  и повышение в лиге «thăng hạng». Человек не отличит «3 место» от «3 ранга». «Hạng» оставляем месту — так говорят в таблицах.
  «Bậc» для ранга не подходит: это уже «ступень» Пика.
- **id ранг → «pangkat».** «Peringkat» — это и место, и ранг. «Pangkat» — ранг-звание; «peringkat» остаётся месту.
  Отдельно: в `components/MedalToast.tsx:454` английское «RANK BARU / RANK TURUN» → «PANGKAT BARU / PANGKAT TURUN».
- **pt-BR ранг → «rank».** Сейчас три слова: «rank» (~15), «nível» (6), «patente» (1). «Nível» сталкивается с «уровнем»,
  «patente» звучит по-армейски. «Rank» — самое частое слово и привычное для игр в Бразилии.
- **id серия → «runtunan».** Сейчас ШЕСТЬ слов: streak (23), rangkaian (17), rentetan (7), runtunan (3), runtutan (3), seri (3).
  «Runtunan» — на плитке Главной (самое видимое место); это естественное слово для «подряд». Выбор не окончательный:
  если владелец предпочтёт «rangkaian» (больше вхождений в новых окнах), меняется одна строка таблицы — работа та же.
- **pl карточки → «karty».** Сейчас karty (97) / fiszki (79), разбито по экранам: Главная — «Twoje karty», модерация — «Otwórz Fiszki».
  Выбрано «karty»: вхождений больше, и так говорят остальные 7 языков. «Fiszki» идиоматичнее для польского — альтернатива,
  решает владелец.
- **набор карточек.** В каждом языке 3–5 слов: en pack/set/deck/collection, es pack/set/paquete/mazo/colección,
  pt-BR pacote/pack/conjunto/baralho/coleção, id paket/set/pack/koleksi, tr paket/set/deste/koleksiyon, pl zestaw/pakiet, vi bộ/gói.
  В таблице — самое частое слово каждого языка. «Набор заданий» Пика — отдельное понятие («conjunto», «zestaw»),
  поэтому строки Тем «Outro conjunto» / «Inny zestaw» верны.
- **vi диалоги → «hội thoại»** (86 против «đối thoại» 19; вкладка «Диалоги» сейчас «Đối thoại» — выбивается).
  **en → «dialogue»** (101 против «dialog» 6).
- **уроки:** pt-BR «lição» (168 против «aula» 20), es «lección» (184 против «clase» 5).
  vi «Bài N» как подпись-номер допустимо, в тексте — «bài học».

## 2. Расхождения в коде (по сводке 15.10 — 11,5 тыс. выровненных строк)

Самое важное — сверху. «Исправлено» — коммит переводчика; остальное ждёт решения по §1.

| # | язык | термин | что в коде | где (примеры) | статус |
|---|---|---|---|---|---|
| 1 | id | серия | 6 слов | `app/notifications.ts` (streak), `streak_moments_strings.ts` (rangkaian), `PaywallBenefitComparison.tsx` (rentetan), `(tabs)/home.tsx:2293` (runtunan), `paywall_copy.ts:1010` (runtutan) | ждёт «да» |
| 2 | vi | место/ранг/лига | всё «hạng» | `moments_strings.ts`, `spire_game_strings.ts`, `coin_rank.tsx`, `coin_rank_strings.ts` | ждёт «да» |
| 3 | id | место/ранг | всё «peringkat» + англ. «RANK BARU» | `coin_rank.tsx`, `moments_strings.ts`, `MedalToast.tsx:454` | ждёт «да» |
| 4 | pt-BR | ранг | rank / nível / patente | `coin_rank.tsx`, `ai_dialog_briefing.tsx:288`, `welcome_back_strings.ts:17`, `paywall_context_texts.ts:261` | ждёт «да» |
| 5 | pt-BR, es | серия | série (6) / serie (2) против sequência / racha | `notifications.ts:1803,1904`, `achievements_screen.tsx:174` | ждёт «да» |
| 6 | pt-BR, es | уроки | aula (20) / clase (5) | `flashcards/selectors.ts:158`, `lesson1.tsx:3975`, `notifications.ts:2223` | ждёт «да» |
| 7 | pl | карточки | karty (97) / fiszki (79) | `(tabs)/home.tsx:2360`, `community_moderation_copy.ts:72`, `flashcards_swipe.tsx` | ждёт «да» |
| 8 | tr | монеты | «madeni para» (~5) вместо «jeton»; «Jeton sıraları» для рангов | `useCollectionData.ts:909`, `release_notes_v2_copy.ts:26`, `CoinRankCatalog.tsx:17` | ждёт «да» (термин ✅, просто привести) |
| 9 | vi | диалоги | đối thoại (19) | вкладка `(tabs)/home.tsx:2248`, `ai_dialog_home.tsx:48` | ждёт «да» |
| 10 | 7 языков | монеты | «РУНЫ» вместо «МОНЕТЫ ЗА УПРАЖНЕНИЯ» (наследие рун) | `components/learning-v2/horizons/copy.ts:380` | **исправлено** — коммит окна 09:00 |
| 11 | pt-BR | монеты | испанское «monedas» | `app/session_attempts/session_attempts_copy.ts:61` | **исправлено** — коммит окна 09:00 |
| 12 | все | набор | 3–5 слов на язык | `CollectionGalleryView.tsx:76`, `CollectionHeader.tsx:218`, `flashcards_swipe.tsx:3759` | ждёт «да» |
| 13 | pl | «Сегодня» | Dziś (41) / dzisiaj (10) | `story_strings.ts:17`, `streak_moments_strings.ts:38` | заголовок блока — Dziś; в предложениях «dzisiaj» допустимо |
| 14 | en | диалоги | dialog (6) | `(tabs)/lessons.tsx:5420`, `app_messages.ts:2086` | ждёт «да» |
| 15 | pl | ранг | кнопка «Awansuj» вместо формы «ranga» | `coin_rank.tsx:209,215` | допустимо: «Awansuj za {price}» — живой глагол, смысл тот же |

Проверено и ложной тревогой не является: в `components/roulette_win_modal.tsx` у `L(...)` порядок аргументов ru, en, uk —
«перепутанные uk/en» в сводке — особенность этого помощника, строки верные.

## 3. Как пользоваться

- Пишешь новый текст — сверь каждый термин с таблицей §1.
- Нужен новый термин — сначала строка в §1 (через переводчика), потом код.
- Нашёл расхождение — допиши в §2, не правь чужую зону молча.

## Решения 17.10 (координатор: «одно понятие — одно слово»; применено переводчиком)

| Язык | Понятие | Стало | Что убрано | Строк |
|---|---|---|---|---|
| id | серия | **rangkaian** | streak, rentetan, runtutan, runtunan («seri» остаётся только у combo → «Kombo») | 22 |
| pl | карточки | **karty** (karta / karty / kart; раздел «Karty») | fiszka / fiszki / fiszek | 90 |
| vi | диалоги | **hội thoại** («người đối thoại» = собеседник — оставлено) | đối thoại | 7 |
| pt-BR | набор | **pacote** | pack (экран создания набора, жалоба, комментарии) | 13 |
| tr | набор | **paket** («deste» остаётся только как вид «колодой», «set» в Пике — набор заданий) | set | 7 |
| es / pt-BR / vi / id / tr / pl | категория достижений combo | Combos / Combos / Combo / Kombo / Kombolar / Kombo | совпадала со словом «серия» | 6 |
| все 9 | «Official pack» | переведено на каждый язык | было по-английски даже в ru | 18 |

Отклонение от прежнего предложения: для id выбрано «rangkaian», а не «runtunan» — оно уже было самым частым (17 из 52) и стоит в новых Моментах v3.
Русский не тронут: в нём самом «цепочка» и «серия» означают одно и то же (вопрос координатору).
