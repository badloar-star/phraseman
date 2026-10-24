# Диалоги · ошибки сессии и свободного разговора по макету u31 — 9 языков (Переводчик → 5 · ВХОД)

Status: Готово к вставке
Owner: «10 · ПЕРЕВОДЧИК» (координатор 24.10, ночной режим)

Источник: `unapproved-gallery.html` u31 → макеты `dialogs.html` кадры C11, C15, C18, C19 и `dialogs-gaps-states.html`.
Решение 24.10: передано 5 · ВХОД вместе с зависанием свободного разговора. Порядок: ru, uk, en, es, pt-BR, vi, id, tr, pl.
На «ты», без рода. ru — дословно из макета.

## Новые строки (в коде звучат иначе или их нет)

```ts
  // C18 — сетевая ошибка, плашка по центру + «Повторить»
  networkError: ['Нет связи. Проверь интернет и попробуй ещё раз.', 'Немає зв’язку. Перевір інтернет і спробуй ще раз.', 'No connection. Check your internet and try again.', 'Sin conexión. Revisa internet e inténtalo de nuevo.', 'Sem conexão. Verifique a internet e tente de novo.', 'Mất kết nối. Hãy kiểm tra mạng rồi thử lại.', 'Tidak ada koneksi. Periksa internet lalu coba lagi.', 'Bağlantı yok. İnterneti kontrol edip tekrar dene.', 'Brak połączenia. Sprawdź internet i spróbuj ponownie.'],
  // C19 — сервис недоступен (сейчас в коде serviceError «Сообщение не отправилось…» — без причины)
  serviceUnavailable: ['Сервис диалогов временно недоступен. Сообщение не отправлено. Попробуй ещё раз.', 'Сервіс діалогів тимчасово недоступний. Повідомлення не надіслано. Спробуй ще раз.', 'The dialogue service is temporarily unavailable. Your message wasn’t sent. Try again.', 'El servicio de diálogos no está disponible por ahora. El mensaje no se envió. Inténtalo de nuevo.', 'O serviço de diálogos está indisponível no momento. A mensagem não foi enviada. Tente de novo.', 'Dịch vụ hội thoại tạm thời không khả dụng. Tin nhắn chưa được gửi. Thử lại nhé.', 'Layanan dialog sedang tidak tersedia. Pesan tidak terkirim. Coba lagi.', 'Diyalog hizmeti geçici olarak kullanılamıyor. Mesaj gönderilmedi. Tekrar dene.', 'Usługa dialogów jest chwilowo niedostępna. Wiadomość nie została wysłana. Spróbuj ponownie.'],
  // C15 none — устройство не умеет распознавать речь (сейчас в коде voiceUnavailable «Голосовой ввод недоступен…»)
  voiceUnsupported: ['Распознавание речи не работает на этом устройстве', 'Розпізнавання мовлення не працює на цьому пристрої', 'Speech recognition doesn’t work on this device', 'El reconocimiento de voz no funciona en este dispositivo', 'O reconhecimento de voz não funciona neste aparelho', 'Nhận dạng giọng nói không hoạt động trên thiết bị này', 'Pengenalan suara tidak berfungsi di perangkat ini', 'Konuşma tanıma bu cihazda çalışmıyor', 'Rozpoznawanie mowy nie działa na tym urządzeniu'],
```

Переводы `networkError` — те же, что у `auth_recovery_modal_model.ts` `errorNetwork`. Отличие только в конце: в макете
«попробуй ещё раз», там — «снова». Одна мысль — одни слова.

## Уже в коде и совпадает с макетом — не дублировать

| макет | ключ в коде | файл |
|---|---|---|
| «Повторить» | `offlineCta` | `components/dialogs/scene/dialogs_scene_copy.ts` |
| «Слишком много сообщений подряд. Подожди немного и попробуй ещё раз.» | `rateLimited` | `app/dialogue_v2_session_coaching_labels.ts` |
| «Нужен доступ к микрофону» / «Открыть настройки» | `voiceDenied` / `openSettings` | там же |
| «Собеседники сейчас недоступны. Загляни чуть позже.» | `pausedMessage` | там же |
| «Готовлю микрофон… удерживай кнопку» | `voiceStarting` | `app/dialogue_v2_session.tsx` |

## Замер

Плашка ошибки во всю ширину, текст переносится. Самая длинная строка — es `serviceUnavailable` (≈ 95 знаков), это 3 строки
при 15 px на 360 dp. Если место плашки ограничено двумя строками, короткая форма: ru «Сервис диалогов недоступен. Попробуй
ещё раз.» — дам 9 языков по запросу.
