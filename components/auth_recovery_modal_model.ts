import type { AuthRecoveryFlowState } from '../app/auth_recovery_flow';
import type { CleanInstallRecoveryFlowState } from '../app/auth_clean_install_recovery_flow';

export type AuthRecoveryUiLocale = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
export type AuthRecoveryEntryMode = 'google_instruction' | 'code_primary' | 'provider_choice';

type RecoveryHintLike = Readonly<{
  linked: boolean;
  provider?: 'google' | 'apple' | null;
  maskedEmail?: string | null;
}>;

export type AuthRecoveryCopy = Readonly<{
  entry: string;
  instructionTitle: string;
  googleInstruction: string;
  codeTitle: string;
  codeDescription: string;
  providerChoice: string;
  useGoogle: string;
  useApple: string;
  sendCode: string;
  codeLabel: string;
  confirm: string;
  resend: string;
  resendIn: string;
  expiresIn: string;
  working: string;
  supportTitle: string;
  supportBody: string;
  errorRateLimited: string;
  errorInvalidCode: string;
  errorExpired: string;
  errorNetwork: string;
  errorCancelled: string;
  errorSupport: string;
}>;

export type CleanInstallRecoveryScreen = 'provider' | 'email' | 'code' | 'resume' | 'support' | 'done';

export type CleanInstallRecoveryCopy = Readonly<{
  entry: string;
  providerTitle: string;
  providerBody: string;
  emailTitle: string;
  emailBody: string;
  emailLabel: string;
  emailPlaceholder: string;
  sendCode: string;
  sentTitle: string;
  sentBody: string;
  codeLabel: string;
  confirm: string;
  resend: string;
  resendIn: string;
  resendEmailHint: string;
  changeEmail: string;
  expiresIn: string;
  resumeTitle: string;
  resumeBody: string;
  resume: string;
  working: string;
  supportTitle: string;
  supportBody: string;
  errorEmail: string;
}>;

const COPY: Record<AuthRecoveryUiLocale, AuthRecoveryCopy> = {
  ru: {
    entry: 'Нет доступа к этому аккаунту?', instructionTitle: 'Сначала попробуй прежний Google-аккаунт',
    googleInstruction: 'Открой Настройки устройства → Аккаунты, добавь указанный ниже аккаунт, затем войди через Google. Если доступа к нему нет, запроси код.',
    codeTitle: 'Восстановление по коду', codeDescription: 'Мы отправим 6-значный код на привязанную почту. Адрес будет показан только в маскированном виде.',
    providerChoice: 'Выбери способ, которым был привязан аккаунт. Ответ не раскроет, существует ли аккаунт.',
    useGoogle: 'Продолжить через Google', useApple: 'Продолжить через Apple', sendCode: 'Отправить код',
    codeLabel: '6-значный код', confirm: 'Подтвердить', resend: 'Отправить код ещё раз', resendIn: 'Повторная отправка через', expiresIn: 'Код действует ещё',
    working: 'Проверяем и восстанавливаем аккаунт…', supportTitle: 'Нужна помощь поддержки',
    supportBody: 'Восстановление остановлено, чтобы не затронуть другой аккаунт. Локальные данные сохранены.',
    errorRateLimited: 'Слишком много попыток. Подожди немного и попробуй снова.', errorInvalidCode: 'Код не подошёл. Проверь все 6 цифр.',
    errorExpired: 'Срок действия кода истёк. Запроси новый код.', errorNetwork: 'Нет связи с сервером. Проверь интернет и попробуй снова.',
    errorCancelled: 'Вход был отменён. Можно попробовать ещё раз.', errorSupport: 'Не удалось безопасно продолжить. Обратись в поддержку.',
  },
  uk: {
    entry: 'Немає доступу до цього акаунта?', instructionTitle: 'Спочатку спробуй попередній Google-акаунт',
    googleInstruction: 'Відкрий Налаштування пристрою → Акаунти, додай указаний нижче акаунт, а потім увійди через Google. Якщо доступу немає, запроси код.',
    codeTitle: 'Відновлення за кодом', codeDescription: 'Ми надішлемо 6-значний код на прив’язану пошту. Адреса буде лише в маскованому вигляді.',
    providerChoice: 'Вибери спосіб, яким було прив’язано акаунт. Відповідь не розкриє, чи існує акаунт.',
    useGoogle: 'Продовжити через Google', useApple: 'Продовжити через Apple', sendCode: 'Надіслати код', codeLabel: '6-значний код',
    confirm: 'Підтвердити', resend: 'Надіслати код ще раз', resendIn: 'Повторне надсилання через', expiresIn: 'Код діє ще', working: 'Перевіряємо та відновлюємо акаунт…',
    supportTitle: 'Потрібна допомога підтримки', supportBody: 'Відновлення зупинено, щоб не зачепити інший акаунт. Локальні дані збережено.',
    errorRateLimited: 'Забагато спроб. Трохи зачекай і спробуй знову.', errorInvalidCode: 'Код не підійшов. Перевір усі 6 цифр.',
    errorExpired: 'Термін дії коду минув. Запроси новий код.', errorNetwork: 'Немає зв’язку із сервером. Перевір інтернет і спробуй знову.',
    errorCancelled: 'Вхід скасовано. Можна спробувати ще раз.', errorSupport: 'Не вдалося безпечно продовжити. Звернися до підтримки.',
  },
  es: {
    entry: '¿No tienes acceso a esta cuenta?', instructionTitle: 'Primero prueba tu cuenta anterior de Google',
    googleInstruction: 'Abre Ajustes del dispositivo → Cuentas, añade la cuenta indicada abajo y después entra con Google. Si no tienes acceso, solicita un código.',
    codeTitle: 'Recuperar con un código', codeDescription: 'Enviaremos un código de 6 dígitos al correo vinculado. Solo mostraremos la dirección oculta.',
    providerChoice: 'Elige cómo vinculaste la cuenta. La respuesta no revelará si una cuenta existe.',
    useGoogle: 'Continuar con Google', useApple: 'Continuar con Apple', sendCode: 'Enviar código', codeLabel: 'Código de 6 dígitos',
    confirm: 'Confirmar', resend: 'Enviar otro código', resendIn: 'Puedes reenviar en', expiresIn: 'El código caduca en', working: 'Comprobando y recuperando la cuenta…',
    supportTitle: 'Necesitas ayuda de soporte', supportBody: 'La recuperación se detuvo para no afectar otra cuenta. Tus datos locales siguen a salvo.',
    errorRateLimited: 'Demasiados intentos. Espera un poco y vuelve a intentarlo.', errorInvalidCode: 'El código no es correcto. Revisa los 6 dígitos.',
    errorExpired: 'El código ha caducado. Solicita uno nuevo.', errorNetwork: 'No podemos conectar con el servidor. Revisa internet e inténtalo de nuevo.',
    errorCancelled: 'Se canceló el acceso. Puedes intentarlo de nuevo.', errorSupport: 'No se puede continuar de forma segura. Contacta con soporte.',
  },
  'pt-BR': {
    entry: 'Sem acesso a esta conta?', instructionTitle: 'Primeiro tente sua conta Google anterior',
    googleInstruction: 'Abra Ajustes do dispositivo → Contas, adicione a conta indicada abaixo e depois entre com Google. Se não tiver acesso, peça um código.',
    codeTitle: 'Recuperar com código', codeDescription: 'Enviaremos um código de 6 dígitos ao e-mail vinculado. O endereço aparecerá mascarado.',
    providerChoice: 'Escolha como a conta foi vinculada. A resposta não revelará se uma conta existe.',
    useGoogle: 'Continuar com Google', useApple: 'Continuar com Apple', sendCode: 'Enviar código', codeLabel: 'Código de 6 dígitos',
    confirm: 'Confirmar', resend: 'Enviar outro código', resendIn: 'Reenviar em', expiresIn: 'O código expira em', working: 'Verificando e recuperando a conta…',
    supportTitle: 'Ajuda do suporte necessária', supportBody: 'A recuperação foi interrompida para não afetar outra conta. Seus dados locais estão preservados.',
    errorRateLimited: 'Muitas tentativas. Aguarde um pouco e tente novamente.', errorInvalidCode: 'O código não confere. Verifique os 6 dígitos.',
    errorExpired: 'O código expirou. Solicite um novo.', errorNetwork: 'Sem conexão com o servidor. Verifique a internet e tente novamente.',
    errorCancelled: 'O acesso foi cancelado. Você pode tentar novamente.', errorSupport: 'Não foi possível continuar com segurança. Fale com o suporte.',
  },
  vi: {
    entry: 'Không truy cập được tài khoản này?', instructionTitle: 'Trước tiên hãy thử tài khoản Google cũ',
    googleInstruction: 'Mở Cài đặt thiết bị → Tài khoản, thêm tài khoản hiển thị bên dưới rồi đăng nhập bằng Google. Nếu không truy cập được, hãy yêu cầu mã.',
    codeTitle: 'Khôi phục bằng mã', codeDescription: 'Chúng tôi sẽ gửi mã 6 chữ số tới email đã liên kết. Địa chỉ chỉ hiển thị ở dạng che.',
    providerChoice: 'Chọn cách tài khoản đã được liên kết. Phản hồi sẽ không tiết lộ tài khoản có tồn tại hay không.',
    useGoogle: 'Tiếp tục với Google', useApple: 'Tiếp tục với Apple', sendCode: 'Gửi mã', codeLabel: 'Mã 6 chữ số',
    confirm: 'Xác nhận', resend: 'Gửi lại mã', resendIn: 'Có thể gửi lại sau', expiresIn: 'Mã hết hạn sau', working: 'Đang kiểm tra và khôi phục tài khoản…',
    supportTitle: 'Cần hỗ trợ', supportBody: 'Quá trình khôi phục đã dừng để không ảnh hưởng tài khoản khác. Dữ liệu trên máy vẫn được giữ.',
    errorRateLimited: 'Quá nhiều lần thử. Hãy chờ một chút rồi thử lại.', errorInvalidCode: 'Mã không đúng. Hãy kiểm tra đủ 6 chữ số.',
    errorExpired: 'Mã đã hết hạn. Hãy yêu cầu mã mới.', errorNetwork: 'Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.',
    errorCancelled: 'Đăng nhập đã bị hủy. Bạn có thể thử lại.', errorSupport: 'Không thể tiếp tục an toàn. Hãy liên hệ hỗ trợ.',
  },
  id: {
    entry: 'Tidak bisa mengakses akun ini?', instructionTitle: 'Coba akun Google lamamu terlebih dahulu',
    googleInstruction: 'Buka Setelan perangkat → Akun, tambahkan akun yang ditampilkan di bawah, lalu masuk dengan Google. Jika tidak bisa mengaksesnya, minta kode.',
    codeTitle: 'Pulihkan dengan kode', codeDescription: 'Kami akan mengirim kode 6 digit ke email tertaut. Alamat hanya ditampilkan dalam bentuk tersamarkan.',
    providerChoice: 'Pilih cara akun ditautkan. Jawaban tidak akan mengungkap apakah akun ada.',
    useGoogle: 'Lanjutkan dengan Google', useApple: 'Lanjutkan dengan Apple', sendCode: 'Kirim kode', codeLabel: 'Kode 6 digit',
    confirm: 'Konfirmasi', resend: 'Kirim kode lagi', resendIn: 'Kirim ulang dalam', expiresIn: 'Kode kedaluwarsa dalam', working: 'Memeriksa dan memulihkan akun…',
    supportTitle: 'Perlu bantuan dukungan', supportBody: 'Pemulihan dihentikan agar tidak memengaruhi akun lain. Data lokal tetap tersimpan.',
    errorRateLimited: 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.', errorInvalidCode: 'Kode tidak cocok. Periksa keenam digit.',
    errorExpired: 'Kode sudah kedaluwarsa. Minta kode baru.', errorNetwork: 'Tidak dapat terhubung ke server. Periksa internet lalu coba lagi.',
    errorCancelled: 'Login dibatalkan. Kamu dapat mencoba lagi.', errorSupport: 'Tidak dapat melanjutkan dengan aman. Hubungi dukungan.',
  },
  tr: {
    entry: 'Bu hesaba erişemiyor musun?', instructionTitle: 'Önce önceki Google hesabını dene',
    googleInstruction: 'Cihaz Ayarları → Hesaplar bölümünü aç, aşağıda gösterilen hesabı ekle ve ardından Google ile giriş yap. Erişemiyorsan kod iste.',
    codeTitle: 'Kodla kurtar', codeDescription: 'Bağlı e-postaya 6 haneli kod göndereceğiz. Adres yalnızca maskeli gösterilir.',
    providerChoice: 'Hesabın nasıl bağlandığını seç. Yanıt, hesabın var olup olmadığını açıklamaz.',
    useGoogle: 'Google ile devam et', useApple: 'Apple ile devam et', sendCode: 'Kod gönder', codeLabel: '6 haneli kod',
    confirm: 'Onayla', resend: 'Kodu yeniden gönder', resendIn: 'Yeniden gönderme süresi', expiresIn: 'Kodun kalan süresi', working: 'Hesap kontrol ediliyor ve kurtarılıyor…',
    supportTitle: 'Destek yardımı gerekli', supportBody: 'Başka bir hesabı etkilememek için kurtarma durduruldu. Yerel verilerin korunuyor.',
    errorRateLimited: 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.', errorInvalidCode: 'Kod eşleşmedi. 6 haneyi kontrol et.',
    errorExpired: 'Kodun süresi doldu. Yeni kod iste.', errorNetwork: 'Sunucuya bağlanılamıyor. İnterneti kontrol edip tekrar dene.',
    errorCancelled: 'Giriş iptal edildi. Tekrar deneyebilirsin.', errorSupport: 'Güvenli biçimde devam edilemiyor. Destekle iletişime geç.',
  },
  pl: {
    entry: 'Nie masz dostępu do tego konta?', instructionTitle: 'Najpierw spróbuj poprzedniego konta Google',
    googleInstruction: 'Otwórz Ustawienia urządzenia → Konta, dodaj konto pokazane niżej, a potem zaloguj się przez Google. Jeśli nie masz dostępu, poproś o kod.',
    codeTitle: 'Odzyskaj za pomocą kodu', codeDescription: 'Wyślemy 6-cyfrowy kod na powiązany e-mail. Adres pokażemy tylko w zamaskowanej formie.',
    providerChoice: 'Wybierz sposób powiązania konta. Odpowiedź nie ujawni, czy konto istnieje.',
    useGoogle: 'Kontynuuj przez Google', useApple: 'Kontynuuj przez Apple', sendCode: 'Wyślij kod', codeLabel: '6-cyfrowy kod',
    confirm: 'Potwierdź', resend: 'Wyślij kod ponownie', resendIn: 'Ponowne wysłanie za', expiresIn: 'Kod wygaśnie za', working: 'Sprawdzamy i odzyskujemy konto…',
    supportTitle: 'Potrzebna pomoc wsparcia', supportBody: 'Odzyskiwanie zatrzymano, aby nie naruszyć innego konta. Dane lokalne zostały zachowane.',
    errorRateLimited: 'Zbyt wiele prób. Poczekaj chwilę i spróbuj ponownie.', errorInvalidCode: 'Kod jest nieprawidłowy. Sprawdź wszystkie 6 cyfr.',
    errorExpired: 'Kod wygasł. Poproś o nowy.', errorNetwork: 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.',
    errorCancelled: 'Logowanie anulowano. Możesz spróbować ponownie.', errorSupport: 'Nie można bezpiecznie kontynuować. Skontaktuj się ze wsparciem.',
  },
};

const CLEAN_INSTALL_COPY: Record<AuthRecoveryUiLocale, CleanInstallRecoveryCopy> = {
  ru: {
    entry: 'Восстановить по email', providerTitle: 'Подтверди способ входа',
    providerBody: 'Сначала подтверди Google или Apple на этом устройстве. Это защищает восстановление от посторонних.',
    emailTitle: 'Введи email аккаунта', emailBody: 'Укажи почту, к которой был привязан прогресс.',
    emailLabel: 'Email аккаунта', emailPlaceholder: 'name@example.com', sendCode: 'Отправить код',
    sentTitle: 'Проверь почту', sentBody: 'Если данные подходят, письмо с 6-значным кодом уже отправлено.',
    codeLabel: '6-значный код', confirm: 'Подтвердить и восстановить', resend: 'Отправить код ещё раз',
    resendIn: 'Повторная отправка через', resendEmailHint: 'Для повторной отправки снова введи email.', changeEmail: 'Изменить email', expiresIn: 'Код действует ещё', resumeTitle: 'Продолжить восстановление',
    resumeBody: 'Проверка уже завершена. Безопасно продолжи перенос аккаунта.', resume: 'Продолжить',
    working: 'Безопасно восстанавливаем аккаунт…', supportTitle: 'Нужна помощь поддержки',
    supportBody: 'Восстановление остановлено, чтобы не затронуть другой аккаунт. Локальные данные сохранены.',
    errorEmail: 'Введи корректный email.',
  },
  uk: {
    entry: 'Відновити за email', providerTitle: 'Підтвердь спосіб входу',
    providerBody: 'Спочатку підтвердь Google або Apple на цьому пристрої. Це захищає відновлення від сторонніх.',
    emailTitle: 'Введи email акаунта', emailBody: 'Укажи пошту, до якої було прив’язано прогрес.',
    emailLabel: 'Email акаунта', emailPlaceholder: 'name@example.com', sendCode: 'Надіслати код',
    sentTitle: 'Перевір пошту', sentBody: 'Якщо дані підходять, лист із 6-значним кодом уже надіслано.',
    codeLabel: '6-значний код', confirm: 'Підтвердити й відновити', resend: 'Надіслати код ще раз',
    resendIn: 'Повторне надсилання через', resendEmailHint: 'Для повторного надсилання знову введи email.', changeEmail: 'Змінити email', expiresIn: 'Код діє ще', resumeTitle: 'Продовжити відновлення',
    resumeBody: 'Перевірку вже завершено. Безпечно продовж перенесення акаунта.', resume: 'Продовжити',
    working: 'Безпечно відновлюємо акаунт…', supportTitle: 'Потрібна допомога підтримки',
    supportBody: 'Відновлення зупинено, щоб не зачепити інший акаунт. Локальні дані збережено.',
    errorEmail: 'Введи коректний email.',
  },
  es: {
    entry: 'Recuperar por email', providerTitle: 'Confirma cómo inicias sesión',
    providerBody: 'Primero confirma Google o Apple en este dispositivo. Así protegemos la recuperación.',
    emailTitle: 'Introduce el email de la cuenta', emailBody: 'Usa el correo vinculado a tu progreso.',
    emailLabel: 'Email de la cuenta', emailPlaceholder: 'nombre@ejemplo.com', sendCode: 'Enviar código',
    sentTitle: 'Revisa tu correo', sentBody: 'Si los datos coinciden, ya enviamos un código de 6 dígitos.',
    codeLabel: 'Código de 6 dígitos', confirm: 'Confirmar y recuperar', resend: 'Enviar otro código',
    resendIn: 'Puedes reenviar en', resendEmailHint: 'Vuelve a introducir el email para reenviar.', changeEmail: 'Cambiar email', expiresIn: 'El código caduca en', resumeTitle: 'Continuar la recuperación',
    resumeBody: 'La verificación ya terminó. Continúa de forma segura con el traslado de la cuenta.', resume: 'Continuar',
    working: 'Recuperando la cuenta de forma segura…', supportTitle: 'Necesitas ayuda de soporte',
    supportBody: 'La recuperación se detuvo para no afectar otra cuenta. Tus datos locales siguen a salvo.',
    errorEmail: 'Introduce un email válido.',
  },
  'pt-BR': {
    entry: 'Recuperar por e-mail', providerTitle: 'Confirme como você entra',
    providerBody: 'Primeiro confirme Google ou Apple neste dispositivo. Isso protege a recuperação.',
    emailTitle: 'Digite o e-mail da conta', emailBody: 'Use o e-mail vinculado ao seu progresso.',
    emailLabel: 'E-mail da conta', emailPlaceholder: 'nome@exemplo.com', sendCode: 'Enviar código',
    sentTitle: 'Confira seu e-mail', sentBody: 'Se os dados corresponderem, um código de 6 dígitos já foi enviado.',
    codeLabel: 'Código de 6 dígitos', confirm: 'Confirmar e recuperar', resend: 'Enviar outro código',
    resendIn: 'Reenviar em', resendEmailHint: 'Digite o e-mail novamente para reenviar.', changeEmail: 'Alterar e-mail', expiresIn: 'O código expira em', resumeTitle: 'Continuar recuperação',
    resumeBody: 'A verificação já terminou. Continue com segurança a transferência da conta.', resume: 'Continuar',
    working: 'Recuperando a conta com segurança…', supportTitle: 'Ajuda do suporte necessária',
    supportBody: 'A recuperação foi interrompida para não afetar outra conta. Seus dados locais estão preservados.',
    errorEmail: 'Digite um e-mail válido.',
  },
  vi: {
    entry: 'Khôi phục bằng email', providerTitle: 'Xác nhận cách đăng nhập',
    providerBody: 'Trước tiên hãy xác nhận Google hoặc Apple trên thiết bị này để bảo vệ quá trình khôi phục.',
    emailTitle: 'Nhập email tài khoản', emailBody: 'Dùng email đã liên kết với tiến trình của bạn.',
    emailLabel: 'Email tài khoản', emailPlaceholder: 'ten@example.com', sendCode: 'Gửi mã',
    sentTitle: 'Kiểm tra email', sentBody: 'Nếu thông tin phù hợp, mã 6 chữ số đã được gửi.',
    codeLabel: 'Mã 6 chữ số', confirm: 'Xác nhận và khôi phục', resend: 'Gửi lại mã',
    resendIn: 'Có thể gửi lại sau', resendEmailHint: 'Nhập lại email để gửi mã mới.', changeEmail: 'Đổi email', expiresIn: 'Mã hết hạn sau', resumeTitle: 'Tiếp tục khôi phục',
    resumeBody: 'Bước xác minh đã hoàn tất. Hãy tiếp tục chuyển tài khoản an toàn.', resume: 'Tiếp tục',
    working: 'Đang khôi phục tài khoản an toàn…', supportTitle: 'Cần hỗ trợ',
    supportBody: 'Quá trình khôi phục đã dừng để không ảnh hưởng tài khoản khác. Dữ liệu trên máy vẫn được giữ.',
    errorEmail: 'Hãy nhập email hợp lệ.',
  },
  id: {
    entry: 'Pulihkan lewat email', providerTitle: 'Konfirmasi cara masuk',
    providerBody: 'Konfirmasi Google atau Apple di perangkat ini terlebih dahulu agar pemulihan tetap aman.',
    emailTitle: 'Masukkan email akun', emailBody: 'Gunakan email yang tertaut ke progresmu.',
    emailLabel: 'Email akun', emailPlaceholder: 'nama@example.com', sendCode: 'Kirim kode',
    sentTitle: 'Periksa email', sentBody: 'Jika datanya sesuai, kode 6 digit sudah dikirim.',
    codeLabel: 'Kode 6 digit', confirm: 'Konfirmasi dan pulihkan', resend: 'Kirim kode lagi',
    resendIn: 'Kirim ulang dalam', resendEmailHint: 'Masukkan kembali email untuk mengirim ulang.', changeEmail: 'Ubah email', expiresIn: 'Kode kedaluwarsa dalam', resumeTitle: 'Lanjutkan pemulihan',
    resumeBody: 'Verifikasi sudah selesai. Lanjutkan pemindahan akun dengan aman.', resume: 'Lanjutkan',
    working: 'Memulihkan akun dengan aman…', supportTitle: 'Perlu bantuan dukungan',
    supportBody: 'Pemulihan dihentikan agar tidak memengaruhi akun lain. Data lokal tetap tersimpan.',
    errorEmail: 'Masukkan email yang valid.',
  },
  tr: {
    entry: 'E-postayla kurtar', providerTitle: 'Giriş yöntemini doğrula',
    providerBody: 'Kurtarmayı korumak için önce bu cihazda Google veya Apple hesabını doğrula.',
    emailTitle: 'Hesap e-postasını gir', emailBody: 'İlerlemenin bağlı olduğu e-postayı kullan.',
    emailLabel: 'Hesap e-postası', emailPlaceholder: 'ad@example.com', sendCode: 'Kod gönder',
    sentTitle: 'E-postanı kontrol et', sentBody: 'Bilgiler eşleşiyorsa 6 haneli kod gönderildi.',
    codeLabel: '6 haneli kod', confirm: 'Doğrula ve kurtar', resend: 'Kodu yeniden gönder',
    resendIn: 'Yeniden gönderme süresi', resendEmailHint: 'Yeniden göndermek için e-postayı tekrar gir.', changeEmail: 'E-postayı değiştir', expiresIn: 'Kodun kalan süresi', resumeTitle: 'Kurtarmaya devam et',
    resumeBody: 'Doğrulama tamamlandı. Hesap aktarımına güvenle devam et.', resume: 'Devam et',
    working: 'Hesap güvenle kurtarılıyor…', supportTitle: 'Destek yardımı gerekli',
    supportBody: 'Başka bir hesabı etkilememek için kurtarma durduruldu. Yerel verilerin korunuyor.',
    errorEmail: 'Geçerli bir e-posta gir.',
  },
  pl: {
    entry: 'Odzyskaj przez e-mail', providerTitle: 'Potwierdź sposób logowania',
    providerBody: 'Najpierw potwierdź Google lub Apple na tym urządzeniu. To chroni proces odzyskiwania.',
    emailTitle: 'Wpisz e-mail konta', emailBody: 'Użyj adresu powiązanego z Twoimi postępami.',
    emailLabel: 'E-mail konta', emailPlaceholder: 'nazwa@example.com', sendCode: 'Wyślij kod',
    sentTitle: 'Sprawdź pocztę', sentBody: 'Jeśli dane pasują, kod 6-cyfrowy został już wysłany.',
    codeLabel: 'Kod 6-cyfrowy', confirm: 'Potwierdź i odzyskaj', resend: 'Wyślij kod ponownie',
    resendIn: 'Ponowne wysłanie za', resendEmailHint: 'Wpisz e-mail ponownie, aby wysłać kod.', changeEmail: 'Zmień e-mail', expiresIn: 'Kod wygaśnie za', resumeTitle: 'Kontynuuj odzyskiwanie',
    resumeBody: 'Weryfikacja jest zakończona. Bezpiecznie kontynuuj przenoszenie konta.', resume: 'Kontynuuj',
    working: 'Bezpiecznie odzyskujemy konto…', supportTitle: 'Potrzebna pomoc wsparcia',
    supportBody: 'Odzyskiwanie zatrzymano, aby nie naruszyć innego konta. Dane lokalne zostały zachowane.',
    errorEmail: 'Wpisz prawidłowy e-mail.',
  },
};

export function getAuthRecoveryCopy(locale: string): AuthRecoveryCopy {
  return COPY[locale as AuthRecoveryUiLocale] ?? COPY.ru;
}

export function getCleanInstallRecoveryCopy(locale: string): CleanInstallRecoveryCopy {
  return CLEAN_INSTALL_COPY[locale as AuthRecoveryUiLocale] ?? CLEAN_INSTALL_COPY.ru;
}

export function getCleanInstallRecoveryScreen(
  stage: CleanInstallRecoveryFlowState['stage'],
): CleanInstallRecoveryScreen {
  if (stage === 'ready' || stage === 'requesting') return 'email';
  if (stage === 'code_sent' || stage === 'confirming') return 'code';
  if (stage === 'confirmed' || stage === 'issuing' || stage === 'adopting') return 'resume';
  if (stage === 'failed' || stage === 'quarantined') return 'support';
  if (stage === 'completed' || stage === 'ack_pending' || stage === 'cancelled') return 'done';
  return 'provider';
}

export function getAuthRecoveryEntryMode(hint: RecoveryHintLike | null): AuthRecoveryEntryMode {
  if (!hint?.linked) return 'provider_choice';
  if (hint.provider === 'google' || /@gmail\.com$/i.test(String(hint.maskedEmail ?? '').trim())) {
    return 'google_instruction';
  }
  return hint.provider === 'apple' ? 'code_primary' : 'provider_choice';
}

function errorText(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error.toLowerCase();
  if (error instanceof Error) return `${error.name} ${error.message}`.toLowerCase();
  if (typeof error === 'object') {
    const value = error as { code?: unknown; message?: unknown };
    return `${String(value.code ?? '')} ${String(value.message ?? '')}`.toLowerCase();
  }
  return '';
}

export function getAuthRecoveryErrorMessage(locale: string, error: unknown): string {
  const copy = getAuthRecoveryCopy(locale);
  const value = errorText(error);
  if (/resource-exhausted|rate[_ -]limited|too[_ -]many/.test(value)) return copy.errorRateLimited;
  if (/code[_ -]invalid|invalid[_ -]code|wrong[_ -]code/.test(value)) return copy.errorInvalidCode;
  if (/code[_ -]expired|handoff[_ -]expired/.test(value)) return copy.errorExpired;
  if (/unavailable|deadline-exceeded|network|offline|send[_ -]failed|confirm[_ -]unavailable/.test(value)) return copy.errorNetwork;
  if (/cancelled|canceled/.test(value)) return copy.errorCancelled;
  return copy.errorSupport;
}

export function normalizeRecoveryCodeInput(value: string): string {
  return String(value ?? '').replace(/[^0-9]/g, '').slice(0, 6);
}

export function normalizeRecoveryEmailInput(value: string): string {
  return String(value ?? '').normalize('NFKC').trim().toLowerCase();
}

export function isRecoveryEmailValid(value: string): boolean {
  const email = normalizeRecoveryEmailInput(value);
  return email.length > 2
    && email.length <= 320
    && !/\s/.test(email)
    && /^[^@]+@[^@]+$/.test(email);
}

export function getRecoveryCountdownSeconds(deadline: number | undefined, now: number): number {
  if (!Number.isFinite(deadline)) return 0;
  return Math.max(0, Math.ceil((Number(deadline) - now) / 1000));
}

export function isRecoveryDismissible(
  stage: AuthRecoveryFlowState['stage'] | CleanInstallRecoveryFlowState['stage'] | 'entry' | 'support',
): boolean {
  return stage !== 'adopting';
}

export type AuthOperationOwner = 'provider' | 'recovery' | 'clean_recovery';

export function createAuthOperationGate() {
  let owner: AuthOperationOwner | null = null;
  return {
    owner: () => owner,
    tryBegin(next: AuthOperationOwner): boolean {
      if (owner !== null) return false;
      owner = next;
      return true;
    },
    release(expected: AuthOperationOwner): void {
      if (owner === expected) owner = null;
    },
    reset(): void {
      owner = null;
    },
  };
}

export function isRecoveryFlowLeaseCurrent<T extends object>(
  currentFlow: T | null,
  currentGeneration: number,
  candidateFlow: T,
  candidateGeneration: number,
): boolean {
  return currentFlow === candidateFlow && currentGeneration === candidateGeneration;
}

export function createRecoveryDisposeBarrier() {
  let pending: Promise<void> | null = null;
  return {
    isPending: () => pending !== null,
    begin(dispose: () => Promise<void>): Promise<void> {
      if (pending) return pending;
      const task = Promise.resolve().then(dispose).catch(() => undefined);
      pending = task;
      void task.finally(() => {
        if (pending === task) pending = null;
      });
      return task;
    },
  };
}

export function createAuthRecoveryCompletion(deps: Readonly<{
  emit: (event: 'auth_provider_linked') => void;
  close: () => void;
  restore: () => Promise<unknown>;
}>): (result: 'completed' | 'ack_pending') => boolean {
  let finished = false;
  return (_result) => {
    if (finished) return false;
    finished = true;
    if (_result === 'completed') {
      deps.emit('auth_provider_linked');
      deps.close();
      void deps.restore().catch(() => undefined);
    } else {
      deps.close();
    }
    return true;
  };
}
