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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePremium } from '../../components/PremiumContext';
import { useOverlayVisible } from '../../components/OverlayArbiter';
import { useLang } from '../../components/LangContext';
import { useStudyTarget } from '../../components/StudyTargetContext';
import RegistrationPromptModal from '../../components/RegistrationPromptModal';
import { hapticSuccess, hapticCelebrate } from '../../hooks/use-haptics';
import { triLang } from '../../constants/i18n';
import { diagnosticContentAvailableForTarget, frenchDiagnosticGateCopy } from '../diagnostic_target_gate';
import { aiDialogContentAvailableForTarget, frenchAiDialogGateCopy } from '../ai_dialog_target_gate';
import { emitAppEvent } from '../events';
import { AUTH_PROMPT_SHOWN_KEY, getLinkedAuthInfo } from '../auth_provider';
import { flashcardsSourceGatedContentAvailableForTarget, frenchFlashcardsGateCopy } from '../flashcards_target_gate';
import { frenchTrainerGateCopy, trainerSessionContentAvailableForTarget } from '../trainer_target_gate';
import { compassOn } from './compass_flags';
import { loadCompassUserPrefs, type CompassUserPrefs } from './compass_user_prefs';
import { useCompassDay } from './use_compass_day';
import { compassTaskRoute, dayClosingFocusRoute, type CompassRoute } from './compass_task_route';
import { compassInductionRoute } from './compass_induction_route';
import { resolvePronunciationRoute } from './compass_pronunciation_route';
import CompassBriefingModal from './compass_briefing_modal';
import {
  collectCompassSocialNews,
  markSocialNewsSeen,
  type CompassSocialEvent,
} from './compass_social_news';
import type { CompassTask, CompassDay } from './compass_brain';
import {
  EVENING_START_HOUR,
  isDayClosingWindow,
  loadDayClosingRitual,
  markDayClosingSeen,
  type DayClosingRitual,
} from './day_closing_ritual';
import { awardDayClosingOnce } from './day_closing_reward';
import { navigateAfterModalClose } from '../safe_modal_navigation';

const SEEN_KEY_PREFIX = 'compass_briefing_seen_';
const ACCOUNT_LINK_REMINDER_SEEN_KEY = 'compass_account_link_reminder_seen_v1';
const COMPASS_BRIEFING_SUPPRESSED_PATHS = new Set([
  '/premium_modal',
  '/premium_modal_v2',
  '/paywall_a',
  '/paywall_b',
  '/paywall_c',
  '/manage_subscription',
]);

export function isCompassBriefingSuppressedPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const base = pathname.split('?')[0];
  return COMPASS_BRIEFING_SUPPRESSED_PATHS.has(base);
}

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
let _compassDayClosingClosedForKey: string | null = null;
let _compassDayClosingAutoShownForKey: string | null = null;

// Кэш соц-сводки на день (JS-сессия): грузим Firestore один раз ДО показа листа —
// блок «Кстати…» больше не впрыгивает в открытый модал со сдвигом высоты.
let _socialNewsForDay: {
  dayKey: string;
  lines: string[];
  allLines: string[];
  events: CompassSocialEvent[];
} | null = null;

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
  // Часы хоста. ВАЖНО: `now` стабилен между рендерами (иначе эффекты с ним в deps
  // зациклились бы — "Maximum update depth exceeded"). Раньше он замораживался на
  // маунте навсегда: сидишь в приложении с 17:30 — вечер наступил, а ритуал не
  // появлялся до перезапуска; после полуночи dayKey оставался вчерашним. Теперь
  // `now` обновляется по СОБЫТИЯМ (одноразовый таймер до ближайшей границы 18:00 /
  // полуночи + возврат из фона) — без опроса и фоновых циклов.
  const mountNowRef = useRef(Date.now());
  const [nowOverride, setNowOverride] = useState<number | null>(null);
  const now = nowMs ?? nowOverride ?? mountNowRef.current;
  const router = useRouter();
  const pathname = usePathname();
  const { hasPremiumAccess } = usePremium();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { day, loading } = useCompassDay(now);
  const [visible, setVisible] = useState(false);
  const [checkedSeen, setCheckedSeen] = useState(false);
  // Соц-сводка «Кстати…»: короткие строки, полный список для раскрытия + события для markSeen.
  const [socialLines, setSocialLines] = useState<string[]>([]);
  const [socialAllLines, setSocialAllLines] = useState<string[]>([]);
  const [socialEvents, setSocialEvents] = useState<CompassSocialEvent[]>([]);
  const [dayClosing, setDayClosing] = useState<DayClosingRitual | null>(null);
  // Вердикт по вечернему ритуалу получен (в т.ч. «ритуала не будет»). Пока его
  // нет — брифинг не показываем: иначе гонка двух асинхронных загрузок давала
  // «брифинг открылся и на глазах превратился в Итог дня».
  const [dayClosingResolved, setDayClosingResolved] = useState(false);
  const [accountReminderEligible, setAccountReminderEligible] = useState(false);
  const [accountPromptVisible, setAccountPromptVisible] = useState(false);
  const dayKey = todayKey(now);
  // Онбординг должен быть завершён: иначе брифинг всплывает поверх онбординга
  // (экран home смонтирован под оверлеем). null = ещё не проверили.
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  // Постоянный латч знакомства: было ли уже показано приветствие первой встречи.
  // null = ещё не прочитали из хранилища (авто-показ не запускаем до чтения).
  const [welcomeMet, setWelcomeMet] = useState<boolean | null>(null);
  // ПОЛЬЗОВАТЕЛЬСКИЕ настройки Компаса (Настройки → Компас): ученик может
  // выключить утренний брифинг / вечерний итог / голос / соц-сводку. null = ещё
  // не прочитали — до чтения ничего не показываем (как и с onboardingDone).
  const [userPrefs, setUserPrefs] = useState<CompassUserPrefs | null>(null);
  const dayClosingRuntimeKey = dayClosing ? `day_closing_${studyTarget ?? 'default'}_${dayClosing.dateKey}` : null;
  const compassSuppressedByRoute = isCompassBriefingSuppressedPath(pathname);
  // День для модала. hasPremium берём из снимка ритуала (dayClosing.isPremium),
  // а не из живого hasPremiumAccess: мигание премиума при cloud-refresh пересоздавало
  // объект и перезапускало reveal-каскад открытого листа.
  const modalDay = useMemo<CompassDay | null>(() => {
    if (!dayClosing) return day;
    return {
      type: 'day_closing',
      tasks: [],
      hasPremium: dayClosing.isPremium,
      dayClosing,
    };
  }, [day, dayClosing]);

  // Одноразовый таймер до ближайшей границы суток (вечернее окно 18:00 / полночь):
  // сработал → обновили `now` → эффект перепланирует следующую границу. Это цепочка
  // one-shot таймеров по событию, не фоновый цикл.
  useEffect(() => {
    if (nowMs != null || !compassOn()) return;
    const evening = new Date(now);
    evening.setHours(EVENING_START_HOUR, 0, 0, 500);
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 500);
    const next = [evening.getTime(), midnight.getTime()].filter((ts) => ts > now).sort((a, b) => a - b)[0];
    if (!next) return;
    const id = setTimeout(() => setNowOverride(Date.now()), Math.max(1000, next - now));
    return () => clearTimeout(id);
  }, [nowMs, now]);

  // Возврат из фона: если сменилась дата или наступил вечер — обновляем часы
  // (иначе ритуал/брифинг жили по времени последнего маунта).
  useEffect(() => {
    if (nowMs != null || !compassOn()) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const fresh = Date.now();
      const dayChanged = new Date(now).toDateString() !== new Date(fresh).toDateString();
      const eveningEntered = !isDayClosingWindow(now) && isDayClosingWindow(fresh);
      if (dayChanged || eveningEntered) setNowOverride(fresh);
    });
    return () => sub.remove();
  }, [nowMs, now]);

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

  // Пользовательские настройки Компаса (читаем один раз за монтирование; экран
  // настроек пишет их в AsyncStorage — свежее значение подхватится на следующем
  // заходе на home, чаще и не нужно: модалка и так раз в день).
  useEffect(() => {
    if (!compassOn()) return;
    let cancelled = false;
    void loadCompassUserPrefs().then((prefs) => {
      if (!cancelled) setUserPrefs(prefs);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Вечерний ритуал: только локальный снимок дня (AsyncStorage), без signal_bus,
  // без ИИ-голоса и без облачных чтений. Free-tier: полный один раз, дальше
  // запертая витрина раз в несколько дней (каденс внутри loadDayClosingRitual).
  useEffect(() => {
    if (!compassOn() || onboardingDone !== true || userPrefs?.dayClosing !== true) {
      setDayClosing(null);
      // Вердикт «ритуала не будет» известен, как только прочитаны prefs/онбординг.
      setDayClosingResolved(onboardingDone !== null && userPrefs !== null);
      return;
    }
    let cancelled = false;
    setDayClosingResolved(false);
    void (async () => {
      const ritual = await loadDayClosingRitual({ studyTarget, nowMs: now, hasPremiumAccess }).catch(() => null);
      if (cancelled) return;
      // Анти-мигание: не пересоздаём объект, если ритуал по сути тот же (мигание
      // hasPremiumAccess при cloud-refresh дёргало контент открытого листа).
      setDayClosing((prev) =>
        prev && ritual && prev.dateKey === ritual.dateKey && prev.locked === ritual.locked ? prev : ritual,
      );
      setDayClosingResolved(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [studyTarget, now, hasPremiumAccess, onboardingDone, userPrefs]);

  // Соц-сводка «Кстати…»: грузим, когда брифинг ВОТ-ВОТ покажется (те же условия,
  // что и авто-показ) — данные обычно успевают за время slide-in + reveal-каскада,
  // и блок больше не впрыгивает в открытый лист со сдвигом высоты. Кэш на день
  // (модульный) страхует от повторных чтений Firestore при ремаунте/мигании
  // премиума. Помечаем seen только при закрытии (markSeen), чтобы тост-фолбэк
  // не задвоил, если юзер закрыл, не посмотрев.
  const briefingEligible =
    !dayClosing &&
    dayClosingResolved &&
    userPrefs?.briefing === true &&
    onboardingDone === true &&
    checkedSeen &&
    !loading &&
    !!day &&
    (day.type === 'first_day' || day.type === 'comeback' || hasPremiumAccess);
  useEffect(() => {
    if (!compassOn() || dayClosing) return;
    if (!visible && !briefingEligible) return;
    if (_socialNewsForDay?.dayKey === dayKey) {
      setSocialLines(_socialNewsForDay.lines);
      setSocialAllLines(_socialNewsForDay.allLines);
      setSocialEvents(_socialNewsForDay.events);
      return;
    }
    let cancelled = false;
    void (async () => {
      const news = await collectCompassSocialNews(lang, now).catch(() => ({ lines: [], allLines: [], events: [] }));
      if (cancelled) return;
      _socialNewsForDay = { dayKey, ...news };
      setSocialLines(news.lines);
      setSocialAllLines(news.allLines);
      setSocialEvents(news.events);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, briefingEligible, lang, now, dayKey, dayClosing]);

  useEffect(() => {
    if (!compassOn()) return;
    const planDayIndex = day?.planDayIndex ?? 0;
    if (onboardingDone !== true || !day || planDayIndex < 2) {
      setAccountReminderEligible(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const reminderSeen = await AsyncStorage.getItem(ACCOUNT_LINK_REMINDER_SEEN_KEY).catch(() => '1');
      if (reminderSeen != null) {
        if (!cancelled) setAccountReminderEligible(false);
        return;
      }
      const authPromptShown = await AsyncStorage.getItem(AUTH_PROMPT_SHOWN_KEY).catch(() => '1');
      if (authPromptShown != null) {
        if (!cancelled) setAccountReminderEligible(false);
        return;
      }
      const linked = await getLinkedAuthInfo().catch(() => null);
      if (!cancelled) setAccountReminderEligible(linked == null);
    })();
    return () => {
      cancelled = true;
    };
  }, [day, onboardingDone]);

  const markAccountReminderSeen = useCallback(() => {
    if (!accountReminderEligible) return;
    setAccountReminderEligible(false);
    void AsyncStorage.setItem(ACCOUNT_LINK_REMINDER_SEEN_KEY, '1').catch(() => {});
  }, [accountReminderEligible]);

  const markSeen = useCallback(() => {
    if (dayClosing && dayClosingRuntimeKey) {
      _compassDayClosingClosedForKey = dayClosingRuntimeKey;
      // Вечер закрыт — «утренний» брифинг сегодня уже не к месту: латчим и его,
      // иначе сразу после «Увидимся утром» всплывал ВТОРОЙ модал с планом дня.
      _compassBriefingClosedForDay = dayKey;
      void AsyncStorage.setItem(dayKey, '1').catch(() => {});
      void markDayClosingSeen({
        studyTarget,
        dateKey: dayClosing.dateKey,
        hasPremiumAccess,
        locked: !!dayClosing.locked,
      }).catch(() => {});
      // НЕ обнуляем dayClosing: пока модалка уезжает (slide-out), контент листа
      // не должен на глазах подменяться брифингом. Латчи выше держат «не показывать».
      return;
    }
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
  }, [dayClosing, dayClosingRuntimeKey, studyTarget, hasPremiumAccess, dayKey, socialEvents, day]);

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
    if (compassSuppressedByRoute) return;
    if (dayClosing && dayClosingRuntimeKey) {
      if (_compassDayClosingClosedForKey === dayClosingRuntimeKey) return;
      if (_compassDayClosingAutoShownForKey === dayClosingRuntimeKey) {
        setVisible(true);
        return;
      }
      _compassDayClosingAutoShownForKey = dayClosingRuntimeKey;
      setVisible(true);
      return;
    }
    if (_compassBriefingClosedForDay === dayKey) return;
    // Знакомство уже состоялось → приветствие первой встречи больше не авто-показываем
    // (стоит ПЕРЕД веткой восстановления, чтобы ремаунт не вернул уже показанное
    // приветствие). comeback/план-дни проходят дальше как обычно.
    const suppressWelcome = welcomeMet === true && day?.type === 'first_day';
    if (suppressWelcome) return;
    // Анти-гонка: пока вердикт по вечернему ритуалу не готов, брифинг не показываем —
    // иначе он успевал открыться и на глазах превращался в «Итог дня».
    if (!dayClosingResolved) return;
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
      userPrefs?.briefing === true &&
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
  }, [checkedSeen, loading, day, hasPremiumAccess, onboardingDone, dayKey, welcomeMet, dayClosing, dayClosingRuntimeKey, compassSuppressedByRoute, userPrefs, dayClosingResolved]);

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

  const pushRoute = useCallback((route: CompassRoute) => {
    router.push(route.params ? { pathname: route.pathname, params: route.params } as never : route.pathname as never);
  }, [router]);

  const handleStart = useCallback(() => {
    if (dayClosing) {
      // Праздничную вибрацию уже сыграла панель ритуала (hapticCelebrate в момент
      // нажатия «Закрыть день»); здесь только помечаем и закрываем.
      markSeen();
      setVisible(false);
      return;
    }
    // Кульминация брифинга — сильный тёплый отклик на ФАКТ старта дня.
    // Приветственные дни (первая встреча / возврат) заслуживают праздничной
    // двойной вибрации; обычный день — обычный «успех». Анти-наложение и
    // уважение к настройке хаптика — внутри слоя use-haptics.
    const isWelcomeStart = day?.type === 'first_day' || day?.type === 'comeback';
    void (isWelcomeStart ? hapticCelebrate() : hapticSuccess());
    markAccountReminderSeen();
    markSeen();
    setVisible(false);
    // «Поехали» у welcome-дня БЕЗ полного доступа раньше вёл прямо в пейвол
    // (тёплое знакомство → холодный душ оплатой). Теперь бесплатный старт ведёт
    // в индакшн-фичу дня — осмысленный первый шаг; план остаётся премиум-путём.
    if (isWelcomeStart && !hasPremiumAccess) {
      const feature = day?.inductionFeature;
      pushRoute(resolveSourceGatedRoute(feature ? compassInductionRoute(feature) : { pathname: '/(tabs)/lessons' }));
      return;
    }
    onStartDay?.();
  }, [dayClosing, markSeen, onStartDay, day, markAccountReminderSeen, hasPremiumAccess, resolveSourceGatedRoute, pushRoute]);

  const handleLater = useCallback(() => {
    if (dayClosing) {
      markSeen();
      setVisible(false);
      return;
    }
    markAccountReminderSeen();
    markSeen();
    setVisible(false);
  }, [dayClosing, markSeen, markAccountReminderSeen]);

  // Мост к полному доступу с запертого вечернего ритуала: день помечаем
  // показанным, модалку закрываем БЕЗ гонки с навигацией (navigateAfterModalClose)
  // и открываем пейвол со своим контекстом. Путь /premium_modal входит в
  // COMPASS_BRIEFING_SUPPRESSED_PATHS — брифинг не всплывёт поверх пейвола.
  const handleDayClosingUpgrade = useCallback(() => {
    markSeen();
    navigateAfterModalClose(
      () => setVisible(false),
      () => router.push({ pathname: '/premium_modal', params: { context: 'compass_day_closing' } } as never),
    );
  }, [markSeen, router]);

  // Тап по «Фокусу на завтра» в полном вечернем ритуале: шаг получает ручку —
  // открываем его экран прямо сейчас. День при этом закрываем честно: XP
  // начисляется идемпотентно (awardDayClosingOnce), день помечается показанным.
  const handleDayClosingFocusPress = useCallback(() => {
    if (!dayClosing || dayClosing.locked) return;
    void hapticSuccess();
    void awardDayClosingOnce({ studyTarget, ritual: dayClosing, lang }).catch(() => {});
    const route = resolveSourceGatedRoute(dayClosingFocusRoute(dayClosing));
    markSeen();
    navigateAfterModalClose(
      () => setVisible(false),
      () => pushRoute(route),
    );
  }, [dayClosing, studyTarget, lang, resolveSourceGatedRoute, markSeen, pushRoute]);

  // Тап по конкретной задаче дня: помечаем показ, закрываем и открываем её экран.
  // Для «повтори вслух» пытаемся открыть задачу произношения текущего дня плана
  // напрямую (она есть в каждом дне плана); если активного плана нет — fallback.
  const handleTaskPress = useCallback((task: CompassTask) => {
    // Тап по конкретной задаче — тоже старт дела дня: тёплый «успех».
    // Лёгкий tap нажатия уже сыграл в модалке (onPressIn); анти-наложение в
    // слое не даст им слиться в один сильный удар.
    void hapticSuccess();
    markAccountReminderSeen();
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
  }, [markSeen, router, day, resolveSourceGatedRoute, markAccountReminderSeen]);

  // Пропускаем показ через OverlayArbiter: на главной несколько `Modal` со
  // statusBarTranslucent (празднование премиума/VIP и т.п.) одновременно подвешивают
  // System UI на Android (см. OverlayArbiter.tsx) — это и был фриз каскада после
  // онбординга (Компас всплывал ПОВЕРХ празднования). Арбитр держит ровно одну
  // модалку: брифинг ждёт своей очереди и не стекается с другими.
  const arbitratedVisible = useOverlayVisible('compassBriefing', visible && !compassSuppressedByRoute);

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
  if (!compassOn() || compassSuppressedByRoute || (!dayClosing && !hasPremiumAccess && !isWelcomeDay)) return null;

  // Тап по индакшн-подсказке «попробуй первым»: закрываем брифинг и ведём в фичу.
  const handleInductionPress = (feature: NonNullable<CompassDay['inductionFeature']>) => {
    // Зов «попробуй первым» — старт знакомства с фичей: тёплый «успех».
    void hapticSuccess();
    markAccountReminderSeen();
    markSeen();
    setVisible(false);
    const route = resolveSourceGatedRoute(compassInductionRoute(feature));
    router.push(route.params ? { pathname: route.pathname, params: route.params } as never : route.pathname as never);
  };

  const accountReminderCopy = accountReminderEligible
    ? {
        eyebrow: triLang(lang, {
          ru: 'Кстати',
          uk: 'До речі',
          es: 'Por cierto',
          'pt-BR': 'Aliás',
          vi: 'Nhân tiện',
          id: 'Ngomong-ngomong',
          tr: 'Bu arada',
          pl: 'Przy okazji',
        }),
        title: triLang(lang, {
          ru: 'Ты сейчас учишься без аккаунта',
          uk: 'Ти зараз вчишся без акаунта',
          es: 'Estás aprendiendo sin cuenta',
          'pt-BR': 'Você está aprendendo sem conta',
          vi: 'Bạn đang học mà chưa có tài khoản',
          id: 'Kamu belajar tanpa akun',
          tr: 'Şu an hesapsız öğreniyorsun',
          pl: 'Uczysz się bez konta',
        }),
        body: triLang(lang, {
          ru: 'Это нормально. Но если сменить телефон или удалить приложение, прогресс можно потерять. Не настаиваю, но очень рекомендую привязать аккаунт.',
          uk: 'Це нормально. Але якщо змінити телефон або видалити застосунок, прогрес можна втратити. Не наполягаю, але дуже раджу привʼязати акаунт.',
          es: 'Está bien. Pero si cambias de móvil o borras la app, podrías perder el progreso. No insisto, pero te recomiendo vincular la cuenta.',
          'pt-BR': 'Tudo bem. Mas se trocar de celular ou apagar o app, você pode perder o progresso. Não vou insistir, mas recomendo vincular a conta.',
          vi: 'Không sao cả. Nhưng nếu đổi điện thoại hoặc xoá ứng dụng, bạn có thể mất tiến trình. Mình không ép, nhưng rất nên liên kết tài khoản.',
          id: 'Tidak apa-apa. Tapi kalau ganti ponsel atau menghapus aplikasi, progres bisa hilang. Tidak memaksa, tapi sebaiknya tautkan akun.',
          tr: 'Sorun değil. Ama telefon değiştirirsen ya da uygulamayı silersen ilerlemen kaybolabilir. Israr etmiyorum, ama hesabını bağlamanı öneririm.',
          pl: 'To w porządku. Ale po zmianie telefonu albo usunięciu aplikacji możesz stracić postępy. Nie naciskam, ale warto połączyć konto.',
        }),
        cta: triLang(lang, {
          ru: 'Привязать аккаунт',
          uk: 'Привʼязати акаунт',
          es: 'Vincular cuenta',
          'pt-BR': 'Vincular conta',
          vi: 'Liên kết tài khoản',
          id: 'Tautkan akun',
          tr: 'Hesabı bağla',
          pl: 'Połącz konto',
        }),
      }
    : null;

  const handleAccountLinkPress = () => {
    markAccountReminderSeen();
    markSeen();
    navigateAfterModalClose(
      () => setVisible(false),
      () => setAccountPromptVisible(true),
    );
  };

  return (
    <>
      <CompassBriefingModal
        visible={arbitratedVisible}
        day={modalDay}
        socialLines={dayClosing ? [] : socialLines}
        socialAllLines={dayClosing ? [] : socialAllLines}
        accountReminder={dayClosing ? null : accountReminderCopy}
        onAccountLinkPress={handleAccountLinkPress}
        onStart={handleStart}
        onLater={handleLater}
        onTaskPress={handleTaskPress}
        onInductionPress={handleInductionPress}
        onDayClosingUpgrade={handleDayClosingUpgrade}
        onDayClosingFocusPress={handleDayClosingFocusPress}
      />
      <RegistrationPromptModal
        visible={accountPromptVisible}
        context="compass"
        title={triLang(lang, {
          ru: 'Сохрани свой путь',
          uk: 'Збережи свій шлях',
          es: 'Guarda tu progreso',
          'pt-BR': 'Salve seu caminho',
          vi: 'Lưu hành trình của bạn',
          id: 'Simpan perjalananmu',
          tr: 'Yolunu kaydet',
          pl: 'Zapisz swoją drogę',
        })}
        subtitle={triLang(lang, {
          ru: 'Кстати: вижу, ты учишься без аккаунта. Это нормально, но прогресс будет спокойнее привязать к Google или Apple.',
          uk: 'До речі: бачу, ти вчишся без акаунта. Це нормально, але прогрес спокійніше привʼязати до Google або Apple.',
          es: 'Por cierto: estás aprendiendo sin cuenta. Está bien, pero tu progreso estará más tranquilo con Google o Apple.',
          'pt-BR': 'Aliás: você está aprendendo sem conta. Tudo bem, mas seu progresso fica mais seguro com Google ou Apple.',
          vi: 'Nhân tiện: bạn đang học mà chưa có tài khoản. Không sao, nhưng tiến trình sẽ an toàn hơn với Google hoặc Apple.',
          id: 'Ngomong-ngomong: kamu belajar tanpa akun. Tidak apa-apa, tapi progres lebih aman dengan Google atau Apple.',
          tr: 'Bu arada: hesapsız öğreniyorsun. Sorun değil, ama ilerlemen Google veya Apple ile daha güvende olur.',
          pl: 'Przy okazji: uczysz się bez konta. To w porządku, ale postępy będą bezpieczniejsze z Google lub Apple.',
        })}
        onClose={() => setAccountPromptVisible(false)}
        onSignedIn={() => {
          setAccountPromptVisible(false);
          setAccountReminderEligible(false);
        }}
      />
    </>
  );
}
