# Новые строки сессии «Дизайн» на 9 языков — на сверку «Специалисту по переводам» (15.10)

Governance-ID: TG-DC3BA22506F3

## Outcome
Список строк, которые сессия «Дизайн» заложила в подготовленные правки (применяются в окнах кода 09:00–10:30). Черновые переводы мои; если у «Специалиста по переводам» формулировки лучше — подставляю отдельным мини-коммитом.

## Scope
Только тексты ниже. Пейвол при исчерпании голоса — существующий контекст `ai_voice_input` (новых строк нет).

## Architecture
Строки лежат на местах использования в `actionToastTri({...})` / `triLang(lang, {...})` по 9 языкам (ru, uk, en, es, pt-BR, vi, id, tr, pl).

## Security and privacy
Данные не затрагиваются.

## Technical debt
Строки пока не в общем словаре переводов — живут рядом с кодом, как остальные тосты этих экранов.

## Verification
Сторож переводов (`scan_untranslated_ui`) и тесты экранов.

## Rollback
Откат коммита правки.

## Строки

### 1. D194 — подпись под микрофоном курса при исчерпании голосовых попыток (`app/learning_v2_direct_session_player_v1.tsx`)
| язык | текст |
|---|---|
| ru | Голос на сегодня закончился |
| uk | Голос на сьогодні закінчився |
| en | No voice attempts left today |
| es | Hoy no quedan intentos de voz |
| pt-BR | As tentativas de voz de hoje acabaram |
| vi | Hôm nay đã hết lượt nói |
| id | Percobaan suara hari ini habis |
| tr | Bugünkü ses hakkın bitti |
| pl | Na dziś głos się skończył |

### 2. Карточки набора — «Вернуть» не удалось (`app/flashcards_collection.tsx`)
| язык | текст |
|---|---|
| ru | Не удалось вернуть карточку. |
| uk | Не вдалося повернути картку. |
| en | Could not restore the card. |
| es | No se pudo restaurar la tarjeta. |
| pt-BR | Não foi possível restaurar o cartão. |
| vi | Không thể khôi phục thẻ. |
| id | Kartu tidak dapat dipulihkan. |
| tr | Kart geri getirilemedi. |
| pl | Nie udało się przywrócić karty. |

### 3. Редактор карточки — карточку не открыть (`app/flashcards_card_editor.tsx`)
| язык | текст |
|---|---|
| ru | Не удалось открыть карточку. |
| uk | Не вдалося відкрити картку. |
| en | Could not open the card. |
| es | No se pudo abrir la tarjeta. |
| pt-BR | Não foi possível abrir o cartão. |
| vi | Không thể mở thẻ. |
| id | Kartu tidak dapat dibuka. |
| tr | Kart açılamadı. |
| pl | Nie udało się otworzyć fiszki. |

### 4. Редактор набора — сохранён, публикацию снять не удалось (`app/community_pack_create.tsx`)
| язык | текст |
|---|---|
| ru | Набор сохранён на устройстве, но публикацию снять не удалось. Нажми «Сохранить» ещё раз при подключении. |
| uk | Набір збережено на пристрої, але зняти публікацію не вдалося. Натисни «Зберегти» ще раз після підключення. |
| en | Saved on this device, but the pack could not be unpublished. Save again when connected. |
| es | Guardado en este dispositivo, pero no se pudo retirar la publicación. Vuelve a guardar con conexión. |
| pt-BR | Salvo neste dispositivo, mas não foi possível retirar a publicação. Salve de novo quando estiver conectado. |
| vi | Đã lưu trên thiết bị này nhưng chưa gỡ được bản xuất bản. Hãy lưu lại khi có kết nối. |
| id | Tersimpan di perangkat ini, tetapi publikasi belum bisa dicabut. Simpan lagi saat terhubung. |
| tr | Bu cihaza kaydedildi ama yayın kaldırılamadı. Bağlanınca tekrar kaydet. |
| pl | Zapisano na tym urządzeniu, ale nie udało się cofnąć publikacji. Zapisz ponownie po połączeniu. |

### 5. К сведению — тексты m06 (`components/spire/moments/step_moment_strings.ts`), решение Макетов
retrySet pt-BR «Outro conjunto», pl «Inny zestaw»; failHearts uk «Сходинку не пройдено». ru не тронут.

## ПРАВКИ ПЕРЕВОДЧИКА (15.10, сверка «Специалиста по переводам»)

Русский не тронут. Всё, что не перечислено ниже, проверено и **принято как есть**.

| № | язык | было | стало | почему |
|---|---|---|---|---|
| 1 | pl | Na dziś głos się skończył | Na dziś koniec prób głosowych | калька с ru: «głos się skończył» по-польски звучит как «голос сорвался», а не как исчерпанный лимит |
| 2 | en | Could not restore the card. | Couldn’t restore the card. | единый тон ошибок приложения — сокращённая форма, как в пейволе («Couldn’t restore purchases») |
| 3 | en | Could not open the card. | Couldn’t open the card. | то же |
| 3 | pl | Nie udało się otworzyć fiszki. | Nie udało się otworzyć karty. | в Карточках pl везде «karta» (Dodaj kartę, Nowa karta, Nie udało się usunąć karty); в пункте 2 той же поставки тоже «karty» — «fiszki» выбивалось |
| 4 | en | Saved on this device, but the pack could not be unpublished. Save again when connected. | Saved on this device, but couldn’t unpublish the pack. Tap “Save” again when you’re online. | как в ru — с названием кнопки; живой порядок слов |
| 4 | es | … Vuelve a guardar con conexión. | … Toca «Guardar» otra vez cuando tengas conexión. | ru называет кнопку «Сохранить» — кнопка в es «Guardar» |
| 4 | pt-BR | … Salve de novo quando estiver conectado. | … Toque em “Salvar” de novo quando estiver on-line. | название кнопки; «conectado» без «к чему» звучит неполно; кавычки pt-BR — “…” |
| 4 | vi | Đã lưu trên thiết bị này nhưng chưa gỡ được bản xuất bản. Hãy lưu lại khi có kết nối. | Đã lưu trên thiết bị này nhưng chưa hủy công khai được bộ thẻ. Hãy nhấn “Lưu” lại khi có mạng. | «gỡ bản xuất bản» — машинный оборот; «bộ thẻ» = набор; название кнопки |
| 4 | id | … Simpan lagi saat terhubung. | … Ketuk “Simpan” lagi saat online. | название кнопки |
| 4 | tr | … Bağlanınca tekrar kaydet. | … İnternete bağlanınca “Kaydet” düğmesine yeniden dokun. | название кнопки; «bağlanınca» без «к интернету» неполно |
| 4 | pl | … Zapisz ponownie po połączeniu. | … Dotknij „Zapisz” ponownie, gdy będziesz online. | название кнопки; кавычки pl — „…” |
| 4 | uk | … Натисни «Зберегти» ще раз після підключення. | … Натисни «Зберегти» ще раз, коли буде інтернет. | «після підключення» — к чему? в ru «при подключении» тоже про сеть |

Итоговые строки для вставки (только изменённые):
- D194 pl: `Na dziś koniec prób głosowych`
- Карточка «вернуть» en: `Couldn’t restore the card.`
- Карточка «открыть» en: `Couldn’t open the card.` · pl: `Nie udało się otworzyć karty.`
- Набор, публикация не снята:
  - uk: `Набір збережено на пристрої, але зняти публікацію не вдалося. Натисни «Зберегти» ще раз, коли буде інтернет.`
  - en: `Saved on this device, but couldn’t unpublish the pack. Tap “Save” again when you’re online.`
  - es: `Guardado en este dispositivo, pero no se pudo retirar la publicación. Toca «Guardar» otra vez cuando tengas conexión.`
  - pt-BR: `Salvo neste dispositivo, mas não foi possível retirar a publicação. Toque em “Salvar” de novo quando estiver on-line.`
  - vi: `Đã lưu trên thiết bị này nhưng chưa hủy công khai được bộ thẻ. Hãy nhấn “Lưu” lại khi có mạng.`
  - id: `Tersimpan di perangkat ini, tetapi publikasi belum bisa dicabut. Ketuk “Simpan” lagi saat online.`
  - tr: `Bu cihaza kaydedildi ama yayın kaldırılamadı. İnternete bağlanınca “Kaydet” düğmesine yeniden dokun.`
  - pl: `Zapisano na tym urządzeniu, ale nie udało się cofnąć publikacji. Dotknij „Zapisz” ponownie, gdy będziesz online.`

Длина: самая длинная строка (pl, п. 4) — тост, переносится по строкам; кнопок и заголовков среди правок нет.
Пункт 5 (m06) — к сведению, правки Тем/Макетов, не трогаю.

### ПРАВКИ ПЕРЕВОДЧИКА — v2 (15.10, 09:02): п. 4 под новый русский

Новый ru (Дизайн, по правилу «без технических слов»): «Набор сохранён. Снять с публикации не получилось — попробуй ещё раз.»
Строки выше для п. 4 («сохрани ещё раз при подключении») **заменяются** этими. Без «онлайн/подключения», без названия кнопки — как в ru.

| язык | текст |
|---|---|
| ru | Набор сохранён. Снять с публикации не получилось — попробуй ещё раз. |
| uk | Набір збережено. Зняти з публікації не вийшло — спробуй ще раз. |
| en | Pack saved. Couldn’t unpublish it — try again. |
| es | Pack guardado. No se pudo retirar la publicación: inténtalo de nuevo. |
| pt-BR | Pacote salvo. Não deu para despublicar — tente de novo. |
| vi | Đã lưu bộ thẻ. Chưa hủy công khai được — thử lại nhé. |
| id | Paket tersimpan. Publikasi belum bisa dicabut — coba lagi. |
| tr | Paket kaydedildi. Yayından kaldırılamadı — tekrar dene. |
| pl | Zestaw zapisany. Nie udało się wycofać publikacji — spróbuj jeszcze raz. |

Почему так: «набор» по глоссарию (en pack, es pack, pt-BR pacote, vi bộ thẻ, id/tr paket, pl zestaw); es — двоеточие вместо тире (норма испанского);
pt-BR «Não deu para…» — неформально, как «не получилось»; vi «nhé» — мягкое «ты»-обращение; tr/id/pl — повелительное на «ты».

### ПРАВКИ ПЕРЕВОДЧИКА — m22 «Энергия закончилась → Plus» (15.10, к cc1c96b09 Авторизации)

Внесены прямо в `components/spire/moments/no_energy_sheet_strings.ts` (финальные строки из 0cf596364). Ru не тронут.

| ключ | язык | было (предложение Авторизации) | стало | почему |
|---|---|---|---|---|
| title | uk/es/pt-BR | Енергія закінчилася / Sin energía / Sem energia | Енергія закінчилась / Se acabó la energía / A energia acabou | 1-в-1 как существующее окно «Энергия закончилась» в приложении |
| sub | en/es/pt-BR/vi/tr | Next one in… / La siguiente en… / A próxima em… / Lượt tiếp theo… / Sonraki {t} içinde | More energy in… / La siguiente llega en… / A próxima chega em… / Năng lượng hồi lại sau… / Sıradaki enerji {t} sonra | «next one» без слова «энергия» повисает; tr «içinde» = «в течение», а не «через» |
| benefit | en/es/pt-BR/vi/id/tr/pl | Energy never runs out / … | Unlimited energy / Energía ilimitada / Energia ilimitada / Năng lượng không giới hạn / Energi tanpa batas / Sınırsız enerji / Energia bez limitu | так говорят в этих языках про подписку; буквальное «никогда не кончается» — калька |
| cta | pt-BR | Experimentar o Plus | Testar o Plus | короче для кнопки в одну строку |
| fineTrial | en/pt-BR | free trial… / teste grátis… | trial via the store / teste pela loja | ru не обещает «бесплатно» — пробный оформляет магазин |
| fineTrial | es/vi/id/tr/pl/uk | de la tienda / từ cửa hàng / dari toko / mağazadan / ze sklepu / з магазину | en la tienda / qua cửa hàng / lewat toko / mağaza üzerinden / w sklepie / із магазину | «через магазин», а не «пробный, взятый из магазина» |
| wait | id | Saya tunggu 10 menit | Aku tunggu 10 menit | приложение говорит на «kamu» — пара к нему «aku», не формальное «saya» |

Риск (повтор): «Подожду 10 минут» — число зашито, `{t}` показывает реальный отсчёт. Решать координатору/Авторизации.

### ПРАВКИ ПЕРЕВОДЧИКА — legacy_bonus «Встречайте PhraseMan 2.0» (15.10 ~12:10, по незакоммиченному modules/legacy_bonus/legacy_bonus_strings.ts)

Бренд «PhraseMan 2.0» не переводится — во всех 9 языках так. Ru не тронут. Принято как есть всё, кроме:

| ключ | язык | было | стало | почему |
|---|---|---|---|---|
| TITLE | id | Kenalan dengan PhraseMan 2.0 | Inilah PhraseMan 2.0 | «kenalan dengan» — «познакомься с (человеком)»; для продукта естественно «Вот он — PhraseMan 2.0» |
| ROW_SPINS | vi | Lượt quay vòng | Lượt quay | «quay vòng» — «крутиться по кругу», повтор; «lượt quay» — привычное «вращения» в играх |
| ROW_SPINS | tr | Çark dönüşleri | Çark çevirme hakkı | «dönüş» — физический оборот; в играх «çark çevirme hakkı» — право крутануть колесо |
| ROW_SPINS | pl | Obroty koła | Zakręcenia kołem | «obroty koła» — обороты колеса (механика); для колеса фортуны говорят «zakręcić kołem» |

Вопрос координатору: в поручении сказано, что в окне должны остаться ТОЛЬКО заголовок и подписи валют, а в файле ещё «Твои бонусы переходят в монеты», «Итого», «Понятно».
Их переводы проверены и верны; убирать ли сами строки — решение Дизайна/владельца.

### НОВЫЕ СТРОКИ ДИЗАЙНА — на проверку переводчику (15.10, после 12:00)

Источник правды — код; пишу полный список, чтобы переводчик проверил 9 языков и записал правки в раздел «ПРАВКИ ПЕРЕВОДЧИКА».

1. **Срок промокода** (`components/premium_celebration/celebrationLiquidCopy.ts`, `promoDurationText`): «Plus на 30 дней» / «Plus навсегда» — шаблоны: ru «{tier} на {N дней}» / «{tier} навсегда»; uk «на … / назавжди»; en «for … / forever»; es «por … / para siempre»; pt-BR «por … / para sempre»; vi «trong … / vĩnh viễn»; id «selama … / selamanya»; tr «{N} günlük {tier} / Kalıcı {tier}»; pl «na … / na zawsze». Слово «день» склоняется по числу.
2. **Окно «Встречайте PhraseMan 2.0»** (`modules/legacy_bonus/legacy_bonus_strings.ts`, 9 языков): заголовок, «Твои бонусы переходят в монеты», «Итого», «Понятно», названия строк (Опыт (XP) / Жемчуг / Вращения колеса), слово «монета» (формы). Подзаголовок «Всё, что ты накопил раньше…» удалён по решению владельца.
3. Правки переводчика к окну «Встречайте» (id заголовок, vi/tr/pl «вращения») внесены в код.
4. Цифра голоса на микрофонах — слов нет (только число и «PLUS»).

### ПРАВКИ ПЕРЕВОДЧИКА — сверка 15.10 ~12:20 (d10576ebd, 40fa3014c, dc5589c86): правок нет

- **«Промокод применён» — «Plus на N дней» / «Plus навсегда»** (`components/premium_celebration/celebrationLiquidCopy.ts`, d10576ebd): принято как есть.
  Число дней склоняется через общий `pluralWithCount` (с польским «21 dni» после 8de2094b5); tr «30 günlük Plus» / «Kalıcı Plus» и vi «trong 30 ngày» —
  естественный порядок слов; «навсегда»: forever / para siempre / para sempre / vĩnh viễn / selamanya / na zawsze — верно.
- **«Встречайте PhraseMan 2.0»** (`modules/legacy_bonus/legacy_bonus_strings.ts`, 40fa3014c): все 4 правки из d5960a686 внесены
  (id «Inilah PhraseMan 2.0», vi «Lượt quay», tr «Çark çevirme hakkı», pl «Zakręcenia kołem»); бренд не переведён — верно.
- **Лимит голоса** (dc5589c86): коммит меняет только момент списания попытки — новых текстов нет; строка «Голос на сегодня закончился»
  в `app/learning_v2_direct_session_player_v1.tsx` уже с правкой pl «Na dziś koniec prób głosowych».

### ПРАВКИ ПЕРЕВОДЧИКА — сверка 15.10 ~12:45 (91d6946f3, 659a909ce): правок нет

- **Тост «Не удалось сохранить настройку. Попробуй ещё раз.»** (`app/flashcards_voice_picker.tsx`, 91d6946f3): все 9 языков на месте и верны,
  на «ты», без системных слов.
- **Код друга «не нашли такой код»** (659a909ce): новых строк нет — ранний отказ без сети показывает существующий текст `unknown_code`
  в `components/referral_code_sheet.tsx` («Такой код не найден. Убедись, что это код приглашения Phraseman.»), 9 языков верны.

## ВЫЧИТКА 17.10 (координатор): новые строки дня

- **«Классический курс»** (98f738846, c92f7585d): все 9 языков без правок. Самый длинный — vi, 16 знаков, помещается в одну строку.
- **Экран «Сегодня»** (8b41a51b7, c9a5ca93d): заголовок, «Назад» и «Смотреть все» без правок. «Смотреть все» совпадает с лентой видео (`HomeV2VideoRail`), «Сегодня» — с заголовком блока на Главной (pl «Dziś» в обоих местах).
- **«Пока не выходит — попробуй через минуту»** (493135bf6): поправлена только id — «coba lagi semenit lagi» → «coba lagi dalam semenit» (там повторялось «lagi»). Остальные 10 языков (включая fr/de) без правок.
- **Окно голосового лимита** (eb0cf55d1 → макет `docs/design/v2-app/voice-limit-session-start.html`, D194): тексты в компоненте расходятся с макетом. Сайт перекладывает окно в шторку и берёт тексты ниже. Все на «ты». `{n}` — число попыток со словом, через `pluralWithCount`.

| | Заголовок | Текст | Счётчик | Главная кнопка | Вторая кнопка |
|---|---|---|---|---|---|
| ru | Голоса на всё занятие не хватит | В этом занятии есть задания с голосом, а на сегодня у тебя осталось {n} — закончить не получится. С Plus лимита на голос нет. | Голос на сегодня · {left} из {max} | Попробовать Plus | Начать всё равно |
| uk | Голосу на все заняття не вистачить | У цьому занятті є завдання з голосом, а на сьогодні в тебе лишилося {n} — завершити не вийде. З Plus ліміту на голос немає. | Голос на сьогодні · {left} з {max} | Спробувати Plus | Почати все одно |
| en | Not enough voice tries for this session | This session has voice tasks, and you have {n} left today — not enough to finish. Plus has no voice limit. | Voice today · {left} of {max} | Try Plus | Start anyway |
| es | Te faltan intentos de voz para esta sesión | Esta sesión tiene tareas de voz y hoy te quedan {n}: no podrás terminarla. Con Plus no hay límite de voz. | Voz de hoy · {left} de {max} | Probar Plus | Empezar igualmente |
| pt-BR | Faltam tentativas de voz para esta sessão | Esta sessão tem tarefas de voz e hoje você só tem {n} — não dá para terminar. Com o Plus não há limite de voz. | Voz hoje · {left} de {max} | Experimentar o Plus | Começar mesmo assim |
| vi | Không đủ lượt nói cho cả buổi học | Buổi học này có bài nói, nhưng hôm nay bạn chỉ còn {n} — không đủ để học hết. Với Plus, nói không giới hạn. | Giọng nói hôm nay · {left}/{max} | Dùng thử Plus | Vẫn bắt đầu |
| id | Percobaan suara tak cukup untuk sesi ini | Sesi ini punya tugas suara, tapi sisa percobaanmu hari ini {n} — tidak cukup sampai selesai. Dengan Plus, suara tanpa batas. | Suara hari ini · {left} dari {max} | Coba Plus | Tetap mulai |
| tr | Ses hakkın bu derse yetmeyecek | Bu derste sesli görevler var, bugün ise {n} kaldı — bitirmeye yetmez. Plus ile ses sınırı yok. | Bugünkü ses · {left}/{max} | Plus'ı dene | Yine de başla |
| pl | Za mało prób głosowych na całą lekcję | W tej lekcji są zadania głosowe, a na dziś zostały ci {n} — nie dasz rady skończyć. Z Plus nie ma limitu głosu. | Głos na dziś · {left} z {max} | Wypróbuj Plus | Zacznij mimo to |

Слово к числу `{n}`:

| Язык | Формы |
|---|---|
| ru | попытка / попытки / попыток |
| uk | спроба / спроби / спроб |
| pl | próba / próby / prób; глагол: «została ci 1 próba», «zostały ci 2 próby», «zostało ci 5 prób» |
| en | try / tries |
| es | intento / intentos |
| pt-BR | tentativa / tentativas |
| vi | «{left} lượt» |
| id | «{left}» без слова, в тексте уже есть «percobaanmu» |
| tr | «{left} ses hakkın» |

Если Сайт оставит одну строку без склонения глагола, для pl безопаснее «na dziś masz jeszcze {n}»: «masz» не склоняется по числу.

**Когда осталась одна попытка, глагол тоже меняется.** Окно показывается при 0, 1 или 2 оставшихся попытках, поэтому при 1 глагол в строке нужен другой:

| Язык | При 0 и 2 | При 1 |
|---|---|---|
| ru | «осталось 2 попытки», «осталось 0 попыток» | «осталась 1 попытка» |
| uk | «лишилося 2 спроби» | «лишилася 1 спроба» |
| pl | «zostały ci 2 próby» | «została ci 1 próba» |

Проще всего хранить строку целиком на каждую форму: one / few / many через `pluralFormFor`.
