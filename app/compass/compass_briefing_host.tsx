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
import { hapticSuccess, hapticCelebrate } from '../../hooks/use-haptics';
import { compassOn } from './compass_flags';
import { useCompassDay } from './use_compass_day';
import { compassTaskRoute } from './compass_task_route';
import { compassInductionRoute } from './compass_induction_route';
import { resolvePronunciationRoute } from './compass_pronunciation_route';
import CompassBriefingModal from './compass_briefing_modal';
import type { CompassTask, CompassDay } from './compass_brain';

const SEEN_KEY_PREFIX = 'compass_briefing_seen_';

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
  const { day, loading } = useCompassDay(now);
  const [visible, setVisible] = useState(false);
  const [checkedSeen, setCheckedSeen] = useState(false);
  const dayKey = todayKey(now);
  // Онбординг должен быть завершён: иначе брифинг всплывает поверх онбординга
  // (экран home смонтирован под оверлеем). null = ещё не проверили.
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

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

  const markSeen = useCallback(() => {
    // Вызывается ТОЛЬКО при намеренном закрытии юзером (Начать/Позже/тап по задаче).
    // Латчим СИНХРОННО в модульной переменной (переживает remount), потом пишем в
    // AsyncStorage (переживает перезапуск приложения). Синхронный латч — главное:
    // он гасит повторный показ до того, как асинхронная запись успеет завершиться.
    _compassBriefingClosedForDay = dayKey;
    void AsyncStorage.setItem(dayKey, '1').catch(() => {});
  }, [dayKey]);

  // Показываем, только когда: онбординг завершён, день готов, есть реальная история
  // (тип ≠ first_day) и сегодня ещё не закрывали. Чистый лист брифингом не дёргаем.
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
      checkedSeen &&
      !loading &&
      day &&
      (isWelcomeDay || hasPremiumAccess)
    ) {
      _compassBriefingAutoShownForDay = dayKey;
      setVisible(true);
    }
  }, [checkedSeen, loading, day, hasPremiumAccess, onboardingDone, dayKey]);

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
      router.push(route.params ? { pathname: route.pathname, params: route.params } as never : route.pathname as never);
    })();
  }, [markSeen, router, day]);

  // Пропускаем показ через OverlayArbiter: на главной несколько `Modal` со
  // statusBarTranslucent (празднование премиума/VIP и т.п.) одновременно подвешивают
  // System UI на Android (см. OverlayArbiter.tsx) — это и был фриз каскада после
  // онбординга (Компас всплывал ПОВЕРХ празднования). Арбитр держит ровно одну
  // модалку: брифинг ждёт своей очереди и не стекается с другими.
  const arbitratedVisible = useOverlayVisible('compassBriefing', visible);

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
    const route = compassInductionRoute(feature);
    router.push(route.params ? { pathname: route.pathname, params: route.params } as never : route.pathname as never);
  };

  return (
    <CompassBriefingModal
      visible={arbitratedVisible}
      day={day}
      onStart={handleStart}
      onLater={handleLater}
      onTaskPress={handleTaskPress}
      onInductionPress={handleInductionPress}
    />
  );
}
