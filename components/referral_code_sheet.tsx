/**
 * ReferralCodeSheet — шит «Код от друга» поверх экрана «Награда за друга».
 *
 * зачем: владелец убрал отдельный экран ввода реферального кода — ввод живёт
 * шитом на едином экране рефералов (и открывается из настроек с ?enter=1).
 * Логика применения кода не менялась: applyManualReferralCode (офлайн-очередь,
 * идемпотентность и валидация — внутри referral_bootstrap).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { applyManualReferralCode, type ReferralApplyStatus } from '../app/referral_bootstrap';
import { lookupUserByFriendCode } from '../app/firestore_friends';
import { sendFriendRequest } from '../app/firestore_friend_requests';
import ReferralSheetShell from './referral_sheet_shell';

type Feedback = { kind: 'ok' | 'error'; text: string };

function makeL(lang: Lang) {
  return (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

function feedbackForStatus(status: ReferralApplyStatus, L: ReturnType<typeof makeL>): Feedback {
  switch (status) {
    case 'applied':
      return {
        kind: 'ok',
        text: L(
          'Код принят. Когда оформишь Plus или Pro — другу откроется ключ к награде.',
          'Код прийнято. Коли оформиш Plus або Pro — друг отримає ключ до нагороди.',
          'Código aceptado. Cuando compres Plus o Pro, tu amigo recibirá una llave.',
          'Código aceito. Quando você assinar Plus ou Pro, seu amigo recebe uma chave.',
          'Đã nhận mã. Khi bạn mua Plus hoặc Pro, bạn của bạn nhận một chìa khóa.',
          'Kode diterima. Setelah kamu membeli Plus atau Pro, temanmu mendapat kunci.',
          'Kod kabul edildi. Plus veya Pro satın aldığında arkadaşın bir anahtar kazanır.',
          'Kod przyjęty. Gdy kupisz Plus lub Pro, znajomy dostanie klucz.',
        ),
      };
    case 'already':
      return {
        kind: 'ok',
        text: L(
          'Код уже привязан к вашему аккаунту.',
          'Код уже прив’язаний до вашого акаунта.',
          'El código ya está vinculado a tu cuenta.',
          'O código já está vinculado à sua conta.',
          'Mã đã được liên kết với tài khoản của bạn.',
          'Kode sudah terhubung ke akunmu.',
          'Kod zaten hesabına bağlı.',
          'Kod jest już powiązany z twoim kontem.',
        ),
      };
    case 'invalid':
      return {
        kind: 'error',
        text: L(
          'Проверьте код: он слишком короткий.',
          'Перевірте код: він закороткий.',
          'Revisa el código: es demasiado corto.',
          'Confira o código: está curto demais.',
          'Hãy kiểm tra mã: mã quá ngắn.',
          'Periksa kodenya: terlalu pendek.',
          'Kodu kontrol et: çok kısa.',
          'Sprawdź kod: jest za krótki.',
        ),
      };
    case 'unknown_code':
      return {
        kind: 'error',
        text: L(
          'Такой код не найден. Убедитесь, что это код приглашения Phraseman.',
          'Такий код не знайдено. Переконайтеся, що це код запрошення Phraseman.',
          'No encontramos ese código. Verifica que sea un código de invitación de Phraseman.',
          'Não encontramos esse código. Confira se é um convite do Phraseman.',
          'Không tìm thấy mã này. Hãy chắc chắn đó là mã mời Phraseman.',
          'Kode ini tidak ditemukan. Pastikan ini kode undangan Phraseman.',
          'Bu kod bulunamadı. Phraseman davet kodu olduğundan emin ol.',
          'Nie znaleziono takiego kodu. Upewnij się, że to kod zaproszenia Phraseman.',
        ),
      };
    case 'too_old':
      return {
        kind: 'error',
        text: L(
          'Этот код можно ввести только на новом аккаунте.',
          'Цей код можна ввести лише на новому акаунті.',
          'Este código solo se puede usar en una cuenta nueva.',
          'Este código só pode ser usado em uma conta nova.',
          'Mã này chỉ dùng được cho tài khoản mới.',
          'Kode ini hanya bisa dipakai di akun baru.',
          'Bu kod yalnızca yeni hesapta kullanılabilir.',
          'Tego kodu można użyć tylko na nowym koncie.',
        ),
      };
    case 'self':
      return {
        kind: 'error',
        text: L(
          'Это ваш код. Его нужно отправить другу.',
          'Це ваш код. Його потрібно надіслати другу.',
          'Es tu código. Envíalo a un amigo.',
          'Esse é o seu código. Envie para um amigo.',
          'Đây là mã của bạn. Hãy gửi nó cho bạn bè.',
          'Ini kodemu. Kirimkan ke teman.',
          'Bu senin kodun. Arkadaşına gönder.',
          'To twój kod. Wyślij go znajomemu.',
        ),
      };
    case 'needs_link':
      return {
        kind: 'error',
        text: L(
          'Код сохранён. Приложение применит его автоматически, как только соединение будет готово.',
          'Код збережено. Застосунок застосує його автоматично, щойно з’єднання буде готове.',
          'Código guardado. Lo aplicaremos automáticamente cuando la conexión esté lista.',
          'Código salvo. Vamos aplicar automaticamente quando a conexão estiver pronta.',
          'Đã lưu mã. Ứng dụng sẽ tự áp dụng khi kết nối sẵn sàng.',
          'Kode disimpan. Aplikasi akan menerapkannya otomatis saat koneksi siap.',
          'Kod kaydedildi. Bağlantı hazır olduğunda otomatik uygulanacak.',
          'Kod zapisany. Aplikacja zastosuje go automatycznie, gdy połączenie będzie gotowe.',
        ),
      };
    case 'disabled':
      return {
        kind: 'error',
        text: L(
          'Приглашения сейчас недоступны. Попробуйте позже.',
          'Запрошення зараз недоступні. Спробуйте пізніше.',
          'Las invitaciones no están disponibles ahora.',
          'Os convites não estão disponíveis agora.',
          'Lời mời hiện chưa khả dụng.',
          'Undangan belum tersedia sekarang.',
          'Davetler şu anda kullanılamıyor.',
          'Zaproszenia są teraz niedostępne.',
        ),
      };
    case 'error':
    default:
      return {
        kind: 'error',
        text: L(
          'Не получилось применить код. Проверьте интернет и попробуйте ещё раз.',
          'Не вдалося застосувати код. Перевірте інтернет і спробуйте ще раз.',
          'No pudimos aplicar el código. Revisa internet e inténtalo de nuevo.',
          'Não foi possível aplicar o código. Confira a internet e tente de novo.',
          'Không áp dụng được mã. Kiểm tra mạng rồi thử lại.',
          'Kode belum bisa diterapkan. Periksa internet lalu coba lagi.',
          'Kod uygulanamadı. İnterneti kontrol edip tekrar dene.',
          'Nie udało się zastosować kodu. Sprawdź internet i spróbuj ponownie.',
        ),
      };
  }
}

interface ReferralCodeSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function ReferralCodeSheet({ visible, onClose }: ReferralCodeSheetProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const L = makeL(lang as Lang);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [friendRequested, setFriendRequested] = useState(false);

  // Каждое открытие — с чистого листа (код мог быть применён в прошлый раз).
  useEffect(() => {
    if (visible) { setCode(''); setFeedback(null); setFriendRequested(false); }
  }, [visible]);

  const canSubmit = code.trim().length >= 4 && !busy;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    hapticTap();
    setBusy(true);
    setFeedback(null);
    setFriendRequested(false);
    try {
      const status = await applyManualReferralCode(code);
      setFeedback(feedbackForStatus(status, L));
      // зачем: «один код» (решение владельца 2026-07-25) — принятый код сразу шлёт
      // заявку в друзья владельцу кода: 1 lookup + 1 заявка строго по явному
      // действию, дружба — бонус, награда уже привязана (ошибки глотаем).
      if (status === 'applied' || status === 'already') {
        try {
          const owner = await lookupUserByFriendCode(code);
          if (owner) {
            const res = await sendFriendRequest(owner.uid);
            if (res === 'sent' || res === 'already_sent') setFriendRequested(true);
          }
        } catch { /* дружба best-effort */ }
      }
    } finally {
      setBusy(false);
    }
  }, [L, canSubmit, code]);

  return (
    <ReferralSheetShell
      visible={visible}
      onClose={onClose}
      testID="referral-code-sheet"
      title={L('Код от друга', 'Код від друга', 'Código de un amigo', 'Código de um amigo', 'Mã của bạn bè', 'Kode teman', 'Arkadaş kodu', 'Kod znajomego')}
      closeLabel={L('Закрыть', 'Закрити', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij')}
    >
      <Text style={{ color: t.textSecond, fontSize: f.sub ?? 13, lineHeight: 20, fontWeight: '400', marginBottom: 12 }}>
        {L(
          'Введи код и оформи Plus или Pro — другу откроется ключ к награде.',
          'Введи код і оформи Plus або Pro — друг отримає ключ до нагороди.',
          'Escribe el código y compra Plus o Pro para darle una llave a tu amigo.',
          'Digite o código e assine Plus ou Pro para dar uma chave ao seu amigo.',
          'Nhập mã và mua Plus hoặc Pro để bạn của bạn nhận một chìa khóa.',
          'Masukkan kode dan beli Plus atau Pro agar temanmu mendapat kunci.',
          'Kodu gir ve Plus veya Pro satın al; arkadaşın bir anahtar kazansın.',
          'Wpisz kod i kup Plus lub Pro, aby znajomy dostał klucz.',
        )}
      </Text>
      <TextInput
        testID="referral-code-sheet-input"
        accessibilityLabel={L('Код приглашения', 'Код запрошення', 'Código de invitación', 'Código de convite', 'Mã mời', 'Kode undangan', 'Davet kodu', 'Kod zaproszenia')}
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder={L('Введите код', 'Введіть код', 'Introduce el código', 'Digite o código', 'Nhập mã', 'Masukkan kode', 'Kodu gir', 'Wpisz kod')}
        placeholderTextColor={t.textMuted}
        style={{
          minHeight: 56,
          borderRadius: 16,
          paddingHorizontal: 16,
          backgroundColor: t.bgSurface,
          color: t.textPrimary,
          fontSize: f.body ?? 16,
          fontWeight: '700',
          letterSpacing: 1,
        }}
      />
      <TouchableOpacity
        testID="referral-code-sheet-submit"
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit }}
        activeOpacity={0.82}
        disabled={!canSubmit}
        onPress={() => { void submit(); }}
        style={{
          minHeight: 56,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          marginTop: 12,
          backgroundColor: canSubmit ? t.accent : t.bgSurface,
          opacity: canSubmit ? 1 : 0.55,
        }}
      >
        {busy
          ? <ActivityIndicator color={t.correctText} />
          : <Ionicons name="checkmark-circle-outline" size={20} color={canSubmit ? t.correctText : t.textMuted} />}
        <Text style={{ color: canSubmit ? t.correctText : t.textMuted, fontSize: f.body ?? 16, fontWeight: '700' }}>
          {L('Применить код', 'Застосувати код', 'Aplicar código', 'Aplicar código', 'Áp dụng mã', 'Terapkan kode', 'Kodu uygula', 'Zastosuj kod')}
        </Text>
      </TouchableOpacity>
      {feedback && (
        <Text
          testID="referral-code-sheet-feedback"
          style={{ color: feedback.kind === 'ok' ? t.correct : t.wrong, fontSize: f.sub ?? 13, lineHeight: 20, fontWeight: '700', marginTop: 10 }}
        >
          {feedback.text}
        </Text>
      )}
      {friendRequested && (
        <Text
          testID="referral-code-sheet-friend-request"
          style={{ color: t.textSecond, fontSize: f.sub ?? 13, lineHeight: 20, fontWeight: '400', marginTop: 6 }}
        >
          {L(
            'Заявка в друзья отправлена — будете видеть прогресс друг друга.',
            'Заявку в друзі надіслано — бачитимете прогрес одне одного.',
            'Solicitud de amistad enviada: verán el progreso el uno del otro.',
            'Pedido de amizade enviado — vocês verão o progresso um do outro.',
            'Đã gửi lời mời kết bạn — hai bạn sẽ thấy tiến độ của nhau.',
            'Permintaan pertemanan terkirim — kalian bisa saling melihat progres.',
            'Arkadaşlık isteği gönderildi — birbirinizin ilerlemesini göreceksiniz.',
            'Wysłano zaproszenie do znajomych — będziecie widzieć swoje postępy.',
          )}
        </Text>
      )}
    </ReferralSheetShell>
  );
}
