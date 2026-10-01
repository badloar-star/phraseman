import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import HybridAlertShell, { CascadeItem } from './modal_fx/HybridAlertShell';
import PressableHybrid from './PressableHybrid';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LUM } from '../constants/motionHybrid';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { triLang, type Lang } from '../constants/i18n';

// зачем: владелец 2026-09-29 — перенос окна на Liquid Glass «1 в 1 с макета»
// (overlays-more.html OM-FULL-WELCOME / OM-FULL-ENDED). Без градиентов и россыпи
// hex: непрозрачная основа и нейтральный CTA из токенов темы (13 тем). Старые
// обещания Plus (про планы, темы и разборы) убраны — в макете их
// нет; остаётся только подтверждённое: за три дня занятия не списывают энергию.
type Props = {
  visible: boolean;
  variant: 'welcome' | 'ended';
  onPrimaryPress: () => void;
  onSecondaryPress?: () => void;
  /** Production default — hybrid; explicit `classic` is the rollback/QA path. */
  motionVariant?: 'classic' | 'hybrid';
};

function introCopy(lang: Lang) {
  return {
    welcomeEyebrow: triLang(lang, { ru: 'Бонус на старт', uk: 'Бонус на старт', en: 'A bonus to start', es: 'Bonus inicial', 'pt-BR': 'Bônus inicial', vi: 'Thưởng khởi đầu', id: 'Bonus awal', tr: 'Başlangıç bonusu', pl: 'Bonus na start' }),
    welcomeTitle: triLang(lang, { ru: 'Три дня доступа начались', uk: 'Три дні доступу почалися', en: 'Your three days of access have begun', es: 'Empezaron tus tres días de acceso', 'pt-BR': 'Seus três dias de acesso começaram', vi: 'Ba ngày truy cập đã bắt đầu', id: 'Tiga hari akses dimulai', tr: 'Üç günlük erişim başladı', pl: 'Trzy dni dostępu się zaczęły' }),
    // зачем (совет 2026-09-30, B8): «условия для 2.0 уточняются» — не ответ человеку. Три дня
    // intro-доступа дают ровно hasPremiumAccess (PremiumContext: introState.active), то есть все
    // Plus-возможности. Диалоги открываются по рангу, не по Plus, — поэтому их здесь не обещаем.
    welcomeBody: triLang(lang, {
      ru: 'Все возможности Plus открыты: уроки, карточки и занятия без траты энергии.',
      uk: 'Усі можливості Plus відкриті: уроки, картки та заняття без витрати енергії.',
      en: 'All Plus features are open: lessons, cards and sessions that don’t spend energy.',
      es: 'Todas las funciones de Plus están abiertas: lecciones, tarjetas y sesiones sin gastar energía.',
      'pt-BR': 'Todos os recursos do Plus estão liberados: lições, cartões e sessões sem gastar energia.',
      vi: 'Mọi tính năng Plus đã mở: bài học, thẻ và buổi học không tốn năng lượng.',
      id: 'Semua fitur Plus terbuka: pelajaran, kartu, dan sesi tanpa menghabiskan energi.',
      tr: 'Tüm Plus özellikleri açık: dersler, kartlar ve enerji harcamayan çalışmalar.',
      pl: 'Wszystkie funkcje Plus są otwarte: lekcje, karty i nauka bez zużywania energii.',
    }),
    welcomeCta: triLang(lang, { ru: 'Начать', uk: 'Почати', en: 'Start', es: 'Empezar', 'pt-BR': 'Começar', vi: 'Bắt đầu', id: 'Mulai', tr: 'Başla', pl: 'Zacznij' }),
    welcomeFooter: triLang(lang, { ru: 'Это бонус. Подписка не включается автоматически.', uk: 'Це бонус. Підписка не вмикається автоматично.', en: 'This is a bonus. A subscription does not start automatically.', es: 'Es un bonus. La suscripción no se activa automáticamente.', 'pt-BR': 'É um bônus. A assinatura não é ativada automaticamente.', vi: 'Đây là phần thưởng. Gói đăng ký không tự động bật.', id: 'Ini bonus. Langganan tidak aktif otomatis.', tr: 'Bu bir bonus. Abonelik otomatik başlamaz.', pl: 'To bonus. Subskrypcja nie włącza się automatycznie.' }),
    endedEyebrow: triLang(lang, { ru: 'Три дня позади', uk: 'Три дні позаду', en: 'Three days behind you', es: 'Tres días atrás', 'pt-BR': 'Três dias para trás', vi: 'Ba ngày đã qua', id: 'Tiga hari telah berlalu', tr: 'Üç gün geride kaldı', pl: 'Trzy dni za tobą' }),
    endedTitle: triLang(lang, { ru: 'Три дня доступа завершились', uk: 'Три дні доступу завершилися', en: 'Your three days of access have ended', es: 'Terminaron tus tres días de acceso', 'pt-BR': 'Seus três dias de acesso terminaram', vi: 'Ba ngày truy cập đã kết thúc', id: 'Tiga hari akses telah berakhir', tr: 'Üç günlük erişim sona erdi', pl: 'Trzy dni dostępu dobiegły końca' }),
    endedBody: triLang(lang, {
      ru: 'Учебный прогресс остаётся. Базовый режим доступен. Актуальные преимущества Plus — в предложении магазина.',
      uk: 'Навчальний прогрес залишається. Базовий режим доступний. Актуальні переваги Plus — у пропозиції магазину.',
      en: 'Your learning progress stays. Basic mode is available. Current Plus benefits are shown in the store offer.',
      es: 'Tu progreso de aprendizaje se queda. El modo básico está disponible. Las ventajas actuales de Plus están en la oferta de la tienda.',
      'pt-BR': 'Seu progresso de estudo continua. O modo básico está disponível. As vantagens atuais do Plus estão na oferta da loja.',
      vi: 'Tiến độ học của bạn vẫn được giữ. Chế độ cơ bản vẫn dùng được. Các lợi ích hiện tại của Plus có trong ưu đãi trên cửa hàng.',
      id: 'Progres belajarmu tetap ada. Mode dasar tersedia. Keunggulan Plus terkini ada di penawaran toko.',
      tr: 'Öğrenme ilerlemen duruyor. Temel mod kullanılabilir. Plus’ın güncel avantajları mağaza teklifinde.',
      pl: 'Twój postęp w nauce zostaje. Tryb podstawowy jest dostępny. Aktualne korzyści Plus są w ofercie sklepu.',
    }),
    endedPrimary: triLang(lang, { ru: 'Посмотреть предложение', uk: 'Переглянути пропозицію', en: 'See the offer', es: 'Ver la oferta', 'pt-BR': 'Ver a oferta', vi: 'Xem ưu đãi', id: 'Lihat penawaran', tr: 'Teklifi gör', pl: 'Zobacz ofertę' }),
    endedSecondary: triLang(lang, { ru: 'Остаться на базовом', uk: 'Залишитися на базовому', en: 'Stay on Basic', es: 'Seguir en el modo básico', 'pt-BR': 'Continuar no básico', vi: 'Ở lại chế độ cơ bản', id: 'Tetap di mode dasar', tr: 'Temel modda kal', pl: 'Zostań na podstawowym' }),
  };
}

function IntroFullAccessModal({ visible, variant, onPrimaryPress, onSecondaryPress, motionVariant = 'hybrid' }: Props) {
  const { lang } = useLang();
  const { f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const copy = introCopy(lang as Lang);
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

  const primaryLabel = isWelcome ? copy.welcomeCta : copy.endedPrimary;
  const primaryTestID = isWelcome ? 'intro-full-access-welcome-primary' : 'intro-full-access-ended-primary';

  // Общий вид панели: hybrid оборачивает в CascadeItem, classic — без анимации.
  const step = (delay: number, node: React.ReactNode) =>
    hybrid ? (
      <CascadeItem delay={delay} reduceMotion={reduceMotion}>{node}</CascadeItem>
    ) : (
      <>{node}</>
    );

  const content = (
    <View style={[styles.content, { backgroundColor: glass.opaqueSheet }]}>
      {step(LUM.ladder[1], (
        <View style={[styles.art, { backgroundColor: glass.opaqueControl }]} accessible={false}>
          <Ionicons name={isWelcome ? 'lock-open' : 'checkmark'} size={28} color={glass.text} />
        </View>
      ))}
      {step(LUM.ladder[2], (
        <Text style={[styles.kicker, { color: glass.secondary, fontSize: f.caption }]}>
          {isWelcome ? copy.welcomeEyebrow : copy.endedEyebrow}
        </Text>
      ))}
      {step(LUM.ladder[2], (
        <Text accessibilityRole="header" style={[styles.title, { color: glass.text, fontSize: f.h1, lineHeight: Math.round(f.h1 * 1.24) }]}>
          {isWelcome ? copy.welcomeTitle : copy.endedTitle}
        </Text>
      ))}
      {step(LUM.ladder[3], (
        <Text style={[styles.body, { color: glass.secondary, fontSize: f.body, lineHeight: Math.round(f.body * 1.45) }]}>
          {isWelcome ? copy.welcomeBody : copy.endedBody}
        </Text>
      ))}
      {step(LUM.ladder[4], (
        <PressableHybrid
          testID={primaryTestID}
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
          variant="primary"
          onPress={handlePrimaryPress}
          style={styles.primaryWrap}
          contentStyle={[styles.primary, { backgroundColor: glass.accent }]}
        >
          <Text style={[styles.primaryText, { color: glass.accentInk, fontSize: f.body }]}>{primaryLabel}</Text>
        </PressableHybrid>
      ))}
      {isWelcome
        ? step(LUM.ladder[5], (
          <Text style={[styles.footer, { color: glass.mutedText, fontSize: f.caption, lineHeight: Math.round(f.caption * 1.4) }]}>
            {copy.welcomeFooter}
          </Text>
        ))
        : step(LUM.ladder[5], (
          <PressableHybrid
            testID="intro-full-access-ended-secondary"
            accessibilityRole="button"
            accessibilityLabel={copy.endedSecondary}
            variant="secondary"
            onPress={handleSecondaryPress}
            style={styles.secondaryButton}
            contentStyle={styles.secondaryContent}
          >
            <Text style={[styles.secondaryText, { color: glass.secondary, fontSize: f.body }]}>{copy.endedSecondary}</Text>
          </PressableHybrid>
        ))}
    </View>
  );

  if (hybrid) {
    // Гибрид «Световод»: панель выходит из света (HybridAlertShell), контент —
    // каскад по LUM.ladder. Свой ScrollView — крупный шрифт/низкий экран.
    return (
      <HybridAlertShell
        scrollContent={false}
        visible={visible}
        onRequestClose={onSecondaryPress ?? onPrimaryPress}
        shadowColor="rgba(0,0,0,0.5)"
        backdropColor="rgba(0,0,0,0.58)"
        testID={isWelcome ? 'intro-full-access-welcome-backdrop' : 'intro-full-access-ended-backdrop'}
      >
        <ScrollView
          decelerationRate="fast"
          style={styles.hybridScroll}
          contentContainerStyle={styles.hybridScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {content}
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
      <View style={styles.overlay} accessibilityViewIsModal>
        {/* зачем 2026-08-02 (владелец: «на маленьких экранах кнопки нет»):
            панель центрировалась без прокрутки — на низком экране обрезалась
            вместе с кнопкой активации подарка. */}
        <SafeAreaView style={styles.safeScroll}>
          <ScrollView
            decelerationRate="fast"
            style={styles.safeScroll}
            contentContainerStyle={styles.safe}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.panel}>{content}</View>
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
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  safeScroll: {
    flex: 1,
  },
  safe: {
    // flexGrow (а не flex): растянись, если контента мало, дай прокрутку, если много.
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
    overflow: 'hidden',
  },
  // HybridAlertShell даёт панель без встроенного скролла — оборачиваем контент
  // в свой ScrollView (низкие экраны и крупный шрифт).
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
  art: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    fontWeight: '800',
    letterSpacing: 0,
  },
  body: {
    fontWeight: '500',
    letterSpacing: 0,
  },
  primaryWrap: {
    marginTop: 4,
  },
  primary: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryText: {
    fontWeight: '800',
    letterSpacing: 0,
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 48,
  },
  secondaryContent: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontWeight: '700',
    letterSpacing: 0,
    textAlign: 'center',
  },
  footer: {
    fontWeight: '500',
    letterSpacing: 0,
    textAlign: 'center',
  },
});
