import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useMemo } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from '../../components/SafeLinearGradient';
import BonusXPCard from '../../components/BonusXPCard';
import ContentWrap from '../../components/ContentWrap';
import LevelBadge from '../../components/LevelBadge';
import ScreenGradient from '../../components/ScreenGradient';
import { useLang, RU } from '../../components/LangContext';
import { REPORT_SCREENS_RUSSIAN_ONLY } from '../../constants/report_ui_ru';
import { triLang } from '../../constants/i18n';
import { useTheme } from '../../components/ThemeContext';
import { getXPProgress, screenTextOnGradient } from '../../constants/theme';
import type { QuizPhrase } from '../quiz_data';
import { getQuizRankInfo, getQuizShareRank } from './results';
import { XpCounter } from './ui';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../../constants/goldTheme';
import GoldBevel from '../../components/GoldBevel';
import { getQuizCompletionMedalSource } from './medal_assets';
import { monoIcon } from '../../constants/monoIcon';
import BouncyScrollView from '../../components/BouncyScrollView';
import ProgressProofBlock from '../../components/feedback/ProgressProofBlock';
import { buildProgressCompletionModel } from '../completion/progress_completion_model';

type Props = {
  phrases: QuizPhrase[];
  results: boolean[];
  score: number;
  bonusXP: number;
  totalXP: number;
  accentColor: string;
  xpFlyY: Animated.Value;
  xpFlyOpacity: Animated.Value;
  xpBarAnim: Animated.Value;
  xpCountAnim: Animated.Value;
  showBonus: boolean;
  onDismissBonus: () => void;
  onReviewMistakes: (wrongPhrases: QuizPhrase[]) => void;
  onRestart: () => void;
  onBack: () => void;
  onShare: (right: number, total: number, pct: number, rankIcon: string) => void;
  onHome: () => void;
};

export default function QuizResultView({
  phrases,
  results,
  score,
  bonusXP,
  totalXP,
  accentColor,
  xpFlyY,
  xpFlyOpacity,
  xpBarAnim,
  xpCountAnim,
  showBonus,
  onDismissBonus,
  onReviewMistakes,
  onRestart,
  onBack,
  onShare,
  onHome,
}: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const isGoldTheme = themeMode === 'gold';
  const { s, lang } = useLang();
  const sQuiz = REPORT_SCREENS_RUSSIAN_ONLY ? RU : s;
  const effectiveLang = REPORT_SCREENS_RUSSIAN_ONLY ? 'ru' : lang;
  const shareLang = REPORT_SCREENS_RUSSIAN_ONLY
    ? 'ru'
    : lang === 'uk'
      ? 'uk'
      : lang === 'es'
        ? 'es'
        : 'ru';
  const total = phrases.length;
  const right = results.filter(Boolean).length;
  const pct = Math.round((right / Math.max(1, total)) * 100);
  const rankInfo = getQuizRankInfo(pct, t.textSecond, t.textMuted);
  const completionMedalSource = useMemo(() => getQuizCompletionMedalSource(themeMode), [themeMode]);
  const rankLabel = triLang(effectiveLang, {
    ru: rankInfo.labelRU,
    uk: rankInfo.labelUK,
    es: rankInfo.labelES,
    'pt-BR': rankInfo.labelPtBr,
    vi: rankInfo.labelVi,
    id: rankInfo.labelId,
    tr: rankInfo.labelTr,
    pl: rankInfo.labelPl,
  });
  const wrongPhrases = phrases.filter((_, i) => !results[i]);
  const { level: lv, xpNeeded } = getXPProgress(totalXP + score);
  const completionModel = buildProgressCompletionModel({
    fact: `${right} / ${total} · ${pct}%`,
    accumulated: rankLabel,
    nextStep: wrongPhrases.length > 0
      ? triLang(effectiveLang, { ru: `${wrongPhrases.length} фраз ждут закрепления`, uk: `${wrongPhrases.length} фраз чекають закріплення`, es: `${wrongPhrases.length} frases esperan repaso`, 'pt-BR': `${wrongPhrases.length} frases aguardam revisão`, vi: `${wrongPhrases.length} cụm từ cần ôn lại`, id: `${wrongPhrases.length} frasa menunggu ulasan`, tr: `${wrongPhrases.length} ifade tekrar bekliyor`, pl: `${wrongPhrases.length} zwrotów czeka na powtórkę` })
      : triLang(effectiveLang, { ru: 'Все ответы подтверждены', uk: 'Усі відповіді підтверджено', es: 'Todas las respuestas confirmadas', 'pt-BR': 'Todas as respostas confirmadas', vi: 'Tất cả câu trả lời đã được xác nhận', id: 'Semua jawaban telah dikonfirmasi', tr: 'Tüm yanıtlar doğrulandı', pl: 'Wszystkie odpowiedzi potwierdzone' }),
    primaryAction: { id: wrongPhrases.length ? 'review' : 'back', label: triLang(effectiveLang, { ru: wrongPhrases.length ? 'Закрепить фразы' : 'Вернуться', uk: wrongPhrases.length ? 'Закріпити фрази' : 'Повернутися', es: wrongPhrases.length ? 'Repasar frases' : 'Volver', 'pt-BR': wrongPhrases.length ? 'Revisar frases' : 'Voltar', vi: wrongPhrases.length ? 'Ôn lại cụm từ' : 'Quay lại', id: wrongPhrases.length ? 'Tinjau frasa' : 'Kembali', tr: wrongPhrases.length ? 'İfadeleri pekiştir' : 'Geri dön', pl: wrongPhrases.length ? 'Utrwal zwroty' : 'Wróć' }) },
    confirmed: { perfect: pct === 100 },
  });

  return (
    <ScreenGradient artBackdrop="quizzes">
      <View style={{ flex: 1 }}>
        <ContentWrap>
          <BouncyScrollView decelerationRate="normal" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }} showsVerticalScrollIndicator={false}>
            <Image
              source={completionMedalSource}
              contentFit="contain"
              transition={0}
              accessibilityIgnoresInvertColors
              style={{ width: 118, height: 118, marginBottom: 10 }}
            />
            <LinearGradient
              colors={isGoldTheme ? GOLD_GRADIENTS.raisedTile : [`${rankInfo.color}22`, `${rankInfo.color}22`, `${rankInfo.color}22`]}
              locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ backgroundColor: `${rankInfo.color}22`, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 8, borderWidth: 0, borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : `${rankInfo.color}55`, marginBottom: 16, overflow: 'hidden' }}
            >
              {isGoldTheme && <GoldBevel radius={12} intensity="normal" />}
              <Text style={{ color: isGoldTheme ? GOLD_RICH.champagne : rankInfo.color, fontSize: f.h2, fontWeight: '800', letterSpacing: 0.5 }}>{rankLabel}</Text>
            </LinearGradient>
            <ProgressProofBlock model={completionModel} testID="quiz-progress-proof" />
            <Animated.Text style={{ color: t.correct, fontSize: f.h2, fontWeight: '600', marginBottom: bonusXP > 0 ? 4 : 16, transform: [{ translateY: xpFlyY }], opacity: xpFlyOpacity }}>
              +{Math.round(score)}{' '}
              {triLang(effectiveLang, {
                ru: 'опыта',
                uk: 'досвіду',
                es: 'XP',
                'pt-BR': 'XP',
                vi: 'XP',
                id: 'XP',
                tr: 'XP',
                pl: 'XP',
              })}
            </Animated.Text>
            {bonusXP > 0 && (
              <Text style={{ color: monoIcon(themeMode, '#D4A017'), fontSize: f.body, fontWeight: '600', marginBottom: 16 }}>
                +{Math.round(bonusXP)}{' '}
                {triLang(effectiveLang, {
                  ru: 'бонусного опыта',
                  uk: 'бонусного досвіду',
                  es: 'XP de bonificación',
                  'pt-BR': 'XP bônus',
                  vi: 'XP thưởng',
                  id: 'XP bonus',
                  tr: 'bonus XP',
                  pl: 'bonusowego XP',
                })}{' '}
                🎁
              </Text>
            )}

            <LinearGradient
              colors={isGoldTheme ? GOLD_GRADIENTS.premiumPanel : [t.bgCard, t.bgCard, t.bgCard]}
              locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[{ backgroundColor: t.bgCard, borderRadius: 14, borderWidth: 0, borderColor: isGoldTheme ? GOLD_RICH.hairline : t.border, padding: 14, width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28, overflow: 'hidden' }, isGoldTheme ? goldShadow(2) : null]}
            >
              {isGoldTheme && <GoldBevel radius={14} intensity="normal" />}
              <LevelBadge level={lv} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                  {triLang(effectiveLang, {
                    ru: `Уровень ${lv}`,
                    uk: `Рівень ${lv}`,
                    es: `Nivel ${lv}`,
                    'pt-BR': `Nível ${lv}`,
                    vi: `Cấp ${lv}`,
                    id: `Level ${lv}`,
                    tr: `Seviye ${lv}`,
                    pl: `Poziom ${lv}`,
                  })}
                </Text>
                <View style={{ height: 6, backgroundColor: isGoldTheme ? 'rgba(0,0,0,0.34)' : t.bgSurface, borderRadius: 3, overflow: 'hidden', marginTop: 5, borderWidth: isGoldTheme ? StyleSheet.hairlineWidth : 0, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : 'transparent' }}>
                  <Animated.View style={{ height: '100%', width: xpBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: isGoldTheme ? 'transparent' : '#D4A017', borderRadius: 3, overflow: 'hidden' }}>
                    {isGoldTheme && (
                      <LinearGradient
                        colors={GOLD_GRADIENTS.progressMetal}
                        locations={[0, 0.48, 1]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                  </Animated.View>
                </View>
                <XpCounter anim={xpCountAnim} xpNeeded={xpNeeded} textStyle={{ color: t.textMuted, fontSize: f.label, marginTop: 3 }} />
              </View>
            </LinearGradient>

            {wrongPhrases.length > 0 && (
              <TouchableOpacity
                style={{ width: '100%', borderWidth: isGoldTheme ? 1 : 1.5, borderColor: isGoldTheme ? GOLD_RICH.hairlineDark : '#F87171', padding: 18, borderRadius: 14, alignItems: 'center', marginBottom: 12, backgroundColor: t.bgCard, overflow: 'hidden' }}
                onPress={() => onReviewMistakes(wrongPhrases)}
              >
                {isGoldTheme && (
                  <>
                    <LinearGradient colors={GOLD_GRADIENTS.raisedTile} locations={GOLD_SURFACE_LOCATIONS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    <GoldBevel radius={14} intensity="normal" />
                  </>
                )}
                <Text style={{ color: monoIcon(themeMode, '#F87171'), fontSize: f.bodyLg, fontWeight: '600' }}>
                  {triLang(effectiveLang, {
                    ru: `🔄 Закрепить промахи (${wrongPhrases.length})`,
                    uk: `🔄 Закріпити промахи (${wrongPhrases.length})`,
                    es: `🔄 Corregir errores (${wrongPhrases.length})`,
                    'pt-BR': `🔄 Corrigir erros (${wrongPhrases.length})`,
                    vi: `🔄 Sửa lỗi (${wrongPhrases.length})`,
                    id: `🔄 Perbaiki kesalahan (${wrongPhrases.length})`,
                    tr: `🔄 Hataları düzelt (${wrongPhrases.length})`,
                    pl: `🔄 Popraw błędy (${wrongPhrases.length})`,
                  })}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{ width: '100%', borderWidth: isGoldTheme ? 1 : 1.5, borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : accentColor, padding: 18, borderRadius: 14, alignItems: 'center', marginBottom: 12, backgroundColor: t.bgCard, overflow: 'hidden' }}
              onPress={onRestart}
            >
              {isGoldTheme && (
                <>
                  <LinearGradient colors={GOLD_GRADIENTS.selectedTile} locations={GOLD_SURFACE_LOCATIONS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <GoldBevel radius={14} intensity="strong" />
                </>
              )}
              <Text style={{ color: isGoldTheme ? GOLD_RICH.champagne : accentColor, fontSize: f.bodyLg, fontWeight: '600' }}>{sQuiz.quizzes.again}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 14 }} onPress={onBack}>
              <Text style={{ color: sx.muted, fontSize: f.body }}>{sQuiz.quizzes.back}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, marginTop: 8 }}
              onPress={() => {
                const shareRank = getQuizShareRank(pct, '#94a3b8', '#64748b', shareLang);
                onShare(right, total, pct, shareRank.icon);
              }}
            >
              <Ionicons name="share-outline" size={16} color={sx.ghost} />
              <Text style={{ color: sx.ghost, fontSize: f.body }}>
                {triLang(effectiveLang, {
                  ru: 'Поделиться',
                  uk: 'Поділитися',
                  es: 'Compartir',
                  'pt-BR': 'Compartilhar',
                  vi: 'Chia sẻ',
                  id: 'Bagikan',
                  tr: 'Paylaş',
                  pl: 'Udostępnij',
                })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 12 }} onPress={onHome}>
              <Text style={{ color: sx.muted, fontSize: f.body, textDecorationLine: 'underline' }}>
                {triLang(effectiveLang, {
                  ru: '🏠 На главную',
                  uk: '🏠 На головну',
                  es: '🏠 Volver al inicio',
                  'pt-BR': '🏠 Início',
                  vi: '🏠 Về trang chính',
                  id: '🏠 Ke beranda',
                  tr: '🏠 Ana sayfaya',
                  pl: '🏠 Do ekranu głównego',
                })}
              </Text>
            </TouchableOpacity>
          </BouncyScrollView>
        </ContentWrap>

        {showBonus && (
          <BonusXPCard bonusXP={bonusXP} onDismiss={onDismissBonus} position="center" duration={2000} />
        )}
      </View>
    </ScreenGradient>
  );
}
