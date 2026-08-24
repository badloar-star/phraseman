import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from './SafeLinearGradient';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { isLightThemeMode } from '../constants/theme';
import {
  RewardModalBackdrop,
  RewardModalPanelBackdrop,
  rewardModalAccentColor,
  rewardModalPanelBorder,
  rewardModalPanelColors,
  rewardModalPrimaryButtonColors,
  rewardModalPrimaryButtonText,
  rewardModalSoftSurface,
} from './RewardModalBackdrop';
import HybridAlertShell, { CascadeItem } from './modal_fx/HybridAlertShell';
import DuoPressable from './DuoPressable';
import PressableHybrid from './PressableHybrid';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LUM } from '../constants/motionHybrid';

type Props = {
  visible: boolean;
  variant: 'welcome' | 'ended';
  onPrimaryPress: () => void;
  onSecondaryPress?: () => void;
  /** Production default — hybrid; explicit `classic` is the rollback/QA path. */
  motionVariant?: 'classic' | 'hybrid';
};

const COPY = {
  ru: {
    welcomeEyebrow: 'Подарок на старт',
    welcomeTitle: 'Три дня — всё открыто',
    welcomeBody: 'Мы дарим тебе три дня полного доступа. Никаких лимитов, всё открыто, энергия бесконечная. Посмотри приложение в полной силе — и сам реши, что тебе нужно.',
    welcomeCta: 'Начать — всё открыто',
    welcomeFooter: 'Это подарок. Подписка не включается автоматически.',
    endedEyebrow: 'Три дня позади',
    endedTitle: 'Продолжай — бесплатно или с Plus',
    endedBody: 'Всё, что ты выучил — остаётся с тобой. Бесплатный режим доступен всегда. Plus нужен, если хочешь вернуть все планы, темы, аналитику и учёбу без ограничений.',
    endedPrimary: 'Открыть полный доступ',
    endedSecondary: 'Остаться на базовом',
  },
  uk: {
    welcomeEyebrow: 'Подарунок на старт',
    welcomeTitle: 'Три дні - весь застосунок без замків',
    welcomeBody: 'Ми відкрили уроки, плани, теми, аналітику помилок і режим без енергії. Можна спокійно натискати все підряд - майже науковий метод.',
    welcomeCta: 'Погнали, все відкрито',
    welcomeFooter: 'Це подарунок. Підписка не вмикається автоматично.',
    endedEyebrow: 'Подарунковий режим завершився',
    endedTitle: 'Безкоштовний режим залишається з тобою',
    endedBody: 'Три дні повного доступу завершилися. Вчитися безкоштовно все ще можна: уроки, фрази й прогрес залишаються. Plus-фішки знову чекають у Plus, якщо захочеться залишити все відкритим.',
    endedPrimary: 'Залишити повний доступ',
    endedSecondary: 'Продовжити безкоштовно',
  },
  es: {
    welcomeEyebrow: 'Regalo inicial',
    welcomeTitle: 'Tres días con toda la app abierta',
    welcomeBody: 'Abrimos lecciones, planes, temas, análisis de errores y modo sin energía. Puedes probarlo todo con calma: método científico, casi.',
    welcomeCta: 'Vamos, todo abierto',
    welcomeFooter: 'Es un regalo. La suscripción no se activa automáticamente.',
    endedEyebrow: 'El regalo terminó',
    endedTitle: 'El modo gratis sigue contigo',
    endedBody: 'Tus tres días de acceso completo terminaron. Aún puedes aprender gratis: lecciones, frases y progreso siguen aquí. Plus vuelve a guardar las funciones avanzadas si quieres dejar todo abierto.',
    endedPrimary: 'Mantener acceso completo',
    endedSecondary: 'Continuar gratis',
  },
  'pt-BR': {
    welcomeEyebrow: 'Presente inicial',
    welcomeTitle: 'Três dias com tudo aberto',
    welcomeBody: 'Abrimos lições, planos, temas, análise de erros e modo sem energia. Você pode testar tudo com calma: quase um método científico.',
    welcomeCta: 'Vamos, tudo aberto',
    welcomeFooter: 'É um presente. A assinatura não é ativada automaticamente.',
    endedEyebrow: 'O presente terminou',
    endedTitle: 'O modo grátis continua com você',
    endedBody: 'Seus três dias de acesso completo terminaram. Você ainda pode aprender grátis: lições, frases e progresso continuam aqui. O Plus volta a guardar os recursos avançados se quiser deixar tudo aberto.',
    endedPrimary: 'Manter acesso completo',
    endedSecondary: 'Continuar grátis',
  },
  vi: {
    welcomeEyebrow: 'Quà khởi đầu',
    welcomeTitle: 'Ba ngày mở toàn bộ ứng dụng',
    welcomeBody: 'Chúng tôi đã mở bài học, kế hoạch, chủ đề, phân tích lỗi và chế độ không giới hạn năng lượng. Bạn có thể thử mọi thứ thật thoải mái: gần như một phương pháp khoa học.',
    welcomeCta: 'Bắt đầu, mọi thứ đã mở',
    welcomeFooter: 'Đây là quà tặng. Gói đăng ký không tự động bật.',
    endedEyebrow: 'Quà tặng đã kết thúc',
    endedTitle: 'Chế độ miễn phí vẫn ở lại với bạn',
    endedBody: 'Ba ngày truy cập đầy đủ đã kết thúc. Bạn vẫn có thể học miễn phí: bài học, cụm từ và tiến độ vẫn ở đây. Plus sẽ giữ lại các tính năng nâng cao nếu bạn muốn mở tất cả.',
    endedPrimary: 'Giữ quyền truy cập đầy đủ',
    endedSecondary: 'Tiếp tục miễn phí',
  },
  id: {
    welcomeEyebrow: 'Hadiah awal',
    welcomeTitle: 'Tiga hari dengan semua terbuka',
    welcomeBody: 'Pelajaran, rencana, tema, analisis kesalahan, dan mode tanpa energi sudah kami buka. Kamu bisa mencoba semuanya dengan tenang: hampir seperti metode ilmiah.',
    welcomeCta: 'Mulai, semuanya terbuka',
    welcomeFooter: 'Ini hadiah. Langganan tidak aktif otomatis.',
    endedEyebrow: 'Hadiah selesai',
    endedTitle: 'Mode gratis tetap bersamamu',
    endedBody: 'Tiga hari akses penuhmu selesai. Kamu masih bisa belajar gratis: pelajaran, frasa, dan progres tetap ada. Plus kembali menyimpan fitur lanjutan kalau kamu ingin semuanya tetap terbuka.',
    endedPrimary: 'Pertahankan akses penuh',
    endedSecondary: 'Lanjut gratis',
  },
  tr: {
    welcomeEyebrow: 'Başlangıç hediyesi',
    welcomeTitle: 'Üç gün boyunca her şey açık',
    welcomeBody: 'Dersleri, planları, temaları, hata analizini ve enerjisiz modu açtık. Her şeyi sakin sakin deneyebilirsin: neredeyse bilimsel yöntem.',
    welcomeCta: 'Başla, her şey açık',
    welcomeFooter: 'Bu bir hediye. Abonelik otomatik başlamaz.',
    endedEyebrow: 'Hediye bitti',
    endedTitle: 'Ücretsiz mod seninle kalıyor',
    endedBody: 'Üç günlük tam erişimin sona erdi. Yine de ücretsiz öğrenebilirsin: dersler, ifadeler ve ilerleme burada kalır. Her şeyi açık tutmak istersen gelişmiş özellikler yeniden Plus’da.',
    endedPrimary: 'Tam erişimi koru',
    endedSecondary: 'Ücretsiz devam et',
  },
  pl: {
    welcomeEyebrow: 'Prezent na start',
    welcomeTitle: 'Trzy dni z całą aplikacją otwartą',
    welcomeBody: 'Otworzyliśmy lekcje, plany, motywy, analizę błędów i tryb bez energii. Możesz spokojnie sprawdzić wszystko: prawie metoda naukowa.',
    welcomeCta: 'Start, wszystko otwarte',
    welcomeFooter: 'To prezent. Subskrypcja nie włącza się automatycznie.',
    endedEyebrow: 'Prezent się skończył',
    endedTitle: 'Tryb darmowy zostaje z tobą',
    endedBody: 'Trzy dni pełnego dostępu dobiegły końca. Nadal możesz uczyć się za darmo: lekcje, frazy i postęp zostają tutaj. Plus znów przechowuje funkcje zaawansowane, jeśli chcesz mieć wszystko otwarte.',
    endedPrimary: 'Zachowaj pełny dostęp',
    endedSecondary: 'Kontynuuj za darmo',
  },
};

function IntroFullAccessModal({ visible, variant, onPrimaryPress, onSecondaryPress, motionVariant = 'hybrid' }: Props) {
  const { lang } = useLang();
  const { theme, themeMode } = useTheme();
  const copy = COPY[lang as keyof typeof COPY] ?? COPY.ru;
  const isWelcome = variant === 'welcome';
  const reduceMotion = useReduceMotion();
  const hybrid = motionVariant === 'hybrid';

  // Воронка: показ модалок intro — раньше не трекались. `intro_ended` — главный
  // момент конверсии (конец 72ч полного доступа), важно видеть его отдельно.
  useEffect(() => {
    if (!visible) return;
    void import('../app/analytics').then(({ trackEvent }) =>
      trackEvent(isWelcome ? 'intro_welcome_shown' : 'intro_ended_shown', {}),
    );
  }, [visible, isWelcome]);

  const accent = rewardModalAccentColor(themeMode, theme);
  const border = rewardModalPanelBorder(themeMode, theme);
  const softSurface = rewardModalSoftSurface(themeMode, theme);
  // зачем: ветка светлой темы была заглушена литералом false — на sagePorcelain
  // белый текст ложился на фарфоровую панель rewardModalPanelColors (белое-на-белом).
  const lightPanel = isLightThemeMode(themeMode);
  const textPrimary = lightPanel ? theme.textPrimary : '#FFFFFF';
  const textSecondary = lightPanel ? 'rgba(23,32,29,0.72)' : 'rgba(255,255,255,0.78)';

  const handlePrimaryPress = () => {
    void import('../app/analytics').then(({ trackEvent }) =>
      trackEvent(isWelcome ? 'intro_welcome_cta' : 'intro_ended_cta', {}),
    );
    onPrimaryPress();
  };
  const handleSecondaryPress = () => {
    void import('../app/analytics').then(({ trackEvent }) => trackEvent('intro_ended_dismiss', {}));
    onSecondaryPress?.();
  };

  // зачем: главная CTA офферных модалок — клавиша с кромкой (владелец, стандарт
  // «кнопки вдавливаются, а не тускнеют»), тёмный тон кромки — акцент темы.
  const primaryEdgeColor = accent;

  if (hybrid) {
    // Гибрид «Световод»: панель выходит из света (HybridAlertShell — общий шелл
    // семьи алертов/оффер-модалок), контент — каскад по LUM.ladder, герой (корона/
    // значок) settle БЕЗ отскока. hapticSuccess НЕ нужен — это оффер, не награда.
    return (
      <HybridAlertShell
        visible={visible}
        onRequestClose={onSecondaryPress ?? onPrimaryPress}
        shadowColor="#000000"
        backdropColor="rgba(0,0,0,0.72)"
        testID={isWelcome ? 'intro-full-access-welcome-backdrop' : 'intro-full-access-ended-backdrop'}
      >
        <ScrollView
          style={styles.hybridScroll}
          contentContainerStyle={styles.hybridScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <RewardModalPanelBackdrop themeMode={themeMode} intensity="strong" opacity={0.72} />
          <LinearGradient
            pointerEvents="none"
            colors={rewardModalPanelColors(themeMode, theme)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.content}>
            <CascadeItem delay={LUM.ladder[1]} reduceMotion={reduceMotion}>
              <View style={[styles.iconWrap, { backgroundColor: softSurface, borderColor: border }]}>
                <Ionicons name={isWelcome ? 'sparkles' : 'shield-checkmark'} size={28} color={accent} />
              </View>
            </CascadeItem>
            <CascadeItem delay={LUM.ladder[2]} reduceMotion={reduceMotion}>
              <Text style={[styles.eyebrow, { color: accent }]}>{isWelcome ? copy.welcomeEyebrow : copy.endedEyebrow}</Text>
            </CascadeItem>
            <CascadeItem delay={LUM.ladder[2]} reduceMotion={reduceMotion}>
              <Text style={[styles.title, { color: textPrimary }]}>{isWelcome ? copy.welcomeTitle : copy.endedTitle}</Text>
            </CascadeItem>
            <CascadeItem delay={LUM.ladder[3]} reduceMotion={reduceMotion}>
              <Text style={[styles.body, { color: textSecondary }]}>{isWelcome ? copy.welcomeBody : copy.endedBody}</Text>
            </CascadeItem>

            <CascadeItem delay={LUM.ladder[4]} reduceMotion={reduceMotion}>
              <DuoPressable
                testID={isWelcome ? 'intro-full-access-welcome-primary' : 'intro-full-access-ended-primary'}
                onPress={handlePrimaryPress}
                edgeColor={primaryEdgeColor}
                edgeHeight={6}
                gradientColors={rewardModalPrimaryButtonColors(themeMode)}
                style={styles.primaryGradient}
                wrapStyle={styles.primaryButtonWrap}
              >
                <Text style={[styles.primaryText, { color: rewardModalPrimaryButtonText(themeMode) }]}>
                  {isWelcome ? copy.welcomeCta : copy.endedPrimary}
                </Text>
              </DuoPressable>
            </CascadeItem>

            {isWelcome ? (
              <CascadeItem delay={LUM.ladder[5]} reduceMotion={reduceMotion}>
                <Text style={[styles.footer, { color: textSecondary }]}>{copy.welcomeFooter}</Text>
              </CascadeItem>
            ) : (
              <CascadeItem delay={LUM.ladder[5]} reduceMotion={reduceMotion}>
                <PressableHybrid
                  testID="intro-full-access-ended-secondary"
                  variant="secondary"
                  onPress={handleSecondaryPress}
                  style={styles.secondaryButton}
                  contentStyle={{ alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={[styles.secondaryText, { color: textSecondary }]}>{copy.endedSecondary}</Text>
                </PressableHybrid>
              </CascadeItem>
            )}
          </View>
        </ScrollView>
      </HybridAlertShell>
    );
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onSecondaryPress ?? onPrimaryPress}
    >
      <View style={styles.overlay}>
        <RewardModalBackdrop themeMode={themeMode} intensity="strong" />
        {/* зачем 2026-08-02 (владелец: «на маленьких экранах кнопки нет»):
            панель центрировалась во весь рост без прокрутки — на низком экране
            обрезалась вместе с кнопкой активации подарка. */}
        <SafeAreaView style={styles.safeScroll}>
        <ScrollView
          style={styles.safeScroll}
          contentContainerStyle={styles.safe}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.panel, { borderColor: border }]}>
            <RewardModalPanelBackdrop themeMode={themeMode} intensity="strong" opacity={0.72} />
            <LinearGradient
              pointerEvents="none"
              colors={rewardModalPanelColors(themeMode, theme)}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.content}>
              <View style={[styles.iconWrap, { backgroundColor: softSurface, borderColor: border }]}>
                <Ionicons name={isWelcome ? 'sparkles' : 'shield-checkmark'} size={28} color={accent} />
              </View>
              <Text style={[styles.eyebrow, { color: accent }]}>{isWelcome ? copy.welcomeEyebrow : copy.endedEyebrow}</Text>
              <Text style={[styles.title, { color: textPrimary }]}>{isWelcome ? copy.welcomeTitle : copy.endedTitle}</Text>
              <Text style={[styles.body, { color: textSecondary }]}>{isWelcome ? copy.welcomeBody : copy.endedBody}</Text>

              <Pressable
                testID={isWelcome ? 'intro-full-access-welcome-primary' : 'intro-full-access-ended-primary'}
                accessibilityRole="button"
                onPress={handlePrimaryPress}
                style={styles.primaryButton}
              >
                <LinearGradient
                  colors={rewardModalPrimaryButtonColors(themeMode)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryGradient}
                >
                  <Text style={[styles.primaryText, { color: rewardModalPrimaryButtonText(themeMode) }]}>
                    {isWelcome ? copy.welcomeCta : copy.endedPrimary}
                  </Text>
                </LinearGradient>
              </Pressable>

              {isWelcome ? (
                <Text style={[styles.footer, { color: textSecondary }]}>{copy.welcomeFooter}</Text>
              ) : (
                <Pressable
                  testID="intro-full-access-ended-secondary"
                  accessibilityRole="button"
                  onPress={handleSecondaryPress}
                  style={styles.secondaryButton}
                >
                  <Text style={[styles.secondaryText, { color: textSecondary }]}>{copy.endedSecondary}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export default memo(IntroFullAccessModal);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  safeScroll: {
    flex: 1,
  },
  safe: {
    // flexGrow (а не flex) — в contentContainerStyle это единственный способ
    // сказать «растянись на всю высоту, если контента мало, но дай прокрутку,
    // если много». Центрирование сохранено для больших экранов.
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  panel: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderRadius: 28,
    borderWidth: 0, // guard-ok: borderColor у вызова инертен (borderWidth 0) — тон/фон несут разделение, не обводка
    overflow: 'hidden',
  },
  // зачем: HybridAlertShell даёт панель без встроенного скролла (maxWidth 360,
  // без ScrollView) — контент этой офферной модалки на низких экранах длиннее,
  // поэтому оборачиваем children в свой ScrollView внутри шелла (тот же паттерн
  // прокрутки, что и в classic-ветке). Радиус НЕ дублируем — шелл уже клипует
  // панель на 16 (styles.panel в HybridAlertShell), это и есть видимый угол.
  hybridScroll: {
    overflow: 'hidden',
    width: '100%',
    maxHeight: '100%',
  },
  hybridScrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 22,
    gap: 13,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: 0,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 4,
  },
  // зачем: DuoPressable(wrapStyle) — обёртка гибрид-CTA; повторяет геометрию
  // primaryButton (marginTop 4), плюс резерв места под кромку задаёт сам DuoPressable.
  primaryButtonWrap: {
    marginTop: 4,
  },
  primaryGradient: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    letterSpacing: 0,
  },
  footer: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    letterSpacing: 0,
    textAlign: 'center',
  },
});
