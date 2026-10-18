# Тексты состояния «ИИ отдохнёт до завтра» — 9 языков (макет docs/design/v2-app/ai-rest-state.html, c11627d7f)

Переводчик, 18.10. Тон — как у `plusDailyCap` в `app/dialogue_v2_session.tsx`. Без слов «сервер», «лимит», «ошибка». Заголовки ≤ 40 знаков.
Строку хаба «Подробный разбор — завтра» не переводил (её убирают).

## Диалоги

| | Заголовок | Текст | Строка Plus (только Free) |
|---|---|---|---|
| ru | На сегодня разговоров достаточно | Собеседник снова ответит завтра. | Больше разговоров в день — с Plus |
| uk | На сьогодні розмов досить | Співрозмовник знову відповість завтра. | Більше розмов на день — з Plus |
| en | That's enough talking for today | Your partner will reply again tomorrow. | More conversations a day with Plus |
| es | Por hoy ya hemos hablado bastante | Tu interlocutor volverá a responder mañana. | Más conversaciones al día con Plus |
| pt-BR | Por hoje já conversamos bastante | Seu parceiro de conversa volta a responder amanhã. | Mais conversas por dia com o Plus |
| vi | Hôm nay trò chuyện vậy là đủ rồi | Ngày mai bạn trò chuyện sẽ trả lời tiếp. | Trò chuyện nhiều hơn mỗi ngày với Plus |
| id | Hari ini sudah cukup mengobrol | Lawan bicaramu akan membalas lagi besok. | Lebih banyak obrolan per hari dengan Plus |
| tr | Bugünlük bu kadar sohbet yeter | Sohbet arkadaşın yarın yine cevap verecek. | Plus ile günde daha fazla sohbet |
| pl | Na dziś wystarczy rozmów | Rozmówca odpowie znowu jutro. | Więcej rozmów dziennie z Plus |

## Объяснить ошибку

| | Заголовок | Текст | Строка Plus (только Free) |
|---|---|---|---|
| ru | Объяснения на сегодня закончились | Правильный вариант — выше. Почему так, разберём завтра. | Больше объяснений в день — с Plus |
| uk | Пояснення на сьогодні закінчилися | Правильний варіант — вище. Чому так, розберемо завтра. | Більше пояснень на день — з Plus |
| en | No more explanations for today | The correct answer is above. We'll go over why tomorrow. | More explanations a day with Plus |
| es | Por hoy no hay más explicaciones | La respuesta correcta está arriba. Mañana vemos el porqué. | Más explicaciones al día con Plus |
| pt-BR | Por hoje acabaram as explicações | A resposta certa está acima. Amanhã vemos o porquê. | Mais explicações por dia com o Plus |
| vi | Hôm nay đã hết lượt giải thích | Đáp án đúng ở phía trên. Ngày mai mình xem vì sao nhé. | Giải thích nhiều hơn mỗi ngày với Plus |
| id | Penjelasan hari ini sudah habis | Jawaban yang benar ada di atas. Alasannya kita bahas besok. | Lebih banyak penjelasan per hari dengan Plus |
| tr | Bugünlük açıklamalar bitti | Doğru cevap yukarıda. Nedenine yarın bakarız. | Plus ile günde daha fazla açıklama |
| pl | Na dziś koniec wyjaśnień | Poprawna odpowiedź jest wyżej. Dlaczego tak — jutro. | Więcej wyjaśnień dziennie z Plus |

## Общие метки

| | Метка | Поле ввода | Кнопка |
|---|---|---|---|
| ru | Снова завтра | Продолжим завтра | Понятно |
| uk | Знову завтра | Продовжимо завтра | Зрозуміло |
| en | Back tomorrow | Let's continue tomorrow | Got it |
| es | De nuevo mañana | Seguimos mañana | Entendido |
| pt-BR | De novo amanhã | Continuamos amanhã | Entendi |
| vi | Mai lại tiếp | Mai mình tiếp nhé | Đã hiểu |
| id | Lagi besok | Kita lanjut besok | Mengerti |
| tr | Yarın yine | Yarın devam ederiz | Anladım |
| pl | Znowu jutro | Kontynuujemy jutro | Rozumiem |

Примечания: заголовки ≤ 40 знаков на всех языках (самый длинный — es «Por hoy ya hemos hablado bastante», 34). «Завтра» без часа — как в макете (полночь UTC у людей разная).
