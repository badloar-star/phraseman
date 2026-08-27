/**
 * cards-2.0 (E5): единый экран результата сессии (§3.10 мастер-плана).
 * Встраиваемый компонент (НЕ роут): сессии рендерят его вместо своего done-блока.
 *
 * Показывает «верно / ошибок / точность» и XP (общая механика приложения).
 * CTA: «Добить: Ещё учу (N)» (второй раунд по ошибочным) + «Готово».
 */
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import ScreenGradient from '../../components/ScreenGradient';
import ContentWrap from '../../components/ContentWrap';
import XpGainBadge from '../../components/XpGainBadge';
import EnergyCostBadge from '../../components/EnergyCostBadge';
import FeedbackRatingCard from '../../components/FeedbackRatingCard';
import { triLang } from '../../constants/i18n';
import { shouldPromptFeedback, markFeedbackPrompted } from '../feedback_prompt_throttle';
import { fcHaptic, playSfx } from './SoundService';

// ── Экран результата ──────────────────────────────────────────────────────────

export type SessionResultScreenProps = {
  /** Верных ответов (по попыткам). */
  correct: number;
  /** Ошибок. */
  wrong: number;
  /** Начисленный XP (итог сессии). */
  xpGained: number;
  /**
   * Руны, заработанные в сессии (владелец, 2026-08-27). Опционален и не
   * влияет на существующие вызовы без него — только Блиц и Голосовая, у
   * которых есть копилка практики, передают это поле.
   */
  runesGained?: number;
  /** Сколько карточек «Ещё учу» — для CTA второго раунда. */
  learnLeft: number;
  /** Рестарт с ошибочными карточками; без него CTA «Добить» скрыт. */
  onRetryWrong?: () => void;
  onDone: () => void;
  /** Акцент экрана сессии (words #4A9EFF / phrases #40C080 / arena #E05050). */
  accentColor?: string;
  /** E10 (слушание): один показатель «прослушано» вместо верно/ошибок/точность. */
  listeningStats?: boolean;
  /** E12 (блиц): текст CTA повтора («Ещё разок!») — показывает кнопку даже при learnLeft=0. */
  retryLabel?: string;
  /** Повтор запускает новый оплачиваемый раунд. */
  retryShowsEnergyCost?: boolean;
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
  xpGained,
  runesGained = 0,
  learnLeft,
  onRetryWrong,
  onDone,
  accentColor,
  listeningStats = false,
  retryLabel,
  retryShowsEnergyCost = false,
  scoreText,
  feedback,
  testID = 'fc-session-result',
}: SessionResultScreenProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const accent = accentColor ?? t.accent;
  // Правило темы: на залитом t.accent — только t.correctText (не хардкодить белый);
  // сессии передают свои насыщенные цвета (#4A9EFF и т.п.) — там белый корректен.
  const ctaTextColor = accentColor ? '#fff' : t.correctText;

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
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <ScrollView decelerationRate="fast"
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets
            keyboardShouldPersistTaps="handled"
          >
          <View style={styles.container} testID={testID}>
            <View style={styles.centerBlock}>
              <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
                {triLang(lang, {
                  ru: 'Сессия завершена', uk: 'Сесію завершено', en: 'Session complete', es: 'Sesión terminada',
                  'pt-BR': 'Sessão concluída', vi: 'Đã hoàn thành buổi học', id: 'Sesi selesai', tr: 'Oturum tamamlandı', pl: 'Sesja zakończona',
                })}
              </Text>

              {/* E12 (блиц): итоговый счёт очков */}
              {scoreText ? (
                <View
                  testID={`${testID}-score`}
                  style={[styles.scorePill, { backgroundColor: `${accent}1A`, borderColor: `${accent}66` }]}
                >
                  <Text style={{ color: accent, fontSize: f.body, fontWeight: '900', letterSpacing: 0.4 }}>
                    {scoreText}
                  </Text>
                </View>
              ) : null}

              {/* Счёт (E10: у слушания — один показатель «прослушано») */}
              <View style={[styles.statsCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                {listeningStats ? (
                  <View style={styles.stat}>
                    <Text style={{ color: accent, fontSize: f.numLg, fontWeight: '900' }}>{correct}</Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>
                      {triLang(lang, {
                        ru: 'карточек прослушано', uk: 'карток прослухано', en: 'cards listened to', es: 'tarjetas escuchadas',
                        'pt-BR': 'cartões ouvidos', vi: 'thẻ đã nghe', id: 'kartu didengarkan', tr: 'dinlenen kart', pl: 'kart odsłuchanych',
                      })}
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.stat}>
                      <Text style={{ color: t.correct, fontSize: f.numLg, fontWeight: '900' }}>{correct}</Text>
                      <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>
                        {triLang(lang, {
                          ru: 'верно', uk: 'вірно', en: 'correct', es: 'correcto',
                          'pt-BR': 'correto', vi: 'đúng', id: 'benar', tr: 'doğru', pl: 'poprawnie',
                        })}
                      </Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: t.border }]} />
                    <View style={styles.stat}>
                      <Text style={{ color: t.wrong, fontSize: f.numLg, fontWeight: '900' }}>{wrong}</Text>
                      <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>
                        {triLang(lang, {
                          ru: 'ошибок', uk: 'помилок', en: 'mistakes', es: 'errores',
                          'pt-BR': 'erros', vi: 'lỗi', id: 'kesalahan', tr: 'hata', pl: 'błędów',
                        })}
                      </Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: t.border }]} />
                    <View style={styles.stat}>
                      <Text style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '900' }}>{accuracyPct}%</Text>
                      <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>
                        {triLang(lang, {
                          ru: 'точность', uk: 'точність', en: 'accuracy', es: 'precisión',
                          'pt-BR': 'precisão', vi: 'độ chính xác', id: 'akurasi', tr: 'doğruluk', pl: 'dokładność',
                        })}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* XP */}
              {xpGained > 0 ? (
                <View style={{ marginTop: 18, alignItems: 'center' }}>
                  <XpGainBadge amount={xpGained} visible />
                </View>
              ) : null}

              {/* Руны (владелец, 2026-08-27): Блиц и Голосовая раньше не
                  начисляли ничего на этом экране — место пустовало. */}
              {runesGained > 0 ? (
                <View style={{
                  marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 8,
                  backgroundColor: t.bgCard, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
                }}>
                  {/* guard-ok: декоративный ассет, смысл несёт число рядом */}
                  <Image
                    source={require('../../assets/images/level-spin-rewards/stars_10.webp')}
                    style={{ width: 20, height: 20 }}
                    contentFit="contain"
                    accessible={false}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
                    +{runesGained}
                  </Text>
                </View>
              ) : null}

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
                  />
                </View>
              ) : null}
            </View>

            {/* CTA */}
            <View style={styles.ctaBlock}>
              {onRetryWrong && (learnLeft > 0 || retryLabel) ? (
                <View style={styles.retryWrap}>
                  <TouchableOpacity
                    onPress={() => {
                      fcHaptic('tap');
                      onRetryWrong();
                    }}
                    testID={`${testID}-retry`}
                    style={[styles.retryBtn, { borderColor: accent, backgroundColor: `${accent}14` }]}
                  >
                    <Ionicons name="refresh" size={18} color={accent} />
                    <Text style={{ color: accent, fontSize: f.body, fontWeight: '800' }}>
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
                  </TouchableOpacity>
                  {retryShowsEnergyCost ? <EnergyCostBadge testID={`${testID}-retry-energy-cost`} /> : null}
                </View>
              ) : null}
              <TouchableOpacity
                onPress={() => {
                  fcHaptic('tap');
                  onDone();
                }}
                testID={`${testID}-done`}
                style={[styles.doneBtn, { backgroundColor: accent }]}
              >
                <Text style={{ color: ctaTextColor, fontSize: f.body, fontWeight: '800' }}>
                  {triLang(lang, {
                    ru: 'Готово', uk: 'Готово', en: 'Done', es: 'Listo',
                    'pt-BR': 'Pronto', vi: 'Xong', id: 'Selesai', tr: 'Tamam', pl: 'Gotowe',
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 },
  centerBlock: { flexGrow: 1, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '800', textAlign: 'center', marginBottom: 18 },
  scorePill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 12,
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    width: '100%',
    marginTop: 14,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  statDivider: { width: StyleSheet.hairlineWidth },
  ctaBlock: { gap: 10 },
  retryWrap: { position: 'relative', overflow: 'visible' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
  },
  doneBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
});

const SessionResultScreen = React.memo(SessionResultScreenImpl);
export { SessionResultScreen };
export default SessionResultScreen;
