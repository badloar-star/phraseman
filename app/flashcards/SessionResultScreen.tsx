/**
 * cards-2.0 (E5): единый экран результата сессии (§3.10 мастер-плана).
 * Встраиваемый компонент (НЕ роут): сессии рендерят его вместо своего done-блока.
 *
 * Показывает «верно / ошибок / точность».
 * CTA: «Добить: Ещё учу (N)» (второй раунд по ошибочным) + «Готово».
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { FONT_SCALE, useTheme } from '../../components/ThemeContext';
import { themeUiAsset } from '../theme_ui_assets';
import { useLang } from '../../components/LangContext';
import ScreenGradient from '../../components/ScreenGradient';
import ContentWrap from '../../components/ContentWrap';
import PressableHybrid from '../../components/PressableHybrid';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { AnimatedCountUpText } from '../../components/AnimatedCountUpText';
import FeedbackRatingCard from '../../components/FeedbackRatingCard';
import { triLang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useScreen } from '../../hooks/use-screen';
import { shouldPromptFeedback, markFeedbackPrompted } from '../feedback_prompt_throttle';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { fcHaptic, playSfx } from './SoundService';
import { LearningV2RuneFlight } from '../../components/LearningV2RuneFlight';
import { usePracticeRuneFlight } from '../../hooks/usePracticeRuneFlight';

// ── Экран результата ──────────────────────────────────────────────────────────

type ResultGlassTokens = ReturnType<typeof liquidGlassTokens>;

function ResultSurfaceSheen({ glass, testID }: Readonly<{ glass: ResultGlassTokens; testID: string }>) {
  return (
    <LinearGradient
      pointerEvents="none"
      testID={testID}
      colors={[glass.lightTint, 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[StyleSheet.absoluteFill, styles.surfaceSheen]}
    />
  );
}

function shouldStackResultStats(availableWidth: number, nativeFontScale: number, preferenceScale: number): boolean {
  const layoutScale = Math.max(1, nativeFontScale * preferenceScale);
  return availableWidth < 312 * layoutScale;
}

function ResultRuneAward({ amount, testID }: Readonly<{ amount: number; testID: string }>) {
  const { theme: t, themeMode, fontSize, uiScale } = useTheme();
  const { lang } = useLang();
  const runeFlight = usePracticeRuneFlight();
  const [originReady, setOriginReady] = useState(false);
  const [targetReady, setTargetReady] = useState(false);
  const playedRef = useRef(false);
  const textScale = (FONT_SCALE[fontSize] / FONT_SCALE.medium) * uiScale;

  useEffect(() => {
    if (amount <= 0 || !originReady || !targetReady || playedRef.current) return undefined;
    playedRef.current = true;
    const frame = requestAnimationFrame(() => runeFlight.fly(amount));
    return () => cancelAnimationFrame(frame);
  }, [amount, originReady, runeFlight, targetReady]);

  return (
    <>
      <View
        ref={runeFlight.counterRef}
        collapsable={false}
        onLayout={() => setTargetReady(true)}
        testID={`${testID}-runes`}
        accessible
        accessibilityLabel={triLang(lang, {
          ru: `Начислено рун: ${amount}`, uk: `Нараховано рун: ${amount}`, en: `Runes earned: ${amount}`,
          es: `Runas ganadas: ${amount}`, 'pt-BR': `Runas ganhas: ${amount}`, vi: `Rune nhận được: ${amount}`,
          id: `Rune diperoleh: ${amount}`, tr: `Kazanılan rün: ${amount}`, pl: `Zdobyte runy: ${amount}`,
        })}
        style={styles.runeAward}
      >
        <Image
          source={themeUiAsset(themeMode, 'rune')}
          style={styles.runeAsset}
          contentFit="contain"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text accessible={false} style={{ color: t.textPrimary, fontSize: 34 * textScale, lineHeight: 40 * textScale, fontWeight: '700' }}>+</Text>
        <AnimatedCountUpText
          value={amount}
          style={{ color: t.textPrimary, fontSize: 34 * textScale, lineHeight: 40 * textScale, fontWeight: '700', minWidth: 24 }}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        />
      </View>
      <View
        ref={runeFlight.originRef}
        collapsable={false}
        onLayout={() => setOriginReady(true)}
        pointerEvents="none"
        style={styles.rewardFlightOrigin}
      />
      {runeFlight.flight ? (
        <LearningV2RuneFlight
          key={runeFlight.flight.key}
          from={runeFlight.flight.from}
          to={runeFlight.flight.to}
          count={runeFlight.flight.count}
          onDone={runeFlight.clearFlight}
        />
      ) : null}
    </>
  );
}

export type SessionResultScreenProps = {
  /** Верных ответов (по попыткам). */
  correct: number;
  /** Ошибок. */
  wrong: number;
  /**
   * Руны, заработанные в сессии (владелец, 2026-08-27). Опционален и не
   * влияет на существующие вызовы без него; все активные режимы карточек
   * передают сюда итог своей копилки практики.
   */
  runesGained?: number;
  /** Сколько карточек «Ещё учу» — для CTA второго раунда. */
  learnLeft: number;
  /** Рестарт с ошибочными карточками; без него CTA «Добить» скрыт. */
  onRetryWrong?: () => void;
  onDone: () => void;
  /** Акцент экрана сессии (words #4A9EFF / phrases #40C080 / arena #E05050). */
  accentColor?: string;
  /** E12 (блиц): текст CTA повтора («Ещё разок!») — показывает кнопку даже при learnLeft=0. */
  retryLabel?: string;
  // зачем (PM-086, владелец 2026-09-24): retryShowsEnergyCost удалён — жил
  // только ради ценника энергии над кнопкой повтора, JSX-вывод которого
  // уже был убран раньше нас; проп остался неиспользуемым мёртвым кодом.
  /** E12 (блиц): пилюля счёта очков под заголовком («Счёт: 1250»). */
  scoreText?: string;
  /**
   * Владелец 2026-08-25: блок оценки звёздами + текст, тот же что на экране
   * MAX. Опционален и без него ничего не меняется — только сессии, которые
   * явно передали entityId, получают карточку (троттлинг раз в неделю на
   * раздел живёт внутри, через shouldPromptFeedback).
   */
  feedback?: {
    entityId: string;
    entityLabel?: string | null;
  };
  testID?: string;
};

function SessionResultScreenImpl({
  correct,
  wrong,
  runesGained = 0,
  learnLeft,
  onRetryWrong,
  onDone,
  accentColor,
  retryLabel,
  scoreText,
  feedback,
  testID = 'fc-session-result',
}: SessionResultScreenProps) {
  const { theme: t, liquidGlassThemeId, fontSize, uiScale } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const { width, fontScale: nativeFontScale } = useWindowDimensions();
  const { contentMaxW } = useScreen();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const textScale = (FONT_SCALE[fontSize] / FONT_SCALE.medium) * uiScale;
  const safeWindowWidth = Math.max(0, width - insets.left - insets.right);
  const availableStatsWidth = Math.max(0, Math.min(contentMaxW, safeWindowWidth) - 40);
  const stackStats = shouldStackResultStats(availableStatsWidth, nativeFontScale, textScale);
  const accent = accentColor ?? t.accent;

  const total = correct + wrong;
  const accuracyPct = total > 0 ? Math.round((correct / total) * 100) : 0;

  // SFX/хаптика финала сессии (§5, E9).
  useEffect(() => {
    playSfx('session_complete');
    fcHaptic('finish');
  }, []);

  // Троттлинг: не чаще раза в неделю на раздел (владелец 2026-08-25) — гейт
  // решается один раз при монтировании экрана результата, не на каждый рендер.
  const [showFeedback, setShowFeedback] = useState(false);
  useEffect(() => {
    if (!feedback) return;
    let cancelled = false;
    void shouldPromptFeedback('vocab').then((allowed) => {
      if (cancelled || !allowed) return;
      setShowFeedback(true);
      void markFeedbackPrompted('vocab');
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback?.entityId]);

  return (
    <ScreenGradient>
      <View
        testID={`${testID}-safe-frame`}
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingRight: insets.right,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
        }}
      >
        <ContentWrap>
          <ScrollView decelerationRate="fast"
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets
            keyboardShouldPersistTaps="handled"
          >
          <View style={styles.container} testID={testID}>
            <PressableHybrid
              accessibilityLabel={triLang(lang, {
                ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar',
                vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
              })}
              testID={`${testID}-close`}
              variant="icon"
              withHaptic={false}
              withSound={false}
              onPress={() => {
                fcHaptic('tap');
                onDone();
              }}
              style={styles.closeTarget}
              contentStyle={[
                styles.closeVisual,
                { backgroundColor: glass.opaqueControl, borderColor: glass.glassEdge },
              ]}
            >
              <Ionicons name="close" size={20} color={t.textPrimary} />
            </PressableHybrid>
            <View style={styles.centerBlock}>
              <Text
                testID={`${testID}-title`}
                style={[
                  styles.title,
                  { color: t.textPrimary, fontSize: 30 * textScale, lineHeight: 36 * textScale },
                ]}
              >
                {triLang(lang, {
                  ru: 'Тренировка завершена', uk: 'Тренування завершено', en: 'Practice complete', es: 'Práctica terminada',
                  'pt-BR': 'Prática concluída', vi: 'Đã hoàn thành luyện tập', id: 'Latihan selesai', tr: 'Alıştırma tamamlandı', pl: 'Ćwiczenie ukończone',
                })}
              </Text>

              {/* E12 (блиц): итоговый счёт очков */}
              {scoreText ? (
                <View
                  testID={`${testID}-score`}
                  style={[styles.scorePill, { backgroundColor: `${accent}1A`, borderColor: `${accent}66` }]}
                >
                  <Text style={{ color: accent, fontSize: 15 * textScale, lineHeight: 20 * textScale, fontWeight: '700', letterSpacing: 0.4, textAlign: 'center' }}>
                    {scoreText}
                  </Text>
                </View>
              ) : null}

              {/* Единый счёт для всех активных режимов карточек. */}
              <View
                testID={`${testID}-stats`}
                style={[
                  styles.statsCard,
                  stackStats && styles.statsCardStacked,
                  { backgroundColor: glass.opaqueCard, borderColor: glass.glassEdge },
                ]}
              >
                <ResultSurfaceSheen glass={glass} testID={`${testID}-stats-sheen`} />
                <>
                  <View
                    accessible
                    accessibilityLabel={`${correct} ${triLang(lang, { ru: 'верно', uk: 'вірно', en: 'correct', es: 'correcto', 'pt-BR': 'correto', vi: 'đúng', id: 'benar', tr: 'doğru', pl: 'poprawnie' })}`}
                    style={[styles.stat, stackStats && styles.statStacked]}
                  >
                    <AnimatedCountUpText
                      value={correct}
                      style={{ color: t.correct, fontSize: 30 * textScale, lineHeight: 34 * textScale, fontWeight: '700', textAlign: 'center' }}
                      accessible={false}
                      importantForAccessibility="no-hide-descendants"
                    />
                    <Text style={{ color: t.textMuted, fontSize: 13 * textScale, lineHeight: 18 * textScale, fontWeight: '700', textAlign: 'center' }}>
                      {triLang(lang, {
                        ru: 'верно', uk: 'вірно', en: 'correct', es: 'correcto',
                        'pt-BR': 'correto', vi: 'đúng', id: 'benar', tr: 'doğru', pl: 'poprawnie',
                      })}
                    </Text>
                  </View>
                  <View style={[styles.statDivider, stackStats && styles.statDividerStacked, { backgroundColor: glass.glassEdge }]} />
                  <View
                    accessible
                    accessibilityLabel={`${wrong} ${triLang(lang, { ru: 'ошибок', uk: 'помилок', en: 'mistakes', es: 'errores', 'pt-BR': 'erros', vi: 'lỗi', id: 'kesalahan', tr: 'hata', pl: 'błędów' })}`}
                    style={[styles.stat, stackStats && styles.statStacked]}
                  >
                    <AnimatedCountUpText
                      value={wrong}
                      style={{ color: t.wrong, fontSize: 30 * textScale, lineHeight: 34 * textScale, fontWeight: '700', textAlign: 'center' }}
                      accessible={false}
                      importantForAccessibility="no-hide-descendants"
                    />
                    <Text style={{ color: t.textMuted, fontSize: 13 * textScale, lineHeight: 18 * textScale, fontWeight: '700', textAlign: 'center' }}>
                      {triLang(lang, {
                        ru: 'ошибок', uk: 'помилок', en: 'mistakes', es: 'errores',
                        'pt-BR': 'erros', vi: 'lỗi', id: 'kesalahan', tr: 'hata', pl: 'błędów',
                      })}
                    </Text>
                  </View>
                  <View style={[styles.statDivider, stackStats && styles.statDividerStacked, { backgroundColor: glass.glassEdge }]} />
                  <View
                    accessible
                    accessibilityLabel={`${accuracyPct}% ${triLang(lang, { ru: 'точность', uk: 'точність', en: 'accuracy', es: 'precisión', 'pt-BR': 'precisão', vi: 'độ chính xác', id: 'akurasi', tr: 'doğruluk', pl: 'dokładność' })}`}
                    style={[styles.stat, stackStats && styles.statStacked]}
                  >
                    <View accessible={false} style={{ flexDirection: 'row', alignItems: 'baseline', flexShrink: 1 }}>
                      <AnimatedCountUpText
                        value={accuracyPct}
                        style={{ color: t.textPrimary, fontSize: 30 * textScale, lineHeight: 34 * textScale, fontWeight: '700', textAlign: 'center' }}
                        accessible={false}
                        importantForAccessibility="no-hide-descendants"
                      />
                      <Text accessible={false} style={{ color: t.textPrimary, fontSize: 30 * textScale, lineHeight: 34 * textScale, fontWeight: '700' }}>%</Text>
                    </View>
                    <Text style={{ color: t.textMuted, fontSize: 13 * textScale, lineHeight: 18 * textScale, fontWeight: '700', textAlign: 'center' }}>
                      {triLang(lang, {
                        ru: 'точность', uk: 'точність', en: 'accuracy', es: 'precisión',
                        'pt-BR': 'precisão', vi: 'độ chính xác', id: 'akurasi', tr: 'doğruluk', pl: 'dokładność',
                      })}
                    </Text>
                  </View>
                </>
              </View>

              {/* Руны: единое итоговое начисление для активных режимов карточек. */}
              {runesGained > 0 ? <ResultRuneAward amount={runesGained} testID={testID} /> : null}

              {/* Оценка сессии (владелец 2026-08-25): статичный блок под
                  остальным содержимым экрана, ничего не блокирует. */}
              {feedback && showFeedback ? (
                <View style={{ marginTop: 18, width: '100%' }}>
                  <FeedbackRatingCard
                    kind="vocab"
                    entityId={feedback.entityId}
                    entityLabel={feedback.entityLabel}
                    lang={lang}
                    title={triLang(lang, { ru: 'Слова того стоили?', en: 'Were these words worth it?', uk: 'Слова були варті того?', es: '¿Valieron la pena estas palabras?',
                      'pt-BR': 'As palavras valeram a pena?', vi: 'Những từ này có đáng học không?',
                      id: 'Kata-katanya sepadan?', tr: 'Bu kelimeler değdi mi?', pl: 'Czy te słowa były warte?',
                    })}
                    placeholder={triLang(lang, { ru: 'Каких слов не хватило? Какие лишние?', en: 'Which words were missing? Which were pointless?', uk: 'Яких слів забракло? Які зайві?', es: '¿Qué palabras faltaron? ¿Cuáles sobraban?',
                      'pt-BR': 'Que palavras faltaram? Quais sobraram?', vi: 'Thiếu những từ nào? Từ nào thừa?',
                      id: 'Kata apa yang kurang? Mana yang tak perlu?', tr: 'Hangi kelimeler eksikti? Hangileri gereksiz?', pl: 'Jakich słów zabrakło? Które zbędne?',
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
                    testID={`${testID}-feedback`}
                    presentation="liquid-glass-rate"
                  />
                </View>
              ) : null}
            </View>

            {/* CTA */}
            <View style={styles.ctaBlock}>
              <PressableHybrid
                accessibilityRole="button"
                variant="primary"
                withHaptic={false}
                withSound={false}
                onPress={() => {
                  fcHaptic('tap');
                  onDone();
                }}
                testID={`${testID}-done`}
                style={styles.actionTarget}
                contentStyle={[styles.doneBtn, { backgroundColor: glass.accent }]}
              >
                <Text style={{ color: glass.accentInk, fontSize: 17 * textScale, lineHeight: 22 * textScale, fontWeight: '700', textAlign: 'center', flexShrink: 1 }}>
                  {triLang(lang, {
                    ru: 'Готово', uk: 'Готово', en: 'Done', es: 'Listo',
                    'pt-BR': 'Pronto', vi: 'Xong', id: 'Selesai', tr: 'Tamam', pl: 'Gotowe',
                  })}
                </Text>
              </PressableHybrid>
              {onRetryWrong && (learnLeft > 0 || retryLabel) ? (
                <View style={styles.retryWrap}>
                  <PressableHybrid
                    accessibilityRole="button"
                    variant="secondary"
                    withHaptic={false}
                    withSound={false}
                    onPress={() => {
                      fcHaptic('tap');
                      onRetryWrong();
                    }}
                    testID={`${testID}-retry`}
                    style={styles.actionTarget}
                    contentStyle={styles.retryBtn}
                  >
                    <Ionicons name="refresh" size={18} color={accent} />
                    <Text style={{ color: accent, fontSize: 16 * textScale, lineHeight: 22 * textScale, fontWeight: '700', textAlign: 'center', flexShrink: 1 }}>
                      {retryLabel ??
                        triLang(lang, {
                          ru: `Добить: Ещё учу (${learnLeft})`,
                          uk: `Добити: Ще вчу (${learnLeft})`,
                          en: `Finish: Still learning (${learnLeft})`,
                          es: `Rematar: Aprendiendo (${learnLeft})`,
                          'pt-BR': `Terminar: Ainda aprendendo (${learnLeft})`,
                          vi: `Hoàn thành: Đang học (${learnLeft})`,
                          id: `Selesaikan: Masih belajar (${learnLeft})`,
                          tr: `Bitir: Hâlâ öğreniyorum (${learnLeft})`,
                          pl: `Dokończ: Jeszcze się uczę (${learnLeft})`,
                        })}
                    </Text>
                  </PressableHybrid>
                </View>
              ) : null}
            </View>
          </View>
          </ScrollView>
        </ContentWrap>
      </View>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 20 },
  closeTarget: { width: 48, height: 48, justifyContent: 'flex-end', alignSelf: 'flex-start' },
  closeVisual: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBlock: { alignItems: 'center' },
  title: { width: '100%', minWidth: 0, flexShrink: 1, fontWeight: '700', textAlign: 'center', marginTop: 18 },
  scorePill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 12,
  },
  runeAward: {
    marginTop: 12,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 12,
  },
  runeAsset: { width: 44, height: 44 },
  rewardFlightOrigin: {
    position: 'absolute',
    left: '50%',
    bottom: 4,
    width: 18,
    height: 18,
    marginLeft: -9,
    opacity: 0,
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
    marginTop: 20,
  },
  statsCardStacked: { flexDirection: 'column' },
  surfaceSheen: { opacity: 0.08 },
  stat: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, paddingHorizontal: 4, gap: 4 },
  statStacked: { flex: 0, width: '100%' },
  statDivider: { width: StyleSheet.hairlineWidth },
  statDividerStacked: { width: '100%', height: StyleSheet.hairlineWidth },
  ctaBlock: { gap: 14, marginTop: 16 },
  actionTarget: { minWidth: 0 },
  retryWrap: { position: 'relative', overflow: 'visible' },
  retryBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  doneBtn: {
    minHeight: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
});

const SessionResultScreen = React.memo(SessionResultScreenImpl);
export { SessionResultScreen };
export default SessionResultScreen;
