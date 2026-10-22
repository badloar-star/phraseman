# Task packet: политика — дуэли удалённого друга, отметка последнего захода; чек-лист Google OAuth

Governance-ID: none (задача координатора 22.10, docs + legal JSON)
Status: Готово к выкладке (выкладку запускает координатор после «да» владельца)
Owner: 9 · САЙТ → 0 · КООРДИНАТОР

## Outcome

1. Политика конфиденциальности описывает решение владельца «друг удалил аккаунт → история дуэлей остаётся, имя скрыто» (§20). Абзац на английском уже в `legal/*.json` и в копиях сайта/админки; ниже — тот же смысл на 9 языках интерфейса.
2. Ответ про отметку последнего захода: новая строка в политике **не нужна** (обоснование ниже).
3. Чек-лист повторной подачи брендинга Google OAuth на 23.10.

## Scope

In scope: `legal/privacy_policy_en.json`, `legal/privacy_policy_en_ios.json` и их копии после `npm run legal:sync`; хэши в `tests/legal_document_liquid_glass_source_contract.test.mjs`; этот документ.
Out of scope: код удаления аккаунта (уже есть: `functions/src/account_delete_friend_duels.ts`), выкладка.

## Architecture

No architecture change. Текст политики — единый источник `legal/*.json` → `npm run legal:sync`.

## Security and privacy

Сверено с кодом: при удалении у выжившего друга остаются только законченные дуэли (`finished`/`declined`/`expired`) и уведомления об итоге (`duel_result`/`duel_declined`); uid удалённого убран из `uids`/`challengerUid`/`opponentUid`, документ переложен под `anon_<sha256>`; в уведомлении очищены `fromUid`, `fromName`, `fromAvatar`, убран `actorStableUid`, стоит `fromDeleted: true` («Удалённый игрок» на телефоне). Открытые вызовы стираются.

## Technical debt

Политика описывает поведение функции удаления. Если 1 · ЯДРО ещё не выложило `account_delete_friend_duels.ts` в прод, выкладывать политику вместе с функцией или после неё.

## Verification

`node --test tests/legal_document_liquid_glass_source_contract.test.mjs` (8/8), `tests/legal_sync_idempotent_contract.test.mjs` (10/10), jest: legal_copies_sync, aa_guest_honesty, smart_reminder_wiring, spire_old_names_guard, support_diagnostics_privacy (42/42).

## Rollback

`git revert` коммита политики и `firebase deploy --only hosting:knowlywww,hosting:admin`.

---

## 1. Дуэли удалённого друга

**Покрывала ли текущая политика?** Нет. §20 говорил «удаляем или обезличиваем» записи друзей в общих словах, а §5 — что друг видит итог дуэли. Что запись **остаётся у друга** и под каким именем — нигде не было. Это и есть «что остаётся, что скрывается, у кого», поэтому абзац добавлен.

**Английский (канон, уже в §20 «Account and data deletion»):**

> Friend duels are handled so that the other person's history stays intact. If you delete your account, finished duels with a friend (their result and date) and the friend's notification about that result stay in your former friend's duel history, so their own record does not change. Your account ID, nickname and avatar are removed from those records and replaced with "Deleted player"; they are no longer linked to you and are visible only to that friend. Open duel challenges you have not answered are deleted. In the same way, if a friend deletes their account, your finished duels with them stay in your history under "Deleted player".

**Тот же абзац на 9 языках интерфейса** (для экрана удаления / справки в приложении; сайт держит политику на английском):

- **ru:** Дуэли с друзьями устроены так, чтобы история другого человека не пропадала. Если вы удалите аккаунт, законченные дуэли с другом (итог и дата) и его уведомление об итоге останутся в истории дуэлей бывшего друга — его собственные результаты не изменятся. Ваш идентификатор аккаунта, ник и аватар из этих записей удаляются, вместо них — «Удалённый игрок»; с вами записи больше не связаны и видны только этому другу. Открытые вызовы, на которые вы не ответили, удаляются. Так же, если друг удалит аккаунт, ваши законченные дуэли с ним останутся в вашей истории под именем «Удалённый игрок».
- **uk:** Дуелі з друзями влаштовані так, щоб історія іншої людини не зникала. Якщо ви видалите акаунт, завершені дуелі з другом (підсумок і дата) та його сповіщення про підсумок залишаться в історії дуелей колишнього друга — його власні результати не зміняться. Ваш ідентифікатор акаунта, нік і аватар із цих записів видаляються, замість них — «Видалений гравець»; з вами записи більше не пов'язані й видимі лише цьому другові. Відкриті виклики, на які ви не відповіли, видаляються. Так само, якщо друг видалить акаунт, ваші завершені дуелі з ним залишаться у вашій історії під ім'ям «Видалений гравець».
- **en:** (канон выше)
- **es:** Los duelos con amigos funcionan de forma que el historial de la otra persona no se pierda. Si eliminas tu cuenta, los duelos terminados con un amigo (resultado y fecha) y su notificación del resultado se quedan en el historial de duelos de tu antiguo amigo, así sus propios resultados no cambian. Tu ID de cuenta, tu apodo y tu avatar se eliminan de esos registros y se sustituyen por «Jugador eliminado»; ya no están vinculados a ti y solo los ve ese amigo. Los retos abiertos que no hayas respondido se eliminan. Del mismo modo, si un amigo elimina su cuenta, tus duelos terminados con él se quedan en tu historial como «Jugador eliminado».
- **pt-BR:** Os duelos com amigos funcionam para que o histórico da outra pessoa não se perca. Se você excluir sua conta, os duelos concluídos com um amigo (resultado e data) e a notificação dele sobre o resultado continuam no histórico de duelos do seu ex-amigo, para que os resultados dele não mudem. Seu ID de conta, apelido e avatar são removidos desses registros e substituídos por "Jogador excluído"; eles deixam de estar ligados a você e só esse amigo os vê. Desafios abertos que você não respondeu são excluídos. Da mesma forma, se um amigo excluir a conta, seus duelos concluídos com ele continuam no seu histórico como "Jogador excluído".
- **vi:** Đấu tay đôi với bạn bè được xử lý để lịch sử của người kia không bị mất. Nếu bạn xóa tài khoản, các trận đấu đã kết thúc với một người bạn (kết quả và ngày) cùng thông báo kết quả của người đó vẫn nằm trong lịch sử đấu của người bạn cũ, để kết quả của họ không thay đổi. ID tài khoản, biệt danh và ảnh đại diện của bạn bị xóa khỏi các bản ghi đó và thay bằng "Người chơi đã xóa"; chúng không còn liên kết với bạn và chỉ người bạn đó nhìn thấy. Các lời thách đấu đang mở mà bạn chưa trả lời sẽ bị xóa. Tương tự, nếu một người bạn xóa tài khoản, các trận đã kết thúc của bạn với họ vẫn ở trong lịch sử của bạn dưới tên "Người chơi đã xóa".
- **id:** Duel dengan teman diatur agar riwayat orang lain tidak hilang. Jika kamu menghapus akunmu, duel yang sudah selesai dengan seorang teman (hasil dan tanggal) serta notifikasi hasil milik teman itu tetap ada di riwayat duel mantan temanmu, sehingga hasil mereka sendiri tidak berubah. ID akun, nama panggilan, dan avatarmu dihapus dari catatan itu dan diganti dengan "Pemain yang dihapus"; catatan itu tidak lagi terhubung denganmu dan hanya terlihat oleh teman tersebut. Tantangan terbuka yang belum kamu jawab dihapus. Begitu juga, jika seorang teman menghapus akunnya, duel yang sudah selesai dengannya tetap ada di riwayatmu sebagai "Pemain yang dihapus".
- **tr:** Arkadaş düelloları, diğer kişinin geçmişi kaybolmayacak şekilde işlenir. Hesabını silersen, bir arkadaşınla tamamlanan düellolar (sonuç ve tarih) ve onun sonuç bildirimi eski arkadaşının düello geçmişinde kalır; böylece onun kendi sonuçları değişmez. Hesap kimliğin, takma adın ve avatarın bu kayıtlardan silinir ve yerine "Silinmiş oyuncu" yazar; kayıtlar artık seninle bağlantılı değildir ve yalnızca o arkadaş görür. Yanıtlamadığın açık meydan okumalar silinir. Aynı şekilde, bir arkadaşın hesabını silerse onunla tamamlanan düellolar geçmişinde "Silinmiş oyuncu" olarak kalır.
- **pl:** Pojedynki ze znajomymi działają tak, aby historia drugiej osoby nie znikała. Jeśli usuniesz konto, zakończone pojedynki ze znajomym (wynik i data) oraz jego powiadomienie o wyniku zostaną w historii pojedynków byłego znajomego, więc jego własne wyniki się nie zmienią. Twój identyfikator konta, nick i awatar zostaną usunięte z tych zapisów i zastąpione napisem „Usunięty gracz”; nie są już z Tobą powiązane i widzi je tylko ten znajomy. Otwarte wyzwania, na które nie odpowiedziałeś, są usuwane. Tak samo, jeśli znajomy usunie konto, wasze zakończone pojedynki zostaną w Twojej historii jako „Usunięty gracz”.

Подпись «Удалённый игрок» на телефоне ставит 8 · МОМЕНТЫ (`fromDeleted`); переводы подписи должны совпасть с кавычками выше — сверить с 10 · ПЕРЕВОДЧИК.

## 2. Отметка последнего захода («Тебя не было N дней») — строка в политике НЕ нужна

- Отметка — ключ `winback_last_active_at_v1` в AsyncStorage (`app/winback_offer.ts:19,51-68`), снимок разрыва — только в памяти процесса (`modules/welcome_back/welcome_back_signal.ts`).
- Ни облачная синхронизация (`app/cloud_sync.ts`), ни бэкап/восстановление этот ключ не читают — `grep winback_last_active_at_v1` находит только `app/winback_offer.ts`. На сервер не уходит.
- §3 политики уже покрывает такие данные: «settings … and similar app data on your device using AsyncStorage», удаляются с данными приложения и при удалении аккаунта.
- Отдельно: облако хранит своё `last_active_at` в профиле (`app/cloud_sync.ts:3773`) для синхронизации — это уже покрыто §4 (облачный прогресс и метаданные) и к надписи не относится.

Итог: **нет**, новой строки не нужно.

## 3. Google OAuth — повторная подача 23.10 (после 17:00, прошло 24 ч с подтверждения домена)

Проект `phraseman-ea0b3`, вход владельца badloar@gmail.com. Задание на 17:47 уже стоит в сессии 9 · САЙТ (сработает, только если сессия открыта).

**Перед подачей (2 мин):**
1. `https://knowlyapps.com/` открывается без входа, отдаёт 200, в заголовке и тексте «Phraseman», есть ссылка на `/legal/privacy/` — проверено 22.10.
2. `https://knowlyapps.com/legal/privacy/` и `/legal/terms/` открываются (200).
3. Search Console: свойство `https://knowlyapps.com/` подтверждено (22.10 ~17:00) — владелец тот же аккаунт.
4. Branding (`console.cloud.google.com/auth/branding?project=phraseman-ea0b3`): App name **Phraseman**; support email badloar@gmail.com; Home page `https://knowlyapps.com/`; Privacy `https://knowlyapps.com/legal/privacy/`; Terms `https://knowlyapps.com/legal/terms/`; Authorized domains: `phraseman-ea0b3.firebaseapp.com`, `knowlyapps.com`, `phraseman-ea0b3.web.app`, `us-central1-phraseman-ea0b3.cloudfunctions.net`; логотип не загружать (лишняя проверка).

**Подача (1 мин):**
5. `…/auth/branding;showIssues=true?project=phraseman-ea0b3` → «Branding verification issues» → выбрать **«I have fixed the issues»** → **Proceed**.
6. Если просит пояснение — текст ниже. Если просит видео/скоупы — у нас только базовые (email, profile, openid), видео не нужно.

**Пояснение для Google (если попросят):**
> We fixed all issues from the previous review. The home page is now https://knowlyapps.com/ (publicly accessible, no login). It describes the Phraseman app and its purpose (a language-learning app for speaking practice), uses the same app name "Phraseman" as the OAuth consent screen, and links to our privacy policy (https://knowlyapps.com/legal/privacy/) and terms (https://knowlyapps.com/legal/terms/). Ownership of knowlyapps.com is verified in Google Search Console under the same account. The app requests only the basic scopes (openid, email, profile) for Google Sign-In.

**После (1 мин):** Verification Center → статус «In review» / «Pending»; снимок экрана в отчёт координатору. Ответ Google обычно 3–5 рабочих дней, письмо на badloar@gmail.com. Срок Google — 12.01.2027.

## 4. «Итог недели друга» и переключатель (добавлено 22.10, пакет «Друзей»)

Сверено с кодом: запись `friends_week_v1` считается на телефоне (`app/friends_together/friend_week.ts`), едет в `users/{uid}.progress` синхронизацией; поля — занятия за неделю, дни с занятиями, серия на конец недели, лучший этаж Пика и рост к прошлой неделе, лучший день; две недели (идущая и прошлая). Сервер не отдаёт запись друзьям при `hidden: true` (`functions/src/friends_profiles.ts:264-266`). Переключатель «Показывать друзьям мою неделю» — `setMyFriendWeekHidden` (`app/friends_together/friend_week_store.ts:129`).

⚠ На 22.10 ни один экран не вызывает `setMyFriendWeekHidden` (текст `showMyWeek` есть, кнопки нет). Политика обещает переключатель — выкладывать её только вместе с экраном, где он есть.

**Английский (§5, после абзаца «Only friends you have accepted…»):**

> The weekly friend summary is calculated on your device and stored with your synced progress. It covers the current and the previous week: how many lessons you completed, on how many days you studied, your streak at the end of the week, your best Peak floor that week and how many floors it is above the previous week, and your best day. Only your accepted friends receive it, through the Friends section. You can turn off "Show my week to friends" at any time; while it is off, our servers stop sending your weekly summary to friends.

**9 языков интерфейса** (название переключателя — дословно из `friend_week_copy.ts:34`):

- **ru:** «Итог недели» для друзей считается на телефоне и хранится вместе с вашим синхронизированным прогрессом. Он охватывает текущую и прошлую неделю: сколько занятий вы прошли, сколько дней занимались, серию на конец недели, лучший этаж Пика за неделю и на сколько он выше прошлой недели, а также лучший день. Его получают только ваши принятые друзья — в разделе «Друзья». Переключатель «Показывать друзьям мою неделю» можно выключить в любой момент; пока он выключен, наши серверы не отдают ваш итог недели друзьям.
- **uk:** «Підсумок тижня» для друзів рахується на телефоні й зберігається разом із вашим синхронізованим прогресом. Він охоплює поточний і минулий тиждень: скільки занять ви пройшли, скільки днів займалися, серію на кінець тижня, найкращий поверх Піку за тиждень і на скільки він вищий за минулий тиждень, а також найкращий день. Його отримують лише ваші прийняті друзі — у розділі «Друзі». Перемикач «Показувати друзям мій тиждень» можна вимкнути будь-коли; поки він вимкнений, наші сервери не передають ваш підсумок тижня друзям.
- **en:** (канон выше)
- **es:** El resumen semanal para amigos se calcula en tu teléfono y se guarda con tu progreso sincronizado. Incluye la semana actual y la anterior: cuántas lecciones completaste, cuántos días estudiaste, tu racha al final de la semana, tu mejor piso del Pico esa semana y cuántos pisos está por encima de la semana anterior, y tu mejor día. Solo lo reciben tus amigos aceptados, en la sección Amigos. Puedes desactivar «Mostrar mi semana a mis amigos» cuando quieras; mientras esté desactivado, nuestros servidores dejan de enviar tu resumen semanal a tus amigos.
- **pt-BR:** O resumo semanal para amigos é calculado no seu celular e salvo com o seu progresso sincronizado. Ele cobre a semana atual e a anterior: quantas lições você concluiu, em quantos dias estudou, sua sequência no fim da semana, seu melhor andar do Pico na semana e quantos andares ele está acima da semana anterior, e seu melhor dia. Só seus amigos aceitos o recebem, na seção Amigos. Você pode desligar "Mostrar minha semana aos amigos" a qualquer momento; enquanto estiver desligado, nossos servidores deixam de enviar seu resumo semanal aos amigos.
- **vi:** Bản tổng kết tuần cho bạn bè được tính trên điện thoại của bạn và lưu cùng tiến độ đã đồng bộ. Nó gồm tuần hiện tại và tuần trước: bạn đã hoàn thành bao nhiêu bài, học bao nhiêu ngày, chuỗi ngày vào cuối tuần, tầng Đỉnh cao nhất trong tuần và cao hơn tuần trước bao nhiêu tầng, cùng ngày tốt nhất. Chỉ những người bạn đã chấp nhận mới nhận được, trong mục Bạn bè. Bạn có thể tắt "Cho bạn bè xem tuần của tôi" bất cứ lúc nào; khi tắt, máy chủ của chúng tôi ngừng gửi bản tổng kết tuần của bạn cho bạn bè.
- **id:** Rekap mingguan untuk teman dihitung di ponselmu dan disimpan bersama progresmu yang tersinkron. Isinya minggu ini dan minggu lalu: berapa pelajaran yang kamu selesaikan, berapa hari kamu belajar, streak di akhir minggu, lantai Puncak terbaikmu minggu itu dan berapa lantai lebih tinggi dari minggu sebelumnya, serta hari terbaikmu. Hanya teman yang sudah kamu terima yang mendapatkannya, di bagian Teman. Kamu bisa mematikan "Tampilkan mingguku ke teman" kapan saja; selama mati, server kami berhenti mengirim rekap mingguanmu ke teman.
- **tr:** Arkadaşlar için haftalık özet telefonunda hesaplanır ve eşitlenmiş ilerlemenle birlikte saklanır. İçinde bu hafta ve geçen hafta vardır: kaç ders tamamladığın, kaç gün çalıştığın, hafta sonundaki serin, o haftaki en iyi Zirve katın ve bunun geçen haftadan kaç kat yukarıda olduğu, ve en iyi günün. Bunu yalnızca kabul ettiğin arkadaşların, Arkadaşlar bölümünde alır. "Haftamı arkadaşlarıma göster" seçeneğini istediğin zaman kapatabilirsin; kapalıyken sunucularımız haftalık özetini arkadaşlarına göndermez.
- **pl:** Tygodniowe podsumowanie dla znajomych powstaje na Twoim telefonie i zapisuje się razem z Twoim zsynchronizowanym postępem. Obejmuje bieżący i poprzedni tydzień: ile lekcji ukończyłeś, przez ile dni się uczyłeś, Twoją serię na koniec tygodnia, Twoje najlepsze piętro Szczytu w tym tygodniu i o ile pięter wyżej niż w poprzednim tygodniu oraz Twój najlepszy dzień. Otrzymują je tylko zaakceptowani znajomi, w sekcji Znajomi. W każdej chwili możesz wyłączyć „Pokazuj znajomym mój tydzień”; gdy to wyłączone, nasze serwery przestają wysyłać Twoje podsumowanie tygodnia znajomym.
