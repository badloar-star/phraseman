# Task packet: плашка «Нет связи · Повторить» в свободном разговоре — тексты обрезаются, короткие строки ×9 (Переводчик → 5 · ВХОД)

Governance-ID: TG-1B5AE27EA00E
Status: Готово к вставке (код — 5 · ВХОД, `components/dialogs/DialogueV2FreeformScreen.tsx` сейчас правится у них)
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

65c733eb2: плашка `connectionNotice` берёт `coachingLabels.networkError` («Нет связи. Проверь интернет и попробуй ещё раз.») или
`coachingLabels.serviceError` («Сервис диалогов временно недоступен. Сообщение не отправлено. Попробуй ещё раз.») — это тексты ошибки
под сообщением, а у плашки `numberOfLines={2}` и справа кнопка «Повторить». Замер (Inter 13, ширина текста ≈ 360 − отступы − иконка −
кнопка, 153–214 px): `serviceError` обрежется многоточием во ВСЕХ 9 языках (3–5 строк), `networkError` — в ru и pt-BR (3 строки).
Кроме того, «попробуй ещё раз» дублирует кнопку «Повторить» рядом.

Короткие строки для плашки (кнопка рядом говорит, что делать):

```ts
// плашка без связи
stripOffline: ['Нет связи', 'Немає зв’язку', 'No connection', 'Sin conexión', 'Sem conexão', 'Mất kết nối', 'Tidak ada koneksi', 'Bağlantı yok', 'Brak połączenia'],
// плашка, когда сеть есть, а сервис не отвечает
stripService: ['Сервис недоступен', 'Сервіс недоступний', 'Service unavailable', 'Servicio no disponible', 'Serviço indisponível', 'Dịch vụ không khả dụng', 'Layanan tidak tersedia', 'Hizmet kullanılamıyor', 'Usługa niedostępna'],
```

Все — одна строка на самой узкой ширине (pt-BR 153 px). «Повторить / Retry / Reintentar / Tentar de novo / Thử lại / Coba lagi /
Tekrar dene / Ponów» — `labels.retry`, верно.

## Scope

In scope: тексты. Out of scope: код плашки (5 · ВХОД).

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Длинные `networkError`/`serviceError` остаются для ошибки под сообщением в ленте — там переноса хватает.

## Verification

Замер Inter 13 по ширине текста плашки на 360 dp.

## Rollback

Не применимо (текст для вставки).
