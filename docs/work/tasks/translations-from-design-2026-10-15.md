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
