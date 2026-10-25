# Task packet: «Удалить навсегда сейчас» — строки окна удаления ×9 (Переводчик → 5 · ВХОД, решение владельца 25.10)

Governance-ID: TG-47A657C5AA80
Status: Готово к вставке
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Строки для `components/DeleteAccountConfirmModal.tsx`: на «ты», как соседние; глагол — как в существующем «Удалить аккаунт?»
(uk видалити, es eliminar, pt-BR excluir, vi xóa, id hapus, tr sil, pl usunąć). Заголовок подтверждения по длине не длиннее
«Удалить аккаунт?» ни в одном языке.

| Ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| deleteNowCta | Удалить навсегда сейчас | Видалити назавжди зараз | Delete permanently now | Eliminar para siempre ahora | Excluir para sempre agora | Xóa vĩnh viễn ngay | Hapus permanen sekarang | Şimdi kalıcı olarak sil | Usuń na zawsze teraz |
| deleteNowTitle | Удалить сразу? | Видалити одразу? | Delete right away? | ¿Eliminar ya? | Excluir agora mesmo? | Xóa ngay? | Hapus sekarang juga? | Hemen silinsin mi? | Usunąć od razu? |
| deleteNowBody | Восстановить будет нельзя. | Відновити буде неможливо. | You won’t be able to restore it. | No se podrá recuperar. | Não será possível recuperar. | Sẽ không thể khôi phục. | Tidak bisa dipulihkan lagi. | Geri yüklemek mümkün olmayacak. | Nie będzie można tego przywrócić. |
| deleteNowConfirm | Удалить сейчас | Видалити зараз | Delete now | Eliminar ahora | Excluir agora | Xóa ngay | Hapus sekarang | Şimdi sil | Usuń teraz |
| appleReauthNote (iOS) | Apple может попросить подтвердить вход — это нужно, чтобы отвязать твой Apple ID | Apple може попросити підтвердити вхід — це потрібно, щоб відв’язати твій Apple ID | Apple may ask you to confirm sign-in — it’s needed to unlink your Apple ID | Apple puede pedirte que confirmes el inicio de sesión: es necesario para desvincular tu Apple ID | A Apple pode pedir que você confirme o login — isso é necessário para desvincular seu ID Apple | Apple có thể yêu cầu xác nhận đăng nhập — việc này cần để hủy liên kết Apple ID của bạn | Apple mungkin meminta konfirmasi masuk — ini perlu untuk melepas tautan Apple ID-mu | Apple girişi onaylamanı isteyebilir — bu, Apple ID’nin bağlantısını kaldırmak için gerekli | Apple może poprosić o potwierdzenie logowania — to potrzebne, by odłączyć twój Apple ID |

Заметки:
- vi: «Xóa ngay» совпадает у заголовка (с «?») и кнопки — для вьетнамского это естественно; при желании кнопка «Xóa ngay bây giờ».
- Apple в 2024 переименовала «Apple ID» в «Аккаунт Apple» (Account Apple / Cuenta de Apple / Conta Apple / Tài khoản Apple /
  Akun Apple / Apple Hesabı / Konto Apple / Обліковий запис Apple). Строка 5 оставлена по исходнику («Apple ID»); если в
  соседних строках приложения уже «Аккаунт Apple» — заменить во всех 9 языках разом.

## Scope

In scope: тексты. Out of scope: вёрстка (макет 3 · МАКЕТЫ), логика удаления.

## Architecture

No architecture change.

## Security and privacy

Тексты удаления аккаунта; новых данных нет. Срок 14 дней и «Удалить навсегда сейчас» — должны совпадать с политикой
конфиденциальности (раздел об удалении) — проверка за 5 · ВХОД при вставке.

## Technical debt

- Вставку в код делает 5 · ВХОД (файл их зоны).

## Verification

После вставки: `scan_untranslated_ui`, `informal_address_ru_uk_guard`.

## Rollback

Не применимо — документ.
