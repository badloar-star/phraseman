# Learning V2 / классический урок: «не расслышал» по причине и ручной ввод — 9 языков (Переводчик → Learning V2, 25.10)

Голос: `docs/work/VOICE.md`, тон — тепло с щепоткой юмора; человек понимает, что делать дальше. Порядок: ru, uk, en, es, pt-BR,
vi, id, tr, pl. Подпись под кнопкой микрофона — до 60 знаков (проверено: все ≤ 60).
Приложение говорит о себе в мужском роде («не разобрал», «дослушаю») — как в прежних строках; род ученика не угадываем.

## SpeakingPanel — почему не распознано (жалоба №4)

| Ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| short (< 0,25 с) | Отпускай кнопку после последнего слова — я дослушаю | Відпускай кнопку після останнього слова — я дослухаю | Let go after your last word — I’ll hear you out | Suelta tras la última palabra: te escucho hasta el final | Solta o botão depois da última palavra — eu escuto até o fim | Thả nút sau từ cuối cùng — mình nghe hết cho | Lepas setelah kata terakhir — aku dengar sampai habis | Son kelimeden sonra bırak — sonuna kadar dinlerim | Puść przycisk po ostatnim słowie — wysłucham do końca |
| long (> 6 с) | Длинная фраза! Скажи чуть быстрее — я успею | Довгий вислів! Скажи трохи швидше — я встигну | That’s a long one! Say it a bit faster — I’ll keep up | ¡Frase larga! Dila un poco más rápido, que te sigo | Frase longa! Fala um pouco mais rápido — eu acompanho | Câu dài quá! Nói nhanh hơn chút — mình theo kịp | Kalimatnya panjang! Ucapkan lebih cepat — aku kejar | Uzun bir cümle! Biraz hızlı söyle — yetişirim | Długie zdanie! Powiedz trochę szybciej — nadążę |
| loading (модель не готова) | Распознавание ещё просыпается. Секунду — и повтори | Розпізнавання ще прокидається. Секунду — і повтори | Speech recognition is still waking up. One sec, then retry | La voz aún se está despertando. Un segundo y repite | O reconhecimento ainda está acordando. Um segundo e repete | Nhận diện giọng nói đang khởi động. Đợi chút rồi nói lại | Pengenal suara masih bangun. Sebentar, lalu ulangi | Ses tanıma daha uyanıyor. Bir saniye, sonra tekrarla | Rozpoznawanie jeszcze się budzi. Sekunda i powtórz |
| empty (слов нет) | Не разобрал слова. Чуть ближе и погромче — и ещё раз | Не розібрав слів. Трохи ближче й гучніше — і ще раз | Couldn’t catch that. A bit closer, a bit louder — again | No pillé las palabras. Acércate, más alto y otra vez | Não peguei as palavras. Chega perto, fala alto e repete | Mình chưa nghe rõ. Lại gần, nói to hơn rồi thử lại | Belum tertangkap. Lebih dekat, lebih keras, ulangi ya | Kelimeleri seçemedim. Yaklaş, yüksek sesle tekrar et | Nie złapałem słów. Bliżej i głośniej — jeszcze raz |

## Ручной ввод (hardMode, жалоба №4)

| Ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| строка над полем (что включено · действие) | Пишешь с клавиатуры · Вернуть слова | Пишеш із клавіатури · Повернути слова | Typing it out · Use word tiles | Escribiendo a mano · Usar palabras | Digitando · Usar palavras | Đang gõ phím · Dùng ô chữ | Mengetik manual · Pakai kata | Klavyeyle yazıyorsun · Kelime seç | Piszesz z klawiatury · Wybieraj słowa |
| тост после тапа | Слова снова на месте | Слова знову на місці | Word tiles are back | Las palabras han vuelto | As palavras voltaram | Ô chữ đã quay lại | Kata-katanya kembali | Kelimeler geri geldi | Słowa wróciły |
| кнопка тоста (одно слово, отмена) | Отмена | Скасувати | Undo | Deshacer | Desfazer | Hoàn tác | Batalkan | Geri al | Cofnij |

Почему не «Включил выбор слов · Вернуть»: «включил» — прошедшее с родом, а «Вернуть» читается двояко (вернуть слова или
вернуть клавиатуру). «Отмена» однозначно отменяет последнее действие.
