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
