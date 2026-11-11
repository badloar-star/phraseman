import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { triLang } from '../constants/i18n';
import ScreenGradient from '../components/ScreenGradient';
import { getPremiumCourseLevel } from './lesson_lock_system';
import { getCourseLevelIndex, getLastLessonForLevel, getPreviousCourseLevel, type CourseLevel } from './course_levels';
import { isTesterNoLimitsActive } from './premium_guard';
import { usePremium } from '../components/PremiumContext';
import { requiresPremiumForLesson } from './monetization_policy';
import { readLegacyFreeLessonCap } from './legacy_free_lesson_access';
import { storageStudyTarget } from './target_storage_keys';
import { examContentAvailableForTarget, frenchExamGateCopy } from './exam_target_gate';
import { classicFinalExamTarget } from './classic_final_exam_bank';
import { safeRouterBack } from './navigation_back';
import LevelExamV2 from '../components/level-exam/LevelExamV2';
import { useSilentLeave } from '../hooks/use_silent_leave';

// зачем (владелец 11.11.2026, «Проверен, вырезать»): этот файл — только маршрут /level_exam. Он проверяет доступ (курс открыт,
// Plus, пройденный уровень) и рисует экзамен на новом движке LevelExamV2. Прежний встроенный экран (свой банк из 96 заданий,
// своя разметка вопроса и итога) был недостижим с тех пор, как все пять курсов перешли на LevelExamV2, и удалён после проверки
// нового экрана на телефоне. Энергию, запись ошибок, сохранение результата и звук итога ведёт LevelExamV2.
const LEVEL_EXAM_ACCESS_TIMEOUT_MS = 12_000;

export default function LevelExam() {
  const router = useRouter();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const frenchExamBlocked = !examContentAvailableForTarget(studyTarget);
  // зачем (владелец 11.11, «Да, зачёты тоже»): у ES/DE/IT/FR зачёт уровня собирается из фраз курса этого языка.
  // Раньше es/de/it уходили в английский LevelExamV2, а fr получал пустой список. null = английский (LevelExamV2, без изменений).
  const classicExamTarget = classicFinalExamTarget(storageStudyTarget(studyTarget));
  const { level } = useLocalSearchParams<{ level: string }>();
  const validLevels = ['A1', 'A2', 'B1', 'B2'];
  const lvl = validLevels.includes(level) ? level : 'A1';

  const [accessState, setAccessState] = useState<'checking' | 'allowed' | 'blocked'>('checking');
  const [blockedText, setBlockedText] = useState('');
  const [accessBlockKind, setAccessBlockKind] = useState<'premium' | 'level' | 'error'>('level');
  const { hasPremiumAccess, accessResolved, reload: reloadPremiumAccess } = usePremium();

  useEffect(() => {
    let cancelled = false;
    setAccessState('checking');
    setBlockedText('');
    setAccessBlockKind('level');
    let accessTimeout: ReturnType<typeof setTimeout> | null = null;
    const accessCheck = (async () => {
      if (frenchExamBlocked) {
        if (!cancelled) {
          setAccessState('blocked');
          setBlockedText(frenchExamGateCopy('level', lang).body);
        }
        return;
      }
      const noLimits = await isTesterNoLimitsActive();
      if (noLimits) {
        if (!cancelled) setAccessState('allowed');
        return;
      }

      if (!accessResolved) {
        void reloadPremiumAccess();
        return;
      }

      const examLevel = lvl as CourseLevel;
      const lastLessonForLevel = getLastLessonForLevel(examLevel);
      const legacyFreeLessonCap = await readLegacyFreeLessonCap(studyTarget);
      const premiumNow = hasPremiumAccess;
      if (!premiumNow && requiresPremiumForLesson(lastLessonForLevel, legacyFreeLessonCap)) {
        if (!cancelled) {
          setAccessBlockKind('premium');
          setBlockedText(triLang(lang, {
            ru: 'Plus откроет уроки уровня и доступ к зачёту. Без Plus доступен A1, уроки открываются последовательно.',
            en: 'Plus unlocks the level lessons and exam access. Without Plus, only A1 is available, unlocked step by step.',
            uk: 'Plus відкриє уроки рівня і доступ до заліку. Без Plus доступний A1, уроки відкриваються послідовно.',
            es: 'Plus abre las lecciones del nivel y el acceso al examen. Sin Plus, A1 está disponible paso a paso.',
            'pt-BR': "O Plus abre as aulas do nível e o acesso ao teste. Sem Plus, o A1 fica disponível passo a passo.",
            vi: "Plus mở các bài học của cấp độ và quyền truy cập vào bài kiểm tra. Không có Plus, A1 mở từng bài theo tiến độ.",
            id: "Plus membuka pelajaran level ini dan akses ke ujian. Tanpa Plus, A1 tersedia bertahap.",
            tr: "Plus, seviyenin derslerini ve sınava erişimi açar. Plus olmadan A1 adım adım kullanılabilir.",
            pl: "Plus odblokowuje lekcje poziomu i dostęp do testu. Bez Plus A1 jest dostępny krok po kroku.",
          }));
          setAccessState('blocked');
        }
        return;
      }

      if (!premiumNow) {
        if (!cancelled) setAccessState('allowed');
        return;
      }

      const reachedLevel = await getPremiumCourseLevel(studyTarget);
      if (getCourseLevelIndex(examLevel) <= getCourseLevelIndex(reachedLevel)) {
        if (!cancelled) setAccessState('allowed');
        return;
      }

      const prevLevel = getPreviousCourseLevel(examLevel);
      if (!cancelled) {
        setAccessBlockKind('level');
        setBlockedText(prevLevel
          ? triLang(lang, {
            ru: `Чтобы открыть уровень ${examLevel}, сначала сдай зачёт ${prevLevel}.`,
            en: `To unlock level ${examLevel}, first pass the ${prevLevel} exam.`,
            uk: `Щоб відкрити рівень ${examLevel}, спочатку склади залік ${prevLevel}.`,
            es: `Para abrir el nivel ${examLevel}, primero supera el examen de ${prevLevel}.`,
            'pt-BR': `Para abrir o nível ${examLevel}, primeiro passe no teste ${prevLevel}.`,
            vi: `Để mở cấp độ ${examLevel}, trước tiên hãy vượt qua bài kiểm tra ${prevLevel}.`,
            id: `Untuk membuka level ${examLevel}, selesaikan dulu ujian ${prevLevel}.`,
            tr: `${examLevel} seviyesini açmak için önce ${prevLevel} sınavını geç.`,
            pl: `Aby odblokować poziom ${examLevel}, najpierw zalicz test ${prevLevel}.`,
          })
          : triLang(lang, {
            ru: 'Этот зачёт пока недоступен.',
            en: 'This exam is not available yet.',
            uk: 'Цей залік поки недоступний.',
            es: 'Este examen todavía no está disponible.',
            'pt-BR': "Este teste ainda não está disponível.",
            vi: "Bài kiểm tra này hiện chưa khả dụng.",
            id: "Ujian ini belum tersedia.",
            tr: "Bu sınav henüz kullanılamıyor.",
            pl: "Ten test nie jest jeszcze dostępny.",
          }));
        setAccessState('blocked');
      }
    })();
    const accessDeadline = new Promise<never>((_, reject) => {
      accessTimeout = setTimeout(
        () => reject(new Error('level_exam_access_timeout')),
        LEVEL_EXAM_ACCESS_TIMEOUT_MS,
      );
    });
    void Promise.race([accessCheck, accessDeadline]).catch(() => {
      if (!cancelled) {
        setAccessBlockKind('error');
        setBlockedText(triLang(lang, {
          ru: 'Доступ к зачёту не проверился. Попробуй открыть его ещё раз.',
          en: 'Could not verify exam access. Try opening it again.',
          uk: 'Не вдалося перевірити доступ до заліку. Спробуй відкрити його ще раз.',
          es: 'No se pudo comprobar el acceso al examen. Inténtalo de nuevo.',
          'pt-BR': "Não foi possível verificar o acesso ao teste. Tente abri-lo de novo.",
          vi: "Không thể kiểm tra quyền truy cập vào bài kiểm tra. Hãy thử mở lại.",
          id: "Tidak dapat memeriksa akses ke ujian. Coba buka lagi.",
          tr: "Sınava erişim kontrol edilemedi. Tekrar açmayı dene.",
          pl: "Nie udało się sprawdzić dostępu do testu. Spróbuj otworzyć go jeszcze raz.",
        }));
        setAccessState('blocked');
        // Keep a late entitlement response from reopening or replacing the fail-closed state.
        cancelled = true;
      }
    }).finally(() => {
      if (accessTimeout) clearTimeout(accessTimeout);
    });
    return () => {
      cancelled = true;
      if (accessTimeout) clearTimeout(accessTimeout);
    };
  }, [accessResolved, frenchExamBlocked, hasPremiumAccess, lang, lvl, reloadPremiumAccess, studyTarget]);

  // зачем (владелец 18.10 07:45: «экранов-ошибок нигде»): французский зачёт закрыт или доступ не проверился —
  // тихо назад к урокам вместо заглушки «…ещё готовится» / «не проверился». Замок Plus/уровня — не ошибка, остаётся.
  const silentLeaveFrench = frenchExamBlocked || (classicExamTarget !== null && accessState === 'blocked' && accessBlockKind === 'error');
  useSilentLeave(silentLeaveFrench, 'level_exam', frenchExamBlocked ? 'french_gate_closed' : 'access_check_failed', () => safeRouterBack(router, '/(tabs)/lessons' as any));

  // зачем (владелец 11.11.2026, «перевести на новые механики»): экзамен уровня всех пяти курсов идёт через новый движок —
  // те же механики Пика и задания из фраз своего курса. Раньше es/de/fr/it шли через встроенный экран ниже с одним видом заданий.
  // Язык курса передаётся движку: задания, попытка, прогресс и достижения пишутся под ключами своего курса.
  // key — смена курса пересоздаёт экран, чтобы попытка одного курса не досталась другому.
  if (!frenchExamBlocked) {
    return (
      <LevelExamV2
        key={classicExamTarget ?? 'en'}
        level={lvl as CourseLevel}
        lang={lang}
        studyTarget={classicExamTarget ?? 'en'}
        accessState={accessState}
        blockedText={blockedText}
        accessBlockKind={accessBlockKind}
      />
    );
  }

  // зачем: сюда доходим только при закрытом курсе — причину ухода пишет useSilentLeave выше, экран-заглушку не показываем
  return <ScreenGradient artBackdrop="exam"><View style={{ flex: 1 }} /></ScreenGradient>;
}
