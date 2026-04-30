import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserProfile, TARGET_LEVEL_LABELS } from '../app/types/user_profile';
import { Lang } from '../constants/i18n';

interface PersonalPlanCardProps {
  profile: UserProfile | null;
  lang: Lang;
}

export function PersonalPlanCard({ profile, lang }: PersonalPlanCardProps) {
  if (!profile || !profile.estimatedTargetDate) {
    return null;
  }

  const isUK = lang === 'uk';
  const isES = lang === 'es';
  const targetLabel = TARGET_LEVEL_LABELS[profile.targetLevel];
  const targetDate = new Date(profile.estimatedTargetDate);

  const title =
    isES ? 'Tu plan' : isUK ? 'Твій план' : 'Твой план';
  const subtitleConnector =
    isES ? 'en' : isUK ? 'за' : 'через';
  const daysWord =
    isES ? 'días' : isUK ? 'днів' : 'дней';
  const labelGoal =
    isES ? 'Objetivo:' : isUK ? 'Ціль:' : 'Цель:';
  const labelReach =
    isES ? 'Fecha prevista:' : isUK ? 'Досягнути:' : 'Достичь:';
  const labelIntensity =
    isES ? 'Intensidad:' : isUK ? 'Інтенсивність:' : 'Интенсивность:';
  const minPerDay =
    isES ? 'min/día' : isUK ? 'хв/день' : 'мин/день';

  const locale = isES ? 'es-ES' : isUK ? 'uk-UA' : 'ru-RU';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🎯</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {title}
          </Text>
          <Text style={styles.subtitle}>
            {targetLabel.short} • {subtitleConnector} {profile.estimatedDaysToTarget} {daysWord}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>
            {labelGoal}
          </Text>
          <Text style={styles.value}>
            {targetLabel.full}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>
            {labelReach}
          </Text>
          <Text style={styles.value}>
            {targetDate.toLocaleDateString(locale, {
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>
            {labelIntensity}
          </Text>
          <Text style={styles.value}>
            {profile.minutesPerDay} {minPerDay}
          </Text>
        </View>
      </View>

      <View style={styles.progress}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: '33%', // примерно 1/3 пути к цели
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#202020',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(200,255,0,0.12)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  emoji: {
    fontSize: 28,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: '#C8FF00',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  content: {
    gap: 10,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#A8A8A8',
    fontSize: 13,
    fontWeight: '500',
  },
  value: {
    color: '#C8FF00',
    fontSize: 13,
    fontWeight: '700',
  },
  progress: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(200,255,0,0.12)',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#C8FF00',
  },
});
