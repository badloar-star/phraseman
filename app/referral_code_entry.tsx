import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import TapScale from '../components/TapScale';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { applyManualReferralCode, type ReferralApplyStatus } from './referral_bootstrap';

type Feedback = { kind: 'ok' | 'error'; text: string };

function feedbackForStatus(status: ReferralApplyStatus, L: ReturnType<typeof makeL>): Feedback {
  switch (status) {
    case 'applied':
      return {
        kind: 'ok',
        text: L(
          'Код принят. Пройдите один урок полностью — вы получите 7 дней полного доступа, и друг сможет забрать свои 7 дней.',
          'Код прийнято. Повністю пройдіть один урок — ви отримаєте 7 днів повного доступу, і друг зможе забрати свої 7 днів.',
          'Código aceptado. Completa una lección: recibirás 7 días de acceso completo y tu amigo podrá recoger sus 7 días.',
          'Código aceito. Conclua uma lição: você recebe 7 dias de acesso completo e seu amigo poderá resgatar os 7 dias.',
          'Đã nhận mã. Hoàn thành một bài học: bạn nhận 7 ngày truy cập đầy đủ và bạn của bạn cũng nhận 7 ngày.',
          'Kode diterima. Selesaikan satu pelajaran: kamu mendapat 7 hari akses penuh dan temanmu bisa mengambil 7 harinya.',
          'Kod kabul edildi. Bir dersi tamamen bitir: 7 gün tam erişim alırsın, arkadaşın da kendi 7 gününü alır.',
          'Kod przyjęty. Ukończ jedną lekcję: dostaniesz 7 dni pełnego dostępu, a znajomy odbierze swoje 7 dni.',
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
          'Код сохранён. Если облако ещё не готово, приложение попробует применить его автоматически позже.',
          'Код збережено. Якщо хмара ще не готова, застосунок спробує застосувати його автоматично пізніше.',
          'Código guardado. Si la nube aún no está lista, lo intentaremos automáticamente más tarde.',
          'Código salvo. Se a nuvem ainda não estiver pronta, tentaremos automaticamente mais tarde.',
          'Đã lưu mã. Nếu đám mây chưa sẵn sàng, ứng dụng sẽ tự thử lại sau.',
          'Kode disimpan. Jika cloud belum siap, aplikasi akan mencoba lagi otomatis nanti.',
          'Kod kaydedildi. Bulut hazır değilse uygulama daha sonra otomatik deneyecek.',
          'Kod zapisany. Jeśli chmura nie jest gotowa, aplikacja spróbuje później automatycznie.',
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

function makeL(lang: Lang) {
  return (
    ru: string,
    uk: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

export default function ReferralCodeEntryScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const L = makeL(lang as Lang);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const canSubmit = code.trim().length >= 4 && !busy;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    hapticTap();
    setBusy(true);
    setFeedback(null);
    try {
      const status = await applyManualReferralCode(code);
      setFeedback(feedbackForStatus(status, L));
    } finally {
      setBusy(false);
    }
  }, [L, canSubmit, code]);

  return (
    <ScreenGradient artBackdrop="friends">
      <SafeAreaView testID="screen-referral-code-entry" style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
              <TapScale
                accessibilityRole="button"
                accessibilityLabel={L('Назад', 'Назад', 'Atrás', 'Voltar', 'Quay lại', 'Kembali', 'Geri', 'Wstecz')}
                onPress={() => router.back()}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: t.bgSurface,
                  borderWidth: 1,
                  borderColor: t.border,
                  marginRight: 12,
                }}
              >
                <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
              </TapScale>
              <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.h1 ?? 28, fontWeight: '900' }}>
                {L('Ввести код', 'Ввести код', 'Ingresar código', 'Inserir código', 'Nhập mã', 'Masukkan kode', 'Kod gir', 'Wpisz kod')}
              </Text>
            </View>

            <View
              style={{
                borderRadius: 20,
                padding: 18,
                backgroundColor: t.bgCard,
                borderWidth: 1,
                borderColor: t.border,
                gap: 14,
              }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgSurface }}>
                <Ionicons name="ticket-outline" size={24} color={t.accent} />
              </View>
              <Text style={{ color: t.textPrimary, fontSize: f.h2 ?? 22, lineHeight: 28, fontWeight: '900' }}>
                {L('Код друга', 'Код друга', 'Código de un amigo', 'Código de um amigo', 'Mã của bạn bè', 'Kode teman', 'Arkadaş kodu', 'Kod znajomego')}
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.body ?? 16, lineHeight: 23, fontWeight: '700' }}>
                {L(
                  'Есть код от друга? Введите его здесь — и заберите 7 дней полного доступа в Phraseman.',
                  'Є код від друга? Введіть його тут — і заберіть 7 днів повного доступу в Phraseman.',
                  '¿Tienes un código de un amigo? Escríbelo aquí y llévate 7 días de acceso completo a Phraseman.',
                  'Tem um código de amigo? Digite aqui e ganhe 7 dias de acesso completo ao Phraseman.',
                  'Có mã từ bạn bè? Nhập mã ở đây để nhận 7 ngày truy cập đầy đủ vào Phraseman.',
                  'Punya kode dari teman? Masukkan di sini dan ambil 7 hari akses penuh ke Phraseman.',
                  'Arkadaşından bir kod mu var? Buraya gir ve Phraseman’da 7 gün tam erişimi al.',
                  'Masz kod od znajomego? Wpisz go tutaj i odbierz 7 dni pełnego dostępu do Phraseman.',
                )}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub ?? 13, lineHeight: 20, fontWeight: '700' }}>
                {L(
                  'Мини-квест простой: установить приложение, ввести код и пройти один урок до конца. После этого вы получите 7 дней полного доступа, а друг — свои 7 дней.',
                  'Мініквест простий: встановити застосунок, ввести код і пройти один урок до кінця. Після цього ви отримаєте 7 днів повного доступу, а друг — свої 7 днів.',
                  'El minirreto es simple: instalar la app, introducir el código y completar una lección. Después recibes 7 días de acceso completo, y tu amigo sus 7 días.',
                  'A missão é simples: instalar o app, inserir o código e concluir uma lição. Depois você recebe 7 dias de acesso completo, e seu amigo recebe os 7 dias dele.',
                  'Nhiệm vụ nhỏ rất đơn giản: cài ứng dụng, nhập mã và hoàn thành một bài học. Sau đó bạn nhận 7 ngày truy cập đầy đủ, còn bạn bè nhận 7 ngày của họ.',
                  'Misi kecilnya simpel: pasang aplikasi, masukkan kode, dan selesaikan satu pelajaran. Setelah itu kamu mendapat 7 hari akses penuh, dan temanmu mendapat 7 harinya.',
                  'Mini görev basit: uygulamayı kur, kodu gir ve bir dersi sonuna kadar bitir. Sonra sen 7 gün tam erişim alırsın, arkadaşın da kendi 7 gününü alır.',
                  'Mini misja jest prosta: zainstaluj aplikację, wpisz kod i ukończ jedną lekcję. Potem dostajesz 7 dni pełnego dostępu, a znajomy swoje 7 dni.',
                )}
              </Text>
              <TextInput
                testID="referral-code-input"
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
                  borderWidth: 1,
                  borderColor: t.border,
                  fontSize: f.body ?? 16,
                  fontWeight: '900',
                  letterSpacing: 1,
                }}
              />
              <TouchableOpacity
                testID="referral-code-submit"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={!canSubmit}
                onPress={submit}
                style={{
                  minHeight: 56,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  backgroundColor: canSubmit ? t.accent : t.bgSurface,
                  opacity: canSubmit ? 1 : 0.55,
                }}
              >
                {busy ? <ActivityIndicator color={t.correctText} /> : <Ionicons name="checkmark-circle-outline" size={20} color={canSubmit ? t.correctText : t.textMuted} />}
                <Text style={{ color: canSubmit ? t.correctText : t.textMuted, fontSize: f.body ?? 16, fontWeight: '900' }}>
                  {L('Применить код', 'Застосувати код', 'Aplicar código', 'Aplicar código', 'Áp dụng mã', 'Terapkan kode', 'Kodu uygula', 'Zastosuj kod')}
                </Text>
              </TouchableOpacity>
              {feedback && (
                <Text
                  testID="referral-code-feedback"
                  style={{ color: feedback.kind === 'ok' ? t.correct : t.wrong, fontSize: f.sub ?? 13, lineHeight: 20, fontWeight: '800' }}
                >
                  {feedback.text}
                </Text>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
