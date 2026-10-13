/**
 * DialogVerdictScreen — полноэкранный финал ИИ-диалога.
 *
 * зачем: фулл-редизайн Диалогов (владелец, 2026-08-23) — вердикт перестал быть
 * карточкой в ленте чата и стал отдельным «экраном-праздником»: свет сцены,
 * медальон исхода, каскад целей, реакция персонажа, разбор фраз и действия.
 * Переписка остаётся жить ПОД финалом: кнопка «Показать переписку» прячет
 * оверлей (в чате появляется пилюля «Итоги» — см. ai_dialog_session.tsx).
 *
 * Perf-контракты: только конечные entering-анимации (никаких withRepeat),
 * reduce-motion гасит движение, контент в ScrollView (низкие экраны докручивают
 * до кнопок), геометрия строк зарезервирована.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reanimated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import type { PremiumDialogReviewResponse } from '../app/ai_dialog_client';
import { dialogueCompletionFeedbackMode } from '../app/dialogue_completion_debrief';
import { objectiveLabel, outcomeTitle, type DialogOutcome } from '../app/dialog_outcome';
import type { DialogObjective } from '../app/ai_dialog_scenarios';
import type { DialogSceneTheme } from '../constants/dialogSceneThemes';
import { noAndroidOutline } from '../constants/androidGlow';
import { triLang, type Lang } from '../constants/i18n';
import { hapticSuccess, hapticWarning } from '../hooks/use-haptics';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { soundDirector } from '../modules/audio/sound_director';
import SkeletonBlock from './SkeletonShimmer';
import { glassFill } from './GlassSurface';
import DialogPhraseReview from './dialogs/DialogPhraseReview';
import { useTheme } from './ThemeContext';

interface DialogVerdictScreenProps {
  outcome: DialogOutcome;
  lang: Lang;
  /** Смайл финального настроения собеседника (moodToFace) — одобренное исключение. */
  moodFace: string;
  scene: DialogSceneTheme;
  scenarioIcon: string;
  scenarioTitle: string;
  personaName: string;
  characterReaction: string;
  objectives: DialogObjective[];
  objectivesMet: Set<string>;
  coachTips: string[];
  review: PremiumDialogReviewResponse | null;
  reviewStatus: 'idle' | 'loading' | 'ready' | 'error';
  /** true — Free-пользователь: разбор закрыт, показываем ветку Plus. */
  locked: boolean;
  /**
   * зачем (аудит 2026-08-23): раньше companion-диалоги без целей и ручное
   * «Завершить» без исхода жили в отдельном инлайн-блоке ленты чата —
   * второй, более бедный стиль финала. Теперь это тот же полноэкранный
   * вердикт, но с нейтральным (не победным/проигрышным) тоном: заголовок
   * «Разговор завершён» + число реплик вместо счёта целей, без хайфайва.
   */
  neutralClosing?: { userExchanges: number; recommendedExchanges: number };
  /** Владелец 2026-08-25: блок оценки диалога (звёзды+текст) — слот, а не
   * прямая завязка на feedback-модуль, чтобы компонент оставался переиспользуемым. */
  feedbackSlot?: React.ReactNode;
  onRetry: () => void;
  onExit: () => void;
  onShowChat: () => void;
  onOpenPlus: () => void;
}

export default function DialogVerdictScreen({
  outcome,
  lang,
  moodFace,
  scene,
  scenarioIcon,
  scenarioTitle,
  personaName,
  characterReaction,
  objectives,
  objectivesMet,
  coachTips,
  review,
  reviewStatus,
  locked,
  neutralClosing,
  feedbackSlot,
  onRetry,
  onExit,
  onShowChat,
  onOpenPlus,
}: DialogVerdictScreenProps) {
  const { theme: t, f } = useTheme();
  const reduceMotion = useReduceMotion();
  const success = outcome === 'success';
  const neutral = !!neutralClosing;
  const hapticFiredRef = useRef(false);

  // Один тактильный аккорд на появление вердикта — успех и неуспех различимы;
  // нейтральное завершение (ручной выход) — без тактильного акцента вовсе,
  // это не игровой момент.
  useEffect(() => {
    if (hapticFiredRef.current || neutral) return;
    hapticFiredRef.current = true;
    if (success) void hapticSuccess();
    else void hapticWarning();
    // зачем: тот же вердикт, что и хаптик выше, — блестяще пройденный диалог
    // празднуем pm.dialog.victory, любой другой исход (не только сеть/сбой,
    // а именно «не сдал, попробуй снова») — поддерживающий pm.dialog.retry,
    // без унижения. Нейтральное закрытие (ручной выход) звука не получает —
    // это не игровой момент, тот же критерий, что и у хаптика.
    soundDirector.request(success ? 'pm.dialog.victory' : 'pm.dialog.retry', { scope: 'dialog-verdict' });
  }, [success, neutral]);

  const outcomeIcon: keyof typeof Ionicons.glyphMap = neutral
    ? 'chatbubble-ellipses-outline'
    : success
      ? 'trophy'
      : outcome === 'lost_patience'
        ? 'flame'
        : 'moon';
  const outcomeColor = neutral
    ? scene.hue
    : success
      ? t.correct
      : outcome === 'lost_patience'
        ? t.wrong
        : scene.hue;

  const closingTitle = neutral
    ? triLang(lang, {
        ru: 'Разговор завершён',
        uk: 'Розмову завершено',
        en: 'Conversation finished',
        es: 'Conversación terminada',
        'pt-BR': 'Conversa encerrada',
        vi: 'Cuộc trò chuyện đã kết thúc',
        id: 'Percakapan selesai',
        tr: 'Sohbet tamamlandı',
        pl: 'Rozmowa zakończona',
      })
    : outcomeTitle(outcome, lang);

  const neutralSubtitle = neutralClosing
    ? triLang(lang, {
        ru: `Твоих реплик: ${neutralClosing.userExchanges}. Ориентир: около ${neutralClosing.recommendedExchanges}, но завершать можно вручную.`,
        uk: `Твоїх реплік: ${neutralClosing.userExchanges}. Орієнтир: близько ${neutralClosing.recommendedExchanges}, але завершити можна вручну.`,
        en: `Your replies: ${neutralClosing.userExchanges}. Target: about ${neutralClosing.recommendedExchanges}, but you can end it manually.`,
        es: `Tus respuestas: ${neutralClosing.userExchanges}. Guía: unas ${neutralClosing.recommendedExchanges}, pero puedes terminar manualmente.`,
        'pt-BR': `Suas respostas: ${neutralClosing.userExchanges}. Referência: cerca de ${neutralClosing.recommendedExchanges}, mas você pode encerrar manualmente.`,
        vi: `Lượt trả lời của bạn: ${neutralClosing.userExchanges}. Gợi ý: khoảng ${neutralClosing.recommendedExchanges}, nhưng bạn có thể tự kết thúc.`,
        id: `Jawabanmu: ${neutralClosing.userExchanges}. Patokan: sekitar ${neutralClosing.recommendedExchanges}, tetapi kamu bisa mengakhiri sendiri.`,
        tr: `${neutralClosing.userExchanges} yanıt verdin. Hedef yaklaşık ${neutralClosing.recommendedExchanges}; yine de elle bitirebilirsin.`,
        pl: `Twoje odpowiedzi: ${neutralClosing.userExchanges}. Wskazówka: około ${neutralClosing.recommendedExchanges}, ale możesz zakończyć ręcznie.`,
      })
    : '';

  const enter = (delayMs: number) =>
    reduceMotion ? undefined : FadeInDown.delay(delayMs).duration(300);

  const metCount = objectives.filter((o) => objectivesMet.has(o.id)).length;
  const reviewEvidence = review?.evidence ?? [];
  const completionObjectiveResults = review?.objectiveResults ?? [];
  const hasSavedScenarioBranch = review?.v2Memory?.scenarioCheckpointStored === true && !locked;
  // Итог должен быть виден на КАЖДОМ финальном экране. Живой ответ модели
  // называется оценкой собеседника только при проверяемых цитатах; локальный
  // fallback честно называется итогом переписки и опирается лишь на её факты.
  const isLocalCompletionFallback = review?.fallback === true;
  const hasCompletionAssessment = Boolean(review?.assessment?.trim());
  const completionAssessment = hasCompletionAssessment ? review!.assessment!.trim() : '';
  const hasGeneratedPartnerAssessment = Boolean(
    !isLocalCompletionFallback && completionAssessment && reviewEvidence.length > 0,
  );
  const completionFeedbackMode = dialogueCompletionFeedbackMode({
    fallback: review?.fallback,
    evidence: reviewEvidence,
    corrections: review?.corrections,
    phrases: review?.phrases,
  });

  const showChatLabel = triLang(lang, {
    ru: 'Показать переписку',
    uk: 'Показати переписку',
    en: 'Show the transcript',
    es: 'Ver la conversación',
    'pt-BR': 'Ver a conversa',
    vi: 'Xem cuộc trò chuyện',
    id: 'Lihat percakapan',
    tr: 'Yazışmayı göster',
    pl: 'Pokaż rozmowę',
  });

  return (
    <Reanimated.View
      entering={reduceMotion ? undefined : FadeIn.duration(220)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: t.bgPrimary,
      }}
    >
      {/* Свет сцены: глубокий тинт места сверху + отсвет исхода снизу. */}
      <LinearGradient
        pointerEvents="none"
        colors={[scene.hueDeep + '52', scene.hue + '14', 'transparent']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 420 }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', outcomeColor + '1F']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 260 }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 26, paddingBottom: 28 }}
        >
          {/* Медальон исхода: глиф сцены в световом кольце. */}
          <Reanimated.View
            entering={reduceMotion ? undefined : ZoomIn.springify().damping(14).duration(420)}
            style={{ alignItems: 'center' }}
          >
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: outcomeColor + '26',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: outcomeColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.45,
                shadowRadius: 16,
                ...noAndroidOutline,
              }}
            >
              <Ionicons name={outcomeIcon} size={44} color={outcomeColor} />
            </View>
          </Reanimated.View>

          <Reanimated.View entering={enter(80)} style={{ alignItems: 'center', marginTop: 16 }}>
            <Text
              style={{ color: t.textPrimary, fontSize: f.h1 + 3, fontWeight: '900', textAlign: 'center' }}
              maxFontSizeMultiplier={1.2}
            >
              {closingTitle}
            </Text>
            {neutral ? (
              <Text
                style={{
                  color: t.textMuted,
                  fontSize: f.body,
                  fontWeight: '600',
                  textAlign: 'center',
                  lineHeight: Math.round(f.body * 1.4),
                  marginTop: 8,
                }}
                maxFontSizeMultiplier={1.2}
              >
                {neutralSubtitle}
              </Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <Ionicons name={scenarioIcon as never} size={15} color={scene.hue} />
                <Text style={{ color: t.accentText, fontSize: f.body, fontWeight: '600' }}>
                  {scenarioTitle}
                </Text>
                <Text
                  style={{ fontSize: f.h2 }}
                  accessibilityLabel={triLang(lang, {
                    ru: 'Финальное настроение собеседника',
                    uk: 'Фінальний настрій співрозмовника',
                    en: "The other person's final mood",
                    es: 'Ánimo final del interlocutor',
                    'pt-BR': 'Humor final do interlocutor',
                    vi: 'Tâm trạng cuối của người kia',
                    id: 'Suasana hati akhir lawan bicara',
                    tr: 'Karşıdakinin son ruh hâli',
                    pl: 'Końcowy nastrój rozmówcy',
                  })}
                >
                  {moodFace}
                </Text>
              </View>
            )}
          </Reanimated.View>

          {/* Реакция персонажа от первого лица. */}
          {characterReaction.length > 0 && (
            <Reanimated.View
              entering={enter(160)}
              style={{
                flexDirection: 'row',
                gap: 12,
                backgroundColor: glassFill(t.bgCard, 0.46),
                borderRadius: 20,
                padding: 14,
                marginTop: 22,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                pointerEvents="none"
                colors={[scene.hue + '1C', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  backgroundColor: scene.hue + '26',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={scenarioIcon as never} size={19} color={scene.hue} />
              </View>
              <Text
                style={{
                  color: t.accentText,
                  fontSize: f.body,
                  fontStyle: 'italic',
                  flex: 1,
                  lineHeight: Math.round(f.sub * 1.45),
                }}
                maxFontSizeMultiplier={1.2}
              >
                {personaName ? `${personaName}: ` : ''}
                {characterReaction}
              </Text>
            </Reanimated.View>
          )}

          {/* Чек-лист целей сцены: каскадом, выполненные — светом сцены. */}
          {objectives.length > 0 && (
            <Reanimated.View
              entering={enter(220)}
              style={{ backgroundColor: glassFill(t.bgCard, 0.46), borderRadius: 20, padding: 14, marginTop: 12 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <Ionicons name="flag" size={14} color={scene.hue} />
                <Text style={{ color: scene.hue, fontSize: f.label, fontWeight: '700', letterSpacing: 0.8, flex: 1 }}>
                  {triLang(lang, {
                    ru: 'Цели сцены',
                    uk: 'Цілі сцени',
                    en: 'Scene goals',
                    es: 'Objetivos de la escena',
                    'pt-BR': 'Objetivos da cena',
                    vi: 'Mục tiêu của cảnh',
                    id: 'Tujuan adegan',
                    tr: 'Sahne hedefleri',
                    pl: 'Cele sceny',
                  })}
                </Text>
                <Text style={{ color: metCount > 0 ? scene.hue : t.textMuted, fontSize: f.h3, fontWeight: '900' }}>
                  {metCount}/{objectives.length}
                </Text>
              </View>
              {objectives.map((o, oi) => {
                const done = objectivesMet.has(o.id);
                return (
                  <Reanimated.View
                    key={o.id}
                    entering={reduceMotion ? undefined : FadeInDown.delay(280 + oi * 70).duration(240)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: oi === 0 ? 0 : 8 }}
                  >
                    <Ionicons
                      name={done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={done ? scene.hue : t.textMuted}
                    />
                  <Text
                    style={{ color: done ? t.textPrimary : t.textMuted, fontSize: f.body, fontWeight: '600', flex: 1 }}
                      maxFontSizeMultiplier={1.2}
                    >
                    {objectiveLabel(o, lang)}
                  </Text>
                  <Text
                    style={{ color: done ? scene.hue : t.textMuted, fontSize: f.sub, fontWeight: '700' }}
                    maxFontSizeMultiplier={1.2}
                  >
                    {done
                      ? triLang(lang, {
                          ru: 'Выполнено', uk: 'Виконано', en: 'Done', es: 'Hecho', 'pt-BR': 'Concluído',
                          vi: 'Đã xong', id: 'Selesai', tr: 'Tamamlandı', pl: 'Wykonano',
                        })
                      : triLang(lang, {
                          ru: 'Не выполнено', uk: 'Не виконано', en: 'Not completed', es: 'No completado', 'pt-BR': 'Não concluído',
                          vi: 'Chưa hoàn thành', id: 'Belum selesai', tr: 'Tamamlanmadı', pl: 'Nie wykonano',
                        })}
                  </Text>
                </Reanimated.View>
              );
              })}
            </Reanimated.View>
          )}

          {hasSavedScenarioBranch && (
            <Reanimated.View
              entering={enter(250)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 9,
                backgroundColor: glassFill(t.bgCard, 0.46),
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 11,
                marginTop: 12,
              }}
            >
              <Ionicons name="bookmark-outline" size={17} color={t.textMuted} />
              <Text
                style={{ color: t.accentText, fontSize: f.sub, fontWeight: '700', flex: 1 }}
                maxFontSizeMultiplier={1.2}
              >
                {triLang(lang, {
                  ru: 'Ветка диалога сохранена',
                  uk: 'Гілку діалогу збережено',
                  en: 'This dialogue branch is saved',
                  es: 'La rama de este diálogo se ha guardado',
                  'pt-BR': 'Esta ramificação do diálogo foi salva',
                  vi: 'Nhánh hội thoại này đã được lưu',
                  id: 'Cabang dialog ini disimpan',
                  tr: 'Bu diyalog dalı kaydedildi',
                  pl: 'Ta gałąź dialogu została zapisana',
                })}
              </Text>
            </Reanimated.View>
          )}

          {/* Советы «на будущее». */}
          {!locked && coachTips.length > 0 && (
            <Reanimated.View
              entering={enter(280)}
              style={{ backgroundColor: t.accentBg, borderRadius: 20, padding: 14, marginTop: 12 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <Ionicons name="bulb-outline" size={15} color={t.accentText} />
                <Text style={{ color: t.accentText, fontSize: f.label, fontWeight: '700', letterSpacing: 0.8 }}>
                  {triLang(lang, {
                    ru: 'На будущее',
                    uk: 'На майбутнє',
                    en: 'For next time',
                    es: 'Para la próxima',
                    'pt-BR': 'Para a próxima',
                    vi: 'Lần sau',
                    id: 'Untuk lain kali',
                    tr: 'Bir dahaki sefere',
                    pl: 'Na przyszłość',
                  })}
                </Text>
              </View>
              {coachTips.map((tip, ti) => (
                <Text
                  key={ti}
                  style={{
                    color: t.accentText,
                    fontSize: f.body,
                    lineHeight: Math.round(f.body * 1.42),
                    marginTop: ti === 0 ? 0 : 6,
                  }}
                  maxFontSizeMultiplier={1.2}
                >
                  • {tip}
                </Text>
              ))}
            </Reanimated.View>
          )}

          {/* Разбор фраз ученика: похвала, исправления, совет. */}
          {/* Разбор фраз ученика: оценка, каждая реплика, совет.
              зачем (владелец 2026-09-14): блок виден И для Free — сервер сам
              оставляет одну фразу и число скрытых, поэтому ценность разбора
              видна до покупки, а не спрятана за глухой плашкой. */}
          {(reviewStatus === 'loading' || (reviewStatus === 'ready' && review)) && (
            <Reanimated.View
              entering={enter(340)}
              style={{ backgroundColor: glassFill(t.bgCard, 0.46), borderRadius: 20, padding: 14, marginTop: 12 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <Ionicons name="school-outline" size={15} color={t.accentText} />
                <Text style={{ color: t.accentText, fontSize: f.label, fontWeight: '700', letterSpacing: 0.8 }} maxFontSizeMultiplier={1.2}>
                  {triLang(lang, {
                    ru: 'Разбор твоих фраз',
                    uk: 'Розбір твоїх висловів',
                    en: 'Breakdown of your phrases',
                    es: 'Análisis de tus frases',
                    'pt-BR': 'Análise das suas frases',
                    vi: 'Phân tích câu của bạn',
                    id: 'Ulasan kalimatmu',
                    tr: 'Cümlelerinin analizi',
                    pl: 'Analiza twoich zdań',
                  })}
                </Text>
              </View>
              {reviewStatus === 'loading' && !hasCompletionAssessment ? (
                <View>
                  <SkeletonBlock width={220} height={13} borderRadius={6} />
                  <View style={{ height: 8 }} />
                  <SkeletonBlock width={170} height={13} borderRadius={6} />
                </View>
              ) : (
                <View>
                  {hasCompletionAssessment ? (
                    <View style={{ backgroundColor: t.accentBg, borderRadius: 14, padding: 12, marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                        <Ionicons name="chatbubble-ellipses-outline" size={14} color={t.accentText} />
                        <Text style={{ color: t.accentText, fontSize: f.sub, fontWeight: '800' }} maxFontSizeMultiplier={1.2}>
                          {hasGeneratedPartnerAssessment
                            ? triLang(lang, {
                                ru: 'Итог от собеседника', uk: 'Підсумок від співрозмовника', en: 'Your partner’s takeaway', es: 'Conclusión de tu interlocutor',
                                'pt-BR': 'Resumo do seu interlocutor', vi: 'Nhận xét từ người trò chuyện cùng bạn', id: 'Kesimpulan dari lawan bicaramu',
                                tr: 'Sohbet arkadaşının özeti', pl: 'Podsumowanie rozmówcy',
                              })
                            : triLang(lang, {
                                ru: 'Итог переписки', uk: 'Підсумок листування', en: 'Conversation summary', es: 'Resumen de la conversación',
                                'pt-BR': 'Resumo da conversa', vi: 'Tóm tắt cuộc trò chuyện', id: 'Ringkasan percakapan',
                                tr: 'Yazışma özeti', pl: 'Podsumowanie rozmowy',
                              })}{hasGeneratedPartnerAssessment && personaName ? ` · ${personaName}` : ''}
                        </Text>
                      </View>
                      <Text
                        style={{ color: t.accentText, fontSize: f.body, lineHeight: Math.round(f.body * 1.42) }}
                        maxFontSizeMultiplier={1.2}
                      >
                        {completionAssessment}
                      </Text>
                    </View>
                  ) : null}
                  {reviewStatus === 'loading' && hasCompletionAssessment ? (
                    <Text
                      style={{ color: t.textMuted, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.4), marginBottom: 12 }}
                      maxFontSizeMultiplier={1.2}
                    >
                      {triLang(lang, {
                        ru: 'Готовим подробный разбор твоих фраз…',
                        uk: 'Готуємо докладний розбір твоїх висловів…',
                        en: 'Preparing a detailed breakdown of your messages…',
                        es: 'Estamos preparando un análisis detallado de tus mensajes…',
                        'pt-BR': 'Estamos preparando uma análise detalhada das suas mensagens…',
                        vi: 'Đang chuẩn bị phần phân tích chi tiết các tin nhắn của bạn…',
                        id: 'Sedang menyiapkan ulasan terperinci pesanmu…',
                        tr: 'Mesajlarının ayrıntılı incelemesini hazırlıyoruz…',
                        pl: 'Przygotowujemy szczegółową analizę Twoich wiadomości…',
                      })}
                    </Text>
                  ) : null}
                  {!!review?.praise && !review?.fallback && review.praise !== completionAssessment && (
                    <Text
                      style={{ color: t.accentText, fontSize: f.body, lineHeight: Math.round(f.body * 1.42) }}
                      maxFontSizeMultiplier={1.2}
                    >
                      {review.praise}
                    </Text>
                  )}
                  {reviewEvidence.length > 0 ? (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '800', marginBottom: 6 }} maxFontSizeMultiplier={1.2}>
                        {triLang(lang, {
                          ru: 'На чём основан итог', uk: 'На чому ґрунтується підсумок', en: 'What this is based on', es: 'En qué se basa',
                          'pt-BR': 'Em que isso se baseia', vi: 'Nhận xét này dựa trên', id: 'Dasar kesimpulan ini',
                          tr: 'Bu özetin dayanağı', pl: 'Na czym opiera się podsumowanie',
                        })}
                      </Text>
                      {reviewEvidence.map((item, index) => (
                        <View key={`${item.learnerTurn}:${index}`} style={{ marginTop: index === 0 ? 0 : 8 }}>
                          <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                            “{item.learnerTurn}”
                          </Text>
                          <Text
                            style={{ color: t.textMuted, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.4), marginTop: 2 }}
                            maxFontSizeMultiplier={1.2}
                          >
                            {item.note}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {completionObjectiveResults.length > 0 ? (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '800', marginBottom: 6 }} maxFontSizeMultiplier={1.2}>
                        {triLang(lang, {
                          ru: 'Итоги задач', uk: 'Підсумки завдань', en: 'Task results', es: 'Resultados de las tareas',
                          'pt-BR': 'Resultados das tarefas', vi: 'Kết quả nhiệm vụ', id: 'Hasil tugas',
                          tr: 'Görev sonuçları', pl: 'Wyniki zadań',
                        })}
                      </Text>
                      {completionObjectiveResults.map((result) => (
                        <View key={result.objectiveId} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 7 }}>
                          <Ionicons
                            name={result.status === 'met' ? 'checkmark-circle' : 'ellipse-outline'}
                            size={16}
                            color={result.status === 'met' ? t.correct : t.textMuted}
                            style={{ marginTop: 1 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                              {result.label}
                            </Text>
                            <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 1 }} maxFontSizeMultiplier={1.2}>
                              {result.status === 'met'
                                ? triLang(lang, {
                                    ru: 'Засчитано', uk: 'Зараховано', en: 'Completed', es: 'Completado', 'pt-BR': 'Concluído',
                                    vi: 'Đã hoàn thành', id: 'Selesai', tr: 'Tamamlandı', pl: 'Zaliczone',
                                  })
                                : triLang(lang, {
                                    ru: 'Можно потренировать ещё', uk: 'Можна потренувати ще', en: 'Worth practicing again', es: 'Vale la pena practicarlo de nuevo',
                                    'pt-BR': 'Vale praticar de novo', vi: 'Nên luyện thêm', id: 'Layak dilatih lagi', tr: 'Tekrar pratik yapmaya değer', pl: 'Warto przećwiczyć ponownie',
                                  })}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {/* Оценка диалога числом (владелец: «обязательно надо чтобы
                      оценка диалога была»). Показываем только когда сервер её
                      прислал — выдумывать число нельзя. */}
                  {typeof review?.score === 'number' && (
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: review?.praise ? 12 : 2 }}>
                      <Text
                        style={{ color: t.accentText, fontSize: f.numLg, fontWeight: '700', letterSpacing: -1 }}
                        maxFontSizeMultiplier={1.2}
                      >
                        {review.score}
                      </Text>
                      <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                        {triLang(lang, {
                          ru: 'из 100', uk: 'зі 100', en: 'out of 100', es: 'de 100', 'pt-BR': 'de 100',
                          vi: 'trên 100', id: 'dari 100', tr: '100 üzerinden', pl: 'na 100',
                        })}
                      </Text>
                    </View>
                  )}

                  {/* Разбор КАЖДОЙ реплики: верные тоже показываем — человек
                      видит, что сказал хорошо, а не только свои ошибки. */}
                  {(review?.phrases ?? []).length > 0 ? (
                    <View style={{ marginTop: 12 }}>
                      <DialogPhraseReview
                        lang={lang}
                        phrases={review?.phrases ?? []}
                        lockedCount={review?.lockedPhrases ?? 0}
                        onOpenPlus={onOpenPlus}
                        testID="dialog-phrase-review"
                      />
                    </View>
                  ) : reviewStatus === 'loading' && hasCompletionAssessment ? null
                    : reviewStatus !== 'loading' && completionFeedbackMode === 'review_unavailable' ? (
                    <Text
                      style={{ color: t.textMuted, fontSize: f.body, lineHeight: Math.round(f.body * 1.42), marginTop: 8 }}
                      maxFontSizeMultiplier={1.2}
                    >
                      {triLang(lang, {
                        ru: 'Подробный разбор сейчас недоступен. Не будем приписывать ошибки или успехи без проверки.',
                        uk: 'Детальний розбір зараз недоступний. Не будемо приписувати помилки чи успіхи без перевірки.',
                        en: 'A detailed review is unavailable right now. We will not claim mistakes or successes without checking.',
                        es: 'El análisis detallado no está disponible ahora. No atribuiremos errores ni aciertos sin comprobarlos.',
                        'pt-BR': 'A análise detalhada não está disponível agora. Não vamos atribuir erros ou acertos sem verificar.',
                        vi: 'Bản phân tích chi tiết hiện chưa có. Chúng tôi sẽ không khẳng định lỗi hay thành công khi chưa kiểm tra.',
                        id: 'Ulasan terperinci belum tersedia. Kami tidak akan mengklaim kesalahan atau keberhasilan tanpa memeriksa.',
                        tr: 'Ayrıntılı değerlendirme şu anda kullanılamıyor. Kontrol etmeden hata ya da başarı iddiasında bulunmayacağız.',
                        pl: 'Szczegółowa analiza jest teraz niedostępna. Nie będziemy przypisywać błędów ani sukcesów bez sprawdzenia.',
                      })}
                    </Text>
                  ) : completionFeedbackMode === 'needs_learner_turn' ? (
                    <Text
                      style={{ color: t.textMuted, fontSize: f.body, lineHeight: Math.round(f.body * 1.42), marginTop: 8 }}
                      maxFontSizeMultiplier={1.2}
                    >
                      {triLang(lang, {
                        ru: 'В переписке пока нет твоих реплик, поэтому оценивать язык ещё нечего.',
                        uk: 'У листуванні поки немає твоїх реплік, тому оцінювати мову ще нічого.',
                        en: 'There are no messages from you in this conversation yet, so there is no language to assess.',
                        es: 'Aún no hay mensajes tuyos en esta conversación, así que todavía no hay nada que evaluar.',
                        'pt-BR': 'Ainda não há mensagens suas nesta conversa, então ainda não há idioma para avaliar.',
                        vi: 'Cuộc trò chuyện này chưa có tin nhắn nào từ bạn, nên chưa có ngôn ngữ để đánh giá.',
                        id: 'Belum ada pesan darimu dalam percakapan ini, jadi belum ada bahasa yang bisa dinilai.',
                        tr: 'Bu konuşmada senden henüz mesaj yok; bu yüzden değerlendirilecek bir dil de yok.',
                        pl: 'W tej rozmowie nie ma jeszcze Twoich wiadomości, więc nie ma czego oceniać językowo.',
                      })}
                    </Text>
                  ) : (review?.corrections ?? []).length === 0 ? (
                    <Text
                      style={{ color: t.correct, fontSize: f.body, fontWeight: '700', marginTop: 8 }}
                      maxFontSizeMultiplier={1.2}
                    >
                      {triLang(lang, {
                        ru: 'Ошибок не нашлось — отличная работа!',
                        uk: 'Помилок не знайшлося — чудова робота!',
                        en: 'No mistakes found — great work!',
                        es: '¡Sin errores — buen trabajo!',
                        'pt-BR': 'Sem erros — ótimo trabalho!',
                        vi: 'Không có lỗi — làm tốt lắm!',
                        id: 'Tidak ada kesalahan — kerja bagus!',
                        tr: 'Hata yok — harika iş!',
                        pl: 'Bez błędów — świetna robota!',
                      })}
                    </Text>
                  ) : (
                    // Старый путь: сервер прислал только список ошибок (voice/
                    // фолбэк без phrases). Показываем его как раньше.
                    (review?.corrections ?? []).map((c, ci) => (
                      <View key={ci} style={{ marginTop: ci === 0 ? 8 : 12 }}>
                        <Text style={{ color: t.textMuted, fontSize: f.body }} maxFontSizeMultiplier={1.2}>
                          {c.original}
                        </Text>
                        <Text
                          style={{ color: t.correct, fontSize: f.body, fontWeight: '700', marginTop: 2 }}
                          maxFontSizeMultiplier={1.2}
                        >
                          → {c.corrected}
                        </Text>
                        {!!c.note && (
                          <Text
                            style={{
                              color: t.accentText,
                              fontSize: f.sub,
                              marginTop: 3,
                              lineHeight: Math.round(f.sub * 1.4),
                            }}
                            maxFontSizeMultiplier={1.2}
                          >
                            {c.note}
                          </Text>
                        )}
                      </View>
                    ))
                  )}
                  {!!review?.tip && (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 12 }}>
                      <Ionicons name="bulb-outline" size={14} color={t.accentText} style={{ marginTop: 2 }} />
                      <Text
                        style={{ color: t.accentText, fontSize: f.body, flex: 1, lineHeight: Math.round(f.body * 1.42) }}
                        maxFontSizeMultiplier={1.2}
                      >
                        {review.tip}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </Reanimated.View>
          )}

          {/* Free-ветка: что открывает Plus-разбор.
              зачем (владелец 2026-09-14): показываем ТОЛЬКО когда живого разбора
              нет (сбой или ещё не пришёл). Если сервер прислал первую фразу
              бесплатно, эта плашка была бы вторым, глухим обещанием того же —
              а ценность уже видна на живом примере. */}
          {locked && (review?.phrases ?? []).length === 0 && (
            <Reanimated.View
              entering={enter(280)}
              style={{ backgroundColor: glassFill(t.bgCard, 0.46), borderRadius: 20, padding: 14, marginTop: 12, overflow: 'hidden' }}
            >
              <LinearGradient
                pointerEvents="none"
                colors={[t.accent + '1F', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                <Ionicons name="school-outline" size={16} color={t.accentText} />
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', flex: 1 }}>
                  {triLang(lang, {
                    ru: 'AI-разбор ошибок — в Plus',
                    uk: 'AI-розбір помилок — у Plus',
                    en: 'AI mistake breakdown — in Plus',
                    es: 'Análisis de errores con IA — en Plus',
                    'pt-BR': 'Análise de erros com IA — no Plus',
                    vi: 'Phân tích lỗi bằng AI — trong Plus',
                    id: 'Analisis kesalahan AI — di Plus',
                    tr: 'AI hata analizi — Plus ile',
                    pl: 'Analiza błędów AI — w Plus',
                  })}
                </Text>
                <View style={{ borderRadius: 9, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: t.accent }}>
                  <Text style={{ color: t.textOnGold, fontSize: 13, fontWeight: '700' }}>PLUS</Text>
                </View>
              </View>
              {[
                triLang(lang, {
                  ru: 'где фраза звучала неестественно',
                  uk: 'де вислів звучав неприродно',
                  en: 'where a phrase sounded unnatural',
                  es: 'dónde la frase sonó poco natural',
                  'pt-BR': 'onde a frase soou pouco natural',
                  vi: 'chỗ câu nói chưa tự nhiên',
                  id: 'bagian frasa yang kurang alami',
                  tr: 'cümlenin nerede doğal durmadığı',
                  pl: 'gdzie zdanie brzmiało nienaturalnie',
                }),
                triLang(lang, {
                  ru: 'что исправить в следующей реплике',
                  uk: 'що виправити в наступній репліці',
                  en: 'what to fix in your next line',
                  es: 'qué corregir en la siguiente respuesta',
                  'pt-BR': 'o que corrigir na próxima fala',
                  vi: 'nên sửa gì ở lượt nói tiếp theo',
                  id: 'apa yang diperbaiki di balasan berikutnya',
                  tr: 'sonraki yanıtta neyi düzeltmek gerektiği',
                  pl: 'co poprawić w następnej odpowiedzi',
                }),
                triLang(lang, {
                  ru: 'как сказать это естественнее',
                  uk: 'як сказати це природніше',
                  en: 'how to say it more naturally',
                  es: 'cómo decirlo de forma más natural',
                  'pt-BR': 'como dizer isso de forma mais natural',
                  vi: 'cách nói tự nhiên hơn',
                  id: 'cara mengatakannya lebih alami',
                  tr: 'bunu daha doğal söyleme yolu',
                  pl: 'jak powiedzieć to naturalniej',
                }),
              ].map((line) => (
                <View key={line} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 }}>
                  <Ionicons name="sparkles-outline" size={14} color={t.textMuted} />
                  <Text style={{ color: t.accentText, fontSize: f.body, flex: 1 }} maxFontSizeMultiplier={1.2}>
                    {line}
                  </Text>
                </View>
              ))}
            </Reanimated.View>
          )}

          {feedbackSlot ? <View style={{ marginTop: 12 }}>{feedbackSlot}</View> : null}

          <View style={{ flex: 1 }} />

          {/* Действия. */}
          <Reanimated.View entering={enter(380)} style={{ marginTop: 22 }}>
            {locked ? (
              <TouchableOpacity
                onPress={onOpenPlus}
                activeOpacity={0.86}
                accessibilityRole="button"
                style={{
                  borderRadius: 18,
                  minHeight: 52,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: t.accent,
                }}
              >
                <Text style={{ color: t.textOnGold, fontWeight: '700', fontSize: f.bodyLg }}>
                  {triLang(lang, {
                    ru: 'Открыть Plus',
                    uk: 'Відкрити Plus',
                    en: 'Unlock Plus',
                    es: 'Abrir Plus',
                    'pt-BR': 'Abrir Plus',
                    vi: 'Mở Plus',
                    id: 'Buka Plus',
                    tr: 'Plus’ı aç',
                    pl: 'Otwórz Plus',
                  })}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onRetry}
                activeOpacity={0.86}
                accessibilityRole="button"
                style={{
                  borderRadius: 18,
                  minHeight: 52,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: t.accent,
                }}
              >
                <Text style={{ color: t.textOnGold, fontWeight: '700', fontSize: f.bodyLg }}>
                  {triLang(lang, {
                    ru: 'Ещё раз',
                    uk: 'Ще раз',
                    en: 'Again',
                    es: 'Otra vez',
                    'pt-BR': 'De novo',
                    vi: 'Lần nữa',
                    id: 'Sekali lagi',
                    tr: 'Tekrar',
                    pl: 'Jeszcze raz',
                  })}
                </Text>
                {/* зачем (PM-086, владелец 2026-09-24): ценник энергии над
                    кнопкой убран — расход энергии не меняется. */}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onExit}
              activeOpacity={0.86}
              accessibilityRole="button"
              style={{
                borderRadius: 18,
                minHeight: 52,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: glassFill(t.bgCard, 0.46),
                marginTop: 10,
              }}
            >
              <Text style={{ color: t.textPrimary, fontWeight: '700', fontSize: f.bodyLg }}>
                {triLang(lang, {
                  ru: 'К диалогам',
                  uk: 'До діалогів',
                  en: 'To dialogues',
                  es: 'A los diálogos',
                  'pt-BR': 'Aos diálogos',
                  vi: 'Về danh sách',
                  id: 'Ke daftar dialog',
                  tr: 'Diyaloglara',
                  pl: 'Do dialogów',
                })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onShowChat}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={showChatLabel}
              style={{ alignItems: 'center', paddingVertical: 14, marginTop: 2 }}
            >
              <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }}>{showChatLabel}</Text>
            </TouchableOpacity>
          </Reanimated.View>
        </ScrollView>
      </SafeAreaView>
    </Reanimated.View>
  );
}
