// ════════════════════════════════════════════════════════════════════════════
// SurveyTaskCard — плашка опроса за осколки, 4-е задание «Вызовов дня».
// Самодостаточна: тянет активный опрос через getActiveShardSurvey. Когда опрос
// пройден сегодня — показывает состояние «выполнено» (галочка) до конца дня
// (сервер пройденный опрос не отдаёт, поэтому опираемся на локальную метку).
// Если опроса нет / облако выкл / ошибка — рендерит null.
//
// Опрос считается 4-м заданием: награду «за все» дают за любые 3 из 4 (логика
// порога — в daily_tasks_screen).
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import TapScale from './TapScale';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { triLang } from '../constants/i18n';
import { screenTextOnGradient } from '../constants/theme';
import { hapticTap } from '../hooks/use-haptics';
import { getCanonicalUserId } from '../app/user_id_policy';
import { fetchActiveSurvey, isSurveyCloudEnabled, type ActiveSurvey } from '../app/survey_client';
import { primeSurvey } from '../app/survey_handoff';
import { isSurveyDailyTaskDoneToday } from '../app/survey_daily_task';
import { DebugLogger } from '../app/debug-logger';

/** Светлый ли HEX-цвет (относительная яркость > 0.6) — для выбора цвета текста. */
function isLightHex(hex: string): boolean {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  // Воспринимаемая яркость (перцептивные веса).
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.6;
}

export default function SurveyTaskCard() {
  const router = useRouter();
  const { lang } = useLang();
  const { theme: t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const [survey, setSurvey] = useState<ActiveSurvey | null>(null);
  const [done, setDone] = useState(false);

  // useFocusEffect: пере-проверяем при возврате с экрана опроса, чтобы плашка
  // сразу переключилась в «выполнено».
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      try {
        const isDone = await isSurveyDailyTaskDoneToday();
        if (cancelled) return;
        setDone(isDone);
        if (isDone) return; // пройден — активный опрос тянуть не нужно
        if (!isSurveyCloudEnabled()) return;
        const stableId = await getCanonicalUserId();
        if (cancelled || !stableId) return;
        const active = await fetchActiveSurvey({ stableId, platform: Platform.OS, lang });
        if (!cancelled && active && active.questions.length > 0) setSurvey(active);
      } catch (e: unknown) {
        // Опрос — задание, ошибка не должна ломать экран заданий, но и не глушим
        // молча: пишем в debug-лог, чтобы реальные сбои (сеть/auth) были видны.
        DebugLogger.warn('SurveyTaskCard', String((e as { message?: string })?.message ?? e ?? 'fetch_failed'));
      }
    })();
    return () => { cancelled = true; };
  }, [lang]));

  // Пройденный опрос — плашка «выполнено» (галочка) до конца дня.
  if (done) {
    return (
      <View style={[styles.card, { backgroundColor: t.bgCard, opacity: 0.85 }]}>
        <View style={[styles.iconWrap, { backgroundColor: sx.ghost }]}>
          <Ionicons name="checkmark-circle" size={24} color="#63D98F" />
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: sx.primary, fontSize: f.body, fontWeight: '700' }}>
            {triLang(lang, {
              ru: 'Опрос пройден', uk: 'Опитування пройдено', es: 'Encuesta completada',
              'pt-BR': 'Pesquisa concluída', vi: 'Đã hoàn thành khảo sát', id: 'Survei selesai',
              tr: 'Anket tamamlandı', pl: 'Ankieta ukończona',
            })}
          </Text>
          <Text numberOfLines={1} style={{ color: sx.muted, fontSize: f.label, marginTop: 2 }}>
            {triLang(lang, {
              ru: 'Засчитано как задание', uk: 'Зараховано як завдання', es: 'Cuenta como tarea',
              'pt-BR': 'Conta como tarefa', vi: 'Tính là nhiệm vụ', id: 'Dihitung sebagai tugas',
              tr: 'Görev sayıldı', pl: 'Liczy się jako zadanie',
            })}
          </Text>
        </View>
      </View>
    );
  }

  if (!survey) return null;

  const open = () => {
    hapticTap();
    primeSurvey(survey);
    router.push({ pathname: '/survey_screen', params: { surveyId: survey.surveyId } });
  };

  // Цвет плашки из конфига (accentColor) — «не как все задания». Есть цвет →
  // красим фон в него; текст авто-контрастный (тёмный на светлом фоне, светлый на
  // тёмном) — иначе белый текст на светлом цвете нечитаем.
  const accent = survey.accentColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(survey.accentColor)
    ? survey.accentColor : null;
  const onAccentDark = accent ? isLightHex(accent) : false; // фон светлый → текст тёмный
  const cardBg = accent || t.bgCard;
  const fg = onAccentDark ? '#1A1A1A' : '#FFFFFF';
  const titleColor = accent ? fg : sx.primary;
  const subColor = accent ? (onAccentDark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.82)') : sx.muted;
  const iconTint = accent ? fg : sx.second;
  const iconWrapBg = accent ? (onAccentDark ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)') : sx.ghost;

  return (
    <TapScale onPress={open} style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={[styles.iconWrap, { backgroundColor: iconWrapBg }]}>
        <Ionicons name="chatbubble-ellipses" size={22} color={iconTint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ color: titleColor, fontSize: f.body, fontWeight: '700' }}>
          {survey.title || triLang(lang, {
            ru: 'Короткий опрос', uk: 'Коротке опитування', es: 'Encuesta breve',
            'pt-BR': 'Pesquisa rápida', vi: 'Khảo sát ngắn', id: 'Survei singkat',
            tr: 'Kısa anket', pl: 'Krótka ankieta',
          })}
        </Text>
        <Text numberOfLines={1} style={{ color: subColor, fontSize: f.label, marginTop: 2 }}>
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
      <Ionicons name="chevron-forward" size={22} color={subColor} />
    </TapScale>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 14, gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
