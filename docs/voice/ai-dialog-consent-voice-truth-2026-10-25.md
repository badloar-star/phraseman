# Окно согласия ИИ-диалогов: правдивая фраза про голос ×9 (Переводчик, 25.10, срочно)

Для: 5 · ВХОД (вносит в `components/AiDialogConsentModal.tsx`, константа `body`), координатор.
Основание: проверка Ядра `docs/work/ai-dialog-consent-truth-2026-10-25.md` (e384e0228):
- в OpenAI уходит только текст;
- голос распознаёт системный сервис (iPhone — Apple, Android — Google), и он может обрабатывать звук на своих серверах;
- аудиофайл хранится только на телефоне.

Политика, раздел 13, говорит то же («may process your voice on the device or on Apple's servers» / «system speech recogniser,
which may be provided by Google»). Окно теперь с ней не расходится.

Тон: тепло, честно, коротко, без шуток. Ничего сверх кода не обещаем: «может обработать» — не «обрабатывает всегда» и не
«никогда не уходит».

## Полный текст `body` (первая и последняя фразы прежние, меняется середина)

| Язык | Текст |
|---|---|
| ru | Практикуй разговоры с персонажами и свободный разговор, получай обратную связь. Для этого то, что ты пишешь или говоришь, отправляется в OpenAI текстом. Голос распознаёт сервис телефона — Apple или Google, он может обработать его на своих серверах. Сама запись остаётся у тебя.\n\nМожно выключить в настройках в любой момент. |
| uk | Практикуй розмови з персонажами й вільну розмову, отримуй зворотний зв’язок. Для цього те, що ти пишеш або кажеш, надсилається в OpenAI текстом. Голос розпізнає сервіс телефона — Apple або Google, він може обробити його на своїх серверах. Сам запис залишається в тебе.\n\nМожна вимкнути в налаштуваннях будь-коли. |
| en | Practice conversations with characters and open conversation, and get feedback. To do this, what you type or say is sent to OpenAI as text. Your voice is recognised by your phone’s service — Apple or Google — which may process it on their servers. The recording itself stays with you.\n\nYou can turn this off in settings at any time. |
| es | Practica conversaciones con personajes y la conversación libre, y recibe comentarios. Para eso, lo que escribes o dices se envía a OpenAI como texto. Tu voz la reconoce el servicio del teléfono —Apple o Google—, que puede procesarla en sus servidores. La grabación en sí se queda contigo.\n\nPuedes desactivarlo en ajustes cuando quieras. |
| pt-BR | Pratique conversas com personagens e a conversa livre, e receba feedback. Para isso, o que você escreve ou fala é enviado à OpenAI como texto. Sua voz é reconhecida pelo serviço do celular — Apple ou Google —, que pode processá-la nos servidores deles. A gravação em si fica com você.\n\nVocê pode desativar isso nas configurações quando quiser. |
| vi | Luyện trò chuyện với các nhân vật và trò chuyện tự do, nhận phản hồi. Để làm vậy, những gì bạn viết hoặc nói được gửi tới OpenAI dưới dạng chữ. Giọng nói được dịch vụ của điện thoại — Apple hoặc Google — nhận dạng và có thể được xử lý trên máy chủ của họ. Bản ghi âm thì vẫn ở chỗ bạn.\n\nCó thể tắt trong cài đặt bất cứ lúc nào. |
| id | Berlatih percakapan dengan karakter dan percakapan bebas, dapatkan masukan. Untuk itu, yang kamu tulis atau ucapkan dikirim ke OpenAI sebagai teks. Suaramu dikenali oleh layanan ponsel — Apple atau Google — yang bisa memprosesnya di server mereka. Rekamannya sendiri tetap ada padamu.\n\nBisa dimatikan di pengaturan kapan saja. |
| tr | Karakterlerle ve serbest konuşmada pratik yap, geri bildirim al. Bunun için yazdıkların ya da söylediklerin OpenAI'ye metin olarak gönderilir. Sesini telefonun hizmeti — Apple ya da Google — tanır ve kendi sunucularında işleyebilir. Kaydın kendisi sende kalır.\n\nİstediğin zaman ayarlardan kapatabilirsin. |
| pl | Ćwicz rozmowy z postaciami i swobodną rozmowę, otrzymuj informację zwrotną. W tym celu to, co piszesz lub mówisz, trafia do OpenAI jako tekst. Głos rozpoznaje usługa telefonu — Apple lub Google — która może przetwarzać go na swoich serwerach. Samo nagranie zostaje u ciebie.\n\nMożesz to wyłączyć w ustawieniach w dowolnym momencie. |

`\n\n` — тот же перенос, что сейчас в коде. В tr апостроф в «OpenAI'ye» в коде экранирован (`\'`), как и сейчас.

## Проверка смысла на каждом языке

Во всех 9 строках три факта, без добавок:
1. в OpenAI — текст;
2. распознаёт сервис Apple/Google и **может** обработать на своих серверах;
3. сама запись — у человека, на телефоне.

## Ещё одно место с той же формулировкой

Старый комментарий над `body` («голос уходит текстом, запись остаётся на телефоне») стоит заменить вместе с текстом, чтобы
следующий автор не вернул неправду. `components/AiConsentSheetModalHybrid.tsx` и `components/dev/motion_showcase/sections/consent_info.tsx`
стоит проверить на копию старой фразы (поиск: «остаётся на телефоне» / «stays on your phone»).
