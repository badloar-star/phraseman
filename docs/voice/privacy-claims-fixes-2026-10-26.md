# Четыре неправды о данных: правдивые тексты ×9 (Переводчик, 26.10, срочно)

Для: координатор → вносит 5 · ВХОД. Основание: проверка ВХОДа `docs/work/privacy-claims-truth-2026-10-26.md` (e20b47676).
Решение координатора: убрать неправдивую часть и **не добавлять новых обещаний**. Тон по VOICE.md для данных: тепло,
честно, коротко, без шуток. Порядок: ru, uk, en, es, pt-BR, vi, id, tr, pl.

## 1. Настройки приватности, пояснение к функциям ИИ — `app/privacy_settings.tsx:393`

Было: «…В зависимости от функции в OpenAI отправляется текст или речь…». Речь в OpenAI не уходит. Стало: «В OpenAI
отправляется текст». Слова «только» нет — нового обещания не даём.

| Язык | Текст |
|---|---|
| ru | Каждая функция работает только после отдельного согласия. В OpenAI отправляется текст. Выключено — новые запросы не отправляются. |
| uk | Кожна функція працює лише після окремої згоди. До OpenAI надсилається текст. Вимкнено — нові запити не надсилаються. |
| en | Each feature works only after separate consent. Text is sent to OpenAI. Turned off — no new requests are sent. |
| es | Cada función requiere un consentimiento separado. A OpenAI se envía texto. Al desactivarla, no se envían solicitudes nuevas. |
| pt-BR | Cada função exige um consentimento separado. Para a OpenAI é enviado texto. Desativada, nenhuma nova solicitação é enviada. |
| vi | Mỗi tính năng cần sự đồng ý riêng. Văn bản được gửi tới OpenAI. Khi tắt, không có yêu cầu mới nào được gửi. |
| id | Setiap fitur memerlukan persetujuan terpisah. Yang dikirim ke OpenAI adalah teks. Saat dimatikan, tidak ada permintaan baru yang dikirim. |
| tr | Her özellik ayrı onay gerektirir. OpenAI'ye metin gönderilir. Kapatıldığında yeni istek gönderilmez. |
| pl | Każda funkcja działa dopiero po osobnej zgodzie. Do OpenAI trafia tekst. Wyłączone — nowe zapytania nie są wysyłane. |

## 2. Онбординг, напоминание о конце пробного — `clean_onboarding_copy_core.ts:143–144`

Было: «Мы напомним заранее…» без условия. Стало — с условием, как в честной en-карточке пейвола. Род не угадываем:
«решать тебе», а не «решишь сам».

`trialReminderBodyDays`:

| Язык | Текст |
|---|---|
| ru | Попробуй Plus бесплатно {n} {days}. Если разрешишь уведомления — напомним заранее: продлевать или нет, решать тебе. |
| uk | Спробуй Plus безкоштовно {n} {days}. Якщо дозволиш сповіщення — нагадаємо заздалегідь: продовжувати чи ні, вирішувати тобі. |
| en | Try Plus free for {n} {days}. If you allow notifications, we’ll remind you ahead of time — whether to continue is up to you. |
| es | Prueba Plus gratis durante {n} {days}. Si permites las notificaciones, te avisaremos con tiempo: tú decides si continuar. |
| pt-BR | Teste o Plus grátis por {n} {days}. Se você permitir notificações, avisaremos com antecedência — continuar ou não é com você. |
| vi | Dùng thử Plus miễn phí {n} {days}. Nếu bạn cho phép thông báo, chúng tôi sẽ nhắc trước — tiếp tục hay không là do bạn. |
| id | Coba Plus gratis {n} {days}. Kalau kamu mengizinkan notifikasi, kami akan mengingatkan lebih dulu — lanjut atau tidak, kamu yang putuskan. |
| tr | Plus’ı {n} {days} ücretsiz dene. Bildirimlere izin verirsen önceden hatırlatırız — devam edip etmemek sana kalmış. |
| pl | Wypróbuj Plus za darmo przez {n} {days}. Jeśli pozwolisz na powiadomienia, przypomnimy wcześniej — o kontynuacji zdecydujesz ty. |

`trialReminderBody` — то же без «{n} {days}»:

| Язык | Текст |
|---|---|
| ru | Попробуй Plus бесплатно. Если разрешишь уведомления — напомним заранее: продлевать или нет, решать тебе. |
| uk | Спробуй Plus безкоштовно. Якщо дозволиш сповіщення — нагадаємо заздалегідь: продовжувати чи ні, вирішувати тобі. |
| en | Try Plus for free. If you allow notifications, we’ll remind you ahead of time — whether to continue is up to you. |
| es | Prueba Plus gratis. Si permites las notificaciones, te avisaremos con tiempo: tú decides si continuar. |
| pt-BR | Teste o Plus grátis. Se você permitir notificações, avisaremos com antecedência — continuar ou não é com você. |
| vi | Dùng thử Plus miễn phí. Nếu bạn cho phép thông báo, chúng tôi sẽ nhắc trước — tiếp tục hay không là do bạn. |
| id | Coba Plus gratis. Kalau kamu mengizinkan notifikasi, kami akan mengingatkan lebih dulu — lanjut atau tidak, kamu yang putuskan. |
| tr | Plus’ı ücretsiz dene. Bildirimlere izin verirsen önceden hatırlatırız — devam edip etmemek sana kalmış. |
| pl | Wypróbuj Plus za darmo. Jeśli pozwolisz na powiadomienia, przypomnimy wcześniej — o kontynuacji zdecydujesz ty. |

⚠ На решение координатора: заголовок над этим текстом `trialReminderTitle` — «Напомним до конца пробного». Он тоже без условия,
но условие сразу под ним, в теле. Если нужно без обещания и в заголовке — «Предупредим до конца пробного» не помогает
(то же обещание). Честный короткий вариант: «Конец пробного — без сюрпризов» ×9 дам по запросу.

## 3. Статистика: «анонимно / обезличено / видим только цифры»

Правда по проверке ВХОДа: статистика привязана к аккаунту (псевдонимно), не продаётся, выключается в любой момент. Слов
«анонимно» и «обезличено» нет.

`clean_onboarding_copy_core.ts:121` `improveBody`:

| Язык | Текст |
|---|---|
| ru | Видим, где урок даётся легко, а где все спотыкаются. Статистика привязана к аккаунту, не продаётся и выключается в любой момент. |
| uk | Бачимо, де урок дається легко, а де всі спотикаються. Статистика прив’язана до акаунта, не продається й вимикається будь-коли. |
| en | We see where a lesson feels easy and where everyone stumbles. The stats are tied to your account, never sold, and you can turn them off anytime. |
| es | Vemos dónde una lección resulta fácil y dónde todos tropiezan. Las estadísticas están vinculadas a tu cuenta, no se venden y puedes desactivarlas cuando quieras. |
| pt-BR | Vemos onde a lição é fácil e onde todo mundo tropeça. As estatísticas ficam ligadas à sua conta, não são vendidas e você pode desativá-las quando quiser. |
| vi | Chúng tôi thấy bài nào dễ và bài nào ai cũng vấp. Thống kê gắn với tài khoản của bạn, không bán cho ai và bạn có thể tắt bất cứ lúc nào. |
| id | Kami melihat pelajaran mana yang mudah dan mana yang bikin semua tersandung. Statistiknya terhubung ke akunmu, tidak dijual, dan bisa kamu matikan kapan saja. |
| tr | Hangi ders kolay, hangisinde herkes takılıyor — bunu görüyoruz. İstatistikler hesabına bağlıdır, satılmaz ve istediğin zaman kapatabilirsin. |
| pl | Widzimy, gdzie lekcja idzie łatwo, a gdzie wszyscy się potykają. Statystyki są powiązane z kontem, nie są sprzedawane i możesz je wyłączyć w każdej chwili. |

«never sold» в en — то же обещание, что «не продаём» в ru (уже есть в политике и в `privacyBody`); нового не добавляет.

`clean_onboarding_copy_core.ts:122` `improveShare` (переключатель):

| ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|
| Делиться статистикой | Ділитися статистикою | Share usage stats | Compartir estadísticas de uso | Compartilhar estatísticas de uso | Chia sẻ thống kê sử dụng | Bagikan statistik penggunaan | Kullanım istatistiklerini paylaş | Udostępniaj statystyki użycia |

`app/privacy_settings.tsx:331–332` (подпись к «Данным об использовании», включено):

| Язык | Текст |
|---|---|
| ru | Данные о том, как проходит обучение, — привязаны к аккаунту и не продаются. Не обязательно: приложение работает и без этого. Сбор сбоев для стабильности продолжается всегда. |
| uk | Дані про те, як проходить навчання, — прив’язані до акаунта й не продаються. Не обов’язково: застосунок працює і без цього. Збір збоїв для стабільності триває завжди. |
| en | Data about how your learning goes — tied to your account and never sold. Optional: the app works without it. Crash reports for stability are always collected. |
| es | Datos sobre cómo avanza tu aprendizaje: vinculados a tu cuenta y nunca se venden. No es obligatorio: la app funciona sin esto. La recolección de fallos para la estabilidad continúa siempre. |
| pt-BR | Dados sobre como seu aprendizado avança — ligados à sua conta e nunca vendidos. Não é obrigatório: o app funciona sem isso. A coleta de falhas para estabilidade continua sempre. |
| vi | Dữ liệu về việc học của bạn — gắn với tài khoản và không bán cho ai. Không bắt buộc: ứng dụng vẫn chạy. Việc thu thập sự cố để ổn định luôn tiếp tục. |
| id | Data tentang proses belajarmu — terhubung ke akun dan tidak dijual. Tidak wajib: aplikasi tetap jalan. Pengumpulan crash untuk stabilitas selalu berjalan. |
| tr | Öğrenmenin nasıl ilerlediğine dair veriler — hesabına bağlıdır ve satılmaz. Zorunlu değil: uygulama bunsuz da çalışır. Kararlılık için çökme toplama her zaman sürer. |
| pl | Dane o przebiegu nauki — powiązane z kontem i nie są sprzedawane. Nie jest to wymagane: aplikacja działa bez tego. Zbieranie awarii dla stabilności trwa zawsze. |

## 4. Режим «повтори» — `app/learning_v2_session_copy.ts:116 / 223 / 669` (`repeatPrivacy`)

Было: «Просто повтори вслух — голос не записываем и не оцениваем» / en «Practice repeat · your voice isn’t recorded or
graded». Обещание убрано, ничего не добавлено.

| ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|
| Просто повтори вслух | Просто повтори вголос | Just say it out loud | Solo dilo en voz alta | É só falar em voz alta | Chỉ cần nói thành tiếng | Ucapkan saja dengan lantang | Sadece sesli söyle | Po prostu powiedz to na głos |

## После внесения

- Сторож голоса (`owner_locks_voice_forbidden_phrases`) стоит дополнить запретом «анонимн / anonymous / обезличен / text or
  speech» в видимых строках, чтобы неправда не вернулась. Это предложение — решает координатор.
- Политику (`legal/`) эти правки не меняют: они приводят интерфейс в соответствие с ней.
