# Task packet: окно удаления по макету «вариант Б» — строки ×9 (Переводчик → 5 · ВХОД, макет утверждён владельцем 25.10)

Governance-ID: TG-F752409352B6
Status: Готово к вставке
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Тексты дословно по `docs/design/v2-app/account-delete-variant-b.html`; на «ты»; глагол как в «Удалить аккаунт?»
(видалити / delete / eliminar / excluir / xóa / hapus / sil / usunąć). Строки с жирным — тремя частями «до | **жирное** | после»
(порядок слов в языке свой, поэтому жирный кусок у tr стоит в середине предложения иначе, чем в ru).
`[a|b|c]` — формы по числу: uk/pl один|2–4|5+; en/es/pt-BR один|много; vi, id, tr без форм. «14» в окне 1 — как в макете
(если срок придёт из кода — подставить `{n}` и формы из строки k).

### Окно 1

| Ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| w1.body.before | Аккаунт и данные удалятся | Акаунт і дані видаляться | Your account and data will be deleted | Tu cuenta y tus datos se eliminarán | Sua conta e seus dados serão excluídos | Tài khoản và dữ liệu sẽ bị xóa | Akun dan data akan dihapus | Hesabın ve verilerin | Konto i dane zostaną usunięte |
| w1.body.bold | через 14 дней | через 14 днів | in 14 days | en 14 días | em 14 dias | sau 14 ngày | dalam 14 hari | 14 gün sonra | za 14 dni |
| w1.body.after | . Передумаешь — войди снова тем же способом, и всё вернётся. | . Передумаєш — увійди знову тим самим способом, і все повернеться. | . Change your mind? Sign in again the same way and everything comes back. | . Si cambias de idea, vuelve a entrar del mismo modo y todo volverá. | . Se mudar de ideia, entre de novo do mesmo jeito e tudo volta. | . Đổi ý thì đăng nhập lại bằng cách cũ, mọi thứ sẽ trở lại. | . Berubah pikiran? Masuk lagi dengan cara yang sama, dan semuanya kembali. | silinecek. Fikrini değiştirirsen aynı yolla tekrar giriş yap, her şey geri gelir. | . Jeśli zmienisz zdanie, zaloguj się ponownie w ten sam sposób, a wszystko wróci. |
| w1.subscription | Подписка в App Store или Google Play сама не отменится. | Підписка в App Store чи Google Play сама не скасується. | Your App Store or Google Play subscription won’t cancel on its own. | La suscripción de App Store o Google Play no se cancelará sola. | A assinatura na App Store ou no Google Play não será cancelada sozinha. | Gói đăng ký trên App Store hoặc Google Play sẽ không tự hủy. | Langganan di App Store atau Google Play tidak akan batal sendiri. | App Store veya Google Play aboneliğin kendiliğinden iptal olmaz. | Subskrypcja w App Store lub Google Play nie anuluje się sama. |
| w1.cta | Удалить через 14 дней | Видалити через 14 днів | Delete in 14 days | Eliminar en 14 días | Excluir em 14 dias | Xóa sau 14 ngày | Hapus dalam 14 hari | 14 gün sonra sil | Usuń za 14 dni |
| w1.deleteNowLink | Удалить навсегда сейчас | Видалити назавжди зараз | Delete permanently now | Eliminar para siempre ahora | Excluir para sempre agora | Xóa vĩnh viễn ngay | Hapus permanen sekarang | Şimdi kalıcı olarak sil | Usuń na zawsze teraz |

Пробелы на стыке: `before` + « » + `bold` + `after` (after начинается с точки, у tr — с пробела и глагола).
Отмена — существующая строка.

### Окно 2

| Ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| w2.title | Удалить навсегда? | Видалити назавжди? | Delete permanently? | ¿Eliminar para siempre? | Excluir para sempre? | Xóa vĩnh viễn? | Hapus permanen? | Kalıcı olarak silinsin mi? | Usunąć na zawsze? |
| w2.body.before | Аккаунт, прогресс, фразы и серия удалятся | Акаунт, прогрес, вислови й серія видаляться | Your account, progress, phrases and streak will be deleted | La cuenta, el progreso, las frases y la racha se eliminarán | A conta, o progresso, as frases e a sequência serão excluídos | Tài khoản, tiến độ, câu và chuỗi sẽ bị xóa | Akun, progres, frasa, dan rangkaian akan dihapus | Hesap, ilerleme, ifadeler ve seri | Konto, postępy, zwroty i seria zostaną usunięte |
| w2.body.bold | сразу | одразу | right away | al instante | na hora | ngay lập tức | seketika | hemen | od razu |
| w2.body.after | . Вернуть их будет нельзя. | . Повернути їх буде неможливо. | . You won’t be able to get them back. | . No podrás recuperarlos. | . Não será possível recuperá-los. | . Không thể khôi phục lại. | . Semuanya tidak bisa dikembalikan. | silinecek. Geri getirmek mümkün olmayacak. | . Nie da się ich przywrócić. |
| w2.cta | Удалить навсегда | Видалити назавжди | Delete permanently | Eliminar para siempre | Excluir para sempre | Xóa vĩnh viễn | Hapus permanen | Kalıcı olarak sil | Usuń na zawsze |
| w2.back | Назад | Назад | Back | Atrás | Voltar | Quay lại | Kembali | Geri | Wstecz |

«Введи „УДАЛИТЬ“ для подтверждения:» — существующая строка в коде (слово-подтверждение УДАЛИТЬ/ВИДАЛИТИ/DELETE/… уже переведено).

### Окно 3 (по слову 5 · ВХОД пока не нужно — на будущее)

| Ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| w3.body | Аккаунт удалится через {n} [день\|дня\|дней]. Весь прогресс ещё на месте. | Акаунт видалиться через {n} [день\|дні\|днів]. Увесь прогрес ще на місці. | Your account will be deleted in {n} [day\|days]. All your progress is still here. | La cuenta se eliminará en {n} [día\|días]. Todo tu progreso sigue aquí. | A conta será excluída em {n} [dia\|dias]. Todo o seu progresso ainda está aqui. | Tài khoản sẽ bị xóa sau {n} ngày. Toàn bộ tiến độ vẫn còn nguyên. | Akun akan dihapus dalam {n} hari. Semua progresmu masih ada. | Hesap {n} gün sonra silinecek. Tüm ilerlemen hâlâ yerinde. | Konto zostanie usunięte za {n} [dzień\|dni\|dni]. Cały postęp wciąż jest na miejscu. |
| w3.label.streak | серия | серія | streak | racha | sequência | chuỗi | rangkaian | seri | seria |
| w3.label.phrases | [фраза\|фразы\|фраз] | [вислів\|вислови\|висловів] | [phrase\|phrases] | [frase\|frases] | [frase\|frases] | câu | frasa | ifade | [zwrot\|zwroty\|zwrotów] |
| w3.label.lessons | уроков | уроків | lessons | lecciones | lições | bài học | pelajaran | ders | lekcji |
| w3.streakValue | {n} [день\|дня\|дней] | {n} [день\|дні\|днів] | {n} [day\|days] | {n} [día\|días] | {n} [dia\|dias] | {n} ngày | {n} hari | {n} gün | {n} [dzień\|dni\|dni] |

Заметка: в макете под «3 из 32» стоит «урок» — по-русски нужно «уроков» (родительный множественного после «из 32»);
дал «уроков» и переводы в той же логике.

## Scope

In scope: тексты окон удаления по макету. Out of scope: вёрстка, логика удаления и восстановления.

## Architecture

No architecture change.

## Security and privacy

Тексты удаления аккаунта, новых данных нет. Срок 14 дней и «удалить навсегда сейчас» должны совпадать с политикой
конфиденциальности (раздел об удалении) — сверка за 5 · ВХОД при вставке.

## Technical debt

- Вставку в код делает 5 · ВХОД (их зона). Строки cfe36be02 «Удалить сразу?» / «Восстановить будет нельзя.» / «Удалить сейчас»
  заменены этим макетом и не нужны.

## Verification

После вставки: `scan_untranslated_ui`, `informal_address_ru_uk_guard`.

## Rollback

Не применимо — документ.
