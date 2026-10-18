# «Никаких системных текстов пользователю» — проход по строкам интерфейса, 9 языков (координатор 03:28)

Проверка: скрипт-сканер по всем языковым записям (объекты ru/uk/en…, 9-элементные массивы, `tl/L/T/LP`)
в `app/ components/ constants/ modules/ hooks/ lib/` — 2482 файла, 7540 записей, 161 запись со «словами-подозреваемыми».
Отдельно: поиск вывода сырой ошибки на экран (`{error.message}`, `Alert.alert(…e.message)`) — на экран не выводится, всё только в журнал.

## Исправлено (только тексты)

| Где | Язык | Было | Стало |
|---|---|---|---|
| components/onboarding/clean_onboarding_copy_core.ts `signInBusy` (диктор) | ru / uk | «Вход всё ещё выполняется. Кнопки останутся недоступны до ответа провайдера.» | «Вход ещё идёт. Кнопки снова заработают, когда ответит Google или Apple.» / «Вхід ще триває. Кнопки знову запрацюють, коли відповість Google або Apple.» |
| components/RegistrationPromptModal.tsx (нет способов входа) | ru / uk | «Ни один провайдер не доступен на этом устройстве.» | «На этом телефоне нет доступного способа входа.» / «На цьому телефоні немає доступного способу входу.» |
| app/(tabs)/settings.tsx «Очистить временные файлы» — сбой | en / id / tr | «Failed» / «Gagal» / «Başarısız» | «Didn’t work» / «Tidak berhasil» / «Olmadı» |
| app/referrals.tsx (сбой прокрута) | uk, en, es, pt-BR, vi, id, tr, pl | «Помилка мережі / Network failed / Falló la red / Falha na rede / Lỗi mạng / Jaringan bermasalah / Ağ hatası / Błąd sieci» | «Зв’язок підвів / Lost connection / Se perdió la conexión / A conexão caiu / Mất kết nối / Koneksi terputus / Bağlantı koptu / Połączenie zawiodło» — как русское «Сеть подвела» |
| app/ai_dialog_session.tsx (перевод реплики не вышел) | en, es, pt-BR, vi, id, tr, pl | «Failed / Error / Falhou / Lỗi / Gagal / Hata / Błąd · Try again» | «Didn’t work · Translate again», «No salió · Traducir de nuevo», «Não deu · Traduzir de novo», «Không được · Dịch lại», «Belum berhasil · Terjemahkan lagi», «Olmadı · Yeniden çevir», «Nie wyszło · Przetłumacz ponownie» — как русское «Не вышло · Перевести снова» |
| components/dialogs/DialogHowToSaySheet.tsx | en | «Failed. Try again» / «Failed · Try again» | «Didn’t work. Try again» / «Didn’t work · Try again» |
| app/paywall_purchase.ts `status_check_failed` | все 9 | «Не удалось проверить статус…» | «Не удалось проверить подписку. Попробуй позже.» (и так на всех языках) |
| app/ai_dialog_client.ts (сообщение не ушло) | все 9 | «…Если ошибка повторится, вернись позже.» | «…Если снова не выйдет, вернись позже.» |

Тест `tests/registration_prompt_modal_lifecycle.test.ts` ищет новый текст вместо старого (иначе проверка «текста нет» стала бы пустой).

## Не системное — оставлено (ложные срабатывания сканера)

- id «gagal» = «не получилось» — обычное слово, так пишут приложения на индонезийском.
- vi «mạng» = «интернет/связь» — обычное слово («Không có mạng» = «Нет интернета»).
- es/pt «error/erro» в уроках, Пике и пейволе — ошибка ученика в ответе, не сбой программы.
- tr «çağrı / ağlıyor / ağrısız» — слова языка, сканер поймал «ağ» внутри слова.
- id «Api» = «огонь» (серия), es «proveedor» — слово из словаря урока.
- «Попробуй позже» с понятной причиной («Не удалось связаться с магазином», «Слишком много опросов подряд», «Промокоды сейчас выключены») — причина названа, правило соблюдено.

## Диалоги 2.0 (коммит Сайта 4e311f74a) — сверка, координатор 04:45

- `components/dialogs/dialogue_typing_caption.ts`: «{name} печатает…» — 9 языков верны. «Отвечает дольше обычного»: uk «Відповідає довше, ніж зазвичай», vi «Trả lời lâu hơn bình thường», id «Balasan lebih lama dari biasanya», pl «Odpowiada dłużej niż zwykle» (как в ru — «он/она отвечает», коротко).
- `components/dialog_limit_text.ts` «Лимит — N ответов в месяц»: ru/uk/pl/en склоняются по числу; es/pt «respuestas/respostas» без формы для 1 — лимит 30, не трогал.
- Системных слов в новых строках нет.

## Неразрывный пробел «слово + число» (ранги и уровень Диалогов)

` ` между словом и числом, чтобы число не уезжало на другую строку (tr — после «N.»):
`app/ai_dialog_briefing.tsx`, `app/dialogue_v2_briefing.tsx` («Откроется на ранге N», «Сейчас ранг N»),
`components/dialogs/DialogueV2CatalogueContainer.tsx`, `components/DialogsTabContent.tsx` (+ чип «ур. N»), все языки, включая fr/de.

Остальные связки «слово + число» по приложению (уровень, урок, этаж — около 360 мест) — вопрос координатору: лучше одним общим помощником, чем вручную.

## Сомнительное — координатору

1. `app/weekly_review_copy.ts` «Собираем данные для точного разбора» / «Данных уже достаточно…» — слово «данные» на грани; можно «Смотрим твои ответы, чтобы разобрать точнее» / «Ответов уже хватает для личного разбора». Русский — голос владельца, без ОК не трогал.
2. `app/weekly_review_copy.ts` `unavailable` «Сейчас обновить не удалось. Попробуй позже.» — не сказано, что именно; можно «Разбор недели сейчас не обновился. Попробуй позже.»
3. `components/BillingIssueToastHost.tsx` en «Payment failed — update your card and Plus stays with you» — «failed» здесь обычное английское, оставил.
