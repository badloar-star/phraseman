import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../components/TapScale';
import DuoPressable from '../components/DuoPressable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Modal, Platform, Pressable, Share, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import BonusXPCard from '../components/BonusXPCard';
import SoftContextualUpsellCard from '../components/SoftContextualUpsellCard';
import CollectibleDropModal from '../components/CollectibleDropModal';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { triLang, type Lang } from '../constants/i18n';
import { useTheme } from '../components/ThemeContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { usePremium } from '../components/PremiumContext';
import { CEFR_FOR_LESSON } from '../constants/theme';
import { LESSON_NAMES_RU, LESSON_NAMES_UK, lessonNamesForLang } from '../constants/lessons';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { noAndroidOutline } from '../constants/androidGlow';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useSoftUpsellOpportunity } from '../hooks/use_soft_upsell_opportunity';
import { checkAchievements } from './achievements';
import { maybeRollCollectibleDrop, type CollectibleDropOutcome } from './collectibles/storage';
import { STORE_URL } from './config';
import { checkGemAchievements, loadMedalInfo, saveMedalProgress, type MedalTier } from './medal_utils';
import { markNextNavigationAsReplace } from './navigation_back';
import { scheduleD1PersonalizedReminder } from './notifications';
import { tryUnlockLevelExam, tryUnlockLingmanExam } from './lesson_lock_system';
import { canShowReview, getReviewActiveDays, markReviewPrompted, markReviewRated, getReviewVariant, ReviewContext, ReviewVariant } from './review_utils';
import { openStoreReviewPage } from './store_review';
import { recordLessonForRepair } from './streak_repair';
import { addShards, SHARD_REWARDS, type ShardSource } from './shards_system';
import { normalizeProfileCardLevel, PROFILE_CARD_LEVEL_KEY, profileCardShardMultiplier } from './profile_card_system';
import { grantLessonFirstCompleteBonus, retryPendingLessonBonusGrants } from './lesson_bonus_grant';
import { logAppWarning } from './app_health';
import { formatLessonShardBatchReason } from './shard_earn_ui';
import { emitAppEvent } from './events';
import { markLessonFinishedOnce } from './mastery';
import { getVerifiedPremiumStatus } from './premium_guard';
import { lessonPaywallContext, requiresPremiumForLesson } from './monetization_policy';
import { readLegacyFreeLessonCap } from './legacy_free_lesson_access';
import { getFreeLessonLimit } from './remote_flags';
import { lessonPurchaseContinuationParams } from './paywall_lesson_continuation';
import { captureAccountGeneration, isCurrentAccountGeneration, subscribeAccountGeneration } from './account_generation';
import type { SoftUpsellCandidate, SoftUpsellStudyTarget } from './soft_upsell_core';
import {
  candidateAfterLessonGrant,
  createLessonSoftUpsellCtaHandler,
  lessonSoftUpsellPersistenceScope,
  shouldRenderLessonSoftUpsell,
  type LessonSoftUpsellIdentity,
} from './lesson_complete_soft_upsell';
import { primeLessonScreenFromStorage } from './lesson_screen_bootstrap';
import { prefetchLessonMenuCache } from './lesson_menu';
import { COURSE_LEVEL_RANGES, getCourseLevelForLesson } from './course_levels';
import RegistrationPromptModal from '../components/RegistrationPromptModal';
import ReviewPromptModal from '../components/ReviewPromptModal';
import CoachToast from '../components/CoachToast';
import { useOverlayVisible } from '../components/OverlayArbiter';
import { AUTH_PROMPT_SHOWN_KEY, getLinkedAuthInfo } from './auth_provider';
import { buildCelebrationShareBody } from './celebration_share_messages';
import { buildLessonShareMessage } from './lesson_share';
import { coachToastDecisionFromRouteParams, type CoachToastDecision } from './coach_toast_trigger';
import { syncToCloud } from './cloud_sync';
import { submitProgressEvent } from './progress_events_client';
import { getLessonData } from './lesson_data_all';
import BouncyScrollView from '../components/BouncyScrollView';
import ResultsSequence from '../components/feedback/ResultsSequence';
import { phraseHasStudyTargetContent } from './phrase_target_utils';
import { frenchStudyActive } from './spanish_content_gate';
import {
  lessonPerfectMilestoneKey,
  lessonProgressKey,
  lessonTopicShardGrantedKey,
} from './target_storage_keys';

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

const MAX_LESSON_MULTIPLIER_PARAM_LENGTH = 512;
const MAX_LESSON_MULTIPLIER_COUNT = 6;
type ConfirmedLessonMultiplier = { multiplier: number; xpDelta: number };

const firstRouteParam = (value: unknown): unknown => Array.isArray(value) && typeof value[0] === 'string'
  ? value[0]
  : value;

export const parseConfirmedLessonXp = (value: unknown): number => {
  const numeric = Number(firstRouteParam(value));
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > Number.MAX_SAFE_INTEGER) return 0;
  return Math.floor(numeric);
};

const normalizeConfirmedLessonMultiplier = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 1 || numeric > 20) return 1;
  return Math.round(numeric * 100) / 100;
};

export const parseConfirmedLessonMultipliers = (value: unknown): ConfirmedLessonMultiplier[] => {
  const raw = firstRouteParam(value);
  if (typeof raw === 'string' && raw.length > MAX_LESSON_MULTIPLIER_PARAM_LENGTH) return [];
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  const consolidated = new Map<number, number>();
  for (const candidate of parsed) {
    const multiplierValue = Array.isArray(candidate)
      ? candidate[0]
      : (candidate as { multiplier?: unknown } | null)?.multiplier;
    const deltaValue = Array.isArray(candidate)
      ? candidate[1]
      : (candidate as { xpDelta?: unknown } | null)?.xpDelta;
    const multiplier = normalizeConfirmedLessonMultiplier(multiplierValue);
    const xpDelta = parseConfirmedLessonXp(deltaValue);
    if (multiplier <= 1 || xpDelta <= 0) continue;
    const nextDelta = (consolidated.get(multiplier) ?? 0) + xpDelta;
    if (nextDelta <= Number.MAX_SAFE_INTEGER) consolidated.set(multiplier, nextDelta);
  }
  return [...consolidated.entries()]
    .sort(([left], [right]) => left - right)
    .slice(0, MAX_LESSON_MULTIPLIER_COUNT)
    .map(([multiplier, xpDelta]) => ({ multiplier, xpDelta }));
};

const formatConfirmedLessonMultiplier = (multiplier: number): string =>
  Number.isInteger(multiplier)
    ? String(multiplier)
    : multiplier.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');

export const deriveConfirmedLessonResults = (input: {
  finalXp: number;
  baseXp: number;
  multipliers: ConfirmedLessonMultiplier[];
}): { xp: number; rewards?: { multipliers: { label: string; xpDelta: number }[] } } => {
  const finalXp = parseConfirmedLessonXp(input.finalXp);
  const baseXp = parseConfirmedLessonXp(input.baseXp);
  const multipliers = parseConfirmedLessonMultipliers(input.multipliers);
  const multiplierXp = multipliers.reduce((total, reward) => total + reward.xpDelta, 0);
  if (baseXp + multiplierXp !== finalXp) return { xp: finalXp };
  if (multipliers.length === 0) return { xp: baseXp };
  return {
    xp: baseXp,
    rewards: {
      multipliers: multipliers.map((reward) => ({
        label: `XP ×${formatConfirmedLessonMultiplier(reward.multiplier)}`,
        xpDelta: reward.xpDelta,
      })),
    },
  };
};

type LessonSoftUpsellCopy = { title: string; body: string; ctaLabel: string; dismissLabel: string; dismissAccessibilityLabel: string; dismissAccessibilityHint: string; ctaAccessibilityLabel: string; ctaAccessibilityHint: string };

const LESSON_SOFT_UPSELL_COPY = {
  ru: { title: 'Первый урок — готово', body: 'Собери личный маршрут, чтобы дальше учить именно то, что пригодится тебе.', ctaLabel: 'Настроить мой путь', dismissLabel: 'Не сейчас', dismissAccessibilityLabel: 'Закрыть предложение', dismissAccessibilityHint: 'Продолжить без настройки личного пути', ctaAccessibilityLabel: 'Настроить личный путь', ctaAccessibilityHint: 'Открыть настройку персонального плана' },
  uk: { title: 'Перший урок — готово', body: 'Склади особистий маршрут, щоб далі вчити саме те, що знадобиться тобі.', ctaLabel: 'Налаштувати мій шлях', dismissLabel: 'Не зараз', dismissAccessibilityLabel: 'Закрити пропозицію', dismissAccessibilityHint: 'Продовжити без налаштування особистого шляху', ctaAccessibilityLabel: 'Налаштувати особистий шлях', ctaAccessibilityHint: 'Відкрити налаштування персонального плану' },
  es: { title: 'Primera lección completada', body: 'Crea una ruta personal para aprender justo lo que necesitas.', ctaLabel: 'Crear mi ruta', dismissLabel: 'Ahora no', dismissAccessibilityLabel: 'Cerrar sugerencia', dismissAccessibilityHint: 'Continuar sin crear una ruta personal', ctaAccessibilityLabel: 'Crear mi ruta personal', ctaAccessibilityHint: 'Abrir la configuración del plan personal' },
  'pt-BR': { title: 'Primeira lição concluída', body: 'Crie uma rota pessoal para aprender exatamente o que você precisa.', ctaLabel: 'Criar minha rota', dismissLabel: 'Agora não', dismissAccessibilityLabel: 'Fechar sugestão', dismissAccessibilityHint: 'Continuar sem criar uma rota pessoal', ctaAccessibilityLabel: 'Criar minha rota pessoal', ctaAccessibilityHint: 'Abrir a configuração do plano pessoal' },
  vi: { title: 'Đã xong bài học đầu tiên', body: 'Tạo lộ trình cá nhân để học đúng những gì bạn cần.', ctaLabel: 'Tạo lộ trình của tôi', dismissLabel: 'Để sau', dismissAccessibilityLabel: 'Đóng gợi ý', dismissAccessibilityHint: 'Tiếp tục mà không tạo lộ trình cá nhân', ctaAccessibilityLabel: 'Tạo lộ trình cá nhân', ctaAccessibilityHint: 'Mở phần thiết lập kế hoạch cá nhân' },
  id: { title: 'Pelajaran pertama selesai', body: 'Buat jalur pribadi untuk mempelajari hal yang benar-benar kamu perlukan.', ctaLabel: 'Buat jalur saya', dismissLabel: 'Nanti saja', dismissAccessibilityLabel: 'Tutup saran', dismissAccessibilityHint: 'Lanjut tanpa membuat jalur pribadi', ctaAccessibilityLabel: 'Buat jalur pribadi', ctaAccessibilityHint: 'Buka pengaturan rencana pribadi' },
  tr: { title: 'İlk ders tamamlandı', body: 'Tam ihtiyacın olanları öğrenmek için kişisel bir yol oluştur.', ctaLabel: 'Yolumu oluştur', dismissLabel: 'Şimdi değil', dismissAccessibilityLabel: 'Öneriyi kapat', dismissAccessibilityHint: 'Kişisel yol oluşturmadan devam et', ctaAccessibilityLabel: 'Kişisel yol oluştur', ctaAccessibilityHint: 'Kişisel plan kurulumunu aç' },
  pl: { title: 'Pierwsza lekcja ukończona', body: 'Ułóż własną ścieżkę, aby uczyć się dokładnie tego, czego potrzebujesz.', ctaLabel: 'Ułóż moją ścieżkę', dismissLabel: 'Nie teraz', dismissAccessibilityLabel: 'Zamknij sugestię', dismissAccessibilityHint: 'Kontynuuj bez układania własnej ścieżki', ctaAccessibilityLabel: 'Ułóż własną ścieżkę', ctaAccessibilityHint: 'Otwórz konfigurację planu osobistego' },
} satisfies Record<Lang, LessonSoftUpsellCopy>;

const FREE_LIMIT_SOFT_UPSELL_COPY = {
  ru: { title: '3 бесплатных урока пройдено', body: 'Ты дошёл до границы бесплатного курса. Plus откроет следующие уроки и весь маршрут.', ctaLabel: 'Посмотреть Plus', dismissLabel: 'Не сейчас', dismissAccessibilityLabel: 'Закрыть предложение', dismissAccessibilityHint: 'Остаться на экране результата', ctaAccessibilityLabel: 'Посмотреть Plus', ctaAccessibilityHint: 'Открыть информацию о доступе к следующим урокам' },
  uk: { title: '3 безкоштовні уроки пройдено', body: 'Ти дістався межі безкоштовного курсу. Plus відкриє наступні уроки й увесь маршрут.', ctaLabel: 'Переглянути Plus', dismissLabel: 'Не зараз', dismissAccessibilityLabel: 'Закрити пропозицію', dismissAccessibilityHint: 'Залишитися на екрані результату', ctaAccessibilityLabel: 'Переглянути Plus', ctaAccessibilityHint: 'Відкрити інформацію про доступ до наступних уроків' },
  es: { title: '3 lecciones gratis completadas', body: 'Has llegado al límite del curso gratuito. Plus abre las siguientes lecciones y toda la ruta.', ctaLabel: 'Ver Plus', dismissLabel: 'Ahora no', dismissAccessibilityLabel: 'Cerrar sugerencia', dismissAccessibilityHint: 'Permanecer en la pantalla de resultados', ctaAccessibilityLabel: 'Ver Plus', ctaAccessibilityHint: 'Abrir información sobre las siguientes lecciones' },
  'pt-BR': { title: '3 lições grátis concluídas', body: 'Você chegou ao limite do curso gratuito. O Plus libera as próximas lições e toda a rota.', ctaLabel: 'Ver Plus', dismissLabel: 'Agora não', dismissAccessibilityLabel: 'Fechar sugestão', dismissAccessibilityHint: 'Permanecer na tela de resultado', ctaAccessibilityLabel: 'Ver Plus', ctaAccessibilityHint: 'Abrir informações sobre as próximas lições' },
  vi: { title: 'Đã hoàn thành 3 bài miễn phí', body: 'Bạn đã đến giới hạn khóa học miễn phí. Plus mở các bài tiếp theo và toàn bộ lộ trình.', ctaLabel: 'Xem Plus', dismissLabel: 'Để sau', dismissAccessibilityLabel: 'Đóng gợi ý', dismissAccessibilityHint: 'Ở lại màn hình kết quả', ctaAccessibilityLabel: 'Xem Plus', ctaAccessibilityHint: 'Mở thông tin về quyền truy cập các bài tiếp theo' },
  id: { title: '3 pelajaran gratis selesai', body: 'Kamu telah mencapai batas kursus gratis. Plus membuka pelajaran berikutnya dan seluruh jalur.', ctaLabel: 'Lihat Plus', dismissLabel: 'Nanti saja', dismissAccessibilityLabel: 'Tutup saran', dismissAccessibilityHint: 'Tetap di layar hasil', ctaAccessibilityLabel: 'Lihat Plus', ctaAccessibilityHint: 'Buka informasi akses pelajaran berikutnya' },
  tr: { title: '3 ücretsiz ders tamamlandı', body: 'Ücretsiz kurs sınırına ulaştın. Plus sonraki dersleri ve tüm yolu açar.', ctaLabel: 'Plus’ı gör', dismissLabel: 'Şimdi değil', dismissAccessibilityLabel: 'Öneriyi kapat', dismissAccessibilityHint: 'Sonuç ekranında kal', ctaAccessibilityLabel: 'Plus’ı gör', ctaAccessibilityHint: 'Sonraki derslere erişim bilgisini aç' },
  pl: { title: 'Ukończono 3 darmowe lekcje', body: 'To koniec darmowej części kursu. Plus otwiera kolejne lekcje i całą ścieżkę.', ctaLabel: 'Zobacz Plus', dismissLabel: 'Nie teraz', dismissAccessibilityLabel: 'Zamknij sugestię', dismissAccessibilityHint: 'Pozostań na ekranie wyniku', ctaAccessibilityLabel: 'Zobacz Plus', ctaAccessibilityHint: 'Otwórz informacje o dostępie do kolejnych lekcji' },
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
      markReviewPrompted().catch(() => {});
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
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', opacity: fadeAnim }}>
        <Pressable style={{ flex: 1 }} onPress={handleNo} />
        <View style={{
          backgroundColor: t.bgCard,
          borderTopLeftRadius: panelRadius,
          borderTopRightRadius: panelRadius,
          padding: 28,
          paddingBottom: Math.max(40, bottomInset + 20),
          borderTopWidth: 0.5,
          borderColor: t.border,
          alignItems: 'center',
          overflow: 'hidden',
        }}>
          {step === 'ask' ? (
            <>
              <Text style={{ fontSize: 36, marginBottom: 14 }}>{variant.emoji}</Text>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                {variant.title}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginBottom: 28, lineHeight: f.body * 1.5 }}>
                {variant.subtitle}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 12, width: '100%' }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    minHeight: 52,
                    backgroundColor: t.bgSurface,
                    borderRadius: buttonRadius,
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 0,
                    borderColor: t.border,
                    overflow: 'hidden',
                  }}
                  onPress={handleNo}
                >
                  <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '600', textAlign: 'center' }}>{variant.btnNo}</Text>
                </TouchableOpacity>
                <TouchableOpacity
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
                      numberOfLines={2}
                    >
                      {variant.btnYes}
                    </Text>
                  </View>
                  <Text style={{ position: 'absolute', right: 16, fontSize: 16, lineHeight: 20 }}>⭐</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🙏</Text>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', textAlign: 'center' }}>
                {triLang(lang, { ru: 'Спасибо!', uk: 'Дякуємо!', es: '¡Gracias!', 'pt-BR': 'Obrigado!', vi: 'Cảm ơn!', id: 'Terima kasih!', tr: 'Teşekkürler!', pl: 'Dziękujemy!' })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 8 }}>
                {triLang(lang, {
                  ru: 'Это значит для нас очень много.',
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
function AchievementNotifModal({ notif, lang, t, f, themeMode, lessonId, lessonScore, lessonCefr, onDismiss }: {
  notif: Notif; lang: Lang; t: any; f: any; themeMode: string;
  lessonId: number; lessonScore: number; lessonCefr: string;
  onDismiss: () => void;
}) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  const dismiss = () => {
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(onDismiss);
  };

  const MEDAL_IMAGES: Record<string, any> = {
    bronze: require('../assets/images/levels/bronza.webp'),
    silver: require('../assets/images/levels/serebro.webp'),
    gold:   require('../assets/images/levels/zoloto.webp'),
  };

  const medalLabel = (tier: MedalTier) => {
    if (tier === 'bronze') return triLang(lang, { ru: '🥉 Бронзовая медаль!', uk: '🥉 Бронзова медаль!', es: '¡🥉 Medalla de bronce!', 'pt-BR': '🥉 Medalha de bronze!', vi: '🥉 Huy chương đồng!', id: '🥉 Medali perunggu!', tr: '🥉 Bronz madalya!', pl: '🥉 Brązowy medal!' });
    if (tier === 'silver') return triLang(lang, { ru: '🥈 Серебряная медаль!', uk: '🥈 Срібна медаль!', es: '¡🥈 Medalla de plata!', 'pt-BR': '🥈 Medalha de prata!', vi: '🥈 Huy chương bạc!', id: '🥈 Medali perak!', tr: '🥈 Gümüş madalya!', pl: '🥈 Srebrny medal!' });
    return triLang(lang, { ru: '🥇 Золотая медаль!', uk: '🥇 Золота медаль!', es: '¡🥇 Medalla de oro!', 'pt-BR': '🥇 Medalha de ouro!', vi: '🥇 Huy chương vàng!', id: '🥇 Medali emas!', tr: '🥇 Altın madalya!', pl: '🥇 Złoty medal!' });
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
      uk: 'Чудова робота! Продовжуй навчання!',
      es: '¡Buen trabajo! Sigue con el inglés.',
      'pt-BR': 'Bom trabalho! Continue estudando inglês.',
      vi: 'Làm tốt lắm! Hãy tiếp tục học tiếng Anh.',
      id: 'Kerja bagus! Terus belajar bahasa Inggris.',
      tr: 'Harika iş! İngilizce çalışmaya devam et.',
      pl: 'Dobra robota! Ucz się dalej angielskiego.',
    });
  } else if (notif.kind === 'lesson_unlock') {
    modalTitle = triLang(lang, {
      ru: '🔓 Урок разблокирован!',
      uk: '🔓 Урок розблоковано!',
      es: '🔓 ¡Lección desbloqueada!',
      'pt-BR': '🔓 Lição desbloqueada!',
      vi: '🔓 Đã mở khóa bài học!',
      id: '🔓 Pelajaran terbuka!',
      tr: '🔓 Ders açıldı!',
      pl: '🔓 Lekcja odblokowana!',
    });
    modalSub =
      notif.unlockedLessonId
        ? triLang(lang, {
            ru: `Урок ${notif.unlockedLessonId} «${LESSON_NAMES_RU[notif.unlockedLessonId - 1]}» теперь доступен!`,
            uk: `Урок ${notif.unlockedLessonId} «${LESSON_NAMES_UK[notif.unlockedLessonId - 1]}» тепер доступний!`,
            es: `¡La Lección ${notif.unlockedLessonId} («${lessonNamesForLang('es')[notif.unlockedLessonId - 1] ?? ''}») ya está disponible!`,
            'pt-BR': `A Lição ${notif.unlockedLessonId} agora está disponível!`,
            vi: `Bài ${notif.unlockedLessonId} hiện đã mở!`,
            id: `Pelajaran ${notif.unlockedLessonId} sekarang tersedia!`,
            tr: `Ders ${notif.unlockedLessonId} artık açık!`,
            pl: `Lekcja ${notif.unlockedLessonId} jest już dostępna!`,
          })
        : undefined;
  } else if (notif.kind === 'level_exam_unlock') {
    modalTitle = triLang(lang, {
      ru: `📋 Зачёт ${notif.cefrLevel} доступен!`,
      uk: `📋 Залік ${notif.cefrLevel} доступний!`,
      es: `📋 ¡Examen ${notif.cefrLevel} disponible!`,
      'pt-BR': `📋 Avaliação ${notif.cefrLevel} disponível!`,
      vi: `📋 Bài kiểm tra ${notif.cefrLevel} đã mở!`,
      id: `📋 Ujian ${notif.cefrLevel} tersedia!`,
      tr: `📋 ${notif.cefrLevel} sınavı açık!`,
      pl: `📋 Test ${notif.cefrLevel} jest dostępny!`,
    });
    modalSub = triLang(lang, {
      ru: `Все уроки уровня ${notif.cefrLevel} пройдены на 4.5+! Теперь можешь сдать зачёт.`,
      uk: `Всі уроки рівня ${notif.cefrLevel} пройдено на 4.5+! Тепер можеш скласти залік.`,
      es: `¡Todas las lecciones del nivel ${notif.cefrLevel} con nota 4,5 o más! Ya puedes hacer el examen de nivel.`,
      'pt-BR': `Todas as lições do nível ${notif.cefrLevel} foram concluídas com 4,5+! Agora você pode fazer a avaliação.`,
      vi: `Tất cả bài học cấp ${notif.cefrLevel} đã đạt 4,5+! Giờ bạn có thể làm bài kiểm tra.`,
      id: `Semua pelajaran level ${notif.cefrLevel} selesai dengan 4,5+! Sekarang kamu bisa mengikuti ujian level.`,
      tr: `${notif.cefrLevel} seviyesindeki tüm dersler 4,5+ ile tamamlandı! Şimdi sınava girebilirsin.`,
      pl: `Wszystkie lekcje poziomu ${notif.cefrLevel} ukończone na 4,5+! Możesz teraz podejść do testu.`,
    });
  } else {
    modalTitle = triLang(lang, {
      ru: '🎓 Экзамен Лингмана открыт!',
      uk: '🎓 Іспит Лінгмана відкрито!',
      es: '🎓 ¡Examen de Lingman desbloqueado!',
      'pt-BR': '🎓 Exame Lingman desbloqueado!',
      vi: '🎓 Đã mở kỳ thi Lingman!',
      id: '🎓 Ujian Lingman terbuka!',
      tr: '🎓 Lingman sınavı açıldı!',
      pl: '🎓 Egzamin Lingmana odblokowany!',
    });
    modalSub = triLang(lang, {
      ru: 'Все занятия = 5.0 и все зачёты сданы! Финальный экзамен открыт.',
      uk: 'Всі заняття = 5.0 та всі заліки здано! Фінальний іспит відкрито.',
      es: '¡Todas las lecciones a 5,0 y todos los exámenes de nivel superados! Examen final abierto.',
      'pt-BR': 'Todas as lições = 5,0 e todas as avaliações concluídas! O exame final está aberto.',
      vi: 'Tất cả bài học đạt 5,0 và mọi bài kiểm tra đã hoàn thành! Kỳ thi cuối đã mở.',
      id: 'Semua pelajaran = 5,0 dan semua ujian level selesai! Ujian akhir terbuka.',
      tr: 'Tüm dersler 5,0 ve tüm sınavlar tamamlandı! Final sınavı açıldı.',
      pl: 'Wszystkie lekcje na 5,0 i wszystkie testy zaliczone! Egzamin końcowy jest otwarty.',
    });
  }
  return (
    <Animated.View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999,
      opacity, justifyContent: 'center', alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.65)',
    }}>
      <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={dismiss} />
      <Animated.View style={{
        transform: [{ translateY }],
        backgroundColor: t.bgCard,
        borderRadius: 28, padding: 28, marginHorizontal: 24,
        alignItems: 'center', width: '100%', maxWidth: 360,
        borderWidth: 0, borderColor: t.textSecond + '44',
        overflow: 'hidden',
        shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 24, ...noAndroidOutline,
      }}>
        {/* Icon / Image */}
        {notif.kind === 'medal' && notif.medalTier && MEDAL_IMAGES[notif.medalTier] && (
          <Image source={MEDAL_IMAGES[notif.medalTier]} style={{ width: 90, height: 90 }} contentFit="contain" />
        )}
        {notif.kind === 'lesson_unlock' && (
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: t.accentBg, justifyContent: 'center', alignItems: 'center', marginBottom: 4, borderWidth: 0, borderColor: 'transparent', overflow: 'hidden' }}>
            <Text style={{ fontSize: 40 }}>🔓</Text>
          </View>
        )}
        {notif.kind === 'level_exam_unlock' && (
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: t.bgSurface, justifyContent: 'center', alignItems: 'center', marginBottom: 4, borderWidth: 0, borderColor: 'transparent', overflow: 'hidden' }}>
            <Text style={{ fontSize: 40 }}>📋</Text>
          </View>
        )}
        {notif.kind === 'lingman_exam_unlock' && (
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: t.correctBg, justifyContent: 'center', alignItems: 'center', marginBottom: 4, borderWidth: 0, borderColor: 'transparent', overflow: 'hidden' }}>
            <Text style={{ fontSize: 40 }}>🎓</Text>
          </View>
        )}

        {/* Title */}
        <Text style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '900', textAlign: 'center', marginTop: 12 }}>
          {modalTitle}
        </Text>

        {/* Subtitle */}
        {!!modalSub && (
          <Text style={{ color: t.textMuted, fontSize: f.bodyLg, fontWeight: '500', marginTop: 8, textAlign: 'center', lineHeight: f.bodyLg * 1.4 }}>
            {modalSub}
          </Text>
        )}

        {/* Share button */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 18,
            backgroundColor: t.bgSurface,
            borderRadius: 14,
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderWidth: 0,
            borderColor: 'transparent',
            overflow: 'hidden',
          }}
          onPress={async () => {
            hapticTap();
            await Share.share({ message: shareMessage() }).catch(() => {});
          }}
        >
          <Ionicons name="share-outline" size={18} color={t.textSecond} />
          <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '600' }}>
            {triLang(lang, { ru: 'Поделиться', uk: 'Поділитися', es: 'Compartir', 'pt-BR': 'Compartilhar', vi: 'Chia sẻ', id: 'Bagikan', tr: 'Paylaş', pl: 'Udostępnij' })}
          </Text>
        </TouchableOpacity>

        {/* Dismiss */}
        <TouchableOpacity
          onPress={() => { hapticTap(); dismiss(); }}
          style={{
            marginTop: 14,
            backgroundColor: t.accent,
            borderRadius: 16,
            paddingHorizontal: 40,
            paddingVertical: 12,
            borderWidth: 0,
            borderColor: 'transparent',
            overflow: 'hidden',
          }}
        >
          <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.bodyLg }}>
            {triLang(lang, { ru: 'Отлично!', uk: 'Чудово!', es: '¡Genial!', 'pt-BR': 'Ótimo!', vi: 'Tuyệt!', id: 'Bagus!', tr: 'Harika!', pl: 'Świetnie!' })}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

export default function LessonComplete() {
  const lessonCompleteRuntimeActive = useRuntimeActive();
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { theme: t, f, themeMode } = useTheme();
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
    coachCategory?: string;
    coachMistakeCount?: string;
    coachWeaknessScore?: string;
    coachPriorityScore?: string;
    coachRecoveryScore?: string;
    coachFocusWords?: string;
    coachMicroDiagnosis?: string;
    coachMicroLabelRu?: string;
    coachMicroLabelUk?: string;
    coachMicroLabelEs?: string;
    coachMicroLabelPtBr?: string;
    coachMicroLabelVi?: string;
    coachMicroLabelId?: string;
    coachMicroLabelTr?: string;
    coachMicroLabelPl?: string;
    coachDiagnosisEvidenceCount?: string;
    earnedXp?: string | string[];
    earnedBaseXp?: string | string[];
    earnedMultipliers?: string | string[];
    passed?: string | string[];
  }>();
  const { id } = params;
  const lessonId = parseInt(id || '1', 10);
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
      getVerifiedPremiumStatus().catch(() => false),
      readLegacyFreeLessonCap(studyTarget).catch(() => undefined),
    ]).then(([premium, legacyFreeLessonCap]) => {
      if (cancelled) return;
      setCompletionRequiresPremium(!premium && requiresPremiumForLesson(lessonId + 1, legacyFreeLessonCap));
      setCompletionAccessReady(true);
    });
    return () => { cancelled = true; };
  }, [lessonId, studyTarget]);
  const nextLessonUnlockHint = completionRequiresPremium
    ? triLang(lang, {
        ru: 'Следующий урок доступен в Plus', uk: 'Наступний урок доступний у Plus', es: 'La siguiente lección está disponible en Plus',
        'pt-BR': 'A próxima lição está disponível no Plus', vi: 'Bài học tiếp theo có trong Plus', id: 'Pelajaran berikutnya tersedia di Plus',
        tr: 'Sonraki ders Plus’ta kullanılabilir', pl: 'Następna lekcja jest dostępna w Plus',
      })
    : lessonId < 32
    ? triLang(lang, {
        ru: 'Следующий урок уже разблокирован', uk: 'Наступний урок уже розблоковано', es: 'La siguiente lección ya está desbloqueada',
        'pt-BR': 'A próxima lição já está desbloqueada', vi: 'Bài học tiếp theo đã được mở khóa', id: 'Pelajaran berikutnya sudah terbuka',
        tr: 'Sonraki dersin kilidi açıldı', pl: 'Następna lekcja jest już odblokowana',
      })
    : triLang(lang, {
        ru: 'Ты завершил весь курс', uk: 'Ти завершив увесь курс', es: 'Has terminado todo el curso',
        'pt-BR': 'Você concluiu todo o curso', vi: 'Bạn đã hoàn thành toàn bộ khóa học', id: 'Kamu sudah menyelesaikan seluruh kursus',
        tr: 'Tüm kursu tamamladın', pl: 'Ukończyłeś cały kurs',
      });
  const [showReview, setShowReview] = useState(false);
  const [reviewContext, setReviewContext] = useState<ReviewContext>('perfect_lesson');
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [lessonScore, setLessonScore] = useState<number>(0);
  const [lessonCefr,  setLessonCefr]  = useState<string>('A1');
  const [medalTier, setMedalTier]     = useState<MedalTier>('none');
  const [medalImproved, setMedalImproved] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [bonusXP, setBonusXP] = useState(0);
  const [firstCompletionAward, setFirstCompletionAward] = useState<{
    baseXp: number;
    finalXp: number;
    multiplier: number;
  } | null>(null);
  const lessonAnswerXp = parseConfirmedLessonXp(params.earnedXp);
  const lessonAnswerBaseXp = parseConfirmedLessonXp(params.earnedBaseXp);
  const earnedMultipliersParam = firstRouteParam(params.earnedMultipliers);
  const lessonAnswerMultipliers = useMemo(
    () => parseConfirmedLessonMultipliers(earnedMultipliersParam),
    [earnedMultipliersParam],
  );
  const lessonResults = useMemo(() => {
    const firstCompletionMultipliers = firstCompletionAward
      ? [{
          multiplier: firstCompletionAward.multiplier,
          xpDelta: Math.max(0, firstCompletionAward.finalXp - firstCompletionAward.baseXp),
        }]
      : [];
    return deriveConfirmedLessonResults({
      finalXp: lessonAnswerXp + (firstCompletionAward?.finalXp ?? 0),
      baseXp: lessonAnswerBaseXp + (firstCompletionAward?.baseXp ?? 0),
      multipliers: [...lessonAnswerMultipliers, ...firstCompletionMultipliers],
    });
  }, [firstCompletionAward, lessonAnswerBaseXp, lessonAnswerMultipliers, lessonAnswerXp]);
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
  const premiumBannerAnim = useRef(new Animated.Value(0)).current;
  const premiumBannerNextLesson = useRef(0);
  const softUpsell = useSoftUpsellOpportunity({
    candidates: softUpsellAccountScope ? softUpsellCandidates : [],
    accountScope: softUpsellAccountScope,
    studyTarget: softUpsellStudyTarget,
    hasPremiumAccess,
  });
  const softUpsellCopy = softUpsell.opportunity?.trigger === 'free_lessons_complete'
    ? FREE_LIMIT_SOFT_UPSELL_COPY[lang]
    : LESSON_SOFT_UPSELL_COPY[lang];

  const runSoftUpsellCta = useMemo(() => createLessonSoftUpsellCtaHandler({
    onCta: softUpsell.onCta,
    navigatePersonal: () => router.push('/personal_plan_setup' as any),
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
  // штатный каскад: medal-notif → collectible drop → review → coach-toast.
  // Чисто визуальный слой: экономика (saveMedalProgress/submitProgressEvent/
  // syncToCloud/tryUnlock*) не трогается.
  const [resultsReady, setResultsReady] = useState(false);
  const [seqDone, setSeqDone] = useState(false);
  const resultsSequenceVisible = useOverlayVisible('lessonResultsSequence', !seqDone);
  const sequenceShowing = resultsSequenceVisible && resultsReady && completionAccessReady && completionXpReady;

  // ReviewModal показывается только когда очередь нотификаций опустела — без конфликта.
  // pendingReview хранит намерение «показать ревью», а useEffect ждёт тишины.
  const pendingReview = useRef(false);
  useEffect(() => {
    // Ревью ждёт и закрытия секвенции наград (seqDone), и тишины очереди нотификаций.
    if (!seqDone || activeNotif || !pendingReview.current) return;
    pendingReview.current = false;
    setShowReview(true);
  }, [activeNotif, seqDone]);

  // Дроп карточки «Сокровищницы»: сервер решает (шанс/кап/без дублей), мы лишь
  // показываем сюрприз ПОСЛЕ всей очереди наград — никогда поверх других модалок.
  const [pendingCardDrop, setPendingCardDrop] = useState<CollectibleDropOutcome | null>(null);
  const [shownCardDrop, setShownCardDrop] = useState<CollectibleDropOutcome | null>(null);
  const collectibleDropVisible = useOverlayVisible('collectibleDrop', shownCardDrop != null);
  useEffect(() => {
    // Окно «тишины» стартует только после закрытия секвенции наград (seqDone).
    if (!seqDone || !pendingCardDrop || shownCardDrop || activeNotif) return;
    // 900мс непрерывной «тишины»: пауза между нотификациями очереди 400мс —
    // таймер переживает её только когда очередь действительно опустела.
    const timer = setTimeout(() => setShownCardDrop(pendingCardDrop), 900);
    return () => clearTimeout(timer);
  }, [pendingCardDrop, shownCardDrop, activeNotif, seqDone]);

  const [coachToast, setCoachToast] = useState<CoachToastDecision | null>(null);

  useEffect(() => {
    const decision = coachToastDecisionFromRouteParams({
      coachCategory: params.coachCategory,
      coachMistakeCount: params.coachMistakeCount,
      coachWeaknessScore: params.coachWeaknessScore,
      coachPriorityScore: params.coachPriorityScore,
      coachRecoveryScore: params.coachRecoveryScore,
      coachFocusWords: params.coachFocusWords,
      coachMicroDiagnosis: params.coachMicroDiagnosis,
      coachMicroLabelRu: params.coachMicroLabelRu,
      coachMicroLabelUk: params.coachMicroLabelUk,
      coachMicroLabelEs: params.coachMicroLabelEs,
      coachMicroLabelPtBr: params.coachMicroLabelPtBr,
      coachMicroLabelVi: params.coachMicroLabelVi,
      coachMicroLabelId: params.coachMicroLabelId,
      coachMicroLabelTr: params.coachMicroLabelTr,
      coachMicroLabelPl: params.coachMicroLabelPl,
      coachDiagnosisEvidenceCount: params.coachDiagnosisEvidenceCount,
    });
    setCoachToast(decision.show ? decision : null);
  }, [
    params.coachCategory,
    params.coachMistakeCount,
    params.coachWeaknessScore,
    params.coachPriorityScore,
    params.coachRecoveryScore,
    params.coachFocusWords,
    params.coachMicroDiagnosis,
    params.coachMicroLabelRu,
    params.coachMicroLabelUk,
    params.coachMicroLabelEs,
    params.coachMicroLabelPtBr,
    params.coachMicroLabelVi,
    params.coachMicroLabelId,
    params.coachMicroLabelTr,
    params.coachMicroLabelPl,
    params.coachDiagnosisEvidenceCount,
  ]);
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
    } catch {
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
      const grantAccountToken = captureAccountGeneration();
      const capturedSoftUpsellIdentity: LessonSoftUpsellIdentity = {
        accountScope: studyTarget === 'es' ? '' : lessonSoftUpsellPersistenceScope(grantAccountToken),
        generation: grantAccountToken.generation,
        lessonId,
        studyTarget: softUpsellStudyTarget,
      };
      const suppress = { suppressEarnEvent: true } as const;
      const shardKeys: ShardSource[] = [];

      // Бонус первого прохождения (сундук XP + осколки lesson_first).
      // Модуль сам логирует сбой и ставит выдачу в retry-очередь — раньше
      // ошибка здесь молча съедала ВСЕ награды экрана (пустой catch).
      const firstBonus = await grantLessonFirstCompleteBonus({ lessonId, studyTarget, lang });
      const softUpsellCandidate = candidateAfterLessonGrant({
        status: firstBonus.status,
        captured: capturedSoftUpsellIdentity,
        current: softUpsellIdentityRef.current,
        mounted: softUpsellMountedRef.current,
        accountGenerationCurrent: isCurrentAccountGeneration(grantAccountToken),
        freeLessonLimit: getFreeLessonLimit(),
      });
      if (softUpsellCandidate) setSoftUpsellCandidates([softUpsellCandidate]);
      if (firstBonus.status === 'granted') {
        setFirstCompletionAward({
          baseXp: firstBonus.baseXp,
          finalXp: firstBonus.finalDelta,
          multiplier: firstBonus.multiplier,
        });
        if (firstBonus.hasBonusWon) {
          setBonusXP(firstBonus.bonusXP);
          setShowBonus(true);
        }
        if (firstBonus.shardsGranted) shardKeys.push('lesson_first');
      }

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
        } catch {}
      }
      checkAchievements({ type: 'lesson_complete', lessonCount, wasPerfect, perfectCount, lessonId, studyTarget }).catch(() => {});
      if (wasPerfect) {
        const nP = await addShards('lesson_perfect', suppress);
        if (nP > 0) shardKeys.push('lesson_perfect');
      }
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
// [SHARDS] 5 уроков подряд без ошибок
      if (perfectCount > 0 && perfectCount % 5 === 0) {
          const perfKey = lessonPerfectMilestoneKey(perfectCount, studyTarget);
        const alreadyPerfect = await AsyncStorage.getItem(perfKey);
        if (!alreadyPerfect) {
          const n5 = await addShards('lessons_5_perfect', suppress);
          if (n5 > 0) {
            shardKeys.push('lessons_5_perfect');
            AsyncStorage.setItem(perfKey, '1').catch(() => {});
          }
        }
      }

      // [SHARDS] Все уроки темы пройдены (CEFR группа: A1=1-8, A2=9-18, B1=19-28, B2=29-32)
      const currentCefr = getCourseLevelForLesson(lessonId);
      const [rangeStart, rangeEnd] = COURSE_LEVEL_RANGES[currentCefr];
      let topicAllDone = true;
      for (let i = rangeStart; i <= rangeEnd; i++) {
        try {
          const saved = await AsyncStorage.getItem(lessonProgressKey(i, studyTarget));
          if (!saved) { topicAllDone = false; break; }
          const p: string[] = JSON.parse(saved);
          const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
          if (correct < 45) { topicAllDone = false; break; }
        } catch { topicAllDone = false; break; }
      }
      if (topicAllDone) {
        const topicKey = lessonTopicShardGrantedKey(currentCefr, studyTarget);
        const alreadyTopic = await AsyncStorage.getItem(topicKey);
        if (!alreadyTopic) {
          const nT = await addShards('topic_completed', suppress);
          if (nT > 0) {
            shardKeys.push('topic_completed');
            AsyncStorage.setItem(topicKey, '1').catch(() => {});
          }
        }
      }

      if (shardKeys.length > 0) {
        const baseTotal = shardKeys.reduce((acc, k) => acc + (SHARD_REWARDS[k] ?? 0), 0);
        // Фаза 2: +5% осколков за карточку IV+ — та же per-source формула, что и в
        // shards_system (бонус уже включён в фактическое начисление; здесь — показ).
        const shardPerkM = profileCardShardMultiplier(
          normalizeProfileCardLevel(await AsyncStorage.getItem(PROFILE_CARD_LEVEL_KEY)),
        );
        const perkBonusTotal = shardKeys.reduce(
          (acc, k) => acc + (shardPerkM > 1 ? Math.ceil((SHARD_REWARDS[k] ?? 0) * (shardPerkM - 1)) : 0),
          0,
        );
        const total = baseTotal + perkBonusTotal;
        if (total > 0) {
          const reasonText = formatLessonShardBatchReason(shardKeys, lang);
          emitAppEvent('shards_earned', { amount: total, ...(perkBonusTotal > 0 ? { bonus: perkBonusTotal } : {}), reasonText });
        }
      }

      // [STREAK REPAIR] Засчитываем урок в прогресс починки цепочки
      const repair = await recordLessonForRepair();
      if (repair.nowRepaired) {
        checkAchievements({ type: 'streak_repair' }).catch(() => {});
      }

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
          const d1Lang: Lang = langRaw === 'uk' ? 'uk' : langRaw === 'es' ? 'es' : 'ru';
          scheduleD1PersonalizedReminder(d1Phrases, d1Streak, d1Lang).catch(() => {});
        } catch {}
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
    // Доначисляем бонусы, зависшие из-за прошлых сбоев (сеть/лимит XP).
    // Идемпотентно: guard-ключ + стабильный eventId в леджере.
    void retryPendingLessonBonusGrants();
  }, []);

  // Вводная анимация медали (spring + fade + покачивание) стартует ПОСЛЕ закрытия
  // секвенции наград: до seqDone статичный контент скрыт (scale/opacity = 0), и
  // крутить Animated.loop под полноэкранным оверлеем незачем (перф-бюджет §2.1).
  // Награды/оценка при этом идут с монтирования как раньше — см. эффект ниже.
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
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -8, duration: 700, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0,  duration: 700, useNativeDriver: true }),
      ])
    );
    const bounceStartTimer = setTimeout(() => bounce.start(), 400);
    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(bounceStartTimer);
      bounce.stop();
    };
  }, [seqDone, bounceAnim, fadeAnim, lessonCompleteRuntimeActive, scaleAnim]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const canApply = await canApplyCompletionRewards();
      if (!canApply) {
        if (!cancelled && frenchStudyActive(studyTarget)) router.replace('/lessons_list' as any);
        return;
      }
      void grantBonus().finally(() => {
        if (!cancelled) setCompletionXpReady(true);
      });
      void markLessonFinishedOnce(lessonId, studyTarget);
      // Qualifying-активность для Сокровищницы. eventId детерминирован
      // (lesson:id:день) — повтор того же урока в тот же день не дропает.
      void maybeRollCollectibleDrop('lesson', String(lessonId)).then((drop) => {
        if (!cancelled && drop) setPendingCardDrop(drop);
      }).catch(() => {});
    })();

    // Загружаем оценку урока, сохраняем медаль
    void (async () => {
      const canApply = await canApplyCompletionRewards();
      if (!canApply) return;
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
        const { newTier, prevTier, isNewBest, newPassCount } = await saveMedalProgress(lessonId, score, p, studyTarget);
        submitProgressEvent({
          eventId: [
            'lesson',
            safeLessonCompleteEventPart(studyTarget),
            String(lessonId),
            'complete',
            String(Math.max(1, newPassCount)),
          ].join(':'),
          type: 'lesson_complete',
          payload: {
            lessonId,
            studyTarget,
            score,
            passed: correct >= 45,
            progress: p,
            cellIndex: p.length,
            xpDelta: 0,
          },
        }).catch(() => {});
        void syncToCloud({ forceNow: true }).catch(() => {});
        setMedalTier(newTier);
        const medalUpgraded = isNewBest && newTier !== prevTier && newTier !== 'none';
        setMedalImproved(medalUpgraded);
        setResultsReady(true);
        if (correct >= 45 && p.filter(x => x === 'wrong').length === 0 && newPassCount > 0) {
          checkAchievements({ type: 'lesson_perfect_pass', lessonId, passCount: newPassCount, studyTarget }).catch(() => {});
        }

        // Build notification queue
        const queue: Notif[] = [];
        if (params.unlocked === '1' && lessonId < 32) {
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
        gems.forEach(g => checkAchievements({ type: 'gem', level: g.level, gem: g.gem, studyTarget }).catch(() => {}));
      } catch {
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
  }, [canApplyCompletionRewards, clearLessonCompleteNotifTimer, grantBonus, lessonId, params.unlocked, router, scheduleActiveNotif, studyTarget]);

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
        if (linked) {
          // Уже залогинен (через онбординг или из Settings) — помечаем чтобы больше не дёргать
          AsyncStorage.setItem(AUTH_PROMPT_SHOWN_KEY, '1').catch(() => {});
          return;
        }
        if (!cancelled) setShowAuthPrompt(true);
      } catch {
        // игнорируем — модалку просто не покажем
      }
    }, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [lessonId]);

  const goNext = () => {
    const next = lessonId + 1;
    if (next <= 32) {
      void (async () => {
        const premium = await getVerifiedPremiumStatus().catch(() => false);
        const legacyFreeLessonCap = await readLegacyFreeLessonCap(studyTarget);
        if (requiresPremiumForLesson(next, legacyFreeLessonCap) && !premium) {
          // Экран результата остаётся единственным: для закрытого урока сразу открываем
          // существующий путь Plus, без промежуточного баннера на завершении урока.
          markNextNavigationAsReplace();
          router.replace({
            pathname: '/premium_modal',
            params: {
              context: lessonPaywallContext(next),
              lessons_done: String(lessonId),
              ...lessonPurchaseContinuationParams(next),
            },
          } as any);
          return;
        }
        await prefetchLessonMenuCache(next, studyTarget);
        router.replace({ pathname: '/lessons_list', params: { id: next } });
      })();
    } else {
      router.replace('/(tabs)/home' as any);
    }
  };

  const goBackFromComplete = useCallback(() => {
    hapticTap();
    router.replace({ pathname: '/lessons_list', params: { id: lessonId } });
  }, [router, lessonId]);

  const handleRepeatLesson = useCallback(() => {
    if (repeatOpeningRef.current) return;
    repeatOpeningRef.current = true;
    setRepeatOpening(true);
    void primeLessonScreenFromStorage(lessonId, studyTarget).catch(() => {});
    try {
      router.replace({ pathname: '/lesson1', params: { id: lessonId } });
    } catch {
      repeatOpeningRef.current = false;
      setRepeatOpening(false);
    }
  }, [lessonId, router, studyTarget]);

  // Android: системный «Назад» НЕ должен попадать на сам пройденный урок.
  // Раньше lesson_complete не перехватывал hardwareBackPress — pop возвращал на
  // экран lesson1, который при полном прогрессе тут же снова делал replace на
  // lesson_complete → бесконечная петля «завершение ⇆ урок». Теперь «Назад»:
  //   1) если открыт оверлей (награда/ревью/карточка/регистрация/премиум-баннер) —
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
      if (shownCardDrop) {
        setShownCardDrop(null);
        setPendingCardDrop(null);
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
    shownCardDrop,
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
            <ResultsSequence
              stars={RESULTS_STARS_BY_TIER[medalTier]}
              xp={lessonResults.xp}
              rewards={lessonResults.rewards}
              title={c.title}
              subtitle={nextLessonUnlockHint}
              badge={medalTier !== 'none' && MEDAL_IMAGES_COMPLETE[medalTier] ? (
                <Image source={MEDAL_IMAGES_COMPLETE[medalTier]} style={{ width: 110, height: 110 }} contentFit="contain" />
              ) : undefined}
              ctaPrimaryLabel={completionRequiresPremium
                ? triLang(lang, { ru: 'Открыть Plus', uk: 'Відкрити Plus', es: 'Abrir Plus', 'pt-BR': 'Abrir Plus', vi: 'Mở Plus', id: 'Buka Plus', tr: 'Plus’ı aç', pl: 'Otwórz Plus' })
                : triLang(lang, { ru: 'Продолжить', uk: 'Продовжити', es: 'Continuar', 'pt-BR': 'Continuar', vi: 'Tiếp tục', id: 'Lanjutkan', tr: 'Devam et', pl: 'Kontynuuj' })}
              onCtaPrimary={() => {
                if (pendingReview.current) {
                  pendingReview.current = false;
                  setShowReview(true);
                  return;
                }
                goNext();
              }}
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
          <TapScale
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
            onPress={goBackFromComplete}
            style={{
              position: 'absolute',
              top: Math.max(16, insets.top + 8),
              left: 20,
              zIndex: 10,
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.bgSurface,
            }}
          >
            <Ionicons name="arrow-back" size={22} color={t.textPrimary} />
          </TapScale>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <Text style={{ color: t.textSecond, fontSize: 16, textAlign: 'center' }}>
              {triLang(lang, {
                ru: 'Сохраняю результат…',
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
        accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
        onPress={goBackFromComplete}
        style={{
          position: 'absolute',
          top: Math.max(16, insets.top + 8),
          left: 20,
          zIndex: 10,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: t.bgCard,
          borderWidth: 0,
          borderColor: t.border,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
      </TapScale>
      )}
      <ContentWrap>
      <BouncyScrollView testID="lesson-complete-screen" decelerationRate="normal" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }} showsVerticalScrollIndicator={false}>

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
            <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: '#3A3A3A', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 40, color: '#555' }}>?</Text>
            </View>
          )}
          {medalImproved && (
            <Animated.Text style={{
              color: t.gold, fontSize: f.bodyLg, fontWeight: '700',
              marginTop: 6, opacity: fadeAnim,
            }}>
              {medalTier === 'bronze' && triLang(lang, { ru: '🥉 Новая медаль!', uk: '🥉 Нова медаль!', es: '¡🥉 Medalla nueva!', 'pt-BR': '🥉 Nova medalha!', vi: '🥉 Huy chương mới!', id: '🥉 Medali baru!', tr: '🥉 Yeni madalya!', pl: '🥉 Nowy medal!' })}
              {medalTier === 'silver' && triLang(lang, { ru: '🥈 Новая медаль!', uk: '🥈 Нова медаль!', es: '¡🥈 Medalla nueva!', 'pt-BR': '🥈 Nova medalha!', vi: '🥈 Huy chương mới!', id: '🥈 Medali baru!', tr: '🥈 Yeni madalya!', pl: '🥈 Nowy medal!' })}
              {medalTier === 'gold'   && triLang(lang, { ru: '🥇 Золото!', uk: '🥇 Золото!', es: '¡🥇 Oro!', 'pt-BR': '🥇 Ouro!', vi: '🥇 Vàng!', id: '🥇 Emas!', tr: '🥇 Altın!', pl: '🥇 Złoto!' })}
            </Animated.Text>
          )}
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', width: '100%' }}>
          <Text style={{ color: t.textPrimary, fontSize: 30, fontWeight: '700', marginBottom: 10, textAlign: 'center' }}>
            {c.title}
          </Text>
          <Text style={{ color: t.textSecond, fontSize: 17, marginBottom: 16, textAlign: 'center' }}>
            {c.subtitle(lessonId)}
          </Text>

          {/* Бонус +500 */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: t.correctBg, borderRadius: 14,
            paddingHorizontal: 18, paddingVertical: 12,
            borderWidth: 1, borderColor: t.correct, marginBottom: 20,
            overflow: 'hidden',
          }}>
            <Ionicons name="star" size={20} color={t.correct} />
            <Text style={{ color: t.correct, fontSize: 18, fontWeight: '700' }}>{c.bonus}</Text>
          </View>

          {/* Совет отдохнуть */}
          <View style={{
            backgroundColor: t.bgCard, borderRadius: 14,
            padding: 16, borderWidth: 0, borderColor: t.border,
            width: '100%', marginBottom: 36,
            flexDirection: 'row', alignItems: 'center', gap: 12,
            overflow: 'hidden',
          }}>
            <Ionicons name="cafe-outline" size={24} color={t.textSecond} />
            <Text style={{ color: t.textMuted, fontSize: 15, lineHeight: 22, flex: 1 }}>
              {c.rest}
            </Text>
          </View>

          {/* Следующий урок — Duolingo-кнопка (вдавливается в кромку при нажатии) */}
          {shouldRenderLessonSoftUpsell(seqDone, softUpsell.opportunity) && softUpsell.opportunity && (
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
                opportunity={softUpsell.opportunity}
                onImpression={softUpsell.onImpression}
                onDismiss={softUpsell.onDismiss}
                onCta={handleSoftUpsellCta}
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
                borderWidth: 0, borderColor: t.border,
                overflow: 'hidden',
              }}
              onPress={goNext}
            >
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700' }}>
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
              <TouchableOpacity
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
                      lessons_done: String(lessonId),
                      ...lessonPurchaseContinuationParams(premiumBannerNextLesson.current),
                    },
                  } as any);
                }}
              >
                <Text style={{ color: t.gold, fontSize: f.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                  {triLang(lang, { ru: '🔓 Следующий урок закрыт', uk: '🔓 Наступний урок закрито', es: '🔓 La siguiente lección está bloqueada', 'pt-BR': '🔓 Próxima lição bloqueada', vi: '🔓 Bài tiếp theo đã bị khóa', id: '🔓 Pelajaran berikutnya terkunci', tr: '🔓 Sonraki ders kilitli', pl: '🔓 Następna lekcja jest zablokowana' })}
                </Text>
                <Text style={{ color: t.correctText, fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 2 }}>
                  {triLang(lang, { ru: 'Открыть Plus — продолжить →', uk: 'Відкрити Plus — продовжити →', es: 'Abrir Plus — continuar →', 'pt-BR': 'Abrir Plus — continuar →', vi: 'Mở Plus — tiếp tục →', id: 'Buka Plus — lanjutkan →', tr: 'Plus aç — devam et →', pl: 'Otwórz Plus — kontynuuj →' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={{ paddingVertical: 8, alignItems: 'center' }}
                onPress={() => {
                  hapticTap();
                  setShowPremiumBanner(false);
                  premiumBannerAnim.setValue(0);
                }}
              >
                <Text style={{ color: t.textGhost, fontSize: f.caption, textDecorationLine: 'underline' }}>
                  {triLang(lang, { ru: 'Остаться на бесплатном', uk: 'Залишитись на безкоштовному', es: 'Quedarme con la versión gratuita', 'pt-BR': 'Ficar no gratuito', vi: 'Tiếp tục miễn phí', id: 'Tetap di gratis', tr: 'Ücretsiz kalmak istiyorum', pl: 'Zostań w darmowej wersji' })}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Повторить урок — Duolingo-кнопка.
              Фон/текст берём из bgCard+textPrimary (не accentBg+accent): в золотой
              теме accentBg — бронзовая дымка, а accent-текст на ней сливался в
              «пустую» плитку. Акцент сохраняем через accent-кромку, рамку и иконку. */}
          <DuoPressable
            testID="lesson-complete-repeat"
            edgeColor={t.accent}
            disabled={repeatOpening}
            accessibilityState={{ busy: repeatOpening }}
            pressedExternally={repeatOpening}
            wrapStyle={{ marginBottom: 14, opacity: repeatOpening ? 0.72 : 1 }}
            style={{
              width: '100%', backgroundColor: t.bgCard,
              borderRadius: 16, padding: 16,
              borderWidth: 0, borderColor: t.accent,
              flexDirection: 'row', justifyContent: 'center', gap: 8,
              overflow: 'hidden',
            }}
            onPress={handleRepeatLesson}
          >
            <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>
              ↺ {c.repeatLesson}
            </Text>
          </DuoPressable>

          {/* Поделиться результатом */}
          <TouchableOpacity
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
              await Share.share({ message: msg }).catch(() => {});
            }}
          >
            <Ionicons name="share-outline" size={18} color={t.textSecond} />
            <Text style={{ color: t.textSecond, fontSize: 15 }}>
              {c.shareResult}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="lesson-complete-back-home"
            style={{
              padding: 14,
              borderRadius: 0,
              backgroundColor: 'transparent',
              borderWidth: 0,
              borderColor: 'transparent',
              overflow: 'hidden',
            }}
            onPress={() => { hapticTap(); router.replace('/(tabs)/home' as any); }}
          >
            <Text style={{ color: t.textMuted, fontSize: 16 }}>{c.backHome}</Text>
          </TouchableOpacity>
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
            xp={lessonResults.xp}
            rewards={lessonResults.rewards}
            title={c.title}
            subtitle={c.subtitle(lessonId)}
            badge={medalTier !== 'none' && MEDAL_IMAGES_COMPLETE[medalTier] ? (
              <Image
                source={MEDAL_IMAGES_COMPLETE[medalTier]}
                style={{ width: 110, height: 110 }}
                contentFit="contain"
              />
            ) : undefined}
            ctaPrimaryLabel={triLang(lang, { ru: 'Продолжить путь', uk: 'Продовжити шлях', es: 'Continuar el camino', 'pt-BR': 'Continuar o caminho', vi: 'Tiếp tục hành trình', id: 'Lanjutkan perjalanan', tr: 'Yola devam et', pl: 'Kontynuuj drogę' })}
            onCtaPrimary={() => setSeqDone(true)}
          />
        </View>
      )}
      {showBonus && seqDone && (
        <BonusXPCard
          bonusXP={bonusXP}
          onDismiss={() => setShowBonus(false)}
          position="center"
          duration={2000}
        />
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
      <CollectibleDropModal
        outcome={collectibleDropVisible ? shownCardDrop : null}
        onClose={() => {
          setShownCardDrop(null);
          setPendingCardDrop(null);
        }}
        onOpenCollection={() => {
          setShownCardDrop(null);
          setPendingCardDrop(null);
          router.push('/collectibles_screen' as any);
        }}
      />
      {coachToast?.show && (
        <CoachToast
          category={coachToast.category}
          labelRu={coachToast.labelRu}
          labelUk={coachToast.labelUk}
          labelEs={coachToast.labelEs}
          labelPtBr={coachToast.labelPtBr}
          labelVi={coachToast.labelVi}
          labelId={coachToast.labelId}
          labelTr={coachToast.labelTr}
          labelPl={coachToast.labelPl}
          mistakeCount={coachToast.mistakeCount}
          weaknessScore={coachToast.weaknessScore}
          priorityScore={coachToast.priorityScore}
          recoveryScore={coachToast.recoveryScore}
          focusWords={coachToast.focusWords}
          microDiagnosisId={coachToast.microDiagnosisId}
          microLabelRu={coachToast.microLabelRu}
          microLabelUk={coachToast.microLabelUk}
          microLabelEs={coachToast.microLabelEs}
          microLabelPtBr={coachToast.microLabelPtBr}
          microLabelVi={coachToast.microLabelVi}
          microLabelId={coachToast.microLabelId}
          microLabelTr={coachToast.microLabelTr}
          microLabelPl={coachToast.microLabelPl}
          diagnosisEvidenceCount={coachToast.diagnosisEvidenceCount}
          onDismiss={() => setCoachToast(null)}
        />
      )}
    </SafeAreaView>
    </ScreenGradient>
  );
}
