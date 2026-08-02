// ════════════════════════════════════════════════════════════════════════════
// AccountLogoutFlow.tsx — подтверждение и выполнение выхода из аккаунта
// для экрана «Аккаунт» (кнопка «Выйти»).
//
// Тот же безопасный флоу, что «Сменить аккаунт» в настройках (Variant 2):
//   confirm → wiping (forced sync + signOut + wipe) → onSignedOut.
// Прогресс перед выходом надёжно сохраняется; при любой блокировке
// (незавершённое списание монет, карантин очереди, нет сети) выход отменяется,
// данные остаются на месте, и юзеру предлагается явный «Выйти без сохранения»
// (аварийная копия пишется внутри signOutAndWipeForAccountSwitch).
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback } from 'react';
import { Alert, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { signOutAndWipeForAccountSwitch } from '../../app/auth_provider';
import { enqueueThemedBlockingInfoAlert } from '../../app/themed_blocking_alert_queue';
import { hapticTap as doHaptic } from '../../hooks/use-haptics';

export type LogoutStage = 'idle' | 'confirm' | 'wiping';

/** Зазор на докрытие нативной модалки перед показом следующей (см. showInfoAlert). */
const LOGOUT_MODAL_DISMISS_SETTLE_MS = 360;

interface AccountLogoutFlowProps {
  stage: LogoutStage;
  onStageChange: (stage: LogoutStage) => void;
  /** Выход завершён: локальные данные вычищены, можно предлагать вход. */
  onSignedOut: (result: { synced: boolean }) => void;
}

export default function AccountLogoutFlow({ stage, onStageChange, onSignedOut }: AccountLogoutFlowProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const L = (
    ru: string, uk: string, es: string, ptBr: string,
    vi: string, id: string, tr: string, pl: string,
  ) => triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });

  // зачем: тот же класс бага, что чинили в удалении аккаунта (present-during-dismiss).
  // ThemedBlockingAlertHost — нативный <Modal>. Если поставить алерт в очередь в том же
  // тике, в котором onStageChange('idle') закрывает модалку этого флоу, на iOS present
  // накладывается на идущий dismiss: стек презентаций ломается, алерт не виден, а экран
  // перестаёт принимать тапы. Ждём кадр докрытия — как NATIVE_MODAL_HANDOFF_GAP_MS
  // в OverlayArbiter (сюда он не достаёт: этот флоу живёт мимо арбитра).
  const showInfoAlert = useCallback((title: string, message: string) => {
    setTimeout(
      () => { void enqueueThemedBlockingInfoAlert(title, message, 'OK'); },
      LOGOUT_MODAL_DISMISS_SETTLE_MS,
    );
  }, []);

  const runLogout = async () => {
    doHaptic();
    onStageChange('wiping');
    const res = await signOutAndWipeForAccountSwitch();
    onStageChange('idle');

    // Общий forced-путь «Выйти без сохранения» для всех блокировок выхода.
    // Аварийная копия (включая очередь монет) пишется внутри
    // signOutAndWipeForAccountSwitch — данные остаются восстановимыми.
    const runForcedLogoutWithoutSaving = async () => {
      onStageChange('wiping');
      const forced = await signOutAndWipeForAccountSwitch({
        allowWipeWithoutSync: true,
        allowPendingShardSpendDiscard: true,
      });
      onStageChange('idle');
      if (!forced.ok) {
        showInfoAlert(
          L('Выход отменён', 'Вихід скасовано', 'Salida cancelada', 'Saída cancelada', 'Đã hủy đăng xuất', 'Keluar dibatalkan', 'Çıkış iptal edildi', 'Wylogowanie anulowane'),
          L(
            'Защитная проверка не разрешила удалить локальные данные. Всё осталось на месте — попробуй снова позже.',
            'Захисна перевірка не дозволила видалити локальні дані. Усе залишилося на місці — спробуй ще раз пізніше.',
            'La comprobación de seguridad no permitió borrar los datos locales. Todo sigue en su lugar; inténtalo más tarde.',
            'A verificação de segurança não permitiu apagar os dados locais. Tudo continua no lugar; tente novamente mais tarde.',
            'Kiểm tra an toàn không cho phép xóa dữ liệu cục bộ. Mọi thứ vẫn nguyên; hãy thử lại sau.',
            'Pemeriksaan keamanan tidak mengizinkan penghapusan data lokal. Semuanya tetap aman; coba lagi nanti.',
            'Güvenlik kontrolü yerel verilerin silinmesine izin vermedi. Her şey yerinde kaldı; daha sonra tekrar dene.',
            'Kontrola bezpieczeństwa nie zezwoliła na usunięcie danych lokalnych. Wszystko pozostało na miejscu; spróbuj ponownie później.',
          ),
        );
        return;
      }
      onSignedOut({ synced: false });
    };

    const forcedLogoutButton = {
      text: L('Выйти без сохранения', 'Вийти без збереження', 'Salir sin guardar', 'Sair sem salvar', 'Đăng xuất mà không lưu', 'Keluar tanpa menyimpan', 'Kaydetmeden çık', 'Wyloguj bez zapisywania'),
      style: 'destructive' as const,
      onPress: runForcedLogoutWithoutSaving,
    };
    const okButton = {
      text: L('Понятно', 'Зрозуміло', 'Entendido', 'Entendi', 'Đã hiểu', 'Mengerti', 'Anladım', 'Rozumiem'),
      style: 'cancel' as const,
    };

    if (!res.ok && res.reason === 'pending_shard_spend') {
      Alert.alert(
        L('Покупка ещё синхронизируется', 'Покупка ще синхронізується', 'La compra aún se está sincronizando', 'A compra ainda está sincronizando', 'Giao dịch mua vẫn đang đồng bộ', 'Pembelian masih disinkronkan', 'Satın alma hâlâ eşitleniyor', 'Zakup nadal się synchronizuje'),
        L(
          'Выход отменён: незавершённое списание жемчужин нельзя переносить или пропускать. Подключись к интернету и попробуй снова.',
          'Вихід скасовано: незавершене списання жемчужин не можна переносити або пропускати. Підключися до інтернету й спробуй ще раз.',
          'Salida cancelada: un gasto de perlas pendiente no se puede trasladar ni omitir. Conéctate a internet e inténtalo de nuevo.',
          'Saída cancelada: um gasto de pérolas pendente não pode ser transferido nem ignorado. Conecte-se à internet e tente novamente.',
          'Đã hủy đăng xuất: khoản trừ xu đang chờ không thể chuyển hoặc bỏ qua. Hãy kết nối internet rồi thử lại.',
          'Keluar dibatalkan: pengeluaran koin yang tertunda tidak dapat dipindahkan atau dilewati. Sambungkan internet lalu coba lagi.',
          'Çıkış iptal edildi: bekleyen jeton harcaması taşınamaz veya atlanamaz. İnternete bağlanıp tekrar dene.',
          'Wylogowanie anulowane: oczekującego wydatku monet nie można przenieść ani pominąć. Połącz się z internetem i spróbuj ponownie.',
        ),
        [okButton, forcedLogoutButton],
      );
      return;
    }
    if (!res.ok && res.reason === 'shard_queue_quarantined') {
      Alert.alert(
        L('Нужна проверка жемчужин', 'Потрібна перевірка жемчужин', 'Hay que revisar las perlas', 'É preciso verificar as pérolas', 'Cần kiểm tra xu', 'Koin perlu diperiksa', 'Jetonların kontrol edilmesi gerekiyor', 'Monety wymagają sprawdzenia'),
        L(
          'Выход отменён: локальная очередь жемчужин повреждена или принадлежит неизвестному аккаунту. Данные сохранены для восстановления.',
          'Вихід скасовано: локальна черга жемчужин пошкоджена або належить невідомому акаунту. Дані збережено для відновлення.',
          'Salida cancelada: la cola local de perlas está dañada o pertenece a una cuenta desconocida. Los datos se conservaron para recuperarlos.',
          'Saída cancelada: a fila local de pérolas está danificada ou pertence a uma conta desconhecida. Os dados foram preservados para recuperação.',
          'Đã hủy đăng xuất: hàng đợi xu cục bộ bị hỏng hoặc thuộc về tài khoản không xác định. Dữ liệu đã được giữ lại để khôi phục.',
          'Keluar dibatalkan: antrean koin lokal rusak atau milik akun yang tidak diketahui. Data disimpan untuk pemulihan.',
          'Çıkış iptal edildi: yerel jeton kuyruğu bozuk veya bilinmeyen bir hesaba ait. Veriler kurtarma için saklandı.',
          'Wylogowanie anulowane: lokalna kolejka monet jest uszkodzona lub należy do nieznanego konta. Dane zachowano do odzyskania.',
        ),
        [okButton, forcedLogoutButton],
      );
      return;
    }
    if (!res.ok && res.reason === 'sync_failed') {
      // Прогресс не доехал до облака — выход отменён, данные целы.
      Alert.alert(
        L('Прогресс не сохранён', 'Прогрес не збережено', 'Progreso no guardado', 'Progresso não salvo', 'Chưa lưu tiến độ', 'Progres belum disimpan', 'İlerleme kaydedilmedi', 'Postęp nie został zapisany'),
        L(
          'Не удалось надёжно сохранить прогресс — похоже, нет соединения. Выход отменён, всё осталось на месте. Проверь интернет и попробуй снова.',
          'Не вдалося надійно зберегти прогрес — схоже, немає з’єднання. Вихід скасовано, все залишилося на місці. Перевір інтернет і спробуй ще раз.',
          'No pudimos guardar tu progreso de forma segura: parece que no hay conexión. La salida se canceló y todo sigue en su lugar. Revisa tu internet e inténtalo de nuevo.',
          'Não foi possível salvar seu progresso com segurança — parece que não há conexão. A saída foi cancelada e tudo continua no lugar. Verifique a internet e tente novamente.',
          'Không thể lưu tiến độ an toàn — có vẻ mất kết nối. Việc đăng xuất đã bị hủy, mọi thứ vẫn nguyên. Kiểm tra internet và thử lại.',
          'Kami tidak bisa menyimpan progres dengan aman — sepertinya tidak ada koneksi. Keluar dibatalkan dan semuanya tetap aman. Periksa internet lalu coba lagi.',
          'İlerlemen güvenle kaydedilemedi — bağlantı yok gibi görünüyor. Çıkış iptal edildi, her şey yerinde. İnterneti kontrol edip tekrar dene.',
          'Nie udało się bezpiecznie zapisać postępu — wygląda na brak połączenia. Wylogowanie zostało anulowane, wszystko zostało na miejscu. Sprawdź internet i spróbuj ponownie.',
        ),
        [okButton, forcedLogoutButton],
      );
      return;
    }
    if (!res.ok) {
      showInfoAlert(
        L('Выход не прошёл. Попробуй снова.', 'Не вдалося вийти', 'No se pudo cerrar sesión', 'Não foi possível sair', 'Không thể đăng xuất', 'Tidak dapat keluar', 'Çıkış yapılamadı', 'Nie udało się wylogować'),
        L('Неизвестная ошибка. Попробуй ещё раз.', 'Невідома помилка. Спробуй ще раз.', 'Error desconocido. Inténtalo de nuevo.', 'Erro desconhecido. Tente novamente.', 'Lỗi không xác định. Hãy thử lại.', 'Error tidak dikenal. Coba lagi.', 'Bilinmeyen hata. Tekrar dene.', 'Nieznany błąd. Spróbuj ponownie.'),
      );
      return;
    }

    onSignedOut({ synced: res.synced });
    if (!res.synced) {
      showInfoAlert(
        L('Можно выбрать аккаунт', 'Можна вибрати акаунт', 'Puedes elegir cuenta', 'Você pode escolher a conta', 'Bạn có thể chọn tài khoản', 'Kamu bisa memilih akun', 'Hesap seçebilirsin', 'Możesz wybrać konto'),
        L(
          'Сервер не ответил перед выходом, поэтому мы сохранили аварийную копию на устройстве. Теперь войди в нужный аккаунт.',
          'Сервер не відповів перед виходом, тому ми зберегли аварійну копію на пристрої. Тепер увійди в потрібний акаунт.',
          'El servidor no respondió antes de salir, así que guardamos una copia de emergencia en el dispositivo. Ahora entra con la cuenta correcta.',
          'O servidor não respondeu antes de sair, então salvamos uma cópia de emergência no dispositivo. Agora entre na conta correta.',
          'Máy chủ không phản hồi trước khi đăng xuất, nên chúng tôi đã lưu bản sao khẩn cấp trên thiết bị. Bây giờ hãy đăng nhập vào đúng tài khoản.',
          'Server tidak merespons sebelum keluar, jadi kami menyimpan salinan darurat di perangkat. Sekarang masuk ke akun yang benar.',
          'Çıkmadan önce sunucu yanıt vermedi, bu yüzden cihazda acil bir kopya sakladık. Şimdi doğru hesapla giriş yap.',
          'Serwer nie odpowiedział przed wylogowaniem, więc zapisaliśmy awaryjną kopię na urządzeniu. Teraz zaloguj się na właściwe konto.',
        ),
      );
    }
  };

  return (
    <>
      {/* ── Подтверждение выхода + лоадер: ОДИН нативный <Modal> ──
          зачем: раньше это были ДВА <Modal> (confirm и wiping). Переход confirm→wiping
          закрывал первый и презентовал второй в одном кадре — present-during-dismiss,
          от которого на iOS ломается стек презентаций (тот же баг, что ловили в удалении
          аккаунта: окно пропадает, экран перестаёт реагировать). Теперь модал один, а
          стадия меняет только его СОДЕРЖИМОЕ — нативного present/dismiss между стадиями
          больше нет. */}
      <Modal
        visible={stage === 'confirm' || stage === 'wiping'}
        transparent
        animationType="fade"
        onRequestClose={() => { if (stage === 'confirm') onStageChange('idle'); }}
      >
        {stage === 'wiping' ? (
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
            <View
              style={{
                width: '100%',
                maxWidth: 280,
                backgroundColor: t.bgCard,
                borderRadius: 16,
                padding: 28,
                alignItems: 'center',
              }}
            >
              <Ionicons name="shield-checkmark" size={28} color={t.correct} />
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
                {L('Сохраняем прогресс', 'Зберігаємо прогрес', 'Guardando progreso', 'Salvando progresso', 'Đang lưu tiến độ', 'Menyimpan progres', 'İlerleme kaydediliyor', 'Zapisywanie postępu')}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 6, textAlign: 'center' }}>
                {L('Не закрывай приложение', 'Не закривай застосунок', 'No cierres la app', 'Não feche o app', 'Đừng đóng ứng dụng', 'Jangan tutup aplikasi', 'Uygulamayı kapatma', 'Nie zamykaj aplikacji')}
              </Text>
            </View>
          </View>
        ) : (
        /* зачем 2026-08-02 (владелец: «на маленьких экранах кнопки нет»):
           карточка подтверждения выхода центрировалась без прокрутки — на
           низком экране кнопки «Выйти»/«Отмена» уходили за границу. */
        <ScrollView
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 380,
              backgroundColor: t.bgCard,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginBottom: 12 }}>
              {L('Выйти из аккаунта?', 'Вийти з акаунту?', '¿Cerrar sesión?', 'Sair da conta?', 'Đăng xuất?', 'Keluar dari akun?', 'Hesaptan çıkılsın mı?', 'Wylogować się?')}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 22, marginBottom: 8 }}>
              {L(
                'Текущий прогресс останется привязан к аккаунту, под которым ты сейчас вошёл. Чтобы вернуться — войди под ним снова.',
                "Поточний прогрес залишиться прив\'язаним до акаунту, під яким ти зараз увійшов. Щоб повернутися до нього — увійди тим самим акаунтом знову.",
                'Tu progreso quedará vinculado a la cuenta con la que iniciaste sesión. Para recuperarlo, vuelve a entrar con la misma cuenta.',
                'Seu progresso atual ficará vinculado à conta em que você está conectado agora. Para voltar, entre nela novamente.',
                'Tiến độ hiện tại sẽ gắn với tài khoản bạn đang đăng nhập. Muốn quay lại, hãy đăng nhập lại bằng tài khoản đó.',
                'Progres saat ini akan tetap terhubung ke akun yang sedang kamu pakai. Untuk kembali, masuk lagi dengan akun yang sama.',
                'Mevcut ilerlemen şu anda giriş yaptığın hesaba bağlı kalacak. Geri dönmek için aynı hesapla tekrar giriş yap.',
                'Obecny postęp pozostanie przypisany do konta, na którym jesteś teraz zalogowany. Aby wrócić, zaloguj się na nie ponownie.',
              )}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: 20 }}>
              {L(
                'Перед выходом надёжно сохраним прогресс. Если соединение не ответит — отменим выход, чтобы ничего не потерялось.',
                'Перед виходом надійно збережемо прогрес. Якщо з’єднання не відповість — скасуємо вихід, щоб нічого не загубилося.',
                'Antes de cerrar sesión guardaremos tu progreso de forma segura. Si la conexión no responde, cancelaremos la salida para que no pierdas nada.',
                'Antes de sair, salvaremos seu progresso com segurança. Se a conexão não responder, cancelaremos a saída para que nada se perca.',
                'Trước khi đăng xuất, chúng tôi sẽ lưu tiến độ của bạn an toàn. Nếu kết nối không phản hồi, việc đăng xuất sẽ bị hủy để không mất gì.',
                'Sebelum keluar, progresmu akan disimpan dengan aman. Jika koneksi tidak merespons, keluar dibatalkan agar tidak ada yang hilang.',
                'Çıkmadan önce ilerlemeni güvenle kaydedeceğiz. Bağlantı yanıt vermezse hiçbir şey kaybolmasın diye çıkışı iptal edeceğiz.',
                'Przed wylogowaniem bezpiecznie zapiszemy Twój postęp. Jeśli połączenie nie odpowie, anulujemy wylogowanie, aby nic nie przepadło.',
              )}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 22 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                onPress={() => onStageChange('idle')}
                style={{ paddingHorizontal: 10, paddingVertical: 8 }}
              >
                <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700' }}>
                  {L('Отмена', 'Скасувати', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                testID="account-logout-confirm"
                onPress={() => { void runLogout(); }}
                style={{ paddingHorizontal: 10, paddingVertical: 8 }}
              >
                <Text style={{ color: t.wrong, fontSize: f.body, fontWeight: '800' }}>
                  {L('Выйти', 'Вийти', 'Salir', 'Sair', 'Đăng xuất', 'Keluar', 'Çıkış yap', 'Wyloguj')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        )}
      </Modal>
    </>
  );
}
