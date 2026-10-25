# Черновик для политики конфиденциальности: немедленное удаление (вариант Б) — 5 · ВХОД, на утверждение владельца

Governance-ID: TG-5A36319FD462
Status: Черновик — в legal/privacy_policy_* только после «да» владельца (затем legal:sync)
Owner: 5 · ВХОД И АККАУНТ (поручение координатора 25.10)

## Outcome

Куда: legal/privacy_policy_en.json и legal/privacy_policy_en_ios.json, абзац про удаление аккаунта — сразу после фразы
«…Once the 14 days elapse, deletion runs and becomes irreversible.» (в terms_of_use_en — после «After the grace period, deletion
runs and cannot be reversed.»). Новых сроков хранения не добавляем (правило владельца 22.09: никаких конкретных сроков, кроме уже
утверждённых 14 дней).

### Основная фраза (пример Макетов)

EN: You can also choose to delete your account immediately; in that case deletion runs right away and cannot be undone.

### Вторая фраза — по желанию владельца (точнее описывает вариант Б)

EN: During the 14 days you are signed out on all devices, and your data stays closed until you sign in again and restore the account.

### Переводы (черновик; для сайта/показа владельцу; вычитка — 10 · ПЕРЕВОДЧИК)

| Язык | Основная фраза | Вторая фраза |
|---|---|---|
| ru | Можно также удалить аккаунт сразу — тогда удаление выполняется немедленно, и отменить его нельзя. | На эти 14 дней выполняется выход на всех устройствах, а данные остаются закрытыми, пока вы снова не войдёте и не восстановите аккаунт. |
| uk | Можна також видалити акаунт одразу — тоді видалення виконується негайно, і скасувати його не можна. | На ці 14 днів виконується вихід на всіх пристроях, а дані залишаються закритими, доки ви знову не ввійдете й не відновите акаунт. |
| es | También puedes eliminar tu cuenta de inmediato; en ese caso, la eliminación se realiza al momento y no se puede deshacer. | Durante esos 14 días se cierra la sesión en todos tus dispositivos y tus datos permanecen cerrados hasta que vuelvas a iniciar sesión y restaures la cuenta. |
| pt-BR | Você também pode excluir sua conta imediatamente; nesse caso, a exclusão acontece na hora e não pode ser desfeita. | Durante esses 14 dias, você sai da conta em todos os dispositivos, e seus dados ficam fechados até você entrar de novo e restaurar a conta. |
| vi | Bạn cũng có thể xóa tài khoản ngay lập tức; khi đó việc xóa được thực hiện ngay và không thể hoàn tác. | Trong 14 ngày đó, bạn sẽ bị đăng xuất trên mọi thiết bị và dữ liệu được khóa cho đến khi bạn đăng nhập lại và khôi phục tài khoản. |
| id | Kamu juga bisa menghapus akun saat itu juga; dalam hal ini penghapusan langsung dijalankan dan tidak bisa dibatalkan. | Selama 14 hari itu, kamu keluar dari akun di semua perangkat, dan datamu tetap tertutup sampai kamu masuk lagi dan memulihkan akun. |
| tr | Hesabını hemen silmeyi de seçebilirsin; bu durumda silme anında gerçekleşir ve geri alınamaz. | Bu 14 gün boyunca tüm cihazlarda oturumun kapatılır ve yeniden giriş yapıp hesabı geri yükleyene kadar verilerin kapalı kalır. |
| pl | Możesz też usunąć konto od razu — wtedy usunięcie następuje natychmiast i nie da się go cofnąć. | Przez te 14 dni zostajesz wylogowany na wszystkich urządzeniach, a Twoje dane pozostają zamknięte, dopóki nie zalogujesz się ponownie i nie przywrócisz konta. |

## Scope

Только черновик. Файлы политики не трогаются до «да» владельца. Политика на сайте — английская (legal/*_en*.json); переводы —
для показа владельцу и, если нужно, для страниц сайта на других языках.

## Architecture

Фразы описывают поведение сервера 713677ddd (не выложен): немедленное удаление по «Удалить навсегда сейчас» (deleteNow) и выход
со всех устройств на 14 дней. До выкладки сервера и появления кнопки в приложении в политику не вписывать — иначе обещание
опередит поведение.

## Security and privacy

Текст про удаление — юридическое обещание; формулировки точно повторяют поведение, без новых сроков.

## Technical debt

Вычитка переводов — 10 · ПЕРЕВОДЧИК.

## Verification

Сверка с кодом: account_delete.ts (deleteNow → удаление сразу; не-гость → revokeRefreshTokens, данные закрыты метками).

## Rollback

Черновик ничего не меняет.
