import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { getHomeSupportingArt } from '../app/home_supporting_art';
import { oskolokImageForPackShards } from '../app/oskolok';
import { SHARD_REWARDS } from '../app/shards_system';
import type { SurveyOfferSnapshot } from '../app/survey_offer_model';
import { triLang } from '../constants/i18n';
import { SURVEY_HYBRID } from '../constants/motionHybrid';
import { useLang } from './LangContext';
import PressableHybrid from './PressableHybrid';
import { useTheme } from './ThemeContext';

export type SurveyTaskCardProps = {
  challenge: SurveyOfferSnapshot;
  onOpen: (challenge: SurveyOfferSnapshot) => void;
};

export default function SurveyTaskCard({ challenge, onOpen }: SurveyTaskCardProps) {
  const { lang } = useLang();
  const { theme: t, themeMode } = useTheme();
  const completed = challenge.phase === 'completed';
  const active = challenge.phase === 'active' && challenge.survey !== null;
  const rewardAmount = SHARD_REWARDS.survey_completed;
  const rewardLabel = triLang(lang, {
    ru: `+${rewardAmount} жемчужина`,
    uk: `+${rewardAmount} перлина`,
    en: `+${rewardAmount} pearl`,
    es: `+${rewardAmount} perla`,
    'pt-BR': `+${rewardAmount} pérola`,
    vi: `+${rewardAmount} ngọc trai`,
    id: `+${rewardAmount} mutiara`,
    tr: `+${rewardAmount} inci`,
    pl: `+${rewardAmount} perła`,
  });
  const completedLabel = triLang(lang, {
    ru: 'Опрос пройден',
    uk: 'Опитування пройдено',
    en: 'Survey completed',
    es: 'Encuesta completada',
    'pt-BR': 'Pesquisa concluída',
    vi: 'Đã hoàn thành khảo sát',
    id: 'Survei selesai',
    tr: 'Anket tamamlandı',
    pl: 'Ankieta ukończona',
  });

  const content = (
    <>
      <View
        testID="survey-offer-icon-well"
        style={[styles.iconCircle, { backgroundColor: t.bgSurface }]}
      >
        <Image
          testID="survey-offer-theme-art"
          source={getHomeSupportingArt(themeMode).survey}
          contentFit="contain"
          style={styles.surveyArt}
          accessible={false}
        />
      </View>
      <View style={styles.copy}>
        {/* eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- approved C2 row is capped at two visual lines; the full authored title remains on the parent accessibilityLabel */}
        <Text testID="survey-offer-title" style={[styles.title, { color: t.textOnCard }]} numberOfLines={2}>
          {challenge.title}
        </Text>
      </View>
      {active ? (
        <View style={styles.reward}>
          <Image
            testID="survey-offer-reward-art"
            source={oskolokImageForPackShards(rewardAmount, themeMode)}
            contentFit="contain"
            style={styles.rewardArt}
            accessible={false}
          />
          <Text testID="survey-offer-reward-label" style={[styles.rewardLabel, { color: t.textPrimary }]}>
            {`+${rewardAmount}`}
          </Text>
        </View>
      ) : null}
      {completed ? (
        <Ionicons
          testID="survey-offer-claimed"
          name="checkmark-circle"
          size={24}
          color={t.accent}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : null}
    </>
  );

  if (!active) {
    return (
      <View
        testID="survey-offer-card"
        accessible
        accessibilityState={{ disabled: true }}
        accessibilityLabel={completed ? `${challenge.title}. ${completedLabel}` : challenge.title}
        style={[styles.card, { backgroundColor: t.bgCard }]}
      >
        {content}
      </View>
    );
  }

  return (
    <PressableHybrid
      testID="survey-offer-card"
      variant="card"
      onPress={() => onOpen(challenge)}
      accessibilityLabel={`${challenge.title}. ${rewardLabel}`}
      contentStyle={[styles.card, { backgroundColor: t.bgCard }]}
    >
      {content}
    </PressableHybrid>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 70, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: SURVEY_HYBRID.taskIconSize,
    height: SURVEY_HYBRID.taskIconSize,
    borderRadius: SURVEY_HYBRID.taskIconSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  surveyArt: {
    width: SURVEY_HYBRID.taskIconSize,
    height: SURVEY_HYBRID.taskIconSize,
  },
  copy: { flex: 1, minWidth: 0 },
  title: { minHeight: 44, fontSize: 17, lineHeight: 22, fontWeight: '800' },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  rewardArt: { width: SURVEY_HYBRID.taskRewardIconSize, height: SURVEY_HYBRID.taskRewardIconSize },
  rewardLabel: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
});
