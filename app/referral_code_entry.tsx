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
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import TapScale from '../components/TapScale';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { applyManualReferralCode, type ReferralApplyStatus } from './referral_bootstrap';
import { safeRouterBack } from './navigation_back';
import TonalSurface from '../components/TonalSurface';
import { useReferralRouletteEnabled } from './referral_roulette_flag';

type Feedback = { kind: 'ok' | 'error'; text: string };

function feedbackForStatus(status: ReferralApplyStatus, L: ReturnType<typeof makeL>): Feedback {
  switch (status) {
    case 'applied':
      return {
        kind: 'ok',
        text: L(
          'Код принят. Когда оформишь Plus или Pro — другу откроется ключ. Наградой может стать Plus от 1 дня до 365 дней.',
          'Код прийнято. Коли оформиш Plus або Pro — друг отримає ключ. Нагородою може стати Plus від 1 до 365 днів.',
          'Código aceptado. Cuando compres Plus o Pro, tu amigo recibirá una llave y podrá ganar de 1 a 365 días de Plus.',
          'Código aceito. Quando você assinar Plus ou Pro, seu amigo recebe uma chave e pode ganhar de 1 a 365 dias de Plus.',
          'Đã nhận mã. Khi bạn mua Plus hoặc Pro, bạn của bạn nhận một chìa khóa và có thể thắng từ 1 đến 365 ngày Plus.',
          'Kode diterima. Setelah kamu membeli Plus atau Pro, temanmu mendapat kunci dan bisa menang 1–365 hari Plus.',
          'Kod kabul edildi. Plus veya Pro satın aldığında arkadaşın bir anahtar kazanır ve 1–365 gün Plus kazanabilir.',
          'Kod przyjęty. Gdy kupisz Plus lub Pro, znajomy dostanie klucz i może wygrać od 1 do 365 dni Plus.',
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
  const rouletteOn = useReferralRouletteEnabled();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const canSubmit = rouletteOn && code.trim().length >= 4 && !busy;

  const submit = useCallback(async () => {
    if (!rouletteOn || !canSubmit) return;
    hapticTap();
    setBusy(true);
    setFeedback(null);
    try {
      const status = await applyManualReferralCode(code);
      setFeedback(feedbackForStatus(status, L));
    } finally {
      setBusy(false);
    }
  }, [L, canSubmit, code, rouletteOn]);

  if (!rouletteOn) {
    return (
      <ScreenGradient artBackdrop="friends">
        <SafeAreaView testID="referral-code-entry-off" style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 }}>
            <TapScale
              accessibilityRole="button"
              accessibilityLabel={L('Назад', 'Назад', 'Atrás', 'Voltar', 'Quay lại', 'Kembali', 'Geri', 'Wstecz')}
              onPress={() => safeRouterBack(router, '/(tabs)/friends' as any)}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgSurface }}
            >
              <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
            </TapScale>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 72 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h2 ?? 22, lineHeight: 28, fontWeight: '700', textAlign: 'center' }}>
              {L('Раздел временно недоступен', 'Розділ тимчасово недоступний', 'Sección temporalmente no disponible', 'Seção temporariamente indisponível', 'Mục tạm thời không khả dụng', 'Bagian sementara tidak tersedia', 'Bölüm geçici olarak kullanılamıyor', 'Sekcja jest chwilowo niedostępna')}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.body ?? 16, lineHeight: 23, fontWeight: '400', textAlign: 'center', marginTop: 8 }}>
              {L('Попробуй ещё раз позже.', 'Спробуй ще раз пізніше.', 'Inténtalo de nuevo más tarde.', 'Tente novamente mais tarde.', 'Hãy thử lại sau.', 'Coba lagi nanti.', 'Daha sonra tekrar dene.', 'Spróbuj ponownie później.')}
            </Text>
          </View>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient artBackdrop="friends">
      <SafeAreaView testID="screen-referral-code-entry" style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
              <TapScale
                accessibilityRole="button"
                accessibilityLabel={L('Назад', 'Назад', 'Atrás', 'Voltar', 'Quay lại', 'Kembali', 'Geri', 'Wstecz')}
                onPress={() => safeRouterBack(router, '/referrals' as any)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: t.bgSurface,
                  marginRight: 12,
                }}
              >
                <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
              </TapScale>
              <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.h1 ?? 28, fontWeight: '900' }}>
                {L('Ввести код', 'Ввести код', 'Ingresar código', 'Inserir código', 'Nhập mã', 'Masukkan kode', 'Kod gir', 'Wpisz kod')}
              </Text>
            </View>

            <TonalSurface
              radius={20}
              style={{
                padding: 18,
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
                  'Есть код от друга? Введи его здесь и оформи Plus или Pro — другу откроется ключ.',
                  'Є код від друга? Введи його тут і оформи Plus або Pro — друг отримає ключ.',
                  '¿Tienes un código de un amigo? Escríbelo aquí y compra Plus o Pro para darle una llave.',
                  'Tem um código de amigo? Digite aqui e assine Plus ou Pro para dar uma chave a ele.',
                  'Có mã từ bạn bè? Nhập mã và mua Plus hoặc Pro để bạn của bạn nhận một chìa khóa.',
                  'Punya kode dari teman? Masukkan dan beli Plus atau Pro agar temanmu mendapat kunci.',
                  'Arkadaşından bir kod mu var? Gir ve Plus veya Pro satın al; arkadaşın bir anahtar kazansın.',
                  'Masz kod od znajomego? Wpisz go i kup Plus lub Pro, aby znajomy dostał klucz.',
                )}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub ?? 13, lineHeight: 20, fontWeight: '700' }}>
                {L(
                  'Мини-квест простой: установить приложение, ввести код и оформить Plus или Pro. После этого друг получит ключ с шансом выиграть Plus от 1 дня до 365 дней.',
                  'Мініквест простий: встановити застосунок, ввести код і оформити Plus або Pro. Після цього друг отримає ключ із шансом виграти Plus від 1 до 365 днів.',
                  'El minirreto es simple: instalar la app, introducir el código y comprar Plus o Pro. Tu amigo recibe una llave con recompensas Plus de 1 a 365 días.',
                  'A missão é simples: instalar o app, inserir o código e assinar Plus ou Pro. Seu amigo recebe uma chave com recompensas Plus de 1 a 365 dias.',
                  'Nhiệm vụ rất đơn giản: cài ứng dụng, nhập mã và mua Plus hoặc Pro. Bạn của bạn nhận một chìa khóa với phần thưởng Plus từ 1 đến 365 ngày.',
                  'Misinya simpel: pasang aplikasi, masukkan kode, lalu beli Plus atau Pro. Temanmu mendapat kunci dengan hadiah Plus 1–365 hari.',
                  'Görev basit: uygulamayı kur, kodu gir ve Plus veya Pro satın al. Arkadaşın bir anahtar ve 1–365 gün Plus şansı kazanır.',
                  'Misja jest prosta: zainstaluj aplikację, wpisz kod i kup Plus lub Pro. Znajomy dostaje klucz z nagrodą Plus od 1 do 365 dni.',
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
            </TonalSurface>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
