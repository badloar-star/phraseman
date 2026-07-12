/**
 * «Разговорный клуб» — хаб миссий (specs/speaking-club.md, волна 1: Акт I).
 * Миссия N открыта, когда урок N пройден (бронза score ≥ 2.5 — как цепочка
 * уроков). Free — 1 миссия в день; пейвол context 'speaking_club'.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import { glassFill } from '../components/GlassSurface';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang, type Lang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';
import { trackEvent, type AnalyticsEvent } from './analytics';
import { shouldGateFeature } from './feature_gates';
import { getLessonsTabInitialState, loadLessonsTabStateFromStorage } from './lessons_tab_state';
import {
  CLUB_MISSIONS,
  type ClubMission,
} from './speaking_club_missions';
import {
  FREE_MISSIONS_PER_DAY,
  loadClubMissionsLocalState,
  type ClubMissionsLocalState,
} from './speaking_club_client';

/** Бронзовый порог цепочки уроков (lesson_lock_system): урок считается пройденным. */
const LESSON_PASSED_SCORE = 2.5;

function missionTitle(mission: ClubMission, lang: Lang): string {
  return lang === 'uk' ? mission.titleUk : mission.titleRu;
}

function missionGoal(mission: ClubMission, lang: Lang): string {
  return lang === 'uk' ? mission.goalUk : mission.goalRu;
}

function starsLabel(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(Math.max(0, 3 - stars));
}

export default function SpeakingClubHome() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const { hasPremiumAccess } = usePremium();
  const { studyTarget } = useStudyTarget();

  // Мгновенный первый кадр: снапшот уроков из session-кэша (Performance Bible).
  const [lessonScores, setLessonScores] = useState<number[]>(() => {
    const snap = getLessonsTabInitialState(studyTarget);
    return snap ? snap.scores : [];
  });
  const [localState, setLocalState] = useState<ClubMissionsLocalState>({
    starsByMission: {},
    missionsStartedToday: 0,
  });

  const refresh = useCallback(() => {
    let cancelled = false;
    void (async () => {
      const [lessonsSnap, clubState] = await Promise.all([
        loadLessonsTabStateFromStorage(studyTarget),
        loadClubMissionsLocalState(CLUB_MISSIONS.map((m) => m.id), studyTarget),
      ]);
      if (cancelled) return;
      // Тихая ревалидация: setState только когда данные реально изменились.
      setLessonScores((prev) =>
        prev.length === lessonsSnap.scores.length && prev.every((v, i) => v === lessonsSnap.scores[i])
          ? prev
          : lessonsSnap.scores,
      );
      setLocalState((prev) =>
        prev.missionsStartedToday === clubState.missionsStartedToday &&
        JSON.stringify(prev.starsByMission) === JSON.stringify(clubState.starsByMission)
          ? prev
          : clubState,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [studyTarget]);

  useFocusEffect(refresh);

  const missionUnlocked = useCallback(
    (mission: ClubMission): boolean => {
      const score = lessonScores[mission.lessonId - 1] ?? 0;
      return score >= LESSON_PASSED_SCORE;
    },
    [lessonScores],
  );

  // Дневной лимит free: замок «на вторую миссию», сама фича не прячется.
  const dailyLimitReached =
    shouldGateFeature('speaking_club', hasPremiumAccess) &&
    localState.missionsStartedToday >= FREE_MISSIONS_PER_DAY;

  const openMission = useCallback(
    (mission: ClubMission) => {
      hapticTap();
      if (!missionUnlocked(mission)) return;
      if (dailyLimitReached) {
        void trackEvent('paywall_shown', { context: 'speaking_club', source: 'club_home_daily_limit' });
        router.push({ pathname: '/premium_modal', params: { context: 'speaking_club' } } as never);
        return;
      }
      // 'as AnalyticsEvent': analytics.ts занят другой сессией — литерал события
      // зарегистрируем в союзе отдельным коммитом (хвост волны 1).
      void trackEvent('speaking_club_mission_open' as AnalyticsEvent, { missionId: mission.id, lessonId: mission.lessonId });
      router.push({ pathname: '/speaking_club_session', params: { mission: mission.id } } as never);
    },
    [missionUnlocked, dailyLimitReached, router],
  );

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, paddingBottom: 8 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => {
              hapticTap();
              safeRouterBack(router, '/(tabs)/home' as never);
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: t.bgCard,
              borderWidth: 0,
              borderColor: t.border,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <Ionicons name="chevron-back" size={22} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '800' }} numberOfLines={1}>
              {triLang(lang, {
                ru: 'Разговорный клуб',
                uk: 'Розмовний клуб',
                es: 'Club de conversación',
                'pt-BR': 'Clube de conversação',
                vi: 'Câu lạc bộ hội thoại',
                id: 'Klub percakapan',
                tr: 'Konuşma kulübü',
                pl: 'Klub konwersacji',
              })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }} numberOfLines={1}>
              {triLang(lang, {
                ru: 'Акт I · Разминка · миссии 1–8',
                uk: 'Акт I · Розминка · місії 1–8',
                es: 'Acto I · Calentamiento · misiones 1–8',
                'pt-BR': 'Ato I · Aquecimento · missões 1–8',
                vi: 'Màn I · Khởi động · nhiệm vụ 1–8',
                id: 'Babak I · Pemanasan · misi 1–8',
                tr: 'Perde I · Isınma · görev 1–8',
                pl: 'Akt I · Rozgrzewka · misje 1–8',
              })}
            </Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 28 }}>
          <View
            style={{
              backgroundColor: glassFill(t.bgSurface, 0.46),
              borderRadius: 16,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
              🎙️ {triLang(lang, {
                ru: 'Говори вслух — фразы урока в живом разговоре',
                uk: 'Говори вголос — фрази уроку в живій розмові',
                es: 'Habla en voz alta: las frases de la lección en una conversación real',
                'pt-BR': 'Fale em voz alta: as frases da lição em uma conversa real',
                vi: 'Nói to — các mẫu câu bài học trong hội thoại thực',
                id: 'Bicaralah — frasa pelajaran dalam percakapan nyata',
                tr: 'Sesli konuş — ders kalıpları gerçek sohbette',
                pl: 'Mów na głos — frazy z lekcji w prawdziwej rozmowie',
              })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 4 }}>
              {triLang(lang, {
                ru: 'Зажми микрофон и говори. Собеседник не перебивает и мягко поправляет. Миссия открывается после её урока.',
                uk: 'Затисни мікрофон і говори. Співрозмовник не перебиває і м’яко виправляє. Місія відкривається після її уроку.',
                es: 'Mantén pulsado el micrófono y habla. Tu interlocutor no te interrumpe y te corrige con suavidad. Cada misión se abre al terminar su lección.',
                'pt-BR': 'Segure o microfone e fale. O parceiro não interrompe e corrige com gentileza. Cada missão abre após a sua lição.',
                vi: 'Giữ micro và nói. Người đối thoại không ngắt lời và sửa lỗi nhẹ nhàng. Nhiệm vụ mở sau bài học tương ứng.',
                id: 'Tahan mikrofon dan bicaralah. Lawan bicara tidak menyela dan mengoreksi dengan lembut. Misi terbuka setelah pelajarannya selesai.',
                tr: 'Mikrofonu basılı tut ve konuş. Partnerin sözünü kesmez, nazikçe düzeltir. Görev, dersi bitince açılır.',
                pl: 'Przytrzymaj mikrofon i mów. Rozmówca nie przerywa i delikatnie poprawia. Misja otwiera się po jej lekcji.',
              })}
            </Text>
          </View>

          {dailyLimitReached && (
            <View
              style={{
                backgroundColor: t.bgCard,
                borderRadius: 16,
                borderWidth: 0,
                borderColor: t.accent,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, {
                  ru: 'Миссия дня пройдена ✅',
                  uk: 'Місію дня пройдено ✅',
                  es: 'Misión de hoy completada ✅',
                  'pt-BR': 'Missão de hoje concluída ✅',
                  vi: 'Đã xong nhiệm vụ hôm nay ✅',
                  id: 'Misi hari ini selesai ✅',
                  tr: 'Bugünün görevi tamam ✅',
                  pl: 'Misja dnia ukończona ✅',
                })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 4 }}>
                {triLang(lang, {
                  ru: 'Возвращайся завтра — или открой безлимит миссий с Plus.',
                  uk: 'Повертайся завтра — або відкрий безліміт місій із Plus.',
                  es: 'Vuelve mañana o desbloquea misiones ilimitadas con Plus.',
                  'pt-BR': 'Volte amanhã ou desbloqueie missões ilimitadas com o Plus.',
                  vi: 'Quay lại vào ngày mai hoặc mở khóa nhiệm vụ không giới hạn với Plus.',
                  id: 'Kembali besok atau buka misi tanpa batas dengan Plus.',
                  tr: 'Yarın tekrar gel ya da Plus ile sınırsız görev aç.',
                  pl: 'Wróć jutro albo odblokuj nielimitowane misje z Plus.',
                })}
              </Text>
            </View>
          )}

          {CLUB_MISSIONS.map((mission) => {
            const unlocked = missionUnlocked(mission);
            const stars = localState.starsByMission[mission.id] ?? 0;
            return (
              <TouchableOpacity
                key={mission.id}
                accessibilityRole="button"
                disabled={!unlocked}
                onPress={() => openMission(mission)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: glassFill(t.bgSurface, 0.46),
                  borderRadius: 16,
                  padding: 12,
                  marginBottom: 8,
                  opacity: unlocked ? 1 : 0.45,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: glassFill(t.bgCard, 0.32),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{unlocked ? mission.icon : '🔒'}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }} numberOfLines={1}>
                    {mission.lessonId} · {missionTitle(mission, lang)}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }} numberOfLines={2}>
                    {unlocked
                      ? missionGoal(mission, lang)
                      : triLang(lang, {
                          ru: `Пройди урок ${mission.lessonId}, чтобы открыть миссию`,
                          uk: `Пройди урок ${mission.lessonId}, щоб відкрити місію`,
                          es: `Completa la lección ${mission.lessonId} para abrir la misión`,
                          'pt-BR': `Complete a lição ${mission.lessonId} para abrir a missão`,
                          vi: `Hoàn thành bài học ${mission.lessonId} để mở nhiệm vụ`,
                          id: `Selesaikan pelajaran ${mission.lessonId} untuk membuka misi`,
                          tr: `Görevi açmak için ${mission.lessonId}. dersi bitir`,
                          pl: `Ukończ lekcję ${mission.lessonId}, aby otworzyć misję`,
                        })}
                  </Text>
                </View>
                {unlocked && (
                  <Text style={{ color: stars > 0 ? t.accent : t.textMuted, fontSize: f.sub, fontWeight: '700' }}>
                    {starsLabel(stars)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}

          <View
            style={{
              backgroundColor: glassFill(t.bgSurface, 0.46),
              borderRadius: 16,
              padding: 14,
              marginTop: 4,
              opacity: 0.6,
            }}
          >
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
              {triLang(lang, {
                ru: 'Акт II · Сценки — скоро',
                uk: 'Акт II · Сценки — незабаром',
                es: 'Acto II · Escenas — pronto',
                'pt-BR': 'Ato II · Cenas — em breve',
                vi: 'Màn II · Tình huống — sắp ra mắt',
                id: 'Babak II · Adegan — segera',
                tr: 'Perde II · Sahneler — yakında',
                pl: 'Akt II · Scenki — wkrótce',
              })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 4 }}>
              {triLang(lang, {
                ru: 'Ролевые миссии уроков 9–18: кафе, дорога, отель.',
                uk: 'Рольові місії уроків 9–18: кафе, дорога, готель.',
                es: 'Misiones de rol de las lecciones 9–18: café, direcciones, hotel.',
                'pt-BR': 'Missões de interpretação das lições 9–18: café, direções, hotel.',
                vi: 'Nhiệm vụ nhập vai của bài 9–18: quán cà phê, hỏi đường, khách sạn.',
                id: 'Misi peran pelajaran 9–18: kafe, arah jalan, hotel.',
                tr: '9–18. derslerin rol görevleri: kafe, yol tarifi, otel.',
                pl: 'Misje fabularne lekcji 9–18: kawiarnia, droga, hotel.',
              })}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
