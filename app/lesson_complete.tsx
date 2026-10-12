import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../components/TapScale';
import DuoPressable from '../components/DuoPressable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { Animated, BackHandler, Modal, Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';
import KitTouchable from '../components/KitTouchable';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import SoftContextualUpsellCard from '../components/SoftContextualUpsellCard';
import ContentWrap from '../components/ContentWrap';
import { glassFill } from '../components/GlassSurface';
import { ResultsGlassBackButton } from '../components/results/ResultsGlass';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { triLang, type Lang } from '../constants/i18n';
import { useTheme } from '../components/ThemeContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { usePremium } from '../components/PremiumContext';
import { CEFR_FOR_LESSON } from '../constants/theme';
import { usePracticeRunes } from '../hooks/usePracticeRunes';
import {
  parseCombinedLessonBreakdownParam,
  parseCombinedLessonTopicsParam,
} from './combined_lesson_pool';
import { readDevPracticeRunesFakeState } from './dev_practice_runes_seed';
import { hapticTap } from '../hooks/use-haptics';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useSoftUpsellOpportunity } from '../hooks/use_soft_upsell_opportunity';
import { checkAchievements } from './achievements';
import { STORE_URL } from './config';
import { checkGemAchievements, loadMedalInfo, saveMedalProgress, type MedalTier } from './medal_utils';
import { markNextNavigationAsReplace } from './navigation_back';
import { scheduleD1PersonalizedReminder } from './notifications';
import { resolveNotificationLang } from './notification_lang';
import {
  shouldAnnounceNextLessonUnlock,
  tryUnlockLevelExam,
  tryUnlockLingmanExam,
} from './lesson_lock_system';
import { canShowReview, getReviewActiveDays, markReviewPrompted, markReviewRated, getReviewVariant, ReviewContext, ReviewVariant } from './review_utils';
import { openStoreReviewPage } from './store_review';
import { grantLessonFirstCompleteBonus, retryPendingLessonBonusGrants } from './lesson_bonus_grant';
import { logAppWarning } from './app_health';
import { markLessonFinishedOnce } from './mastery';
import { getVerifiedPremiumAccessStatus, getVerifiedPremiumStatus } from './premium_guard';
import { FREE_LESSON_LIMIT, lessonPaywallContext, requiresPremiumForLesson } from './monetization_policy';
import { readLegacyFreeLessonCap } from './legacy_free_lesson_access';
import { lessonPurchaseContinuationParams } from './paywall_lesson_continuation';
import { captureAccountGeneration, isCurrentAccountGeneration, subscribeAccountGeneration } from './account_generation';
import type { SoftUpsellCandidate, SoftUpsellOpportunity, SoftUpsellStudyTarget } from './soft_upsell_core';
import { getDevLessonUpsell } from './dev_paywall_state';
import { isDevAccountLinkedDemo } from './dev_account_state';
import {
  candidateAfterLessonGrant,
  createLessonSoftUpsellCtaHandler,
  lessonSoftUpsellPersistenceScope,
  shouldRenderLessonSoftUpsell,
  type LessonSoftUpsellIdentity,
} from './lesson_complete_soft_upsell';
import { primeLessonScreenFromStorage } from './lesson_screen_bootstrap';
import { makeLessonServerAttemptId, normalizeLessonServerAttemptId } from './lesson_attempt_identity';
import { prefetchLessonMenuCache } from './lesson_menu';
import RegistrationPromptModal from '../components/RegistrationPromptModal';
import ReviewPromptModal from '../components/ReviewPromptModal';
import { useOverlayVisible } from '../components/OverlayArbiter';
import { AUTH_PROMPT_SHOWN_KEY, getLinkedAuthInfo } from './auth_provider';
import { buildCelebrationShareBody } from './celebration_share_messages';
import { buildLessonShareMessage } from './lesson_share';
import { syncToCloud } from './cloud_sync';
import { submitProgressEvent } from './progress_events_client';
import { getLessonData } from './lesson_data_all';
import BouncyScrollView from '../components/BouncyScrollView';
import ResultsSequence from '../components/feedback/ResultsSequence';
import V2DoneScreen from '../components/completion/V2DoneScreen';
import { lessonNamesForLang } from '../constants/lessons';
import CombinedLessonBreakdown from '../components/CombinedLessonBreakdown';
import FeedbackRatingCard from '../components/FeedbackRatingCard';
import { shouldPromptFeedback, markFeedbackPrompted } from './feedback_prompt_throttle';
import { phraseHasStudyTargetContent } from './phrase_target_utils';
import { frenchStudyActive } from './spanish_content_gate';
import {
  lessonProgressKey,
  lessonSessionKey,
} from './target_storage_keys';
import { DebugLogger } from './debug-logger';
import { recordTodayTaskActivity } from '../modules/today-tasks/today_tasks_store';

const EXEMPT_COLOR_1 = 'rgba(0,0,0,0.5)'; // theme-exempt: затемнение под окном — тёмный скрим в любой теме
import { noteSwallowedAs, noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

const MEDAL_IMAGES_COMPLETE: Record<string, any> = {
  bronze: require('../assets/images/levels/bronza.webp'),
  silver: require('../assets/images/levels/serebro.webp'),
  gold: require('../assets/images/levels/zoloto.webp'),
};

// ── ResultsSequence (FeedbackKit, спек §2/§2.1) ──────────────────────────────
// Маппинг медали в 0-3 звезды секвенции. Лестница медалей строгая (getMedalTier:
// bronze ≥ 2.5, silver ≥ 4.5, gold = 5.0), поэтому соответствие однозначно.
const RESULTS_STARS_BY_TIER: Record<MedalTier, number> = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
};
const safeLessonCompleteEventPart = (value: unknown, max = 60): string =>
  String(value ?? 'na').trim().replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, max) || 'na';

type LessonSoftUpsellCopy = { title: string; body: string; ctaLabel: string; dismissLabel: string; dismissAccessibilityLabel: string; dismissAccessibilityHint: string; ctaAccessibilityLabel: string; ctaAccessibilityHint: string };

// зачем (владелец 2026-09-22, правило 114baf437): текст не рассказывает, что человек «уже получил»
// бесплатно, и не называет уровни A1/A2/B1/B2 (начинающий их не знает); из него видно, что Plus
// открывает всё приложение. Общий текст курса («впереди 29 уроков») сюда не подходит — это после 1-го урока.
const MAIN_COURSE_ACCESS_BODY: Record<Lang, string> = {
  ru: 'Дальше курс ведёт от простых фраз до свободного разговора. С Plus открывается весь курс, а с ним и всё остальное: разговоры вслух, тренировки без счётчика и статистика.',
  uk: 'Далі курс веде від простих висловів до вільної розмови. З Plus відкривається увесь курс, а з ним і все інше: розмови вголос, тренування без лічильника і статистика.',
  en: 'Next, the course takes you from simple phrases to free conversation. Plus opens the whole course, and everything else with it: speaking out loud, training without a counter and statistics.',
  es: 'Después, el curso te lleva de las frases simples a la conversación libre. Con Plus se abre el curso completo y, con él, todo lo demás: hablar en voz alta, entrenamientos sin contador y estadísticas.',
  'pt-BR': 'Daqui em diante, o curso vai das frases simples à conversa livre. Com o Plus abre o curso inteiro e, junto com ele, todo o resto: falar em voz alta, treinos sem contador e estatísticas.',
  vi: 'Tiếp theo, khóa học đưa bạn từ câu đơn giản đến trò chuyện tự nhiên. Với Plus, cả khóa học mở ra, cùng mọi thứ khác: nói thành tiếng, luyện tập không giới hạn lượt và thống kê.',
  id: 'Selanjutnya, kursus membawamu dari frasa sederhana sampai percakapan bebas. Dengan Plus seluruh kursus terbuka, bersama semua yang lain: bicara lantang, latihan tanpa penghitung, dan statistik.',
  tr: 'Bundan sonra kurs seni basit ifadelerden serbest konuşmaya götürür. Plus ile kursun tamamı açılır, onunla birlikte gerisi de: sesli konuşma, sayaçsız antrenman ve istatistikler.',
  pl: 'Dalej kurs prowadzi od prostych zwrotów do swobodnej rozmowy. Z Plus otwiera się cały kurs, a z nim cała reszta: mówienie na głos, treningi bez licznika i statystyki.',
};

const LESSON_SOFT_UPSELL_COPY = {
  ru: { title: 'Первый урок — готово', body: MAIN_COURSE_ACCESS_BODY.ru, ctaLabel: 'Посмотреть Plus', dismissLabel: 'Не сейчас', dismissAccessibilityLabel: 'Закрыть предложение', dismissAccessibilityHint: 'Продолжить без просмотра Plus', ctaAccessibilityLabel: 'Посмотреть Plus', ctaAccessibilityHint: 'Открыть информацию о Plus' },
  en: { title: 'First lesson done', body: MAIN_COURSE_ACCESS_BODY.en, ctaLabel: 'See Plus', dismissLabel: 'Not now', dismissAccessibilityLabel: 'Close suggestion', dismissAccessibilityHint: 'Continue without viewing Plus', ctaAccessibilityLabel: 'See Plus', ctaAccessibilityHint: 'Open information about Plus' },
  uk: { title: 'Перший урок — готово', body: MAIN_COURSE_ACCESS_BODY.uk, ctaLabel: 'Переглянути Plus', dismissLabel: 'Не зараз', dismissAccessibilityLabel: 'Закрити пропозицію', dismissAccessibilityHint: 'Продовжити без перегляду Plus', ctaAccessibilityLabel: 'Переглянути Plus', ctaAccessibilityHint: 'Відкрити інформацію про Plus' },
  es: { title: 'Primera lección completada', body: MAIN_COURSE_ACCESS_BODY.es, ctaLabel: 'Ver Plus', dismissLabel: 'Ahora no', dismissAccessibilityLabel: 'Cerrar sugerencia', dismissAccessibilityHint: 'Continuar sin ver Plus', ctaAccessibilityLabel: 'Ver Plus', ctaAccessibilityHint: 'Abrir información sobre Plus' },
  'pt-BR': { title: 'Primeira lição concluída', body: MAIN_COURSE_ACCESS_BODY['pt-BR'], ctaLabel: 'Ver Plus', dismissLabel: 'Agora não', dismissAccessibilityLabel: 'Fechar sugestão', dismissAccessibilityHint: 'Continuar sem ver o Plus', ctaAccessibilityLabel: 'Ver Plus', ctaAccessibilityHint: 'Abrir informações sobre o Plus' },
  vi: { title: 'Đã xong bài học đầu tiên', body: MAIN_COURSE_ACCESS_BODY.vi, ctaLabel: 'Xem Plus', dismissLabel: 'Để sau', dismissAccessibilityLabel: 'Đóng gợi ý', dismissAccessibilityHint: 'Tiếp tục mà không xem Plus', ctaAccessibilityLabel: 'Xem Plus', ctaAccessibilityHint: 'Mở thông tin về Plus' },
  id: { title: 'Pelajaran pertama selesai', body: MAIN_COURSE_ACCESS_BODY.id, ctaLabel: 'Lihat Plus', dismissLabel: 'Nanti saja', dismissAccessibilityLabel: 'Tutup saran', dismissAccessibilityHint: 'Lanjut tanpa melihat Plus', ctaAccessibilityLabel: 'Lihat Plus', ctaAccessibilityHint: 'Buka informasi tentang Plus' },
  tr: { title: 'İlk ders tamamlandı', body: MAIN_COURSE_ACCESS_BODY.tr, ctaLabel: 'Plus’ı gör', dismissLabel: 'Şimdi değil', dismissAccessibilityLabel: 'Öneriyi kapat', dismissAccessibilityHint: 'Plus’ı görmeden devam et', ctaAccessibilityLabel: 'Plus’ı gör', ctaAccessibilityHint: 'Plus bilgisini aç' },
  pl: { title: 'Pierwsza lekcja ukończona', body: MAIN_COURSE_ACCESS_BODY.pl, ctaLabel: 'Zobacz Plus', dismissLabel: 'Nie teraz', dismissAccessibilityLabel: 'Zamknij sugestię', dismissAccessibilityHint: 'Kontynuuj bez oglądania Plus', ctaAccessibilityLabel: 'Zobacz Plus', ctaAccessibilityHint: 'Otwórz informacje o Plus' },
} satisfies Record<Lang, LessonSoftUpsellCopy>;

const FREE_LIMIT_SOFT_UPSELL_COPY = {
  ru: { title: 'Три урока — отличный старт', body: MAIN_COURSE_ACCESS_BODY.ru, ctaLabel: 'Посмотреть Plus', dismissLabel: 'Не сейчас', dismissAccessibilityLabel: 'Закрыть предложение', dismissAccessibilityHint: 'Остаться на экране результата', ctaAccessibilityLabel: 'Посмотреть Plus', ctaAccessibilityHint: 'Открыть информацию о доступе к следующим урокам' },
  en: { title: 'Three lessons — a strong start', body: MAIN_COURSE_ACCESS_BODY.en, ctaLabel: 'See Plus', dismissLabel: 'Not now', dismissAccessibilityLabel: 'Close suggestion', dismissAccessibilityHint: 'Stay on the results screen', ctaAccessibilityLabel: 'See Plus', ctaAccessibilityHint: 'Open information about access to the next lessons' },
  uk: { title: 'Три уроки — чудовий старт', body: MAIN_COURSE_ACCESS_BODY.uk, ctaLabel: 'Переглянути Plus', dismissLabel: 'Не зараз', dismissAccessibilityLabel: 'Закрити пропозицію', dismissAccessibilityHint: 'Залишитися на екрані результату', ctaAccessibilityLabel: 'Переглянути Plus', ctaAccessibilityHint: 'Відкрити інформацію про доступ до наступних уроків' },
  es: { title: 'Tres lecciones: un gran comienzo', body: MAIN_COURSE_ACCESS_BODY.es, ctaLabel: 'Ver Plus', dismissLabel: 'Ahora no', dismissAccessibilityLabel: 'Cerrar sugerencia', dismissAccessibilityHint: 'Permanecer en la pantalla de resultados', ctaAccessibilityLabel: 'Ver Plus', ctaAccessibilityHint: 'Abrir información sobre las siguientes lecciones' },
  'pt-BR': { title: 'Três lições: um ótimo começo', body: MAIN_COURSE_ACCESS_BODY['pt-BR'], ctaLabel: 'Ver Plus', dismissLabel: 'Agora não', dismissAccessibilityLabel: 'Fechar sugestão', dismissAccessibilityHint: 'Permanecer na tela de resultado', ctaAccessibilityLabel: 'Ver Plus', ctaAccessibilityHint: 'Abrir informações sobre as próximas lições' },
  vi: { title: 'Ba bài học — một khởi đầu tốt', body: MAIN_COURSE_ACCESS_BODY.vi, ctaLabel: 'Xem Plus', dismissLabel: 'Để sau', dismissAccessibilityLabel: 'Đóng gợi ý', dismissAccessibilityHint: 'Ở lại màn hình kết quả', ctaAccessibilityLabel: 'Xem Plus', ctaAccessibilityHint: 'Mở thông tin về quyền truy cập các bài tiếp theo' },
  id: { title: 'Tiga pelajaran — awal yang kuat', body: MAIN_COURSE_ACCESS_BODY.id, ctaLabel: 'Lihat Plus', dismissLabel: 'Nanti saja', dismissAccessibilityLabel: 'Tutup saran', dismissAccessibilityHint: 'Tetap di layar hasil', ctaAccessibilityLabel: 'Lihat Plus', ctaAccessibilityHint: 'Buka informasi akses pelajaran berikutnya' },
  tr: { title: 'Üç ders — güçlü bir başlangıç', body: MAIN_COURSE_ACCESS_BODY.tr, ctaLabel: 'Plus’ı gör', dismissLabel: 'Şimdi değil', dismissAccessibilityLabel: 'Öneriyi kapat', dismissAccessibilityHint: 'Sonuç ekranında kal', ctaAccessibilityLabel: 'Plus’ı gör', ctaAccessibilityHint: 'Sonraki derslere erişim bilgisini aç' },
  pl: { title: 'Trzy lekcje — świetny początek', body: MAIN_COURSE_ACCESS_BODY.pl, ctaLabel: 'Zobacz Plus', dismissLabel: 'Nie teraz', dismissAccessibilityLabel: 'Zamknij sugestię', dismissAccessibilityHint: 'Pozostań na ekranie wyniku', ctaAccessibilityLabel: 'Zobacz Plus', ctaAccessibilityHint: 'Otwórz informacje o dostępie do kolejnych lekcji' },
} satisfies Record<Lang, LessonSoftUpsellCopy>;

function ReviewModal({ visible, context, t, f, themeMode, bottomInset, lang, onClose }: {
  visible: boolean; context: ReviewContext; t: any; f: any; themeMode: string; bottomInset: number; lang: Lang; onClose: () => void;
}) {
  const [step, setStep] = useState<'ask' | 'thanks'>('ask');
  const [variant, setVariant] = useState<ReviewVariant | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep('ask');
      getReviewVariant(context, lang).then(setVariant);
      // Помечаем показ СРАЗУ при появлении окна — так лимит показов и 30-дневный
      // кулдаун учитываются при любом способе закрытия (кнопка, тап по фону, системно),
      // а не только при нажатии "нет".
      markReviewPrompted().catch(noteSwallowedHandler('lesson_complete:useEffect.markReviewPrompted'));
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [context, fadeAnim, lang, visible]);

  const handleYes = async () => {
    // Наше окно — это пре-промпт. На "Да" уводим в стор писать отзыв и показываем
    // "спасибо". НЕ вызываем нативный requestReview, иначе два окна оценки наложатся.
    await markReviewRated();
    setStep('thanks');
    await openStoreReviewPage();
    setTimeout(onClose, 1500);
  };

  const handleNo = async () => {
    // Показ уже помечен при открытии окна — здесь только закрываем.
    onClose();
  };

  if (!visible || !variant) return null;
  const panelRadius = 24;
  const buttonRadius = 14;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={handleNo}>
      <Animated.View style={{ flex: 1, backgroundColor: EXEMPT_COLOR_1, justifyContent: 'flex-end', opacity: fadeAnim }}>
        <Pressable style={{ flex: 1 }} onPress={handleNo} />
        <View style={{
          backgroundColor: glassFill(t.bgCard, 0.46),
          borderTopLeftRadius: panelRadius,
          borderTopRightRadius: panelRadius,
          padding: 28,
          paddingBottom: Math.max(40, bottomInset + 20),
          // зачем («Тень» 12.10): шторку отделяет затемнение, верхняя кромка 0.5 убрана
          alignItems: 'center',
          overflow: 'hidden',
        }}>
          {step === 'ask' ? (
            <>
              {/* зачем (PM-030): крупный декоративный эмодзи над вопросом об оценке убран — заголовок самодостаточен. */}
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                {variant.title}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginBottom: 28, lineHeight: f.body * 1.5 }}>
                {variant.subtitle}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 12, width: '100%' }}>
                <KitTouchable
                  style={{
                    flex: 1,
                    minHeight: 52,
                    backgroundColor: glassFill(t.bgCard, 0.62),
                    borderRadius: buttonRadius,
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                  }}
                  onPress={handleNo}
                >
                  <Text style={{ color: t.accentText, fontSize: f.body, fontWeight: '600', textAlign: 'center' }}>{variant.btnNo}</Text>
                </KitTouchable>
                <KitTouchable
                  style={{
                    flex: 1,
                    minHeight: 52,
                    backgroundColor: t.correct,
                    borderRadius: buttonRadius,
                    paddingVertical: 14,
                    paddingHorizontal: 36,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 0,
                    borderColor: 'transparent',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                  onPress={handleYes}
                >
                  <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    <Text
                      style={{
                        color: t.correctText,
                        fontSize: f.body,
                        fontWeight: '700',
                        lineHeight: f.body * 1.15,
                        textAlign: 'center',
                      }}
                    >
                      {variant.btnYes}
                    </Text>
                  </View>
                  <Text style={{ position: 'absolute', right: 16, fontSize: 16, lineHeight: 20 }}>⭐</Text>
                </KitTouchable>
              </View>
            </>
          ) : (
            <>
              {/* зачем (PM-030): декоративный эмодзи заменён стандартной иконкой. */}
              <Ionicons name="heart" size={40} color={t.textPrimary} style={{ marginBottom: 12 }} accessibilityElementsHidden importantForAccessibility="no" />
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', textAlign: 'center' }}>
                {triLang(lang, { ru: 'Спасибо!', en: 'Thank you!', uk: 'Дякуємо!', es: '¡Gracias!', 'pt-BR': 'Obrigado!', vi: 'Cảm ơn!', id: 'Terima kasih!', tr: 'Teşekkürler!', pl: 'Dziękujemy!' })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 8 }}>
                {triLang(lang, {
                  ru: 'Это значит для нас очень много.',
                  en: 'That means a lot to us.',
                  uk: 'Це для нас дуже багато значить.',
                  es: 'Para nosotros es muy importante.',
                  'pt-BR': 'Isso significa muito para nós.',
                  vi: 'Điều này rất có ý nghĩa với chúng tôi.',
                  id: 'Ini sangat berarti bagi kami.',
                  tr: 'Bu bizim için çok önemli.',
                  pl: 'To dla nas bardzo dużo znaczy.',
                })}
              </Text>
            </>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

type NotifKind = 'medal' | 'lesson_unlock' | 'level_exam_unlock' | 'lingman_exam_unlock';
interface Notif {
  kind: NotifKind;
  medalTier?: MedalTier;
  unlockedLessonId?: number;
  cefrLevel?: string; // for level_exam_unlock
}

// ── AchievementNotifModal ─────────────────────────────────────────────────────
function AchievementNotifModal({ notif, lang, f, lessonId, lessonScore, lessonCefr, onDismiss }: {
  notif: Notif; lang: Lang; t: any; f: any; themeMode: string;
  lessonId: number; lessonScore: number; lessonCefr: string;
  onDismiss: () => void;
}) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const notifInsets = useStableSafeAreaInsets();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  // зачем (координатор 10.10, Optimistic UI): окна «открыто/медаль» идут очередью — двойной тап по скриму/«Отлично!» вызвал бы onDismiss
  // дважды и пропустил следующее окно очереди; замок синхронный.
  const dismissedRef = useRef(false);
  useEffect(() => { dismissedRef.current = false; }, [notif]); // новое окно очереди — замок снова открыт
  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(onDismiss);
  };

  const MEDAL_IMAGES: Record<string, any> = {
    bronze: require('../assets/images/levels/bronza.webp'),
    silver: require('../assets/images/levels/serebro.webp'),
    gold:   require('../assets/images/levels/zoloto.webp'),
  };

  const medalLabel = (tier: MedalTier) => {
    if (tier === 'bronze') return triLang(lang, { ru: 'Бронзовая медаль!', en: 'Bronze medal!', uk: 'Бронзова медаль!', es: '¡Medalla de bronce!', 'pt-BR': 'Medalha de bronze!', vi: 'Huy chương đồng!', id: 'Medali perunggu!', tr: 'Bronz madalya!', pl: 'Brązowy medal!' });
    if (tier === 'silver') return triLang(lang, { ru: 'Серебряная медаль!', en: 'Silver medal!', uk: 'Срібна медаль!', es: '¡Medalla de plata!', 'pt-BR': 'Medalha de prata!', vi: 'Huy chương bạc!', id: 'Medali perak!', tr: 'Gümüş madalya!', pl: 'Srebrny medal!' });
    return triLang(lang, { ru: 'Золотая медаль!', en: 'Gold medal!', uk: 'Золота медаль!', es: '¡Medalla de oro!', 'pt-BR': 'Medalha de ouro!', vi: 'Huy chương vàng!', id: 'Medali emas!', tr: 'Altın madalya!', pl: 'Złoty medal!' });
  };

  const shareMessage = () => {
    const body = buildCelebrationShareBody(notif.kind, lang, lessonId, lessonScore, {
      medalTier: notif.medalTier,
      unlockedLessonId: notif.unlockedLessonId,
      cefrLevel: notif.cefrLevel,
    });
    return `${body}\n${STORE_URL}`;
  };

  let modalTitle = '';
  let modalSub: string | undefined;
  if (notif.kind === 'medal' && notif.medalTier) {
    modalTitle = medalLabel(notif.medalTier);
    modalSub = triLang(lang, {
      ru: 'Отличная работа! Продолжай учиться!',
      en: 'Great work! Keep learning!',
      uk: 'Чудова робота! Продовжуй навчання!',
      es: '¡Buen trabajo! Sigue con el inglés.',
      'pt-BR': 'Bom trabalho! Continue estudando inglês.',
      vi: 'Làm tốt lắm! Hãy tiếp tục học tiếng Anh.',
      id: 'Kerja bagus! Terus belajar bahasa Inggris.',
      tr: 'Harika iş! İngilizce çalışmaya devam et.',
      pl: 'Dobra robota! Ucz się dalej angielskiego.',
    });
  } else if (notif.kind === 'lesson_unlock') {
    // зачем (30.09, «1 в 1 с макета» overlays-specialist.html OS-ACHIEVEMENT-NOTIF-*):
    // заголовок и подпись ровно как в макете — без эмодзи и без пересказа условий.
    modalTitle = triLang(lang, {
      ru: 'Новый урок открыт', en: 'New lesson unlocked', uk: 'Новий урок відкрито', es: 'Nueva lección abierta',
      'pt-BR': 'Nova lição liberada', vi: 'Đã mở bài học mới', id: 'Pelajaran baru terbuka', tr: 'Yeni ders açıldı', pl: 'Nowa lekcja otwarta',
    });
    modalSub = triLang(lang, {
      ru: 'Продолжай обучение, когда захочешь.', en: 'Keep learning whenever you are ready.', uk: 'Продовжуй навчання, коли захочеш.',
      es: 'Sigue aprendiendo cuando estés listo.', 'pt-BR': 'Continue estudando quando estiver pronto.', vi: 'Tiếp tục học khi bạn sẵn sàng.',
      id: 'Lanjutkan belajar kapan pun kamu siap.', tr: 'Hazır olduğunda öğrenmeye devam et.', pl: 'Ucz się dalej, kiedy będziesz gotowy.',
    });
  } else if (notif.kind === 'level_exam_unlock') {
    modalTitle = triLang(lang, {
      ru: 'Экзамен уровня открыт', en: 'Level exam unlocked', uk: 'Іспит рівня відкрито', es: 'Examen de nivel abierto',
      'pt-BR': 'Exame de nível liberado', vi: 'Đã mở bài thi cấp độ', id: 'Ujian level terbuka', tr: 'Seviye sınavı açıldı', pl: 'Egzamin poziomu otwarty',
    });
    modalSub = triLang(lang, {
      ru: 'Проверь знания для следующего шага.', en: 'Check your knowledge before the next step.', uk: 'Перевір знання для наступного кроку.',
      es: 'Comprueba lo que sabes para el siguiente paso.', 'pt-BR': 'Teste seus conhecimentos para o próximo passo.', vi: 'Kiểm tra kiến thức cho bước tiếp theo.',
      id: 'Uji pengetahuanmu untuk langkah berikutnya.', tr: 'Bir sonraki adım için bilgini sına.', pl: 'Sprawdź wiedzę przed kolejnym krokiem.',
    });
  } else {
    modalTitle = triLang(lang, {
      ru: 'Экзамен Lingman открыт', en: 'Lingman exam unlocked', uk: 'Іспит Lingman відкрито', es: 'Examen Lingman abierto',
      'pt-BR': 'Exame Lingman liberado', vi: 'Đã mở bài thi Lingman', id: 'Ujian Lingman terbuka', tr: 'Lingman sınavı açıldı', pl: 'Egzamin Lingman otwarty',
    });
    modalSub = triLang(lang, {
      ru: 'Новый срез знаний доступен на твоём пути.', en: 'A new knowledge check is available on your path.', uk: 'Новий зріз знань доступний на твоєму шляху.',
      es: 'Hay una nueva prueba de conocimientos en tu camino.', 'pt-BR': 'Uma nova avaliação está disponível no seu caminho.', vi: 'Một bài kiểm tra kiến thức mới đã có trên hành trình của bạn.',
      id: 'Tes pengetahuan baru tersedia di jalurmu.', tr: 'Yolunda yeni bir bilgi ölçümü seni bekliyor.', pl: 'Na Twojej ścieżce czeka nowy sprawdzian wiedzy.',
    });
  }
  // зачем: владелец 2026-09-29 — Liquid Glass «1 в 1 с макета» (overlays-specialist.html
  // OS-ACHIEVEMENT-NOTIF-*): непрозрачная основа из токенов активной темы (13 тем), плитка-иконка,
  // «Поделиться» вторичной кнопкой, CTA нейтральный (не зелёный), без обводок. Прокрутка — для крупного шрифта.
  const notifIcon = notif.kind === 'lesson_unlock' ? 'layers-outline' : 'checkmark-circle-outline';
  const shareLabel = triLang(lang, { ru: 'Поделиться', en: 'Share', uk: 'Поділитися', es: 'Compartir', 'pt-BR': 'Compartilhar', vi: 'Chia sẻ', id: 'Bagikan', tr: 'Paylaş', pl: 'Udostępnij' });
  const greatLabel = triLang(lang, { ru: 'Отлично!', en: 'Great!', uk: 'Чудово!', es: '¡Genial!', 'pt-BR': 'Ótimo!', vi: 'Tuyệt!', id: 'Bagus!', tr: 'Harika!', pl: 'Świetnie!' });
  return (
    <Animated.View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999,
      opacity, justifyContent: 'center', alignItems: 'center',
      backgroundColor: 'rgba(2,3,6,0.72)', // theme-exempt: затемнение под окном — тёмный скрим в любой теме
    }}>
      <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={dismiss} accessibilityRole="button" accessibilityLabel={greatLabel} />
      <Animated.View style={{
        transform: [{ translateY }],
        backgroundColor: glass.opaqueSheet,
        borderRadius: 28,
        marginHorizontal: 24,
        marginTop: notifInsets.top,
        marginBottom: notifInsets.bottom,
        width: '100%', maxWidth: 360,
        maxHeight: '86%',
        overflow: 'hidden',
      }}>
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 28, alignItems: 'center' }} decelerationRate="fast"
        >
          {/* Icon / Image */}
          {notif.kind === 'medal' && notif.medalTier && MEDAL_IMAGES[notif.medalTier] && (
            <Image source={MEDAL_IMAGES[notif.medalTier]} style={{ width: 90, height: 90 }} contentFit="contain" accessible={false} />
          )}
          {notif.kind !== 'medal' && (
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: glass.opaqueControl, justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons name={notifIcon} size={38} color={glass.text} accessibilityElementsHidden />
            </View>
          )}
          <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: glass.secondary, fontSize: f.body, letterSpacing: 6, marginTop: 10 }}>✦ ✦ ✦</Text>

          {/* Title */}
          <Text accessibilityRole="header" style={{ color: glass.text, fontSize: f.numLg, fontWeight: '900', textAlign: 'center', marginTop: 10 }}>
            {modalTitle}
          </Text>

          {/* Subtitle */}
          {!!modalSub && (
            <Text style={{ color: glass.secondary, fontSize: f.bodyLg, fontWeight: '500', marginTop: 8, textAlign: 'center', lineHeight: f.bodyLg * 1.4 }}>
              {modalSub}
            </Text>
          )}

          {/* Share button */}
          <KitTouchable
            accessibilityRole="button"
            accessibilityLabel={shareLabel}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 22,
              minHeight: 48,
              backgroundColor: glass.opaqueControl,
              borderRadius: 16,
              paddingHorizontal: 22,
              alignSelf: 'stretch',
            }}
            onPress={async () => {
              hapticTap();
              await Share.share({ message: shareMessage() }).catch(noteSwallowedHandler('lesson_complete:AchievementNotifModal.share'));
            }}
          >
            <Ionicons name="share-outline" size={18} color={glass.text} accessibilityElementsHidden />
            <Text style={{ color: glass.text, fontSize: f.body, fontWeight: '700' }}>
              {shareLabel}
            </Text>
          </KitTouchable>

          {/* Dismiss */}
          <KitTouchable
            accessibilityRole="button"
            accessibilityLabel={greatLabel}
            activeOpacity={0.85}
            onPress={() => { hapticTap(); dismiss(); }}
            style={{
              marginTop: 12,
              minHeight: 48,
              alignSelf: 'stretch',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: glass.accent,
              borderRadius: 16,
              paddingHorizontal: 24,
            }}
          >
            <Text style={{ color: glass.accentInk, fontWeight: '800', fontSize: f.bodyLg }}>
              {greatLabel}
            </Text>
          </KitTouchable>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

export default function LessonComplete() {
  const lessonCompleteRuntimeActive = useRuntimeActive();
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const { theme: t, f, themeMode, liquidGlassThemeId } = useTheme();
  const { s, lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const softUpsellStudyTarget: SoftUpsellStudyTarget = studyTarget === 'fr' ? 'fr' : 'en';
  const { hasPremiumAccess } = usePremium();
  const [softUpsellAccountToken, setSoftUpsellAccountToken] = useState(() => captureAccountGeneration());
  const softUpsellAccountScope = studyTarget === 'es'
    ? ''
    : lessonSoftUpsellPersistenceScope(softUpsellAccountToken);
  const params = useLocalSearchParams<{
    id: string;
    unlocked?: string;
    completedAttemptId?: string | string[];
    repeatAttemptId?: string | string[];
    passed?: string | string[];
    runeCompletionOrdinal?: string | string[];
    devRunesSeed?: string | string[];
    /** Комбинированный урок: id тем через запятую. Пусто — обычный урок. */
    combo?: string | string[];
    /** Разбивка «тема:верно:всего» через запятую, напр. "3:16:17,10:10:16". */
    comboBreakdown?: string | string[];
  }>();
  // зачем (владелец 2026-09-17): комбинированный урок — отдельная тренировка.
  // Медаль принадлежит КОНКРЕТНОЙ теме, а комбо смешивает несколько, поэтому
  // здесь медалей и цели дня нет; вместо них показываем разбивку по темам.
  const comboTopics = useMemo(
    () => parseCombinedLessonTopicsParam(params.combo),
    [params.combo],
  );
  const isComboCompletion = comboTopics.length > 0;
  const comboBreakdown = useMemo(
    () => parseCombinedLessonBreakdownParam(params.comboBreakdown),
    [params.comboBreakdown],
  );
  // зачем (владелец, 2026-08-27): DEV-хаб «Проверка рун» открывает НАСТОЯЩИЙ
  // экран, но счётчик стартует со случайного числа вместо реальной копилки.
  // Диск и сеть в этом режиме не трогаются (см. hooks/usePracticeRunes).
  const devRunesFake = useMemo(
    () => readDevPracticeRunesFakeState(params.devRunesSeed),
    [params.devRunesSeed],
  );
  const { id } = params;
  const lessonId = parseInt(id || '1', 10);
  const completionAttemptId = useMemo(
    () => normalizeLessonServerAttemptId(params.completedAttemptId) ?? makeLessonServerAttemptId(),
    [lessonId, params.completedAttemptId, studyTarget],
  );
  // зачем (владелец, 2026-08-27): «руны засчитываются, когда игрок дошёл до
  // экрана празднования». Копилка та же, что копилась на lesson1.tsx — она
  // восстанавливается по идентичному sessionKey с диска, здесь только зовём
  // settle() при монтировании. ordinal фиксирован в параметре навигации, а не
  // пересчитывается здесь заново (passCount на lesson1 в этот момент уже мог
  // измениться под новый заход).
  // зачем: общий helper firstRouteParam удалён вместе с XP-параметрами маршрута; здесь нужен только для ординала рун
  const rawRuneOrdinal = params.runeCompletionOrdinal;
  const runeCompletionOrdinal = Number(Array.isArray(rawRuneOrdinal) ? rawRuneOrdinal[0] : rawRuneOrdinal) || 1;
  const practiceRunes = usePracticeRunes({
    activity: 'lesson',
    sessionKey: `lesson${lessonId}_runes_${studyTarget}`,
    completionOrdinal: runeCompletionOrdinal,
    devFakeStartRunes: devRunesFake?.runes,
  });
  const practiceRunesSettleOnceRef = useRef(false);
  useEffect(() => {
    if (practiceRunes.hydrating || practiceRunesSettleOnceRef.current) return;
    practiceRunesSettleOnceRef.current = true;
    void practiceRunes.settle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceRunes.hydrating]);
  const c = s.lessonComplete;
  const [completionRequiresPremium, setCompletionRequiresPremium] = useState(false);
  const [completionAccessReady, setCompletionAccessReady] = useState(() => lessonId >= 32);
  useEffect(() => {
    if (lessonId >= 32) {
      setCompletionRequiresPremium(false);
      setCompletionAccessReady(true);
      return;
    }

    let cancelled = false;
    setCompletionAccessReady(false);
    void Promise.all([
      getVerifiedPremiumAccessStatus({
        bypassCache: true,
        allowCloudRefresh: false,
      }).catch(noteSwallowedAs('lesson_complete:useEffect.getVerifiedPremiumAccessStatus', false)),
      readLegacyFreeLessonCap(studyTarget).catch(noteSwallowedAs('lesson_complete:useEffect.readLegacyFreeLessonCap', undefined)),
    ]).then(([premium, legacyFreeLessonCap]) => {
      if (cancelled) return;
      setCompletionRequiresPremium(!premium && requiresPremiumForLesson(lessonId + 1, legacyFreeLessonCap));
      setCompletionAccessReady(true);
    });
    return () => { cancelled = true; };
  }, [lessonId, studyTarget]);
  // Subtitle сообщает только о ФАКТИЧЕСКОМ didUnlock из lesson1. Один active
  // Plus не означает успех: при score < 2.5 route несёт unlocked='0'. И наоборот,
  // stale/подменённый unlocked='1' не обходит свежий Free entitlement выше.
  const nextLessonUnlockHint = completionAccessReady && shouldAnnounceNextLessonUnlock(
    lessonId,
    params.unlocked === '1',
    !completionRequiresPremium,
  )
    ? triLang(lang, {
        ru: 'Следующий урок уже разблокирован', en: 'The next lesson is already unlocked', uk: 'Наступний урок уже розблоковано', es: 'La siguiente lección ya está desbloqueada',
        'pt-BR': 'A próxima lição já está desbloqueada', vi: 'Bài học tiếp theo đã được mở khóa', id: 'Pelajaran berikutnya sudah terbuka',
        tr: 'Sonraki dersin kilidi açıldı', pl: 'Następna lekcja jest już odblokowana',
      })
    : undefined;
  const [showReview, setShowReview] = useState(false);
  const [reviewContext, setReviewContext] = useState<ReviewContext>('perfect_lesson');
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [lessonScore, setLessonScore] = useState<number>(0);
  // зачем (макет E, 01.10): общий итог показывает «верно / ошибок / точность» — считаем из того же
  // прогресса, что и балл; null, пока прогресс не прочитан (блок не рисуется, ничего не выдумываем).
  const [lessonCounts, setLessonCounts] = useState<{ correct: number; wrong: number } | null>(null);
  const [lessonCefr,  setLessonCefr]  = useState<string>('A1');
  const [medalTier, setMedalTier]     = useState<MedalTier>('none');
  const [medalImproved, setMedalImproved] = useState(false);
  const isQualifyingLessonPass = params.passed === '1';
  const [completionXpReady, setCompletionXpReady] = useState(false);
  const [showPremiumBanner, setShowPremiumBanner] = useState(false);
  const [repeatOpening, setRepeatOpening] = useState(false);
  const [softUpsellCandidates, setSoftUpsellCandidates] = useState<SoftUpsellCandidate[]>([]);
  const softUpsellMountedRef = useRef(true);
  const softUpsellIdentityRef = useRef<LessonSoftUpsellIdentity>({
    accountScope: softUpsellAccountScope,
    generation: softUpsellAccountToken.generation,
    lessonId,
    studyTarget: softUpsellStudyTarget,
  });
  softUpsellIdentityRef.current = {
    accountScope: softUpsellAccountScope,
    generation: softUpsellAccountToken.generation,
    lessonId,
    studyTarget: softUpsellStudyTarget,
  };
  const repeatOpeningRef = useRef(false);
  // зачем (аудит 2026-08-22): «Следующий урок» ждала 2 await (премиум-статус +
  // лимит бесплатных уроков) без защиты от двойного тапа — сосед «Повторить»
  // уже был защищён тем же паттерном (ref-гейт + видимое состояние).
  const nextOpeningRef = useRef(false);
  const premiumBannerAnim = useRef(new Animated.Value(0)).current;
  const premiumBannerNextLesson = useRef(0);
  const softUpsell = useSoftUpsellOpportunity({
    candidates: softUpsellAccountScope ? softUpsellCandidates : [],
    accountScope: softUpsellAccountScope,
    studyTarget: softUpsellStudyTarget,
    hasPremiumAccess,
  });
  // зачем (Авторизация 12.10, paywalls-009/010): dev `upsell=first_lesson|three_lessons` — предложение Plus на итоге урока
  // без кулдаунов; подставное предложение живёт только в памяти, его показ/закрытие НЕ пишут отметок (обработчики пустые).
  const devUpsellOpportunity = useMemo<SoftUpsellOpportunity | null>(() => {
    const kind = getDevLessonUpsell();
    if (!kind) return null;
    const firstLesson = kind === 'first_lesson';
    console.warn('[DEV-STATE] lesson_complete: предложение Plus подменено', JSON.stringify({ kind, lessonId })); // guard-ok: dev-ветка
    return {
      trigger: firstLesson ? 'first_lesson' : 'free_lessons_complete',
      value: firstLesson ? 1 : FREE_LESSON_LIMIT,
      studyTarget: softUpsellStudyTarget,
      context: firstLesson ? 'first_lesson_success' : 'free_lessons_complete',
      destination: 'paywall',
      milestoneId: `dev_${kind}`,
    };
  }, [lessonId, softUpsellStudyTarget]);
  const upsellOpportunity = devUpsellOpportunity ?? softUpsell.opportunity;
  const devUpsellNoop = useCallback(async () => { console.warn('[DEV-STATE] lesson_complete: действие с подставным предложением — без записи'); }, []); // guard-ok: dev-ветка
  const softUpsellCopy = upsellOpportunity?.trigger === 'free_lessons_complete'
    ? FREE_LIMIT_SOFT_UPSELL_COPY[lang]
    : LESSON_SOFT_UPSELL_COPY[lang];

  const runSoftUpsellCta = useMemo(() => createLessonSoftUpsellCtaHandler({
    onCta: softUpsell.onCta,
    navigatePaywall: () => router.push({
          pathname: '/premium_modal',
          params: {
            context: 'free_lessons_complete',
            source: 'lesson_complete_soft_upsell',
            ...lessonPurchaseContinuationParams(lessonId + 1),
          },
        } as any),
  }), [lessonId, router, softUpsell.onCta]);
  const handleSoftUpsellCta = useCallback(() => {
    if (!softUpsell.opportunity) return Promise.resolve();
    return runSoftUpsellCta(softUpsell.opportunity.trigger);
  }, [runSoftUpsellCta, softUpsell.opportunity]);

  useEffect(() => {
    softUpsellMountedRef.current = true;
    return () => { softUpsellMountedRef.current = false; };
  }, []);

  useEffect(() => {
    const subscription = subscribeAccountGeneration((token) => {
      setSoftUpsellCandidates([]);
      setSoftUpsellAccountToken(token);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setSoftUpsellCandidates([]);
  }, [lessonId, softUpsellAccountScope, studyTarget]);

  // Notification queue
  const [, setNotifQueue] = useState<Notif[]>([]);
  const [activeNotif, setActiveNotif] = useState<Notif | null>(null);
  const activeNotifVisible = useOverlayVisible('lessonCompleteNotif', activeNotif != null);

  // ── Секвенция наград (FeedbackKit §2.1): играет ПЕРВОЙ в очереди арбитра ────
  // Слот запрашивается сразу с монтирования (ownState = !seqDone), чтобы более
  // поздние кандидаты (coach-toast регистрируется коммитом позже, medal-notif —
  // через 1200мс) вставали в очередь ЗА секвенцией. Рендерим её только когда
  // медаль/оценка загружены (resultsReady) — иначе звёзды/бейдж стартуют пустыми.
  // Закрытие (CTA/тап/back) выставляет seqDone → слот освобождается → дальше
  // штатный каскад: medal-notif → review → coach-toast.
  // Чисто визуальный слой: экономика (saveMedalProgress/submitProgressEvent/
  // syncToCloud/tryUnlock*) не трогается.
  const [resultsReady, setResultsReady] = useState(false);
  const [seqDone, setSeqDone] = useState(false);
  const resultsSequenceVisible = useOverlayVisible('lessonResultsSequence', !seqDone);
  const sequenceShowing = resultsSequenceVisible && resultsReady && completionAccessReady && completionXpReady;

  // Оценка урока (владелец 2026-08-25): троттлинг раз в неделю на раздел,
  // гейт решается один раз при монтировании — не зависит от очереди модалок.
  const [showLessonFeedback, setShowLessonFeedback] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void shouldPromptFeedback('lesson').then((allowed) => {
      if (cancelled || !allowed) return;
      setShowLessonFeedback(true);
      void markFeedbackPrompted('lesson');
    });
    return () => { cancelled = true; };
  }, []);

  // ReviewModal показывается только когда очередь нотификаций опустела — без конфликта.
  // pendingReview хранит намерение «показать ревью», а useEffect ждёт тишины.
  const pendingReview = useRef(false);
  useEffect(() => {
    // Ревью ждёт и закрытия секвенции наград (seqDone), и тишины очереди нотификаций.
    if (!seqDone || activeNotif || !pendingReview.current) return;
    pendingReview.current = false;
    setShowReview(true);
  }, [activeNotif, seqDone]);

  // зачем: D140 (владелец 2026-10-01) — коллекции («Сокровищница») удалены целиком:
  // дропа карточки за закрытый раздел больше нет.

  const scaleAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const lessonCompleteNotifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLessonCompleteNotifTimer = useCallback(() => {
    if (lessonCompleteNotifTimerRef.current) {
      clearTimeout(lessonCompleteNotifTimerRef.current);
      lessonCompleteNotifTimerRef.current = null;
    }
  }, []);

  const scheduleActiveNotif = useCallback((notif: Notif, delayMs: number) => {
    clearLessonCompleteNotifTimer();
    lessonCompleteNotifTimerRef.current = setTimeout(() => {
      lessonCompleteNotifTimerRef.current = null;
      setActiveNotif(notif);
    }, delayMs);
  }, [clearLessonCompleteNotifTimer]);

  const canApplyCompletionRewards = useCallback(async (): Promise<boolean> => {
    if (!frenchStudyActive(studyTarget)) return true;
    const hasFrenchRows = getLessonData(lessonId).some(phrase => phraseHasStudyTargetContent(phrase, studyTarget));
    if (!hasFrenchRows) return false;
    try {
      const progressRaw = await AsyncStorage.getItem(lessonProgressKey(lessonId, studyTarget));
      if (!progressRaw) return false;
      const progress = JSON.parse(progressRaw);
      return Array.isArray(progress) && progress.length > 0;
    } catch (error: unknown) {
      // зачем (аудит Optimistic UI «Главная и Уроки», 12.10): false здесь для французского отправляет человека в список уроков без наград —
      // причина обязана быть в журнале, иначе это выглядит как «награда пропала сама»
      console.warn(`[LESSON-COMPLETE] прогресс урока не прочитан lessonId=${lessonId} target=${studyTarget} → награды не выдаём: ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch пишет причину
      return false;
    }
  }, [lessonId, studyTarget]);

  const dismissNotif = useCallback(() => {
    setActiveNotif(null);
    setNotifQueue(prev => {
      const rest = prev.slice(1);
      if (rest.length > 0) {
        scheduleActiveNotif(rest[0], 400);
        return rest;
      }
      return rest;
    });
  }, [scheduleActiveNotif]);

  const grantBonus = useCallback(async () => {
      if (!isQualifyingLessonPass) return;
      // зачем (D49, «Сегодня»): пройденный урок засчитывает задание дня. unitKey —
      // урок+цель: повтор того же экрана итога не считается второй раз (store
      // идемпотентен по дню), а done/монеты ставятся ровно один раз.
      void recordTodayTaskActivity({ kind: 'lesson', unitKey: `legacy:${studyTarget}:${lessonId}`, source: 'lesson_complete' });
      const grantAccountToken = captureAccountGeneration();
      const capturedSoftUpsellIdentity: LessonSoftUpsellIdentity = {
        accountScope: studyTarget === 'es' ? '' : lessonSoftUpsellPersistenceScope(grantAccountToken),
        generation: grantAccountToken.generation,
        lessonId,
        studyTarget: softUpsellStudyTarget,
      };
      // зачем: D70 — жемчуг за урок (0 штук) удалён; здесь только отметка первого прохождения.
      const firstBonus = await grantLessonFirstCompleteBonus({ lessonId, studyTarget, lang });
      const softUpsellCandidate = candidateAfterLessonGrant({
        status: firstBonus.status,
        captured: capturedSoftUpsellIdentity,
        current: softUpsellIdentityRef.current,
        mounted: softUpsellMountedRef.current,
        accountGenerationCurrent: isCurrentAccountGeneration(grantAccountToken),
        freeLessonLimit: FREE_LESSON_LIMIT,
      });
      if (softUpsellCandidate) setSoftUpsellCandidates([softUpsellCandidate]);

      try {
      // [ACHIEVEMENT] Считаем сколько уроков завершено + проверяем идеальность
      let lessonCount = 0;
      let perfectCount = 0;
      let wasPerfect = false;
      for (let i = 1; i <= 32; i++) {
        try {
          const saved = await AsyncStorage.getItem(lessonProgressKey(i, studyTarget));
          if (saved) {
            const p: string[] = JSON.parse(saved);
            const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
            if (correct >= 45) {
              lessonCount++;
              const wrong = p.filter(x => x === 'wrong').length;
              if (wrong === 0 && i === lessonId) wasPerfect = true;
              if (wrong === 0) perfectCount++;
            }
          }
        } catch (e) {
      DebugLogger.error('lesson_complete:wrong', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      }
      checkAchievements({ type: 'lesson_complete', lessonCount, wasPerfect, perfectCount, lessonId, studyTarget }).catch(noteSwallowedHandler('lesson_complete:useCallback.checkAchievements'));
      const activeDays = wasPerfect ? await getReviewActiveDays() : 0;
      const eligible = wasPerfect && await canShowReview({
        trigger: 'perfect_lesson',
        completedLessons: lessonCount,
        activeDays,
      });
      if (eligible) {
        setReviewContext('perfect_lesson');
        pendingReview.current = true;
      }
      // зачем: D107 — починка серии уроком удалена; спасает серию только заморозка Plus.

      // D+1 персональное уведомление — только после первого урока
      if (lessonId === 1) {
        try {
          const progressRaw = await AsyncStorage.getItem(lessonProgressKey(1, studyTarget));
          let d1Phrases = 0;
          if (progressRaw) {
            const p: string[] = JSON.parse(progressRaw);
            d1Phrases = p.filter(x => x === 'correct' || x === 'replay_correct').length;
          }
          const streakRaw = await AsyncStorage.getItem('streak_count');
          const d1Streak = parseInt(streakRaw || '0') || 0;
          const langRaw = await AsyncStorage.getItem('app_lang');
          // зачем (аудит смены языка R1 п.3, Авторизация 13.10): прежний разбор `uk ? uk : es ? es : ru` слал D+1 по-русски
          // для en/pt-BR/vi/id/tr/pl, хотя текст пуша есть на всех 9 языках — общий помощник, как у энергии и серии (ace26d405).
          const d1Lang: Lang = resolveNotificationLang(langRaw, 'lesson_d1');
          scheduleD1PersonalizedReminder(d1Phrases, d1Streak, d1Lang).catch(noteSwallowedHandler('lesson_complete:useCallback.scheduleD1PersonalizedReminder'));
        } catch (e) {
      DebugLogger.error('lesson_complete:langRaw', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      }
    } catch (e) {
      // Ошибка в пост-наградах (ачивки/осколки за идеальность/тему/стрик) —
      // не молчим: телеметрия позволяет расследовать «не засчитался бонус».
      logAppWarning('lesson_complete:post_rewards_failed', e, {
        tags: { lessonId, studyTarget: String(studyTarget ?? 'legacy') },
      });
    }
  }, [isQualifyingLessonPass, lang, lessonId, softUpsellStudyTarget, studyTarget]);

  useEffect(() => {
    // Доначисляем бонусы, зависшие из-за прошлых сбоев сети.
    // Идемпотентно: guard-ключ + стабильный eventId в леджере.
    void retryPendingLessonBonusGrants();
  }, []);

  // Вводная анимация медали (spring + fade + покачивание) стартует ПОСЛЕ закрытия
  // секвенции наград: до seqDone статичный контент скрыт (scale/opacity = 0), и
  // крутить Animated.loop под полноэкранным оверлеем незачем (перф-бюджет §2.1).
  // Награды/оценка при этом идут с монтирования как раньше — см. эффект ниже.
  // зачем (PM-033-A1): «Уменьшить движение» — бесконечная анимация не запускается.
  const reducedMotionLoop = useReducedMotion();
  useEffect(() => {
    if (!lessonCompleteRuntimeActive || !seqDone) {
      bounceAnim.stopAnimation();
      bounceAnim.setValue(0);
      return;
    }
    // Появление иконки
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    // Текст чуть позже
    const fadeInTimer = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, 300);
    // Мягкое покачивание
    // зачем (PM-032, allowlist движения): вечная пульсация запрещена — декоративный цикл стал разовой реакцией.
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -8, duration: 700, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0,  duration: 700, useNativeDriver: true }),
      ]),
      { iterations: 2 },
    );
    const bounceStartTimer = setTimeout(() => { if (!reducedMotionLoop) bounce.start(); }, 400);
    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(bounceStartTimer);
      bounce.stop();
    };
  }, [seqDone, bounceAnim, fadeAnim, lessonCompleteRuntimeActive, scaleAnim, reducedMotionLoop]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const canApply = await canApplyCompletionRewards();
      if (!canApply) {
        if (!cancelled && frenchStudyActive(studyTarget)) {
          markNextNavigationAsReplace();
          router.replace('/lessons_list' as any);
        }
        return;
      }
      void grantBonus().catch((error: unknown) => {
        console.warn(`[LESSON-COMPLETE] выдача награды упала lessonId=${lessonId}: ${error instanceof Error ? error.message : String(error)} — экран итога открыт, повтор при следующем заходе`); // guard-ok: catch пишет причину
      }).finally(() => {
        if (!cancelled) setCompletionXpReady(true);
      });
      void markLessonFinishedOnce(lessonId, studyTarget);
    })();

    // Загружаем оценку урока, сохраняем медаль
    void (async () => {
      const canApply = await canApplyCompletionRewards();
      if (!canApply) return;
      // зачем (владелец 2026-09-17, «зачёт только в комбо»): комбинированный
      // урок НЕ ТРОГАЕТ прогресс тем. saveMedalProgress ниже пишет в ключи
      // одной темы (lessonId), а в комбо lessonId — лишь первая из выбранных:
      // запись затёрла бы честно заработанные медаль и проценты чужой темы.
      // Поэтому здесь ранний выход со своим расчётом счёта и без медалей.
      if (isComboCompletion) {
        const okTotal = comboBreakdown.reduce((sum, row) => sum + row.correct, 0);
        const allTotal = comboBreakdown.reduce((sum, row) => sum + row.total, 0);
        const comboScore = allTotal > 0
          ? parseFloat(((okTotal / allTotal) * 5).toFixed(1))
          : 0;
        if (__DEV__) {
          console.log('[COMBO-COMPLETE] медали и цель пропущены', JSON.stringify({
            topics: comboTopics, okTotal, allTotal, comboScore,
          }));
        }
        if (cancelled) return;
        setLessonScore(comboScore);
        setMedalTier('none');
        setMedalImproved(false);
        setResultsReady(true);
        return;
      }
      const saved = await AsyncStorage.getItem(lessonProgressKey(lessonId, studyTarget));
      if (cancelled) return;
      if (!saved) {
        // Fallback: если прогресс не найден (например, очищен до открытия экрана),
        // показываем уже сохранённую медаль по best_score, чтобы не было "?".
        const info = await loadMedalInfo(lessonId, studyTarget);
        setLessonScore(info.bestScore || 0);
        setMedalTier(info.tier);
        setMedalImproved(false);
        setResultsReady(true);
        return;
      }
      try {
        const p: string[] = JSON.parse(saved);
        const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
        const totalAnswers = Array.isArray(p) && p.length > 0 ? Math.min(p.length, 50) : 50;
        const score = parseFloat(((Math.min(correct, totalAnswers) / totalAnswers) * 5).toFixed(1));
        setLessonScore(score);
        setLessonCounts({ correct: Math.min(correct, totalAnswers), wrong: p.filter(x => x === 'wrong').length });
        const { newTier, prevTier, isNewBest, newPassCount } = await saveMedalProgress(lessonId, score, p, studyTarget);
        submitProgressEvent({
          eventId: [
            'lesson',
            safeLessonCompleteEventPart(studyTarget),
            String(lessonId),
            'complete',
            safeLessonCompleteEventPart(completionAttemptId),
          ].join(':'),
          type: 'lesson_complete',
          payload: {
            lessonId,
            studyTarget,
            score,
            passed: correct >= 45,
            progress: p,
            cellIndex: p.length,
            attemptId: completionAttemptId,
          },
        }).catch(noteSwallowedHandler('lesson_complete:useEffect.submitProgressEvent'));
        void syncToCloud({ forceNow: true }).catch(noteSwallowedHandler('lesson_complete:useEffect.syncToCloud'));
        setMedalTier(newTier);
        const medalUpgraded = isNewBest && newTier !== prevTier && newTier !== 'none';
        setMedalImproved(medalUpgraded);
        setResultsReady(true);
        if (correct >= 45 && p.filter(x => x === 'wrong').length === 0 && newPassCount > 0) {
          checkAchievements({ type: 'lesson_perfect_pass', lessonId, passCount: newPassCount, studyTarget }).catch(noteSwallowedHandler('lesson_complete:useEffect.checkAchievements'));
        }

        // Build notification queue
        const queue: Notif[] = [];
        const nextLessonNeedsPlus = lessonId < 32 && requiresPremiumForLesson(lessonId + 1);
        const premiumForUnlockAnnouncement = nextLessonNeedsPlus
          ? await getVerifiedPremiumAccessStatus({
              bypassCache: true,
              allowCloudRefresh: false,
            }).catch(noteSwallowedAs('lesson_complete:useEffect.getVerifiedPremiumAccessStatus_2', false))
          : false;
        if (shouldAnnounceNextLessonUnlock(
          lessonId,
          params.unlocked === '1',
          premiumForUnlockAnnouncement,
        )) {
          queue.push({ kind: 'lesson_unlock', unlockedLessonId: lessonId + 1 });
        }
        if (medalUpgraded) {
          queue.push({ kind: 'medal', medalTier: newTier });
        }

        // Зачёт уровня: все уроки уровня >= 4.5
        const unlockedLevel = await tryUnlockLevelExam(lessonId, studyTarget);
        if (unlockedLevel) {
          queue.push({ kind: 'level_exam_unlock', cefrLevel: unlockedLevel });
        }
        // Экзамен Лингмана: все 32 урока = 5.0 + все зачёты сданы
        const lingmanUnlocked = await tryUnlockLingmanExam(studyTarget);
        if (lingmanUnlocked) {
          queue.push({ kind: 'lingman_exam_unlock' });
        }

        if (!cancelled && queue.length > 0) {
          setNotifQueue(queue);
          scheduleActiveNotif(queue[0], 1200);
        }

        // Gem achievements
        const gems = await checkGemAchievements(lessonId, studyTarget);
        gems.forEach(g => checkAchievements({ type: 'gem', level: g.level, gem: g.gem, studyTarget }).catch(noteSwallowedHandler('lesson_complete:useEffect.checkAchievements_2')));
      } catch (error: unknown) {
        console.warn(`[LESSON-COMPLETE] медаль/разблокировка не посчитаны lessonId=${lessonId}: ${error instanceof Error ? error.message : String(error)} — показываю последнюю сохранённую`); // guard-ok: catch пишет причину
        const info = await loadMedalInfo(lessonId, studyTarget);
        setLessonScore(info.bestScore || 0);
        setMedalTier(info.tier);
        setMedalImproved(false);
        setResultsReady(true);
      }
    })();
    const cefr = CEFR_FOR_LESSON(lessonId);
    setLessonCefr(cefr);
    return () => {
      cancelled = true;
      clearLessonCompleteNotifTimer();
    };
  }, [canApplyCompletionRewards, clearLessonCompleteNotifTimer, completionAttemptId, grantBonus, lessonId, params.unlocked, router, scheduleActiveNotif, studyTarget]);

  // ── Триггер регистрационной модалки после первого урока ────────────────────
  // Показывается ровно один раз: только для урока 1, только если юзер ещё не залогинен
  // и модалка раньше не показывалась. Через 1.5с после монтирования экрана —
  // даём пройти основной анимации завершения.
  useEffect(() => {
    if (lessonId !== 1) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const shown = await AsyncStorage.getItem(AUTH_PROMPT_SHOWN_KEY);
        if (shown === '1') return;
        const linked = await getLinkedAuthInfo();
        // зачем (Авторизация 12.10, settings-gap-001): привязка `account=linked` подставная — отметку «окно входа уже показано» на диск не пишем
        if (linked && isDevAccountLinkedDemo()) {
          console.log('[DEV-STATE] lesson_complete: привязка для показа (account=linked) — отметка окна входа не пишется'); // guard-ok: dev-ветка
          return;
        }
        if (linked) {
          // Уже залогинен (через онбординг или из Settings) — помечаем чтобы больше не дёргать
          AsyncStorage.setItem(AUTH_PROMPT_SHOWN_KEY, '1').catch(noteSwallowedHandler('lesson_complete:useEffect.setItem'));
          return;
        }
        if (!cancelled) setShowAuthPrompt(true);
      } catch (e) {
      // игнорируем — модалку просто не покажем
      DebugLogger.error('lesson_complete:linked', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    }, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [lessonId]);

  const goNext = () => {
    if (nextOpeningRef.current) return;
    const next = lessonId + 1;
    if (next <= 32) {
      nextOpeningRef.current = true;
      void (async () => {
        try {
          const premium = await getVerifiedPremiumStatus().catch(noteSwallowedAs('lesson_complete:goNext.getVerifiedPremiumStatus', false));
          const legacyFreeLessonCap = await readLegacyFreeLessonCap(studyTarget);
          if (requiresPremiumForLesson(next, legacyFreeLessonCap) && !premium) {
            // Экран результата остаётся единственным: для закрытого урока сразу открываем
            // существующий путь Plus, без промежуточного баннера на завершении урока.
            markNextNavigationAsReplace();
            router.replace({
              pathname: '/premium_modal',
              params: {
                context: lessonPaywallContext(next),
                source: 'lesson_complete_soft_upsell',
                lessons_done: String(lessonId),
                ...lessonPurchaseContinuationParams(next),
              },
            } as any);
            return;
          }
          void prefetchLessonMenuCache(next, studyTarget).catch(noteSwallowedHandler('lesson_complete:goNext.prefetchLessonMenuCache'));
          markNextNavigationAsReplace();
          router.replace({ pathname: '/lessons_list', params: { id: next } });
        } finally {
          // Экран уходит по replace в любой ветке — сброс не нужен для повторного
          // тапа НА ЭТОМ экране, но снимаем гейт на случай, если навигация не
          // произошла (например, router выбросил синхронно).
          nextOpeningRef.current = false;
        }
      })();
    } else {
      markNextNavigationAsReplace();
      router.replace('/(tabs)/home' as any);
    }
  };

  const goBackFromComplete = useCallback(() => {
    hapticTap();
    markNextNavigationAsReplace();
    router.replace({ pathname: '/lessons_list', params: { id: lessonId } });
  }, [router, lessonId]);

  const handleRepeatLesson = useCallback(() => {
    if (repeatOpeningRef.current) return;
    repeatOpeningRef.current = true;
    setRepeatOpening(true);
    const repeatAttemptId = normalizeLessonServerAttemptId(params.repeatAttemptId)
      ?? makeLessonServerAttemptId();
    // The route is the synchronous source of truth for the next screen. Storage
    // remains the durable fallback, but navigation never waits for the native
    // write and therefore stays instant on Android.
    void AsyncStorage.setItem(
      lessonSessionKey(lessonId, 'serverAttemptId', studyTarget),
      repeatAttemptId,
    ).catch(noteSwallowedHandler('lesson_complete:useCallback.setItem'));
    void primeLessonScreenFromStorage(lessonId, studyTarget).catch(noteSwallowedHandler('lesson_complete:useCallback.primeLessonScreenFromStorage'));
    try {
      markNextNavigationAsReplace();
      router.replace({ pathname: '/lesson1', params: { id: lessonId, serverAttemptId: repeatAttemptId } });
    } catch (error: unknown) {
      console.warn(`[LESSON-COMPLETE] повтор урока не открылся lessonId=${lessonId}: ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch пишет причину
      repeatOpeningRef.current = false;
      setRepeatOpening(false);
    }
  }, [lessonId, params.repeatAttemptId, router, studyTarget]);

  // Android: системный «Назад» НЕ должен попадать на сам пройденный урок.
  // Раньше lesson_complete не перехватывал hardwareBackPress — pop возвращал на
  // экран lesson1, который при полном прогрессе тут же снова делал replace на
  // lesson_complete → бесконечная петля «завершение ⇆ урок». Теперь «Назад»:
  //   1) если открыт оверлей (награда/ревью/регистрация/премиум-баннер) —
  //      закрываем его, не уходя с экрана;
  //   2) иначе уходим туда же, куда и кнопка «Назад» в шапке — в меню урока.
  // Это детерминированный выход без возврата в урок, что и разрывает цикл.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sequenceShowing) {
        // Не оставляем пустой промежуточный экран: «Назад» выходит в список уроков.
        goBackFromComplete();
        return true;
      }
      if (showPremiumBanner) {
        setShowPremiumBanner(false);
        premiumBannerAnim.setValue(0);
        return true;
      }
      if (showAuthPrompt) {
        setShowAuthPrompt(false);
        return true;
      }
      if (showReview) {
        setShowReview(false);
        return true;
      }
      if (activeNotif) {
        dismissNotif();
        return true;
      }
      goBackFromComplete();
      return true;
    });
    return () => sub.remove();
  }, [
    sequenceShowing,
    showPremiumBanner,
    premiumBannerAnim,
    showAuthPrompt,
    showReview,
    activeNotif,
    dismissNotif,
    goBackFromComplete,
  ]);

  // Единственный видимый результат завершения урока. ResultsSequence уже содержит
  // проверенную поочерёдную анимацию трёх звёзд; здесь не создаём ни карточек,
  // ни модалок, ни промежуточного экрана после неё.
  const legacyCompletionSurfacesEnabled = false;
  if (!legacyCompletionSurfacesEnabled) {
    if (sequenceShowing) {
      return (
        <ScreenGradient>
          <SafeAreaView style={{ flex: 1 }}>
            {/* зачем (владелец 01.10): «старые экраны все должны быть заменены на макетные» —
                итог урока = общий экран завершения 2.0 (learn.html E, D36/D64.1, PM-137). */}
            <V2DoneScreen
              testID="lesson-complete-done"
              title={triLang(lang, { ru: 'Урок пройден', en: 'Lesson complete', uk: 'Урок пройдено', es: 'Lección completada', 'pt-BR': 'Lição concluída', vi: 'Đã hoàn thành bài học', id: 'Pelajaran selesai', tr: 'Ders tamamlandı', pl: 'Lekcja ukończona' })}
              subtitle={isComboCompletion ? undefined : [
                triLang(lang, { ru: `Урок ${lessonId}`, en: `Lesson ${lessonId}`, uk: `Урок ${lessonId}`, es: `Lección ${lessonId}`, 'pt-BR': `Lição ${lessonId}`, vi: `Bài ${lessonId}`, id: `Pelajaran ${lessonId}`, tr: `Ders ${lessonId}`, pl: `Lekcja ${lessonId}` }),
                lessonNamesForLang(lang)[lessonId - 1],
              ].filter(Boolean).join(' · ')}
              stars={isComboCompletion ? null : RESULTS_STARS_BY_TIER[medalTier]}
              starsNote={!isComboCompletion && RESULTS_STARS_BY_TIER[medalTier] === 1
                ? triLang(lang, { ru: 'Для следующего урока нужно 2★', en: 'You need 2★ for the next lesson', uk: 'Для наступного уроку потрібно 2★', es: 'Necesitas 2★ para la siguiente lección', 'pt-BR': 'Você precisa de 2★ para a próxima lição', vi: 'Cần 2★ để mở bài tiếp theo', id: 'Butuh 2★ untuk pelajaran berikutnya', tr: 'Sonraki ders için 2★ gerekir', pl: 'Do następnej lekcji potrzeba 2★' })
                : nextLessonUnlockHint
                  ? triLang(lang, { ru: 'Следующий урок открыт', en: 'The next lesson is open', uk: 'Наступний урок відкрито', es: 'La siguiente lección está abierta', 'pt-BR': 'A próxima lição está aberta', vi: 'Bài tiếp theo đã mở', id: 'Pelajaran berikutnya terbuka', tr: 'Sonraki ders açıldı', pl: 'Następna lekcja jest otwarta' })
                  : undefined}
              correct={lessonCounts?.correct ?? null}
              wrong={lessonCounts?.wrong ?? null}
              coinsGained={practiceRunes.runes}
              plusNote={completionRequiresPremium ? {
                title: triLang(lang, { ru: 'Следующий урок входит в Plus', en: 'The next lesson is part of Plus', uk: 'Наступний урок входить у Plus', es: 'La siguiente lección es de Plus', 'pt-BR': 'A próxima lição faz parte do Plus', vi: 'Bài tiếp theo thuộc gói Plus', id: 'Pelajaran berikutnya termasuk Plus', tr: 'Sonraki ders Plus kapsamında', pl: 'Następna lekcja jest w Plus' }),
                body: triLang(lang, { ru: 'Первые три урока открыты бесплатно. Дальше — с Plus.', en: 'The first three lessons are free. After that — with Plus.', uk: 'Перші три уроки відкриті безкоштовно. Далі — з Plus.', es: 'Las tres primeras lecciones son gratis. Después, con Plus.', 'pt-BR': 'As três primeiras lições são grátis. Depois, com Plus.', vi: 'Ba bài đầu miễn phí. Sau đó cần Plus.', id: 'Tiga pelajaran pertama gratis. Selanjutnya dengan Plus.', tr: 'İlk üç ders ücretsiz. Sonrası Plus ile.', pl: 'Pierwsze trzy lekcje są darmowe. Dalej — z Plus.' }),
              } : undefined}
              feedbackSlot={(isComboCompletion && comboBreakdown.length > 0) || showLessonFeedback ? (
                <View style={{ width: '100%', gap: 12 }}>
                {isComboCompletion && comboBreakdown.length > 0 ? (
                  <CombinedLessonBreakdown
                    rows={comboBreakdown}
                    lang={lang}
                    theme={{
                      bgCard: t.bgCard,
                      bgSurface: t.bgSurface,
                      textPrimary: t.textPrimary,
                      textSecond: t.textSecond,
                      textMuted: t.textMuted,
                      accent: t.accent,
                      wrong: t.wrong,
                    }}
                    fonts={{ body: f.body, label: f.label }}
                  />
                ) : null}
                {showLessonFeedback ? (
                <FeedbackRatingCard
                  kind="lesson"
                  entityId={`${studyTarget}:${lessonId}:${completionAttemptId}`}
                  entityLabel={`Урок ${lessonId}`}
                  lang={lang}
                  title={triLang(lang, { ru: 'Всё было понятно?', en: 'Did everything make sense?', uk: 'Усе було зрозуміло?', es: '¿Se entendió todo?',
                    'pt-BR': 'Deu para entender tudo?', vi: 'Mọi thứ có dễ hiểu không?',
                    id: 'Semuanya jelas?', tr: 'Her şey anlaşıldı mı?', pl: 'Wszystko było jasne?',
                  })}
                  placeholder={triLang(lang, { ru: 'Где застрял? Что объяснить иначе?', en: 'Where did you get stuck? What to explain better?', uk: 'Де застряг? Що пояснити інакше?', es: '¿Dónde te atascaste? ¿Qué explicar mejor?',
                    'pt-BR': 'Onde travou? O que explicar melhor?', vi: 'Bạn mắc ở đâu? Cần giải thích lại điều gì?',
                    id: 'Di mana kamu tersendat? Apa yang perlu dijelaskan ulang?', tr: 'Nerede takıldın? Ne daha iyi anlatılmalı?', pl: 'Gdzie utknąłeś? Co wyjaśnić inaczej?',
                  })}
                  sendLabel={triLang(lang, { ru: 'Отправить', en: 'Send', uk: 'Надіслати', es: 'Enviar', 'pt-BR': 'Enviar',
                    vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij',
                  })}
                  thanksLabel={triLang(lang, { ru: 'Спасибо! Отзыв отправлен', en: 'Thanks! Feedback sent', uk: 'Дякуємо! Відгук надіслано', es: '¡Gracias! Comentario enviado',
                    'pt-BR': 'Obrigado! Comentário enviado', vi: 'Cảm ơn! Đã gửi phản hồi',
                    id: 'Terima kasih! Masukan terkirim', tr: 'Teşekkürler! Geri bildirim gönderildi', pl: 'Dziękujemy! Opinia wysłana',
                  })}
                  ratingA11yLabel={triLang(lang, { ru: 'Оценка', en: 'Rating', uk: 'Оцінка', es: 'Valoración', 'pt-BR': 'Avaliação',
                    vi: 'Đánh giá', id: 'Penilaian', tr: 'Puan', pl: 'Ocena',
                  })}
                  testID="lesson-complete-feedback"
                  presentation="liquid-glass-rate"
                />
                ) : null}
                </View>
              ) : undefined}
              // зачем (макет learn.html E1–E4): у каждого исхода свои кнопки.
              primaryLabel={completionRequiresPremium
                ? triLang(lang, { ru: 'Открыть Plus', en: 'Open Plus', uk: 'Відкрити Plus', es: 'Abrir Plus', 'pt-BR': 'Abrir Plus', vi: 'Mở Plus', id: 'Buka Plus', tr: 'Plus’ı aç', pl: 'Otwórz Plus' })
                : !isComboCompletion && RESULTS_STARS_BY_TIER[medalTier] === 1
                  ? triLang(lang, { ru: 'Повторить урок', en: 'Repeat the lesson', uk: 'Повторити урок', es: 'Repetir la lección', 'pt-BR': 'Repetir a lição', vi: 'Học lại bài', id: 'Ulangi pelajaran', tr: 'Dersi tekrarla', pl: 'Powtórz lekcję' })
                  : isComboCompletion
                    ? triLang(lang, { ru: 'Продолжить', en: 'Continue', uk: 'Продовжити', es: 'Continuar', 'pt-BR': 'Continuar', vi: 'Tiếp tục', id: 'Lanjutkan', tr: 'Devam et', pl: 'Kontynuuj' })
                    : triLang(lang, { ru: 'Следующий урок', en: 'Next lesson', uk: 'Наступний урок', es: 'Siguiente lección', 'pt-BR': 'Próxima lição', vi: 'Bài tiếp theo', id: 'Pelajaran berikutnya', tr: 'Sonraki ders', pl: 'Następna lekcja' })}
              onPrimary={() => {
                if (!completionRequiresPremium && !isComboCompletion && RESULTS_STARS_BY_TIER[medalTier] === 1) {
                  handleRepeatLesson();
                  return;
                }
                if (pendingReview.current) {
                  pendingReview.current = false;
                  setShowReview(true);
                  return;
                }
                goNext();
              }}
              secondaryLabel={isComboCompletion ? undefined : completionRequiresPremium
                ? triLang(lang, { ru: 'Остаться на бесплатном', en: 'Stay on Free', uk: 'Залишитися на безкоштовному', es: 'Seguir en gratis', 'pt-BR': 'Ficar no grátis', vi: 'Tiếp tục bản miễn phí', id: 'Tetap gratis', tr: 'Ücretsiz devam et', pl: 'Zostań przy darmowym' })
                : RESULTS_STARS_BY_TIER[medalTier] === 1
                  ? triLang(lang, { ru: 'К списку уроков', en: 'To the lesson list', uk: 'До списку уроків', es: 'A la lista de lecciones', 'pt-BR': 'Para a lista de lições', vi: 'Về danh sách bài', id: 'Ke daftar pelajaran', tr: 'Ders listesine', pl: 'Do listy lekcji' })
                  : triLang(lang, { ru: 'Пройти ещё раз', en: 'Try again', uk: 'Пройти ще раз', es: 'Repetir', 'pt-BR': 'Fazer de novo', vi: 'Làm lại', id: 'Ulangi', tr: 'Tekrar yap', pl: 'Jeszcze raz' })}
              onSecondary={isComboCompletion ? undefined : (completionRequiresPremium || RESULTS_STARS_BY_TIER[medalTier] === 1) ? goBackFromComplete : handleRepeatLesson}
              onClose={goBackFromComplete}
            />
            <ReviewPromptModal
              visible={showReview}
              context={reviewContext}
              lang={lang}
              onClose={goNext}
            />
          </SafeAreaView>
        </ScreenGradient>
      );
    }

    // Saving must never become an unescapable black frame. Keep a deterministic
    // route back to the lesson list while the completion model is materializing.
    return (
      <ScreenGradient>
        <SafeAreaView testID="lesson-complete-loading" style={{ flex: 1 }}>
          {/* зачем (владелец 2026-09-30): «назад» 44 dp в стиле макета results.html; логика выхода прежняя. */}
          <View style={{ position: 'absolute', top: Math.max(16, insets.top + 8), left: 20, zIndex: 10 }}>
            <ResultsGlassBackButton
              glass={liquidGlassTokens(liquidGlassThemeId)}
              accessibilityLabel={triLang(lang, { ru: 'Назад', en: 'Back', uk: 'Назад', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
              onPress={goBackFromComplete}
            />
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <Text style={{ color: t.accentText, fontSize: 16, textAlign: 'center' }}>
              {triLang(lang, {
                ru: 'Сохраняю результат…',
                en: 'Saving result…',
                uk: 'Зберігаю результат…',
                es: 'Guardando el resultado…',
                'pt-BR': 'Salvando o resultado…',
                vi: 'Đang lưu kết quả…',
                id: 'Menyimpan hasil…',
                tr: 'Sonuç kaydediliyor…',
                pl: 'Zapisywanie wyniku…',
              })}
            </Text>
          </View>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      {/* Кнопка «Назад» прячется под секвенцией: выход из празднования — CTA/тап/back. */}
      {!sequenceShowing && (
      <TapScale
        accessibilityRole="button"
        accessibilityLabel={triLang(lang, { ru: 'Назад', en: 'Back', uk: 'Назад', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
        onPress={goBackFromComplete}
        style={{
          position: 'absolute',
          top: Math.max(16, insets.top + 8),
          left: 20,
          zIndex: 10,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: glassFill(t.bgCard, 0.46),
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
      </TapScale>
      )}
      <ContentWrap>
      <BouncyScrollView testID="lesson-complete-screen" decelerationRate="fast" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }} showsVerticalScrollIndicator={false}>

        {/* Анимированная медаль */}
        <Animated.View style={{
          transform: [{ scale: scaleAnim }, { translateY: bounceAnim }],
          marginBottom: 24,
          alignItems: 'center',
        }}>
          {medalTier !== 'none' && MEDAL_IMAGES_COMPLETE[medalTier] ? (
            <Image
              source={MEDAL_IMAGES_COMPLETE[medalTier]}
              style={{ width: 110, height: 110 }}
              contentFit="contain"
            />
          ) : (
            <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: t.bgSurface, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 40, color: t.textMuted }}>?</Text>
            </View>
          )}
          {medalImproved && (
            <Animated.Text style={{
              color: t.accentText, fontSize: f.bodyLg, fontWeight: '700',
              marginTop: 6, opacity: fadeAnim,
            }}>
              {medalTier === 'bronze' && triLang(lang, { ru: 'Новая медаль!', en: 'New medal!', uk: 'Нова медаль!', es: '¡Medalla nueva!', 'pt-BR': 'Nova medalha!', vi: 'Huy chương mới!', id: 'Medali baru!', tr: 'Yeni madalya!', pl: 'Nowy medal!' })}
              {medalTier === 'silver' && triLang(lang, { ru: 'Новая медаль!', en: 'New medal!', uk: 'Нова медаль!', es: '¡Medalla nueva!', 'pt-BR': 'Nova medalha!', vi: 'Huy chương mới!', id: 'Medali baru!', tr: 'Yeni madalya!', pl: 'Nowy medal!' })}
              {medalTier === 'gold'   && triLang(lang, { ru: 'Золото!', en: 'Gold!', uk: 'Золото!', es: '¡Oro!', 'pt-BR': 'Ouro!', vi: 'Vàng!', id: 'Emas!', tr: 'Altın!', pl: 'Złoto!' })}
            </Animated.Text>
          )}
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', width: '100%' }}>
          <Text style={{ color: t.textPrimary, fontSize: 30, fontWeight: '700', marginBottom: 10, textAlign: 'center' }}>
            {c.title}
          </Text>
          <Text style={{ color: t.accentText, fontSize: 16, marginBottom: 16, textAlign: 'center' }}>
            {c.subtitle(lessonId)}
          </Text>


          {/* Руны за урок (владелец, 2026-08-27): показываются только если
              накопилось хоть что-то — урок мог быть пройден без рун (старый
              контент, ошибка сети на предыдущем шаге). */}
          {practiceRunes.runes > 0 && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: glassFill(t.bgCard, 0.46), borderRadius: 14,
              paddingHorizontal: 18, paddingVertical: 12,
              marginBottom: 20, overflow: 'hidden',
            }}>
              <Ionicons
                name="star"
                size={22}
                color={t.accentText}
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>
                +{practiceRunes.runes}
              </Text>
            </View>
          )}

          {/* Совет отдохнуть */}
          <View style={{
            backgroundColor: glassFill(t.bgCard, 0.46), borderRadius: 14,
            padding: 16,
            width: '100%', marginBottom: 36,
            flexDirection: 'row', alignItems: 'center', gap: 12,
            overflow: 'hidden',
          }}>
            <Ionicons name="cafe-outline" size={24} color={t.accentText} />
            <Text style={{ color: t.textMuted, fontSize: 16, lineHeight: 22, flex: 1 }}>
              {c.rest}
            </Text>
          </View>

          {/* Следующий урок — Duolingo-кнопка (вдавливается в кромку при нажатии) */}
          {shouldRenderLessonSoftUpsell(seqDone, upsellOpportunity) && upsellOpportunity && (
            <View style={{ width: '100%', marginBottom: 20 }}>
              <SoftContextualUpsellCard
                title={softUpsellCopy.title}
                body={softUpsellCopy.body}
                ctaLabel={softUpsellCopy.ctaLabel}
                dismissLabel={softUpsellCopy.dismissLabel}
                dismissAccessibilityLabel={softUpsellCopy.dismissAccessibilityLabel}
                dismissAccessibilityHint={softUpsellCopy.dismissAccessibilityHint}
                ctaAccessibilityLabel={softUpsellCopy.ctaAccessibilityLabel}
                ctaAccessibilityHint={softUpsellCopy.ctaAccessibilityHint}
                opportunity={upsellOpportunity}
                onImpression={devUpsellOpportunity ? devUpsellNoop : softUpsell.onImpression}
                onDismiss={devUpsellOpportunity ? devUpsellNoop : softUpsell.onDismiss}
                onCta={devUpsellOpportunity ? devUpsellNoop : handleSoftUpsellCta}
              />
            </View>
          )}

          {lessonId < 32 && !showPremiumBanner && (
            <DuoPressable
              testID="lesson-complete-next-lesson"
              edgeColor={t.border}
              wrapStyle={{ marginBottom: 12 }}
              style={{
                width: '100%', backgroundColor: t.bgSurface,
                borderRadius: 16, padding: 18,
                overflow: 'hidden',
              }}
              onPress={goNext}
            >
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>
                {c.nextLesson} {lessonId + 1} →
              </Text>
            </DuoPressable>
          )}

          {/* Premium-баннер: появляется вместо перехода на пейвол — пользователь уже видел результат */}
          {showPremiumBanner && (
            <Animated.View
              style={{
                width: '100%',
                marginBottom: 12,
                opacity: premiumBannerAnim,
                transform: [{ scale: premiumBannerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
              }}
            >
              <KitTouchable
                activeOpacity={0.88}
                style={{
                  width: '100%',
                  borderRadius: 16,
                  padding: 18,
                  alignItems: 'center',
                  backgroundColor: t.textSecond,
                  borderWidth: 0,
                  borderColor: t.gold + '55',
                  overflow: 'hidden',
                }}
                onPress={() => {
                  hapticTap();
                  // replace на пейвол = всегда mark, иначе экран остаётся в стеке «назад» → петля.
                  markNextNavigationAsReplace();
                  router.replace({
                    pathname: '/premium_modal',
                    params: {
                      context: lessonPaywallContext(premiumBannerNextLesson.current),
                      source: 'lesson_complete_soft_upsell',
                      lessons_done: String(lessonId),
                      ...lessonPurchaseContinuationParams(premiumBannerNextLesson.current),
                    },
                  } as any);
                }}
              >
                <Text style={{ color: t.accentText, fontSize: f.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                  {triLang(lang, { ru: 'Следующий урок закрыт', en: 'Next lesson is locked', uk: 'Наступний урок закрито', es: 'La siguiente lección está bloqueada', 'pt-BR': 'Próxima lição bloqueada', vi: 'Bài tiếp theo đã bị khóa', id: 'Pelajaran berikutnya terkunci', tr: 'Sonraki ders kilitli', pl: 'Następna lekcja jest zablokowana' })}
                </Text>
                <Text style={{ color: liquidGlassTokens(liquidGlassThemeId).ctaInk, fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 2 }}>
                  {triLang(lang, { ru: 'Открыть Plus — продолжить →', en: 'Open Plus — continue →', uk: 'Відкрити Plus — продовжити →', es: 'Abrir Plus — continuar →', 'pt-BR': 'Abrir Plus — continuar →', vi: 'Mở Plus — tiếp tục →', id: 'Buka Plus — lanjutkan →', tr: 'Plus aç — devam et →', pl: 'Otwórz Plus — kontynuuj →' })}
                </Text>
              </KitTouchable>
              <KitTouchable
                activeOpacity={0.7}
                style={{ paddingVertical: 8, alignItems: 'center' }}
                onPress={() => {
                  hapticTap();
                  setShowPremiumBanner(false);
                  premiumBannerAnim.setValue(0);
                }}
              >
                <Text style={{ color: t.textGhost, fontSize: f.caption, textDecorationLine: 'underline' }}>
                  {triLang(lang, { ru: 'Остаться на обычном аккаунте', en: 'Stay on free', uk: 'Залишитись на безкоштовному', es: 'Quedarme con la versión gratuita', 'pt-BR': 'Ficar no gratuito', vi: 'Tiếp tục miễn phí', id: 'Tetap di gratis', tr: 'Ücretsiz kalmak istiyorum', pl: 'Zostań w darmowej wersji' })}
                </Text>
              </KitTouchable>
            </Animated.View>
          )}

          {/* Повторить урок — Duolingo-кнопка.
              Фон/текст берём из bgCard+textPrimary (не accentBg+accent): в золотой
              теме accentBg — бронзовая дымка, а accent-текст на ней сливался в
              «пустую» плитку. Акцент сохраняем через accent-кромку, рамку и иконку. */}
          <View style={{ position: 'relative', overflow: 'visible', width: '100%', marginBottom: 14 }}>
            <DuoPressable
              testID="lesson-complete-repeat"
              edgeColor={liquidGlassTokens(liquidGlassThemeId).accentGraphic}
              disabled={repeatOpening}
              accessibilityState={{ busy: repeatOpening }}
              pressedExternally={repeatOpening}
              wrapStyle={{ opacity: repeatOpening ? 0.72 : 1 }}
              style={{
                width: '100%', backgroundColor: glassFill(t.bgCard, 0.46),
                borderRadius: 16, padding: 16,
                flexDirection: 'row', justifyContent: 'center', gap: 8,
                overflow: 'hidden',
              }}
              onPress={handleRepeatLesson}
            >
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>
                ↺ {c.repeatLesson}
              </Text>
            </DuoPressable>
            {/* зачем (PM-086): ценник энергии на кнопке убран — сам расход энергии не менялся. */}
          </View>

          {/* Поделиться результатом */}
          <KitTouchable
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              padding: 12,
              marginTop: 4,
              borderRadius: 0,
              backgroundColor: 'transparent',
              borderWidth: 0,
              borderColor: 'transparent',
              overflow: 'hidden',
            }}
            onPress={async () => {
              hapticTap();
              const msg = buildLessonShareMessage(
                lang,
                lessonId,
                lessonScore,
                STORE_URL
              );
              await Share.share({ message: msg }).catch(noteSwallowedHandler('lesson_complete:LessonComplete.share'));
            }}
          >
            <Ionicons name="share-outline" size={18} color={t.accentText} />
            <Text style={{ color: t.accentText, fontSize: 13 }}>
              {c.shareResult}
            </Text>
          </KitTouchable>

          <KitTouchable
            testID="lesson-complete-back-home"
            style={{
              padding: 14,
              borderRadius: 0,
              backgroundColor: 'transparent',
              borderWidth: 0,
              borderColor: 'transparent',
              overflow: 'hidden',
            }}
            onPress={() => { hapticTap(); markNextNavigationAsReplace(); router.replace('/(tabs)/home' as any); }}
          >
            <Text style={{ color: t.textMuted, fontSize: 16 }}>{c.backHome}</Text>
          </KitTouchable>
        </Animated.View>

      </BouncyScrollView>
      </ContentWrap>
      {/* Секвенция наград (FeedbackKit §2.1) поверх экрана: фон прозрачный — сквозь него
          виден ScreenGradient, а статичный контент до seqDone скрыт (scale/opacity = 0).
          Монтируется только здесь и полностью демонтируется по закрытию (перф-бюджет);
          тап по экрану пропускает анимацию (внутри компонента), CTA закрывает. */}
      {sequenceShowing && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}>
          <ResultsSequence
            stars={RESULTS_STARS_BY_TIER[medalTier]}
            runes={practiceRunes.runes}
            title={c.title}
            subtitle={c.subtitle(lessonId)}
            badge={medalTier !== 'none' && MEDAL_IMAGES_COMPLETE[medalTier] ? (
              <Image
                source={MEDAL_IMAGES_COMPLETE[medalTier]}
                style={{ width: 110, height: 110 }}
                contentFit="contain"
              />
            ) : undefined}
            ctaPrimaryLabel={triLang(lang, { ru: 'Продолжить путь', en: 'Continue the journey', uk: 'Продовжити шлях', es: 'Continuar el camino', 'pt-BR': 'Continuar o caminho', vi: 'Tiếp tục hành trình', id: 'Lanjutkan perjalanan', tr: 'Yola devam et', pl: 'Kontynuuj drogę' })}
            onCtaPrimary={() => setSeqDone(true)}
          />
        </View>
      )}
      <ReviewPromptModal
        visible={showReview}
        context={reviewContext}
        lang={lang}
        onClose={() => setShowReview(false)}
      />
      {activeNotif && activeNotifVisible && (
        <AchievementNotifModal
          notif={activeNotif}
          lang={lang}
          t={t}
          f={f}
          themeMode={themeMode}
          lessonId={lessonId}
          lessonScore={lessonScore}
          lessonCefr={lessonCefr}
          onDismiss={dismissNotif}
        />
      )}
      <RegistrationPromptModal
        visible={showAuthPrompt && seqDone}
        context="lesson1"
        onClose={() => setShowAuthPrompt(false)}
      />
    </SafeAreaView>
    </ScreenGradient>
  );
}
