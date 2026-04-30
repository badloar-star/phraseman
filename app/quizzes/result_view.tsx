import { Ionicons } from '@expo/vector-icons';
import React, { type RefObject } from 'react';
import { Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Svg from 'react-native-svg';
import QuizShareCardSvg from '../../components/share_cards/QuizShareCardSvg';
import type { ShareCardLang } from '../../components/share_cards/streakCardCopy';
import BonusXPCard from '../../components/BonusXPCard';
import ContentWrap from '../../components/ContentWrap';
import LevelBadge from '../../components/LevelBadge';
import ScreenGradient from '../../components/ScreenGradient';
import { useLang, RU } from '../../components/LangContext';
import { REPORT_SCREENS_RUSSIAN_ONLY } from '../../constants/report_ui_ru';
import { triLang } from '../../constants/i18n';
import { useTheme } from '../../components/ThemeContext';
import { getXPProgress } from '../../constants/theme';
import type { QuizPhrase } from '../quiz_data';
import { getQuizRankInfo, getQuizShareCardRank } from './results';
import { XpCounter } from './ui';

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
  shareCardSvgRef: RefObject<InstanceType<typeof Svg> | null>;
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
  shareCardSvgRef,
}: Props) {
  const { theme: t, f } = useTheme();
  const { s, lang } = useLang();
  const sQuiz = REPORT_SCREENS_RUSSIAN_ONLY ? RU : s;
  const effectiveLang = REPORT_SCREENS_RUSSIAN_ONLY ? 'ru' : lang;
  const cardLang: ShareCardLang = REPORT_SCREENS_RUSSIAN_ONLY
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
  const rankLabel = triLang(effectiveLang, { ru: rankInfo.labelRU, uk: rankInfo.labelUK, es: rankInfo.labelES });
  const wrongPhrases = phrases.filter((_, i) => !results[i]);
  const { level: lv, xpNeeded } = getXPProgress(totalXP + score);

  return (
    <ScreenGradient>
      <View style={{ flex: 1 }}>
        <View
          pointerEvents="none"
          collapsable={false}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, left: 0, top: 0, zIndex: -1, overflow: 'hidden' }}
        >
          <QuizShareCardSvg
            ref={shareCardSvgRef}
            right={right}
            total={total}
            pct={pct}
            lang={cardLang}
            layoutSize={1080}
          />
        </View>
        <ContentWrap>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }} showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: f.numLg + 28, marginBottom: 10 }} adjustsFontSizeToFit numberOfLines={1}>{rankInfo.icon}</Text>
            <View style={{ backgroundColor: `${rankInfo.color}22`, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 8, borderWidth: 1, borderColor: `${rankInfo.color}55`, marginBottom: 16 }}>
              <Text style={{ color: rankInfo.color, fontSize: f.h2, fontWeight: '800', letterSpacing: 0.5 }}>{rankLabel}</Text>
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '700', marginBottom: 10 }} adjustsFontSizeToFit numberOfLines={1}>{sQuiz.quizzes.done}</Text>
            <Text style={{ color: t.textPrimary, fontSize: f.h1, marginBottom: 4 }}>{right} / {total}</Text>
            <Text style={{ color: t.textSecond, fontSize: f.numLg + 8, fontWeight: '700', marginBottom: 8 }} adjustsFontSizeToFit numberOfLines={1}>{pct}%</Text>
            <Animated.Text style={{ color: t.correct, fontSize: f.h2, fontWeight: '600', marginBottom: bonusXP > 0 ? 4 : 16, transform: [{ translateY: xpFlyY }], opacity: xpFlyOpacity }}>
              +{Math.round(score)}{' '}
              {triLang(effectiveLang, { ru: 'опыта', uk: 'досвіду', es: 'XP' })}
            </Animated.Text>
            {bonusXP > 0 && (
              <Text style={{ color: '#D4A017', fontSize: f.body, fontWeight: '600', marginBottom: 16 }}>
                +{Math.round(bonusXP)}{' '}
                {triLang(effectiveLang, {
                  ru: 'бонусного опыта',
                  uk: 'бонусного досвіду',
                  es: 'XP de bonificación',
                })}{' '}
                🎁
              </Text>
            )}

            <View style={{ backgroundColor: t.bgCard, borderRadius: 14, borderWidth: 0.5, borderColor: t.border, padding: 14, width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <LevelBadge level={lv} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                  {triLang(effectiveLang, { ru: `Уровень ${lv}`, uk: `Рівень ${lv}`, es: `Nivel ${lv}` })}
                </Text>
                <View style={{ height: 5, backgroundColor: t.bgSurface, borderRadius: 3, overflow: 'hidden', marginTop: 5 }}>
                  <Animated.View style={{ height: '100%', width: xpBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: '#D4A017', borderRadius: 3 }} />
                </View>
                <XpCounter anim={xpCountAnim} xpNeeded={xpNeeded} textStyle={{ color: t.textMuted, fontSize: f.label, marginTop: 3 }} />
              </View>
            </View>

            {wrongPhrases.length > 0 && (
              <TouchableOpacity
                style={{ width: '100%', borderWidth: 1.5, borderColor: '#F87171', padding: 18, borderRadius: 14, alignItems: 'center', marginBottom: 12, backgroundColor: t.bgCard }}
                onPress={() => onReviewMistakes(wrongPhrases)}
              >
                <Text style={{ color: '#F87171', fontSize: f.bodyLg, fontWeight: '600' }}>
                  {triLang(effectiveLang, {
                    ru: `🔄 Исправить ошибки (${wrongPhrases.length})`,
                    uk: `🔄 Виправити помилки (${wrongPhrases.length})`,
                    es: `🔄 Corregir errores (${wrongPhrases.length})`,
                  })}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{ width: '100%', borderWidth: 1.5, borderColor: accentColor, padding: 18, borderRadius: 14, alignItems: 'center', marginBottom: 12, backgroundColor: t.bgCard }}
              onPress={onRestart}
            >
              <Text style={{ color: accentColor, fontSize: f.bodyLg, fontWeight: '600' }}>{sQuiz.quizzes.again}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 14 }} onPress={onBack}>
              <Text style={{ color: t.textMuted, fontSize: f.body }}>{sQuiz.quizzes.back}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, marginTop: 8 }}
              onPress={() => {
                const shareRank = getQuizShareCardRank(pct, '#94a3b8', '#64748b', cardLang);
                onShare(right, total, pct, shareRank.icon);
              }}
            >
              <Ionicons name="share-outline" size={16} color={t.textGhost} />
              <Text style={{ color: t.textGhost, fontSize: f.body }}>
                {triLang(effectiveLang, { ru: 'Поделиться', uk: 'Поділитися', es: 'Compartir' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 12 }} onPress={onHome}>
              <Text style={{ color: t.textMuted, fontSize: f.body, textDecorationLine: 'underline' }}>
                {triLang(effectiveLang, {
                  ru: '🏠 На главную',
                  uk: '🏠 На головну',
                  es: '🏠 Volver al inicio',
                })}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </ContentWrap>

        {showBonus && (
          <BonusXPCard bonusXP={bonusXP} onDismiss={onDismissBonus} position="center" duration={2000} />
        )}
      </View>
    </ScreenGradient>
  );
}
