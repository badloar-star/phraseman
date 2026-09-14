import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { getPublicUserIdea, submitUserIdea, updateUserIdea, type IdeaCategory } from './ideas_client';
import { isIdeasEnabled } from './remote_flags';
import { enqueueThemedBlockingInfoAlert } from './themed_blocking_alert_queue';

const IDEA_MIN_LENGTH = 10;
const IDEA_TITLE_MIN_LENGTH = 3;
const IDEA_LANGUAGES = ['id', 'en', 'uk', 'es', 'ru', 'pt-BR', 'vi', 'tr', 'pl'] as const;
type IdeaLanguage = typeof IDEA_LANGUAGES[number];

function isIdeaCategory(value: string): value is IdeaCategory {
  return value === 'feature' || value === 'improvement' || value === 'monetization' || value === 'content' || value === 'other';
}

function isIdeaLanguage(value: string): value is IdeaLanguage {
  return IDEA_LANGUAGES.includes(value as IdeaLanguage);
}

export default function IdeasSubmitScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ editIdeaId?: string | string[] }>();
  const editIdeaId = typeof params.editIdeaId === 'string' ? params.editIdeaId : '';
  const ideasEnabled = isIdeasEnabled();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);

  const L = useCallback((
    ru: string,
    uk: string,
    en: string,
    es: string,
    ptBR: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl }), [lang]);

  const [title, setTitle] = useState('');
  const [idea, setIdea] = useState('');
  const [editBenefit, setEditBenefit] = useState('');
  const [editCategory, setEditCategory] = useState<IdeaCategory>('other');
  const [editLang, setEditLang] = useState<IdeaLanguage>(lang);
  const [busy, setBusy] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editIdeaId));
  useEffect(() => { if (!ideasEnabled) router.replace('/(tabs)/settings' as never); }, [ideasEnabled, router]);
  useEffect(() => {
    if (!editIdeaId) return;
    let active = true;
    setLoadingEdit(true);
    void getPublicUserIdea(editIdeaId, { force: true }).then((loaded) => {
      if (!active) return;
      setTitle(loaded.title);
      setIdea(loaded.description);
      setEditBenefit(loaded.benefit ?? '');
      setEditCategory(isIdeaCategory(loaded.category) ? loaded.category : 'other');
      setEditLang(isIdeaLanguage(loaded.lang || '') ? loaded.lang as IdeaLanguage : lang);
    }).catch(() => {
      if (active) router.replace('/ideas_catalog' as never);
    }).finally(() => { if (active) setLoadingEdit(false); });
    return () => { active = false; };
  }, [editIdeaId, lang, router]);
  const canSend = useMemo(
    () => title.trim().length >= IDEA_TITLE_MIN_LENGTH && idea.trim().length >= IDEA_MIN_LENGTH && !busy && !loadingEdit,
    [busy, idea, loadingEdit, title],
  );

  const onSend = useCallback(async () => {
    if (!canSend) return;
    Keyboard.dismiss();
    hapticTap();
    setBusy(true);
    try {
      const description = idea.trim();
      const input = {
        title: title.trim(),
        description,
        benefit: editIdeaId ? editBenefit : '',
        category: editIdeaId ? editCategory : 'other',
        lang: editIdeaId ? editLang : lang,
      } as const;
      const result = editIdeaId ? await updateUserIdea(editIdeaId, input) : await submitUserIdea(input);
      if (!result?.ok || !result.id) throw Object.assign(new Error('offline'), { code: 'offline' });
      const successTitle = editIdeaId
        ? L('Изменения сохранены', 'Зміни збережено', 'Changes saved', 'Cambios guardados', 'Alterações salvas', 'Đã lưu thay đổi', 'Perubahan tersimpan', 'Değişiklikler kaydedildi', 'Zmiany zapisane')
        : L('Идея отправлена', 'Ідею надіслано', 'Idea sent', 'Idea enviada', 'Ideia enviada', 'Ý tưởng đã gửi', 'Ide terkirim', 'Fikir gönderildi', 'Pomysł wysłany');
      const successMessage = editIdeaId
        ? L('Твоя идея обновлена в разделе сообщества.', 'Твою ідею оновлено в розділі спільноти.', 'Your idea was updated in the community section.', 'Tu idea se actualizó en la comunidad.', 'Sua ideia foi atualizada na comunidade.', 'Ý tưởng của bạn đã được cập nhật.', 'Idemu diperbarui di komunitas.', 'Fikrin toplulukta güncellendi.', 'Twój pomysł został zaktualizowany w społeczności.')
        : L('Идея уже опубликована в разделе сообщества. Если возьмём её в работу — откроем тебе Plus на год.', 'Дякуємо! Ми прочитаємо твою ідею. Якщо візьмемо її в роботу — відкриємо тобі Plus на рік.', "Thank you! We will read your idea. If we take it on, we'll unlock Plus for you for a year.", '¡Gracias! Leeremos tu idea. Si la llevamos a cabo, te damos Plus por un año.', 'Obrigado! Vamos ler sua ideia. Se ela entrar no trabalho, liberamos Plus por um ano.', 'Cảm ơn! Chúng tôi sẽ đọc ý tưởng của bạn. Nếu đưa vào làm, chúng tôi sẽ mở Plus cho bạn trong một năm.', 'Terima kasih! Kami akan membaca idemu. Jika kami kerjakan, kami akan membukakan Plus selama setahun.', 'Teşekkürler! Fikrini okuyacağız. Üzerinde çalışmaya alırsak sana bir yıllık Plus açacağız.', 'Dzięki! Przeczytamy twój pomysł. Jeśli weźmiemy go do pracy, odblokujemy ci Plus na rok.');
      await enqueueThemedBlockingInfoAlert(
        successTitle,
        successMessage,
        L('Вернуться в настройки', 'Повернутися в налаштування', 'Back to settings', 'Volver a ajustes', 'Voltar aos ajustes', 'Về cài đặt', 'Kembali ke pengaturan', 'Ayarlara dön', 'Wróć do ustawień'),
      );
      router.replace('/ideas_catalog' as never);
    } catch (error: unknown) {
      const code = (error as { code?: string; message?: string })?.code || '';
      const message = (error as { message?: string })?.message || '';
      const isLimited = code.includes('resource-exhausted') || message.includes('rate_limited');
      const isRestricted = code === 'idea-restricted' || code.includes('idea_submission_restricted') || message.includes('idea_submission_restricted');
      await enqueueThemedBlockingInfoAlert(
        isRestricted
          ? L('Отправка идей ограничена', 'Надсилання ідей обмежено', 'Idea submissions are restricted', 'El envío de ideas está restringido', 'O envio de ideias está restrito', 'Việc gửi ý tưởng bị hạn chế', 'Pengiriman ide dibatasi', 'Fikir gönderme kısıtlandı', 'Wysyłanie pomysłów jest ograniczone')
          : isLimited
          ? L('Уже приняли идею сегодня', 'Вже прийняли ідею сьогодні', 'We already received an idea today', 'Ya recibimos una idea hoy', 'Já recebemos uma ideia hoje', 'Hôm nay chúng tôi đã nhận một ý tưởng', 'Kami sudah menerima ide hari ini', 'Bugün zaten bir fikir aldık', 'Dziś przyjęliśmy już pomysł')
          : L('Что-то пошло не так', 'Щось пішло не так', 'Something went wrong', 'Algo salió mal', 'Algo deu errado', 'Đã xảy ra lỗi', 'Ada yang bermasalah', 'Bir şeyler ters gitti', 'Coś poszło nie tak'),
        isRestricted
          ? L('Сейчас нельзя отправлять новые идеи. Если считаешь это ошибкой, обратись в поддержку.', 'Зараз не можна надсилати нові ідеї. Якщо вважаєш це помилкою, звернися в підтримку.', 'You cannot submit new ideas right now. Contact support if you think this is a mistake.', 'Ahora no puedes enviar nuevas ideas. Contacta con soporte si crees que es un error.', 'Agora não é possível enviar novas ideias. Fale com o suporte se achar que é um erro.', 'Hiện tại bạn không thể gửi ý tưởng mới. Hãy liên hệ hỗ trợ nếu đây là nhầm lẫn.', 'Kamu tidak bisa mengirim ide baru sekarang. Hubungi dukungan jika ini keliru.', 'Şu anda yeni fikir gönderemezsin. Bunun bir hata olduğunu düşünüyorsan desteğe ulaş.', 'Nie możesz teraz wysyłać nowych pomysłów. Jeśli to błąd, skontaktuj się z pomocą.')
          : isLimited
          ? L('Можно отправить одну идею в день. Возвращайся завтра со следующей.', 'Можна надіслати одну ідею на день. Повертайся завтра з наступною.', "You can send one idea per day. Come back tomorrow with the next one.", 'Puedes enviar una idea al día. Vuelve mañana con la siguiente.', 'Você pode enviar uma ideia por dia. Volte amanhã com a próxima.', 'Bạn có thể gửi một ý tưởng mỗi ngày. Hãy quay lại vào ngày mai.', 'Kamu bisa mengirim satu ide per hari. Kembali besok.', 'Günde bir fikir gönderebilirsin. Sonraki fikir için yarın gel.', 'Możesz wysłać jeden pomysł dziennie. Wróć jutro z kolejnym.')
          : L('Не получилось отправить идею. Проверь связь и попробуй снова.', 'Не вдалося надіслати ідею. Перевір зв’язок і спробуй знову.', "Couldn't send the idea. Check your connection and try again.", 'No se pudo enviar la idea. Revisa la conexión e inténtalo de nuevo.', 'Não conseguimos enviar a ideia. Verifique a conexão e tente de novo.', 'Không gửi được ý tưởng. Hãy kiểm tra kết nối và thử lại.', 'Ide belum bisa dikirim. Periksa koneksi dan coba lagi.', 'Fikir gönderilemedi. Bağlantını kontrol edip tekrar dene.', 'Nie udało się wysłać pomysłu. Sprawdź połączenie i spróbuj ponownie.'),
        L('Вернуться к идее', 'Повернутися до ідеї', 'Back to my idea', 'Volver a mi idea', 'Voltar à minha ideia', 'Quay lại ý tưởng', 'Kembali ke ide', 'Fikre dön', 'Wróć do pomysłu'),
      );
    } finally {
      setBusy(false);
    }
  }, [L, canSend, editBenefit, editCategory, editIdeaId, editLang, idea, lang, router, title]);

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
          title={L('Идеи', 'Ідеї', 'Ideas', 'Ideas', 'Ideias', 'Ý tưởng', 'Ide', 'Fikirler', 'Pomysły')}
          onClose={() => safeRouterBack(router, '/(tabs)/settings' as never)}
        />
        <BouncyScrollView
          decelerationRate="fast"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 32 + Math.max(bottomInset, 16) }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          {loadingEdit ? <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', paddingVertical: 26 }}><ActivityIndicator color={t.accent} /><Text style={{ color: t.textSecond, fontSize: f.caption, marginTop: 10 }}>{L('Загружаем идею…', 'Завантажуємо ідею…', 'Loading idea…', 'Cargando la idea…', 'Carregando a ideia…', 'Đang tải ý tưởng…', 'Memuat ide…', 'Fikir yükleniyor…', 'Ładowanie pomysłu…')}</Text></View> : null}
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
              {editIdeaId ? L('Редактируй идею', 'Редагуй ідею', 'Edit your idea', 'Edita tu idea', 'Edite sua ideia', 'Chỉnh sửa ý tưởng', 'Edit idemu', 'Fikrini düzenle', 'Edytuj pomysł') : L('Поделись идеей', 'Поділися ідеєю', 'Share your idea', 'Comparte tu idea', 'Compartilhe sua ideia', 'Chia sẻ ý tưởng', 'Bagikan idemu', 'Fikrini paylaş', 'Podziel się pomysłem')}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: f.body * 1.4, textAlign: 'center', marginTop: 8 }}>
              {L(
                'Поделись идеей, которая поможет Phraseman стать лучше. Если она откликнется нам и мы решим воплотить её в приложении, в знак благодарности откроем тебе Plus на целый год.',
                'Поділися ідеєю, яка допоможе зробити Phraseman кращим. Якщо вона відгукнеться нам і ми вирішимо втілити її в застосунку, на знак подяки відкриємо тобі Plus на цілий рік.', "Share an idea that could make Phraseman better. If it resonates and we build it, we'll thank you with a whole year of Plus.",
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
            {L('Коротко', 'Коротко', 'Briefly', 'En breve', 'Em poucas palavras', 'Tóm tắt', 'Singkatnya', 'Kısaca', 'Krótko')}
          </Text>
          <TextInput
            accessibilityLabel={L('Короткое название идеи', 'Коротка назва ідеї', 'Short idea title', 'Título breve de la idea', 'Título curto da ideia', 'Tên ngắn của ý tưởng', 'Judul singkat ide', 'Fikrin kısa başlığı', 'Krótki tytuł pomysłu')}
            value={title}
            onChangeText={setTitle}
            placeholder={L('Например: добавить поиск фраз', 'Наприклад: додати пошук фраз', 'E.g.: add phrase search', 'Por ejemplo: añadir búsqueda de frases', 'Por exemplo: adicionar busca de frases', 'Ví dụ: thêm tìm kiếm cụm từ', 'Contoh: tambahkan pencarian frasa', 'Örneğin: ifade araması ekleyin', 'Na przykład: dodać wyszukiwanie zwrotów')}
            placeholderTextColor={t.textGhost}
            maxLength={120}
            editable={!loadingEdit}
            style={[inputStyle, { minHeight: 52, maxHeight: 52, textAlignVertical: 'center' }]}
          />

          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginTop: 20, marginBottom: 8 }}>
            {L('Твоя идея', 'Твоя ідея', 'Your idea', 'Tu idea', 'Sua ideia', 'Ý tưởng của bạn', 'Idemu', 'Fikrin', 'Twój pomysł')}
          </Text>
          <TextInput
            accessibilityLabel={L('Опиши свою идею', 'Опиши свою ідею', 'Describe your idea', 'Describe tu idea', 'Descreva sua ideia', 'Mô tả ý tưởng của bạn', 'Jelaskan idemu', 'Fikrini anlat', 'Opisz swój pomysł')}
            value={idea}
            onChangeText={setIdea}
            placeholder={L('Что можно сделать лучше? Опиши как получится — мы разберёмся.', 'Що можна зробити краще? Опиши як виходить — ми розберемося.', "What could be better? Describe it any way you like — we'll figure it out.", '¿Qué podemos mejorar? Cuéntanoslo como te salga.', 'O que podemos melhorar? Conte do seu jeito.', 'Chúng tôi có thể cải thiện điều gì? Hãy viết theo cách của bạn.', 'Apa yang bisa kami buat lebih baik? Ceritakan dengan caramu.', 'Neyi daha iyi yapabiliriz? Aklındaki gibi anlat.', 'Co możemy ulepszyć? Opisz to po swojemu.')}
            placeholderTextColor={t.textGhost}
            multiline
            maxLength={2000}
            editable={!loadingEdit}
            style={inputStyle}
          />
          <Text style={{ color: t.textSecond, fontSize: f.caption, marginTop: 8 }}>
            {L('Название — от 3 символов, описание — от 10.', 'Назва — від 3 символів, опис — від 10.', 'Title: at least 3 characters. Description: at least 10.', 'Título: al menos 3 caracteres. Descripción: al menos 10.', 'Título: pelo menos 3 caracteres. Descrição: pelo menos 10.', 'Tiêu đề: ít nhất 3 ký tự, mô tả: ít nhất 10.', 'Judul minimal 3 karakter, deskripsi minimal 10.', 'Başlık en az 3, açıklama en az 10 karakter.', 'Tytuł: minimum 3 znaki, opis: minimum 10.')}
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={editIdeaId ? L('Сохранить изменения', 'Зберегти зміни', 'Save changes', 'Guardar cambios', 'Salvar alterações', 'Lưu thay đổi', 'Simpan perubahan', 'Değişiklikleri kaydet', 'Zapisz zmiany') : L('Отправить идею', 'Надіслати ідею', 'Send idea', 'Enviar idea', 'Enviar ideia', 'Gửi ý tưởng', 'Kirim ide', 'Fikri gönder', 'Wyślij pomysł')}
            onPress={onSend}
            disabled={!canSend || loadingEdit}
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
                {editIdeaId ? L('Сохранить изменения', 'Зберегти зміни', 'Save changes', 'Guardar cambios', 'Salvar alterações', 'Lưu thay đổi', 'Simpan perubahan', 'Değişiklikleri kaydet', 'Zapisz zmiany') : L('Отправить идею', 'Надіслати ідею', 'Send idea', 'Enviar idea', 'Enviar ideia', 'Gửi ý tưởng', 'Kirim ide', 'Fikri gönder', 'Wyślij pomysł')}
              </Text>
            )}
          </TouchableOpacity>
        </BouncyScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
