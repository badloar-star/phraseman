/**
 * Компас — хост брифинга. ОБОЛОЧКА, Волна 2.3.
 *
 * Самодостаточный компонент: сам грузит «День» (хук) и сам управляет показом
 * модала один раз за день. Сделан так, чтобы подключение на главный экран было
 * ОДНОЙ строкой `<CompassBriefingHost />` за флагом — без правки логики home.
 *
 * ИЗОЛЯЦИЯ: при выключенном Компасе рендерит null и ничего не грузит. Премиум —
 * брифинг только для тех, у кого есть доступ (план — Premium-фича).
 *
 * Показ «раз в день» хранится локально (AsyncStorage), чтобы не всплывать при
 * каждом возврате на главную.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePremium } from '../../components/PremiumContext';
import { useOverlayVisible } from '../../components/OverlayArbiter';
import { useLang } from '../../components/LangContext';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { hapticSuccess, hapticCelebrate } from '../../hooks/use-haptics';
import { diagnosticContentAvailableForTarget, frenchDiagnosticGateCopy } from '../diagnostic_target_gate';
import { aiDialogContentAvailableForTarget, frenchAiDialogGateCopy } from '../ai_dialog_target_gate';
import { emitAppEvent } from '../events';
import { flashcardsSourceGatedContentAvailableForTarget, frenchFlashcardsGateCopy } from '../flashcards_target_gate';
import { frenchTrainerGateCopy, trainerSessionContentAvailableForTarget } from '../trainer_target_gate';
import { compassOn } from './compass_flags';
import { useCompassDay } from './use_compass_day';
import { compassTaskRoute, type CompassRoute } from './compass_task_route';
import { compassInductionRoute } from './compass_induction_route';
import { resolvePronunciationRoute } from './compass_pronunciation_route';
import CompassBriefingModal from './compass_briefing_modal';
import {
  collectCompassSocialNews,
  markSocialNewsSeen,
  type CompassSocialEvent,
} from './compass_social_news';
import type { CompassTask, CompassDay } from './compass_brain';

const SEEN_KEY_PREFIX = 'compass_briefing_seen_';

// ПОСТОЯННЫЙ латч «знакомство с Компасом состоялось» — ставится один раз, когда
// пользователь намеренно закрыл ИМЕННО приветствие первой встречи (first_day).
// НЕ календарный: после установки приветствие first_day больше не авто-показывается
// никогда. comeback (возврат после паузы) и план-дни этим ключом НЕ затрагиваются.
const WELCOME_MET_KEY = 'compass_welcome_met_v1';

function todayKey(nowMs: number): string {
  const d = new Date(nowMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${SEEN_KEY_PREFIX}${y}-${m}-${day}`;
}

// МОДУЛЬНЫЙ latch ЗАКРЫТИЯ (живёт всю сессию JS-бандла, переживает ПЕРЕМОНТИРОВАНИЕ
// хоста). Ставится ТОЛЬКО когда юзер намеренно закрыл брифинг (Начать день / Позже /
// тап по задаче) — см. markSeen. Пока он не стоит за сегодня, показ ВОССТАНАВЛИВАЕТСЯ
// после ремаунта (мигание hasPremiumAccess при фоновом cloud-refresh, Fast Refresh,
// ремаунт поддерева home, навигация). Раньше латч ставился синхронно в момент ПОКАЗА —
// тогда первый же ремаунт хоста гасил модалку через cleanup useOverlayVisible
// (setWants(false)), а латч не давал ей вернуться → «открылась и сразу закрылась сама».
let _compassBriefingClosedForDay: string | null = null;

// МОДУЛЬНЫЙ latch ПОКАЗА в этой JS-сессии. Нужен, чтобы авто-показ сработал РОВНО один
// раз: если что-то снаружи гасит модалку (не юзер), мы НЕ переоткрываем её по кругу
// (анти-мигание). Сбрасывается в false при намеренном закрытии не нужно — день уже
// латчится _compassBriefingClosedForDay. Живёт до перезапуска бандла.
let _compassBriefingAutoShownForDay: string | null = null;

// Признак «брифинг СЕЙЧАС на экране» — читается тостом-фолбэком соц-сводки, чтобы
// не показать тост одновременно с блоком «Кстати…» в открытой модалке. Живёт в
// модуле (как и латчи) — общий на JS-сессию.
let _compassBriefingOnScreen = false;

/** true, если модалка брифинга Компаса сейчас показана (для тоста-фолбэка соц-сводки). */
export function isCompassBriefingOnScreen(): boolean {
  return _compassBriefingOnScreen;
}

interface CompassBriefingHostProps {
  /** Колбэк «начать день» — навигация решается вызывающим экраном (home). */
  onStartDay?: () => void;
  /** Текущее время (мс). Передаётся для тестируемости; по умолчанию — now. */
  nowMs?: number;
}

export default function CompassBriefingHost({ onStartDay, nowMs }: CompassBriefingHostProps) {
  // ВАЖНО: фиксируем `now`, иначе при отсутствии nowMs `Date.now()` даёт новое
  // значение на каждом рендере → эффекты с `now` в deps (здесь и в useCompassDay)
  // зацикливаются на setState → "Maximum update depth exceeded".
  const now = useMemo(() => nowMs ?? Date.now(), [nowMs]);
  const router = useRouter();
  const { hasPremiumAccess } = usePremium();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { day, loading } = useCompassDay(now);
  const [visible, setVisible] = useState(false);
  const [checkedSeen, setCheckedSeen] = useState(false);
  // Соц-сводка «Кстати…»: строки для блока + события для markSeen на закрытии.
  const [socialLines, setSocialLines] = useState<string[]>([]);
  const [socialEvents, setSocialEvents] = useState<CompassSocialEvent[]>([]);
  const dayKey = todayKey(now);
  // Онбординг должен быть завершён: иначе брифинг всплывает поверх онбординга
  // (экран home смонтирован под оверлеем). null = ещё не проверили.
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  // Постоянный латч знакомства: было ли уже показано приветствие первой встречи.
  // null = ещё не прочитали из хранилища (авто-показ не запускаем до чтения).
  const [welcomeMet, setWelcomeMet] = useState<boolean | null>(null);

  // Один показ в день: проверяем локальный маркер. Не гейтим премиумом — само
  // решение «показывать ли» учитывает премиум ниже (приветственные дни видны всем,
  // план-дни — только премиуму). Чтение маркера дешёвое и безвредное.
  useEffect(() => {
    if (!compassOn()) return;
    let cancelled = false;
    void (async () => {
      const seen = await AsyncStorage.getItem(todayKey(now)).catch(() => null);
      // checkedSeen === true означает «сегодня ещё НЕ показывали» (можно показать).
      if (!cancelled) setCheckedSeen(seen == null);
    })();
    return () => {
      cancelled = true;
    };
  }, [now]);

  // Завершён ли онбординг (читаем один раз). Без премиум-гейта — см. выше.
  useEffect(() => {
    if (!compassOn()) return;
    let cancelled = false;
    void (async () => {
      const done = await AsyncStorage.getItem('onboarding_done').catch(() => null);
      if (!cancelled) setOnboardingDone(done === '1');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Состоялось ли уже знакомство с Компасом (постоянный латч, читаем один раз).
  // Пока welcomeMet === null, авто-показ приветствия первой встречи не запускаем.
  useEffect(() => {
    if (!compassOn()) return;
    let cancelled = false;
    void (async () => {
      const met = await AsyncStorage.getItem(WELCOME_MET_KEY).catch(() => null);
      if (!cancelled) setWelcomeMet(met === '1');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Соц-сводка «Кстати…»: грузим РОВНО когда брифинг стал видимым (не раньше —
  // незачем читать Firestore, если модалка сегодня не покажется). Помечаем seen
  // только при закрытии (handleStart/handleLater/handleTaskPress → markSeen),
  // чтобы тост-фолбэк не задвоил, если юзер закрыл, не посмотрев.
  useEffect(() => {
    if (!compassOn() || !visible) return;
    let cancelled = false;
    void (async () => {
      const news = await collectCompassSocialNews(lang, now).catch(() => ({ lines: [], events: [] }));
      if (cancelled) return;
      setSocialLines(news.lines);
      setSocialEvents(news.events);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, lang, now]);

  const markSeen = useCallback(() => {
    // Вызывается ТОЛЬКО при намеренном закрытии юзером (Начать/Позже/тап по задаче).
    // Латчим СИНХРОННО в модульной переменной (переживает remount), потом пишем в
    // AsyncStorage (переживает перезапуск приложения). Синхронный латч — главное:
    // он гасит повторный показ до того, как асинхронная запись успеет завершиться.
    _compassBriefingClosedForDay = dayKey;
    void AsyncStorage.setItem(dayKey, '1').catch(() => {});
    // Знакомство засчитываем НАВСЕГДА только для приветствия первой встречи
    // (first_day). После этого приветствие первой встречи больше не авто-показывается.
    // comeback (возврат после паузы) сюда НЕ попадает — он должен повторяться.
    if (day?.type === 'first_day') {
      setWelcomeMet(true);
      void AsyncStorage.setItem(WELCOME_MET_KEY, '1').catch(() => {});
    }
    // Соц-сводку, которую юзер увидел в брифинге, помечаем показанной — иначе
    // тост-фолбэк или завтрашний брифинг повторят те же заявки/лайки.
    if (socialEvents.length > 0) {
      void markSocialNewsSeen(socialEvents).catch(() => {});
    }
  }, [dayKey, socialEvents, day]);

  // Показываем, только когда: онбординг завершён, день готов и сегодня ещё не
  // закрывали. Приветствие первой встречи (first_day) показываем при чистом листе,
  // но РОВНО ОДИН РАЗ за всё время — после знакомства его глушит постоянный латч
  // compass_welcome_met_v1 (welcomeMet). comeback (возврат после паузы) и план-дни
  // премиума под этот латч НЕ попадают — у них своя дневная логика повтора.
  //
  // ДВА МОДУЛЬНЫХ ЛАТЧА (оба переживают ремаунт хоста — мигание hasPremiumAccess при
  // фоновом cloud-refresh, Fast Refresh, ремаунт home, навигация):
  //  • _compassBriefingClosedForDay — юзер закрыл брифинг сегодня → больше не показываем.
  //  • _compassBriefingAutoShownForDay — авто-показ сегодня уже случался. Используем его,
  //    чтобы ВОССТАНОВИТЬ visible после ремаунта (когда локальный setVisible(false)
  //    сбросился, а юзер ещё не закрывал) — но РОВНО один раз восстанавливаем, без
  //    повторного запуска всей проверки. Это снимает и «открылось-и-сразу-пропало»
  //    (теперь показ переживает ремаунт), и старое «бесконечное мигание» (не
  //    переоткрываем по кругу, если модалку гасит что-то снаружи, а не юзер).
  useEffect(() => {
    if (_compassBriefingClosedForDay === dayKey) return;
    // Знакомство уже состоялось → приветствие первой встречи больше не авто-показываем
    // (стоит ПЕРЕД веткой восстановления, чтобы ремаунт не вернул уже показанное
    // приветствие). comeback/план-дни проходят дальше как обычно.
    const suppressWelcome = welcomeMet === true && day?.type === 'first_day';
    if (suppressWelcome) return;
    // Восстановление после ремаунта: авто-показ за сегодня уже был, юзер не закрывал —
    // вернуть видимость, не перезапуская проверку условий.
    if (_compassBriefingAutoShownForDay === dayKey) {
      setVisible(true);
      return;
    }
    // Приветственные дни (первый день / возврат после паузы) — персональный
    // привет от Компаса: показываем ВСЕМ, включая бесплатных (это знакомство с
    // Компасом и индакшн в фичу, а не план-фича). Остальные дни (easy/deep_dive/
    // repair) ведут по плану — они только для премиума, как и раньше.
    const isWelcomeDay = day?.type === 'first_day' || day?.type === 'comeback';
    if (
      compassOn() &&
      onboardingDone === true &&
      welcomeMet !== null &&
      checkedSeen &&
      !loading &&
      day &&
      (isWelcomeDay || hasPremiumAccess)
    ) {
      _compassBriefingAutoShownForDay = dayKey;
      setVisible(true);
    }
  }, [checkedSeen, loading, day, hasPremiumAccess, onboardingDone, dayKey, welcomeMet]);

  const handleStart = useCallback(() => {
    // Кульминация брифинга — сильный тёплый отклик на ФАКТ старта дня.
    // Приветственные дни (первая встреча / возврат) заслуживают праздничной
    // двойной вибрации; обычный день — обычный «успех». Анти-наложение и
    // уважение к настройке хаптика — внутри слоя use-haptics.
    const isWelcomeStart = day?.type === 'first_day' || day?.type === 'comeback';
    void (isWelcomeStart ? hapticCelebrate() : hapticSuccess());
    markSeen();
    setVisible(false);
    onStartDay?.();
  }, [markSeen, onStartDay, day]);

  const handleLater = useCallback(() => {
    markSeen();
    setVisible(false);
  }, [markSeen]);

  const resolveSourceGatedRoute = useCallback((route: CompassRoute): CompassRoute => {
    if (
      route.pathname === '/flashcards_swipe' &&
      !flashcardsSourceGatedContentAvailableForTarget(studyTarget, 'system_cards')
    ) {
      const copy = frenchFlashcardsGateCopy(lang);
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: copy.title,
        messageUk: copy.title,
        messageEs: 'French flashcards are still behind source gate.',
      });
      return { pathname: '/flashcards' };
    }
    if (route.pathname === '/trainer' && !trainerSessionContentAvailableForTarget(studyTarget)) {
      const copy = frenchTrainerGateCopy(lang);
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: copy.title,
        messageUk: copy.title,
        messageEs: 'French trainer is still behind source gate.',
      });
      return { pathname: '/(tabs)/lessons' };
    }
    if (route.pathname === '/diagnostic_test' && !diagnosticContentAvailableForTarget(studyTarget)) {
      const copy = frenchDiagnosticGateCopy(lang);
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: copy.title,
        messageUk: copy.title,
        messageEs: 'French diagnostic is still behind source gate.',
      });
      return { pathname: '/(tabs)/lessons' };
    }
    if (route.pathname === '/ai_dialog_home' && !aiDialogContentAvailableForTarget(studyTarget)) {
      const copy = frenchAiDialogGateCopy(lang);
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: copy.title,
        messageUk: copy.title,
        messageEs: 'French AI dialogs are still behind source gate.',
      });
      return { pathname: '/(tabs)/lessons' };
    }
    return route;
  }, [lang, studyTarget]);

  // Тап по конкретной задаче дня: помечаем показ, закрываем и открываем её экран.
  // Для «повтори вслух» пытаемся открыть задачу произношения текущего дня плана
  // напрямую (она есть в каждом дне плана); если активного плана нет — fallback.
  const handleTaskPress = useCallback((task: CompassTask) => {
    // Тап по конкретной задаче — тоже старт дела дня: тёплый «успех».
    // Лёгкий tap нажатия уже сыграл в модалке (onPressIn); анти-наложение в
    // слое не даст им слиться в один сильный удар.
    void hapticSuccess();
    markSeen();
    setVisible(false);
    void (async () => {
      let route = compassTaskRoute(task, day);
      if (task.kind === 'pronunciation') {
        const direct = await resolvePronunciationRoute();
        if (direct) route = direct;
      }
      route = resolveSourceGatedRoute(route);
      router.push(route.params ? { pathname: route.pathname, params: route.params } as never : route.pathname as never);
    })();
  }, [markSeen, router, day, resolveSourceGatedRoute]);

  // Пропускаем показ через OverlayArbiter: на главной несколько `Modal` со
  // statusBarTranslucent (празднование премиума/VIP и т.п.) одновременно подвешивают
  // System UI на Android (см. OverlayArbiter.tsx) — это и был фриз каскада после
  // онбординга (Компас всплывал ПОВЕРХ празднования). Арбитр держит ровно одну
  // модалку: брифинг ждёт своей очереди и не стекается с другими.
  const arbitratedVisible = useOverlayVisible('compassBriefing', visible);

  // Сообщаем тосту-фолбэку соц-сводки, что брифинг сейчас на экране — пока модалка
  // открыта, тост не должен дублировать блок «Кстати…».
  useEffect(() => {
    _compassBriefingOnScreen = arbitratedVisible;
    return () => {
      _compassBriefingOnScreen = false;
    };
  }, [arbitratedVisible]);

  // Рендерим, если Компас включён И (есть премиум ИЛИ это приветственный день).
  // Приветствие первого дня/возврата — знакомство с Компасом, доступно бесплатным;
  // план-дни остаются премиумными (для них visible не выставится выше).
  const isWelcomeDay = day?.type === 'first_day' || day?.type === 'comeback';
  if (!compassOn() || (!hasPremiumAccess && !isWelcomeDay)) return null;

  // Тап по индакшн-подсказке «попробуй первым»: закрываем брифинг и ведём в фичу.
  const handleInductionPress = (feature: NonNullable<CompassDay['inductionFeature']>) => {
    // Зов «попробуй первым» — старт знакомства с фичей: тёплый «успех».
    void hapticSuccess();
    markSeen();
    setVisible(false);
    const route = resolveSourceGatedRoute(compassInductionRoute(feature));
    router.push(route.params ? { pathname: route.pathname, params: route.params } as never : route.pathname as never);
  };

  return (
    <CompassBriefingModal
      visible={arbitratedVisible}
      day={day}
      socialLines={socialLines}
      onStart={handleStart}
      onLater={handleLater}
      onTaskPress={handleTaskPress}
      onInductionPress={handleInductionPress}
    />
  );
}
