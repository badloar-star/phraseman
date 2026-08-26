import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import SectionSheetHeader from '../components/SectionSheetHeader';
import BouncyScrollView from '../components/BouncyScrollView';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { triLang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';
import { submitUserIdea } from './ideas_client';
import { enqueueThemedBlockingInfoAlert } from './themed_blocking_alert_queue';

const IDEA_MIN_LENGTH = 10;
const IDEA_TITLE_MIN_LENGTH = 3;

export default function IdeasSubmitScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);

  const L = useCallback((
    ru: string,
    uk: string,
    es: string,
    ptBR: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang, { ru, uk, es, 'pt-BR': ptBR, vi, id, tr, pl }), [lang]);

  const [title, setTitle] = useState('');
  const [idea, setIdea] = useState('');
  const [busy, setBusy] = useState(false);
  const canSend = useMemo(
    () => title.trim().length >= IDEA_TITLE_MIN_LENGTH && idea.trim().length >= IDEA_MIN_LENGTH && !busy,
    [busy, idea, title],
  );

  const onSend = useCallback(async () => {
    if (!canSend) return;
    Keyboard.dismiss();
    hapticTap();
    setBusy(true);
    try {
      const description = idea.trim();
      await submitUserIdea({
        title: title.trim(),
        description,
        benefit: '',
        category: 'other',
        lang,
      });
      await enqueueThemedBlockingInfoAlert(
        L('Идея отправлена', 'Ідею надіслано', 'Idea enviada', 'Ideia enviada', 'Ý tưởng đã gửi', 'Ide terkirim', 'Fikir gönderildi', 'Pomysł wysłany'),
        L(
          'Спасибо! Мы прочитаем твою идею. Если возьмём её в работу — откроем тебе Plus на год.',
          'Дякуємо! Ми прочитаємо твою ідею. Якщо візьмемо її в роботу — відкриємо тобі Plus на рік.',
          '¡Gracias! Leeremos tu idea. Si la llevamos a cabo, te damos Plus por un año.',
          'Obrigado! Vamos ler sua ideia. Se ela entrar no trabalho, liberamos Plus por um ano.',
          'Cảm ơn! Chúng tôi sẽ đọc ý tưởng của bạn. Nếu đưa vào làm, chúng tôi sẽ mở Plus cho bạn trong một năm.',
          'Terima kasih! Kami akan membaca idemu. Jika kami kerjakan, kami akan membukakan Plus selama setahun.',
          'Teşekkürler! Fikrini okuyacağız. Üzerinde çalışmaya alırsak sana bir yıllık Plus açacağız.',
          'Dzięki! Przeczytamy twój pomysł. Jeśli weźmiemy go do pracy, odblokujemy ci Plus na rok.',
        ),
        L('Понятно', 'Зрозуміло', 'Entendido', 'Entendi', 'Đã hiểu', 'Mengerti', 'Anladım', 'Rozumiem'),
      );
      safeRouterBack(router, '/(tabs)/settings' as never);
    } catch (error: unknown) {
      const code = (error as { code?: string; message?: string })?.code || '';
      const message = (error as { message?: string })?.message || '';
      const isLimited = code.includes('resource-exhausted') || message.includes('rate_limited');
      await enqueueThemedBlockingInfoAlert(
        isLimited
          ? L('Уже приняли идею сегодня', 'Вже прийняли ідею сьогодні', 'Ya recibimos una idea hoy', 'Já recebemos uma ideia hoje', 'Hôm nay chúng tôi đã nhận một ý tưởng', 'Kami sudah menerima ide hari ini', 'Bugün zaten bir fikir aldık', 'Dziś przyjęliśmy już pomysł')
          : L('Что-то пошло не так', 'Щось пішло не так', 'Algo salió mal', 'Algo deu errado', 'Đã xảy ra lỗi', 'Ada yang bermasalah', 'Bir şeyler ters gitti', 'Coś poszło nie tak'),
        isLimited
          ? L('Можно отправить одну идею в день. Возвращайся завтра со следующей.', 'Можна надіслати одну ідею на день. Повертайся завтра з наступною.', 'Puedes enviar una idea al día. Vuelve mañana con la siguiente.', 'Você pode enviar uma ideia por dia. Volte amanhã com a próxima.', 'Bạn có thể gửi một ý tưởng mỗi ngày. Hãy quay lại vào ngày mai.', 'Kamu bisa mengirim satu ide per hari. Kembali besok.', 'Günde bir fikir gönderebilirsin. Sonraki fikir için yarın gel.', 'Możesz wysłać jeden pomysł dziennie. Wróć jutro z kolejnym.')
          : L('Не получилось отправить идею. Проверь связь и попробуй снова.', 'Не вдалося надіслати ідею. Перевір зв’язок і спробуй знову.', 'No se pudo enviar la idea. Revisa la conexión e inténtalo de nuevo.', 'Não conseguimos enviar a ideia. Verifique a conexão e tente de novo.', 'Không gửi được ý tưởng. Hãy kiểm tra kết nối và thử lại.', 'Ide belum bisa dikirim. Periksa koneksi dan coba lagi.', 'Fikir gönderilemedi. Bağlantını kontrol edip tekrar dene.', 'Nie udało się wysłać pomysłu. Sprawdź połączenie i spróbuj ponownie.'),
        L('Понятно', 'Зрозуміло', 'Entendido', 'Entendi', 'Đã hiểu', 'Mengerti', 'Anladım', 'Rozumiem'),
      );
    } finally {
      setBusy(false);
    }
  }, [L, canSend, idea, lang, router, title]);

  const inputStyle = {
    minHeight: 142,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: t.bgCard,
    color: t.textPrimary,
    fontSize: f.body,
    lineHeight: f.body * 1.45,
    textAlignVertical: 'top' as const,
  };
  const submitTextColor = canSend ? t.correctText : t.textSecond;

  return (
    <ScreenGradient artBackdrop="settings">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <SectionSheetHeader
          title={L('Идеи', 'Ідеї', 'Ideas', 'Ideias', 'Ý tưởng', 'Ide', 'Fikirler', 'Pomysły')}
          onClose={() => safeRouterBack(router, '/(tabs)/settings' as never)}
        />
        <BouncyScrollView
          decelerationRate="fast"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 32 + Math.max(bottomInset, 16) }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          <View style={{ alignItems: 'center', marginTop: 6, marginBottom: 28 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.correctBg,
                marginBottom: 14,
              }}
            >
              <Ionicons name="bulb-outline" size={27} color={t.correct} />
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center' }}>
              {L('Поделись идеей', 'Поділися ідеєю', 'Comparte tu idea', 'Compartilhe sua ideia', 'Chia sẻ ý tưởng', 'Bagikan idemu', 'Fikrini paylaş', 'Podziel się pomysłem')}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: f.body * 1.4, textAlign: 'center', marginTop: 8 }}>
              {L(
                'Поделись идеей, которая поможет Phraseman стать лучше. Если она откликнется нам и мы решим воплотить её в приложении, в знак благодарности откроем тебе Plus на целый год.',
                'Поділися ідеєю, яка допоможе зробити Phraseman кращим. Якщо вона відгукнеться нам і ми вирішимо втілити її в застосунку, на знак подяки відкриємо тобі Plus на цілий рік.',
                'Comparte una idea que ayude a mejorar Phraseman. Si nos inspira y decidimos llevarla a la app, te daremos Plus durante un año como agradecimiento.',
                'Compartilhe uma ideia que ajude a melhorar o Phraseman. Se ela nos inspirar e decidirmos trazê-la para o app, você ganha Plus por um ano como agradecimento.',
                'Hãy chia sẻ một ý tưởng giúp Phraseman tốt hơn. Nếu ý tưởng ấy truyền cảm hứng cho chúng tôi và được đưa vào ứng dụng, bạn sẽ nhận Plus một năm như lời cảm ơn.',
                'Bagikan ide yang membantu Phraseman menjadi lebih baik. Jika ide itu menginspirasi kami dan kami membawanya ke aplikasi, kamu akan mendapat Plus setahun sebagai terima kasih.',
                'Phraseman’i daha iyi yapacak fikrini paylaş. Bize ilham verir ve uygulamada hayata geçirmeye karar verirsek, teşekkür olarak sana bir yıllık Plus açarız.',
                'Podziel się pomysłem, który pomoże ulepszyć Phraseman. Jeśli nas zainspiruje i zdecydujemy się wprowadzić go do aplikacji, w podziękowaniu otrzymasz Plus na cały rok.',
              )}
            </Text>
          </View>

          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginBottom: 8 }}>
            {L('Коротко', 'Коротко', 'En breve', 'Em poucas palavras', 'Tóm tắt', 'Singkatnya', 'Kısaca', 'Krótko')}
          </Text>
          <TextInput
            accessibilityLabel={L('Короткое название идеи', 'Коротка назва ідеї', 'Título breve de la idea', 'Título curto da ideia', 'Tên ngắn của ý tưởng', 'Judul singkat ide', 'Fikrin kısa başlığı', 'Krótki tytuł pomysłu')}
            value={title}
            onChangeText={setTitle}
            placeholder={L('Например: добавить поиск фраз', 'Наприклад: додати пошук фраз', 'Por ejemplo: añadir búsqueda de frases', 'Por exemplo: adicionar busca de frases', 'Ví dụ: thêm tìm kiếm cụm từ', 'Contoh: tambahkan pencarian frasa', 'Örneğin: ifade araması ekleyin', 'Na przykład: dodać wyszukiwanie zwrotów')}
            placeholderTextColor={t.textGhost}
            maxLength={120}
            style={[inputStyle, { minHeight: 52, maxHeight: 52, textAlignVertical: 'center' }]}
          />

          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginTop: 20, marginBottom: 8 }}>
            {L('Твоя идея', 'Твоя ідея', 'Tu idea', 'Sua ideia', 'Ý tưởng của bạn', 'Idemu', 'Fikrin', 'Twój pomysł')}
          </Text>
          <TextInput
            accessibilityLabel={L('Опиши свою идею', 'Опиши свою ідею', 'Describe tu idea', 'Descreva sua ideia', 'Mô tả ý tưởng của bạn', 'Jelaskan idemu', 'Fikrini anlat', 'Opisz swój pomysł')}
            value={idea}
            onChangeText={setIdea}
            placeholder={L('Что можно сделать лучше? Опиши как получится — мы разберёмся.', 'Що можна зробити краще? Опиши як виходить — ми розберемося.', '¿Qué podemos mejorar? Cuéntanoslo como te salga.', 'O que podemos melhorar? Conte do seu jeito.', 'Chúng tôi có thể cải thiện điều gì? Hãy viết theo cách của bạn.', 'Apa yang bisa kami buat lebih baik? Ceritakan dengan caramu.', 'Neyi daha iyi yapabiliriz? Aklındaki gibi anlat.', 'Co możemy ulepszyć? Opisz to po swojemu.')}
            placeholderTextColor={t.textGhost}
            multiline
            maxLength={2000}
            style={inputStyle}
          />
          <Text style={{ color: t.textSecond, fontSize: f.caption, marginTop: 8 }}>
            {L('Одна идея в день. Мы прочитаем каждую.', 'Одна ідея на день. Ми прочитаємо кожну.', 'Una idea al día. Leemos cada una.', 'Uma ideia por dia. Lemos cada uma.', 'Một ý tưởng mỗi ngày. Chúng tôi đọc từng ý tưởng.', 'Satu ide per hari. Kami membaca semuanya.', 'Günde bir fikir. Her birini okuyoruz.', 'Jeden pomysł dziennie. Czytamy każdy.')}
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={L('Отправить идею', 'Надіслати ідею', 'Enviar idea', 'Enviar ideia', 'Gửi ý tưởng', 'Kirim ide', 'Fikri gönder', 'Wyślij pomysł')}
            onPress={onSend}
            disabled={!canSend}
            activeOpacity={0.85}
            style={{
              minHeight: 52,
              marginTop: 24,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: canSend ? t.accent : t.bgCard,
              opacity: canSend ? 1 : 0.7,
            }}
          >
            {busy ? <ActivityIndicator color={submitTextColor} /> : (
              <Text style={{ color: submitTextColor, fontSize: f.body, fontWeight: '800' }}>
                {L('Отправить идею', 'Надіслати ідею', 'Enviar idea', 'Enviar ideia', 'Gửi ý tưởng', 'Kirim ide', 'Fikri gönder', 'Wyślij pomysł')}
              </Text>
            )}
          </TouchableOpacity>
        </BouncyScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
