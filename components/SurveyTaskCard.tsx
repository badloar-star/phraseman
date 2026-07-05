// ════════════════════════════════════════════════════════════════════════════
// SurveyTaskCard — бонусная карточка «Пройти опрос» на экране дневных заданий.
// Самодостаточна: сама тянет активный опрос через getActiveShardSurvey и решает,
// показываться ли. Если опроса нет / облако выкл / ошибка — рендерит null
// (footprint в большом daily_tasks_screen = одна строка <SurveyTaskCard/>).
//
// По спеке §1.1: отдельная карточка СВЕРХУ, НЕ входит в набор «3 задания».
// ════════════════════════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import TapScale from './TapScale';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { triLang } from '../constants/i18n';
import { screenTextOnGradient } from '../constants/theme';
import { hapticTap } from '../hooks/use-haptics';
import { getCanonicalUserId } from '../app/user_id_policy';
import { fetchActiveSurvey, isSurveyCloudEnabled, type ActiveSurvey } from '../app/survey_client';
import { primeSurvey } from '../app/survey_handoff';
import { DebugLogger } from '../app/debug-logger';

export default function SurveyTaskCard() {
  const router = useRouter();
  const { lang } = useLang();
  const { theme: t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const [survey, setSurvey] = useState<ActiveSurvey | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSurveyCloudEnabled()) return;
      try {
        const stableId = await getCanonicalUserId();
        if (!stableId) return;
        const active = await fetchActiveSurvey({ stableId, platform: Platform.OS, lang });
        if (!cancelled && active && active.questions.length > 0) setSurvey(active);
      } catch (e: unknown) {
        // Опрос — бонус, ошибка не должна ломать экран заданий, но и не глушим
        // молча: пишем в debug-лог, чтобы реальные сбои (сеть/auth) были видны.
        DebugLogger.warn('SurveyTaskCard', String((e as { message?: string })?.message ?? e ?? 'fetch_failed'));
      }
    })();
    return () => { cancelled = true; };
  }, [lang]);

  if (!survey) return null;

  const open = () => {
    hapticTap();
    primeSurvey(survey);
    router.push({ pathname: '/survey_screen', params: { surveyId: survey.surveyId } });
  };

  return (
    <TapScale onPress={open} style={[styles.card, { backgroundColor: t.bgCard }]}>
      <View style={[styles.iconWrap, { backgroundColor: sx.ghost }]}>
        <Ionicons name="chatbubble-ellipses" size={22} color={sx.second} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ color: sx.primary, fontSize: f.body, fontWeight: '700' }}>
          {survey.title || triLang(lang, {
            ru: 'Короткий опрос', uk: 'Коротке опитування', es: 'Encuesta breve',
            'pt-BR': 'Pesquisa rápida', vi: 'Khảo sát ngắn', id: 'Survei singkat',
            tr: 'Kısa anket', pl: 'Krótka ankieta',
          })}
        </Text>
        <Text numberOfLines={1} style={{ color: sx.muted, fontSize: f.label, marginTop: 2 }}>
          {triLang(lang, {
            ru: `Ответь и получи 💎${survey.rewardShards}`,
            uk: `Відповідай і отримай 💎${survey.rewardShards}`,
            es: `Responde y gana 💎${survey.rewardShards}`,
            'pt-BR': `Responda e ganhe 💎${survey.rewardShards}`,
            vi: `Trả lời và nhận 💎${survey.rewardShards}`,
            id: `Jawab dan dapatkan 💎${survey.rewardShards}`,
            tr: `Yanıtla ve kazan 💎${survey.rewardShards}`,
            pl: `Odpowiedz i zdobądź 💎${survey.rewardShards}`,
          })}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={sx.muted} />
    </TapScale>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 14, gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
