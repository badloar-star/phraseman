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
