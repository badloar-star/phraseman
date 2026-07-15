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
import BouncyScrollView from '../components/BouncyScrollView';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { triLang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';
import { submitUserIdea, type IdeaCategory } from './ideas_client';
import { enqueueThemedBlockingInfoAlert } from './themed_blocking_alert_queue';

const CATEGORIES: { key: IdeaCategory; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'feature', icon: 'sparkles-outline' },
  { key: 'improvement', icon: 'trending-up-outline' },
  { key: 'monetization', icon: 'diamond-outline' },
  { key: 'content', icon: 'library-outline' },
  { key: 'other', icon: 'ellipsis-horizontal-circle-outline' },
];

export default function IdeasSubmitScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);

  const L = (
    ru: string,
    uk: string,
    es: string,
    ptBR: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang, { ru, uk, es, 'pt-BR': ptBR, vi, id, tr, pl });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [benefit, setBenefit] = useState('');
  const [category, setCategory] = useState<IdeaCategory>('feature');
  const [busy, setBusy] = useState(false);

  const categoryLabel = useCallback(
    (key: IdeaCategory): string => {
      switch (key) {
        case 'feature':
          return L('Новая фича', 'Нова фіча', 'Nueva función', 'Nova funcionalidade', 'Tính năng mới', 'Fitur baru', 'Yeni özellik', 'Nowa funkcja');
        case 'improvement':
          return L('Улучшение', 'Покращення', 'Mejora', 'Melhoria', 'Cải tiến', 'Peningkatan', 'İyileştirme', 'Ulepszenie');
        case 'monetization':
          return L('Монетизация', 'Монетизація', 'Monetización', 'Monetização', 'Kiếm tiền', 'Monetisasi', 'Para kazanma', 'Monetyzacja');
        case 'content':
          return L('Контент', 'Контент', 'Contenido', 'Conteúdo', 'Nội dung', 'Konten', 'İçerik', 'Treść');
        default:
          return L('Другое', 'Інше', 'Otro', 'Outro', 'Khác', 'Lainnya', 'Diğer', 'Inne');
      }
    },
    [lang],
  );

  const canSend = useMemo(
    () => title.trim().length >= 3 && description.trim().length >= 10 && !busy,
    [title, description, busy],
  );

  const onSend = useCallback(async () => {
    if (!canSend) return;
    Keyboard.dismiss();
    hapticTap();
    setBusy(true);
    try {
      await submitUserIdea({
        title: title.trim(),
        description: description.trim(),
        benefit: benefit.trim(),
        category,
        lang,
      });
      await enqueueThemedBlockingInfoAlert(
        L('Идея отправлена 🚀', 'Ідею надіслано 🚀', 'Idea enviada 🚀', 'Ideia enviada 🚀', 'Ý tưởng đã gửi 🚀', 'Ide terkirim 🚀', 'Fikir gönderildi 🚀', 'Pomysł wysłany 🚀'),
        L(
          'Спасибо! Мы прочитаем твою идею. Если возьмём её в работу — откроем тебе Plus на год.',
          'Дякуємо! Ми прочитаємо твою ідею. Якщо візьмемо її в роботу — відкриємо тобі Plus на рік.',
          '¡Gracias! Leeremos tu idea. Si la tomamos, te damos Plus por un año.',
          'Obrigado! Vamos ler sua ideia. Se ela entrar no trabalho, liberamos Plus por um ano.',
          'Cảm ơn! Chúng tôi sẽ đọc ý tưởng của bạn. Nếu đưa vào làm, chúng tôi sẽ mở Plus cho bạn trong một năm.',
          'Terima kasih! Kami akan membaca idemu. Jika kami kerjakan, kami akan membukakan Plus selama setahun.',
          'Teşekkürler! Fikrini okuyacağız. Üzerinde çalışmaya alırsak sana bir yıllık Plus açacağız.',
          'Dzięki! Przeczytamy twój pomysł. Jeśli weźmiemy go do pracy, odblokujemy ci Plus na rok.',
        ),
        L('Понятно', 'Зрозуміло', 'Entendido', 'Entendi', 'Đã hiểu', 'Mengerti', 'Anladım', 'Rozumiem'),
      );
      safeRouterBack(router, '/(tabs)/settings' as any);
    } catch (e: unknown) {
      const code = (e as { code?: string; message?: string })?.code || '';
      const msg = (e as { message?: string })?.message || '';
      const limited = code.includes('resource-exhausted') || msg.includes('rate_limited');
      await enqueueThemedBlockingInfoAlert(
        limited
          ? L('Уже приняли идею сегодня', 'Вже прийняли ідею сьогодні', 'Ya recibimos una idea hoy', 'Já recebemos uma ideia hoje', 'Hôm nay chúng tôi đã nhận một ý tưởng', 'Kami sudah menerima ide hari ini', 'Bugün zaten bir fikir aldık', 'Dziś przyjęliśmy już pomysł')
          : L('Что-то пошло не так', 'Щось пішло не так', 'Algo salió mal', 'Algo deu errado', 'Đã xảy ra lỗi', 'Ada yang bermasalah', 'Bir şeyler ters gitti', 'Coś poszło nie tak'),
        limited
          ? L(
              'Одна идея в день — чтобы каждая получила внимание. Возвращайся завтра со следующей.',
              'Одна ідея на день — щоб кожна отримала увагу. Повертайся завтра з наступною.',
              'Una idea al día para dar atención a cada una. Vuelve mañana con la siguiente.',
              'Uma ideia por dia para que cada uma receba atenção. Volte amanhã com a próxima.',
              'Mỗi ngày một ý tưởng để ý tưởng nào cũng được chú ý. Hãy quay lại ngày mai với ý tưởng tiếp theo.',
              'Satu ide per hari agar setiap ide mendapat perhatian. Kembali besok dengan ide berikutnya.',
              'Her fikre dikkat verebilmek için günde bir fikir. Sonraki fikirle yarın geri gel.',
              'Jeden pomysł dziennie, żeby każdy dostał uwagę. Wróć jutro z kolejnym.',
            )
          : L(
              'Не получилось отправить идею. Проверь связь и попробуй снова.',
              'Не вдалося надіслати ідею. Перевір зв’язок і спробуй знову.',
              'No se pudo enviar la idea. Revisa la conexión e inténtalo de nuevo.',
              'Não conseguimos enviar a ideia. Verifique a conexão e tente de novo.',
              'Không gửi được ý tưởng. Hãy kiểm tra kết nối và thử lại.',
              'Ide belum bisa dikirim. Periksa koneksi dan coba lagi.',
              'Fikir gönderilemedi. Bağlantını kontrol edip tekrar dene.',
              'Nie udało się wysłać pomysłu. Sprawdź połączenie i spróbuj ponownie.',
            ),
        L('Понятно', 'Зрозуміло', 'Entendido', 'Entendi', 'Đã hiểu', 'Mengerti', 'Anladım', 'Rozumiem'),
      );
    } finally {
      setBusy(false);
    }
  }, [canSend, title, description, benefit, category, lang, router]);

  const inputStyle = {
    backgroundColor: t.bgCard,
    borderColor: t.border,
    borderWidth: 0,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: t.textPrimary,
    fontSize: f.body,
  } as const;
  const labelStyle = {
    color: t.textPrimary,
    fontSize: f.body,
    fontWeight: '700' as const,
    marginBottom: 8,
    marginTop: 18,
  };
  const hintStyle = { color: t.textSecond, fontSize: f.caption, marginTop: 6 };

  const scrollBottomPad = 120 + Math.max(bottomInset, 16);
  const submitTextColor = canSend ? t.correctText : t.textSecond;

  return (
    <ScreenGradient artBackdrop="settings">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 0.5,
            borderBottomColor: t.border,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              hapticTap();
              safeRouterBack(router, '/(tabs)/settings' as any);
            }}
            style={{ marginRight: 12, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TouchableOpacity>
          <Text
            style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', flex: 1 }}
            numberOfLines={1}
          >
            {L('Идеи', 'Ідеї', 'Ideas', 'Ideias', 'Ý tưởng', 'Ide', 'Fikirler', 'Pomysły')}
          </Text>
        </View>

        <BouncyScrollView
          decelerationRate="normal"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: scrollBottomPad }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          {/* Hero — Стиль ИГРА (Библия Phraseman): дружелюбный заголовок + награда-акцент */}
          <View style={{ alignItems: 'center', marginTop: 4, marginBottom: 6 }}>
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: 24,
                backgroundColor: t.correctBg,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 0,
                borderColor: t.correct,
                marginBottom: 14,
              }}
            >
              <Ionicons name="bulb" size={44} color={t.correct} />
            </View>
            <Text
              style={{
                fontSize: f.h2,
                fontWeight: '800',
                textAlign: 'center',
                lineHeight: f.h2 * 1.25,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: t.textPrimary }}>
                {L('Есть идея? ', 'Є ідея? ', '¿Tienes una idea? ', 'Tem uma ideia? ', 'Bạn có ý tưởng? ', 'Punya ide? ', 'Fikrin mi var? ', 'Masz pomysł? ')}
              </Text>
              <Text style={{ color: t.correct }}>
                {L('Получи год Plus', 'Отримай рік Plus', 'Gana un año de Plus', 'Ganhe um ano de Plus', 'Nhận một năm Plus', 'Dapatkan Plus setahun', 'Bir yıl Plus kazan', 'Zdobądź rok Plus')}
              </Text>
            </Text>
            <Text
              style={{
                color: t.textSecond,
                fontSize: f.body,
                textAlign: 'center',
                lineHeight: f.body * 1.4,
                paddingHorizontal: 6,
              }}
            >
              {L(
                'Помоги сделать Phraseman лучше. Возьмём идею в работу — откроем тебе всё на год.',
                'Допоможи зробити Phraseman кращим. Візьмемо ідею в роботу — відкриємо тобі все на рік.',
                'Ayuda a mejorar Phraseman. Si tomamos tu idea, te abrimos todo por un año.',
                'Ajude a melhorar o Phraseman. Se levarmos sua ideia adiante, liberamos tudo por um ano.',
                'Giúp Phraseman tốt hơn. Nếu chọn ý tưởng của bạn để làm, chúng tôi sẽ mở toàn bộ trong một năm.',
                'Bantu membuat Phraseman lebih baik. Jika idemu kami kerjakan, semua akses kami buka setahun.',
                "Phraseman'i daha iyi yapmamıza yardım et. Fikrini çalışmaya alırsak her şeyi bir yıllığına açarız.",
                'Pomóż ulepszyć Phraseman. Jeśli weźmiemy twój pomysł do pracy, odblokujemy wszystko na rok.',
              )}
            </Text>
          </View>

          {/* Как это работает — 3 шага (Стиль ИГРА) */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 4 }}>
            {[
              { emoji: '✍️', label: L('Опиши\nидею', 'Опиши\nідею', 'Describe\ntu idea', 'Descreva\na ideia', 'Mô tả\ný tưởng', 'Jelaskan\nidemu', 'Fikrini\nyaz', 'Opisz\npomysł'), reward: false },
              { emoji: '👀', label: L('Мы её\nпрочитаем', 'Ми її\nпрочитаємо', 'La\nleemos', 'Vamos\nler', 'Chúng tôi\nsẽ đọc', 'Kami\nbaca', 'Biz\nokuruz', 'My go\nprzeczytamy'), reward: false },
              { emoji: '🎁', label: L('Год\nPlus', 'Рік\nPlus', 'Año\nPlus', 'Ano\nPlus', 'Một năm\nPlus', 'Plus\nsetahun', 'Bir yıl\nPlus', 'Rok\nPlus'), reward: true },
            ].map((step, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  backgroundColor: step.reward ? t.correctBg : t.bgCard,
                  borderWidth: 0,
                  borderColor: step.reward ? t.correct : t.border,
                  borderRadius: 13,
                  paddingVertical: 11,
                  paddingHorizontal: 6,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 22 }}>{step.emoji}</Text>
                <Text
                  style={{
                    color: step.reward ? t.correct : t.textSecond,
                    fontSize: f.caption,
                    fontWeight: step.reward ? '700' : '500',
                    textAlign: 'center',
                    marginTop: 4,
                    lineHeight: f.caption * 1.3,
                  }}
                >
                  {step.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Графа 1 — Название */}
          <Text style={labelStyle}>📝 {L('Название идеи', 'Назва ідеї', 'Título de la idea', 'Título da ideia', 'Tên ý tưởng', 'Judul ide', 'Fikrin başlığı', 'Tytuł pomysłu')} *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={L('Коротко, в одну строку', 'Коротко, в один рядок', 'Breve, en una línea', 'Curto, em uma linha', 'Ngắn gọn, một dòng', 'Singkat, satu baris', 'Kısa, tek satır', 'Krótko, w jednej linii')}
            placeholderTextColor={t.textGhost}
            maxLength={120}
            style={inputStyle}
          />

          {/* Графа 2 — Что это и как работает */}
          <Text style={labelStyle}>💬 {L('Что это и как работает', 'Що це і як працює', 'Qué es y cómo funciona', 'O que é e como funciona', 'Đó là gì và hoạt động thế nào', 'Apa ini dan cara kerjanya', 'Bu nedir ve nasıl çalışır', 'Co to jest i jak działa')} *</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={L(
              'Опиши идею подробно: что увидит пользователь и как этим пользоваться.',
              'Опиши ідею докладно: що побачить користувач і як цим користуватися.',
              'Describe la idea: qué verá el usuario y cómo se usa.',
              'Descreva a ideia em detalhes: o que o usuário verá e como vai usar.',
              'Mô tả chi tiết ý tưởng: người dùng sẽ thấy gì và dùng như thế nào.',
              'Jelaskan idenya: apa yang dilihat pengguna dan bagaimana cara memakainya.',
              'Fikri ayrıntılı anlat: kullanıcı ne görecek ve nasıl kullanacak.',
              'Opisz pomysł dokładnie: co zobaczy użytkownik i jak będzie z tego korzystać.',
            )}
            placeholderTextColor={t.textGhost}
            multiline
            maxLength={2000}
            style={[inputStyle, { minHeight: 120, textAlignVertical: 'top' }]}
          />

          {/* Графа 3 — Чем поможет приложению */}
          <Text style={labelStyle}>🚀 {L('Чем это поможет приложению', 'Чим це допоможе застосунку', 'Cómo ayuda a la app', 'Como isso ajuda o app', 'Điều này giúp ứng dụng thế nào', 'Bagaimana ini membantu aplikasi', 'Bu uygulamaya nasıl yardım eder', 'Jak to pomoże aplikacji')}</Text>
          <TextInput
            value={benefit}
            onChangeText={setBenefit}
            placeholder={L(
              'Зачем это нужно: что станет удобнее, интереснее или выгоднее.',
              'Навіщо це потрібно: що стане зручніше, цікавіше або вигідніше.',
              'Para qué sirve: qué será más cómodo, interesante o rentable.',
              'Por que isso importa: o que ficará mais prático, interessante ou útil.',
              'Vì sao cần điều này: điều gì sẽ tiện hơn, thú vị hơn hoặc có lợi hơn.',
              'Mengapa ini perlu: apa yang jadi lebih nyaman, menarik, atau berguna.',
              'Neden gerekli: ne daha rahat, ilginç veya faydalı olacak.',
              'Po co to jest: co stanie się wygodniejsze, ciekawsze albo bardziej opłacalne.',
            )}
            placeholderTextColor={t.textGhost}
            multiline
            maxLength={1000}
            style={[inputStyle, { minHeight: 88, textAlignVertical: 'top' }]}
          />

          {/* Графа 4 — Категория */}
          <Text style={labelStyle}>🏷️ {L('Категория', 'Категорія', 'Categoría', 'Categoria', 'Danh mục', 'Kategori', 'Kategori', 'Kategoria')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map((c) => {
              const active = category === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => {
                    Keyboard.dismiss();
                    hapticTap();
                    setCategory(c.key);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    borderRadius: 999,
                    borderWidth: 0,
                    borderColor: active ? t.correct : t.border,
                    backgroundColor: active ? t.correctBg : t.bgCard,
                  }}
                >
                  <Ionicons
                    name={c.icon}
                    size={16}
                    color={active ? t.correct : t.textSecond}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      color: active ? t.textPrimary : t.textSecond,
                      fontSize: f.caption,
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    {categoryLabel(c.key)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={hintStyle}>
            {L('⏳ Одна идея в день — так у каждой больше шансов. Ответ придёт прямо в приложение.', '⏳ Одна ідея на день — так у кожної більше шансів. Відповідь прийде прямо в застосунок.', '⏳ Una idea al día — así cada una tiene más opciones. La respuesta llega a la app.', '⏳ Uma ideia por dia — assim cada uma tem mais chance. A resposta chegará direto no app.', '⏳ Mỗi ngày một ý tưởng — như vậy mỗi ý tưởng có cơ hội hơn. Câu trả lời sẽ đến ngay trong ứng dụng.', '⏳ Satu ide per hari — jadi tiap ide punya peluang lebih besar. Jawaban akan datang langsung di aplikasi.', '⏳ Günde bir fikir — böylece her birinin şansı artar. Yanıt doğrudan uygulamaya gelecek.', '⏳ Jeden pomysł dziennie — tak każdy ma większą szansę. Odpowiedź przyjdzie prosto w aplikacji.')}
          </Text>

          {/* CTA — Стиль ИНВЕСТОР (глагол + ценность) */}
          <TouchableOpacity
            onPress={onSend}
            disabled={!canSend}
            activeOpacity={0.85}
            style={{
              marginTop: 22,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: canSend ? t.accent : t.bgCard,
              borderWidth: 0,
              borderColor: t.border,
              opacity: canSend ? 1 : 0.7,
            }}
          >
            {busy ? (
              <ActivityIndicator color={submitTextColor} />
            ) : (
              <Text
                style={{
                  color: submitTextColor,
                  fontSize: f.body,
                  fontWeight: '800',
                }}
              >
                {L('🚀 Отправить идею', '🚀 Надіслати ідею', '🚀 Enviar idea', '🚀 Enviar ideia', '🚀 Gửi ý tưởng', '🚀 Kirim ide', '🚀 Fikri gönder', '🚀 Wyślij pomysł')}
              </Text>
            )}
          </TouchableOpacity>
        </BouncyScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
