# 2.0.3 · «Готовим занятие…» (Learning V2) и «Не удалось загрузить наборы / Повторить» (Вход) — строки ×9 (Переводчик)

Governance-ID: TG-6EBC957B844F
Status: Готово к вставке; ключи — предложение
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Координатор 25.10, две пачки для 2.0.3. Порядок: ru, uk, en, es, pt-BR, vi, id, tr, pl.

### 1. Learning V2 — урок готов до тапа, состояние подготовки

Тон спокойный, без «подождите»; образец — `FlashcardsTrainingModeSheet.preparingSubtitle` («Готовим тренировку…») и
`dialogue_v2_freeform.loading` («Готовим разговор…»). Слово «занятие» — как уже в Learning V2 (`learning_v2_direct_session_player_v1.tsx`:
session / sesión / sessão / buổi / sesi / oturum / zajęcia).

```ts
preparingSession: ['Готовим занятие…', 'Готуємо заняття…', 'Getting your session ready…', 'Preparando tu sesión…', 'Preparando sua sessão…', 'Đang chuẩn bị buổi học…', 'Menyiapkan sesi…', 'Oturum hazırlanıyor…', 'Przygotowujemy zajęcia…'],
```

### 2. Вход — шторка наборов, сбой загрузки

Черновик уже стоит в `app/flashcards/ExpandedCardV2.tsx` (незакоммичено, сессия Входа). ru/uk/en/vi/pl верны. В es/pt-BR/id/tr
слово «набор» расходится с глоссарием 9 языков (a00f814c8: en/es pack, pt-BR pacote, id/tr paket, pl zestaw, vi bộ thẻ):

```ts
loadFailed: ['Не удалось загрузить наборы', 'Не вдалося завантажити набори', "Couldn't load your packs", 'No se pudieron cargar los packs', 'Não foi possível carregar os pacotes', 'Không tải được bộ thẻ', 'Paket tidak dapat dimuat', 'Paketler yüklenemedi', 'Nie udało się wczytać zestawów'],
retry: ['Повторить', 'Повторити', 'Retry', 'Reintentar', 'Tentar de novo', 'Thử lại', 'Coba lagi', 'Tekrar dene', 'Spróbuj ponownie'],
```

Правки против черновика: es «los sets» → «los packs», pt-BR «os conjuntos» → «os pacotes», id «Set» → «Paket», tr «Setler» → «Paketler».
`retry` — как в `clean_onboarding_copy_core.retry` и черновике (верно).

## Scope

In scope: тексты. Out of scope: код (Learning V2 — подготовка урока, Вход — шторка наборов).

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- `app/flashcards/CollectionHeaderV2.tsx:254` tr «Seti bildir» и `CollectionHeader.tsx:219` id «sebagai set» — то же расхождение
  с глоссарием (paket); не в этой задаче.

## Verification

Строки короткие (самая длинная — en `preparingSession`, 28 знаков); замер на экране — после вставки.

## Rollback

Не применимо (текст для вставки).

## Дополнение 25.10 — просьба 5 · ВХОД (проверка строк подготовки занятия)

Порядок: ru, uk, en, es, pt-BR, vi, id, tr, pl. Слово кнопки «Продолжить» — как на кнопке плеера Learning V2
(`learning_v2_direct_session_player_v1.tsx` resume: Продолжить / Продовжити / Continue / Continuar / Continuar / Tiếp tục / Lanjutkan /
Devam et / Kontynuuj). Образец второй строки — уже существующая версия с «Начать» (`app/(tabs)/lessons.tsx` ~3516).

```ts
// короткое состояние, пока занятие догружается
stillPreparing: ['Ещё готовится…', 'Ще готується…', 'Still getting ready…', 'Aún preparándose…', 'Ainda preparando…', 'Vẫn đang chuẩn bị…', 'Masih disiapkan…', 'Hâlâ hazırlanıyor…', 'Jeszcze się przygotowuje…'],
// подсказка, если нажали «Продолжить» раньше, чем занятие готово
stillPreparingContinue: ['Занятие ещё готовится. Нажми «Продолжить» через пару секунд', 'Заняття ще готується. Натисни «Продовжити» за кілька секунд', 'The session is still getting ready. Tap Continue again in a few seconds', 'La sesión aún se está preparando. Toca Continuar en unos segundos', 'A sessão ainda está sendo preparada. Toque em Continuar em alguns segundos', 'Buổi học vẫn đang chuẩn bị. Nhấn Tiếp tục sau vài giây', 'Sesi masih disiapkan. Ketuk Lanjutkan lagi dalam beberapa detik', "Oturum hâlâ hazırlanıyor. Birkaç saniye sonra Devam et'e dokun", 'Zajęcia jeszcze się przygotowują. Stuknij „Kontynuuj” za kilka sekund'],
```

Без слов «сессия», «интро», «попытка» (замок `no_dev_jargon_visible_copy_2026_10_25`). На «ты».
