# Task packet: тексты словаря V2 Learning V2 — вычитка 8 языков

Governance-ID: TG-19F996F2FC96
Status: In progress
Owner: «10 · ПЕРЕВОДЧИК»
Related epic/enabler: R07

## Outcome

`components/learning-v2/learning_v2_dictionary_v2_copy.ts` (закоммичен в 07789abb1, чужих правок нет): исправлены
строки, звучащие неестественно или неграмотно; ru не трогаю (дословно из макета).

Исправлено:
- pl `toastMany`: «5 słów **jest** teraz w Kartach» — для 2–4 нужно «są» («2 słowa są»), для 1 «jest». Форма без
  глагола работает для любого числа: **«W Kartach: {N słów}»**.
- id `offlineRest`: «**simpanan** dikirim nanti» — «simpanan» = сбережения (банк). → «yang disimpan akan dikirim nanti».
- tr `offlineRest`: «Kelimeler ve **çalışma çalışıyor**» — тавтология. → «Kelimeler ve alıştırma açık; kayıtları sonra göndeririz.»
- es `offlineRest`: «los guardados se enviarán» — неуклюже. → «lo que guardes se enviará después».
- pt-BR `offlineRest`: «os salvos serão enviados» — неуклюже. → «o que você salvar será enviado depois».
- tr `listen` / `saveWord` (подписи для экранного диктора): «{word} dinle», «{word} kartlara kaydet» — без падежа
  читается как приказ слову. → «Dinle: {word}», «Kartlara kaydet: {word}».

Названия режимов (Блиц / Устно / Напиши / Правда-ложь) в этом файле не встречаются: словарь открывает тренировку
«Карточек», где названия уже свои. Сверять нечего. Название раздела «Карточки» в строках словаря совпадает с приложением
(Cards / Tarjetas / Cartões / Thẻ / Kartu / Kartlar / Karty → «w Kartach»).

## Scope

In scope: строки текста в `learning_v2_dictionary_v2_copy.ts`. Out of scope: логика экрана, ru.

## Architecture

No architecture change.

## Security and privacy

Не применимо: только тексты.

## Technical debt

- Не проверено носителями.

## Verification

`babel.parseSync`; поиск тестов со старыми строками.

## Rollback

`git revert <коммит>`.
