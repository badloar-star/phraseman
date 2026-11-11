// ═══════════════════════════════════════════════════════════════════════════
// WelcomeGate.tsx — «шлюз» приветствия B-3: показывает ApprovedWelcome ОДИН раз новому пользователю.
//
// зачем (владелец 04.11 + координатор): новый = онбординг завершён после выхода версии (метка onboarding_completed_at_ms_v1 ≥ RANK_GATES_NEW_USERS_SINCE_MS, нет прежнего прогресса) —
// решение readRankGateUserVerdict; приветствие ещё не показывалось (ключ AsyncStorage). «Дальше» 1→2→3, последний экран ведёт к занятиям, «Пропустить» — на Главную.
// Отдельный файл, чтобы не трогать CleanOnboarding.tsx; Главная монтирует шлюз одной строкой. Только AsyncStorage, Firebase не читается.
import React, { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Modal } from 'react-native';

import { readRankGateUserVerdict } from '../../app/rank_gates_new_user';
import { useLang } from '../LangContext';
import { useStudyTarget } from '../StudyTargetContext';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { useActiveAccountOwner } from '../../hooks/use_active_account_owner';
import { useOverlayVisible } from '../OverlayArbiter';
import { useTabNav } from '../../app/TabContext';
import type { Lang } from '../../constants/i18n';
import { useSpirePalette } from '../spire/useSpirePalette';
import { ApprovedWelcome } from './ApprovedWelcome';
import { welcomeDimColor } from './welcome_dim';
import { insteadStoryLanded, recordHelloStory, storiesReplaceWindows } from '../../modules/story_events/story_instead_sources';

/**
 * Отметка «приветствие показано» — НА АККАУНТ (владелец 04.11): удаление аккаунта, выход и второй человек на том же телефоне не наследуют чужую отметку.
 * Лежит в уже стираемом семействе `story_events_v1:` (app/cloud_sync WIPE_ONLY_ACCOUNT_KEY_PREFIXES) — стирается при выходе и удалении аккаунта.
 */
export const WELCOME_B3_KEY_PREFIX = 'story_events_v1:welcome_b3';
export const welcomeB3ShownKey = (owner: string): string => `${WELCOME_B3_KEY_PREFIX}:${owner}`;

type Names = Readonly<Record<string, Readonly<Record<string, string>>>>;
// Название выбранного языка обучения на языке интерфейса (для реплики экрана 1).
const NAMES: Names = {
  ru: { en: 'английский', es: 'испанский', fr: 'французский', de: 'немецкий', it: 'итальянский' },
  uk: { en: 'англійська', es: 'іспанська', fr: 'французька', de: 'німецька', it: 'італійська' },
  en: { en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian' },
  es: { en: 'inglés', es: 'español', fr: 'francés', de: 'alemán', it: 'italiano' },
  'pt-BR': { en: 'inglês', es: 'espanhol', fr: 'francês', de: 'alemão', it: 'italiano' },
  vi: { en: 'tiếng Anh', es: 'tiếng Tây Ban Nha', fr: 'tiếng Pháp', de: 'tiếng Đức', it: 'tiếng Ý' },
  id: { en: 'Inggris', es: 'Spanyol', fr: 'Prancis', de: 'Jerman', it: 'Italia' },
  tr: { en: 'İngilizce', es: 'İspanyolca', fr: 'Fransızca', de: 'Almanca', it: 'İtalyanca' },
  pl: { en: 'angielski', es: 'hiszpański', fr: 'francuski', de: 'niemiecki', it: 'włoski' },
};

export function welcomeLanguageName(lang: string, target: string): string {
  return NAMES[lang]?.[target] ?? NAMES.en[target] ?? target;
}

/** Решение шлюза: показываем только новому и только один раз. */
export function shouldShowWelcome(input: Readonly<{ isNew: boolean; alreadyShown: boolean }>): boolean {
  return input.isNew && !input.alreadyShown;
}

// зачем (риск Ревизора, координатор 04.11): время создания аккаунта Auth может быть ещё неизвестно в момент показа (первый запуск, сеть/Auth не успели) —
// вердикт 'account_age_unknown' НЕ фиксируется, и приветствие не должно потеряться: перепроверяем через 3, 8 и 20 с (максимум 3 раза), без записи «не новый».
export const WELCOME_RETRY_DELAYS_MS: readonly number[] = [3_000, 8_000, 20_000];

/** Через сколько мс перепроверить вердикт (null — не нужно). Только 'account_age_unknown' и только до исчерпания попыток. */
export function nextWelcomeRetryDelayMs(reason: string, attempt: number): number | null {
  if (reason !== 'account_age_unknown') return null;
  return attempt >= 0 && attempt < WELCOME_RETRY_DELAYS_MS.length ? WELCOME_RETRY_DELAYS_MS[attempt]! : null;
}

/** force — только dev-съёмка (превью Шпиля ?state=welcome): показать без проверки «новый» и без ключа «показано», ничего не писать и не переходить. */
export function WelcomeGate({ force = false }: Readonly<{ force?: boolean }> = {}): React.JSX.Element | null {
  const router = useRouter();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const reducedMotion = useReduceMotion();
  const insets = useStableSafeAreaInsets();
  const palette = useSpirePalette();
  // зачем (координатор 04.11): приветствие показывается ТОЛЬКО через арбитр окон (ключ 'onboardingWelcome', приоритет выше «Открытий разделов» и праздников) —
  // wants = «хочу показать», visible = «арбитр выдал слот». force (dev-съёмка) идёт мимо арбитра.
  const [wants, setWants] = useState(force);
  // зачем (слово владельца 05.11: «приветствие только на Главной»; Вердикт G: кадр с Пиком под пеленой): все вкладки живут в ОДНОМ роутном экране, шлюз смонтирован в
  // Главной всегда — без проверки владельца среды он всплывал над Пиком/любой вкладкой. Честный сигнал — runtimeOwnerId; dev-превью (force) идёт мимо.
  const { runtimeOwnerId } = useTabNav();
  const onHome = force || runtimeOwnerId === 'home';
  const granted = useOverlayVisible('onboardingWelcome', wants && !force && onHome);
  const visible = (force ? wants : granted) && onHome;
  useEffect(() => {
    if (wants) console.log('[WELCOME-B3]', JSON.stringify({ event: 'host_check', runtimeOwnerId, onHome, granted, visible })); // guard-ok: где сейчас вкладка и показали ли мы приветствие
  }, [wants, runtimeOwnerId, onHome, granted, visible]);
  const owner = useActiveAccountOwner();

  useEffect(() => {
    if (force) return undefined;
    // зачем (владелец 04.11): решение принадлежит аккаунту — при смене аккаунта (выход, удаление, второй человек) приветствие пересчитывается; без аккаунта не показываем
    setWants(false);
    if (!owner) {
      console.log('[WELCOME-B3]', JSON.stringify({ show: false, reason: 'no_owner' })); // guard-ok: ранний выход называет причину
      return undefined;
    }
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const check = async (attempt: number): Promise<void> => {
      const [verdict, shown] = await Promise.all([readRankGateUserVerdict(), AsyncStorage.getItem(welcomeB3ShownKey(owner))]);
      const show = shouldShowWelcome({ isNew: verdict.isNew, alreadyShown: shown !== null });
      const retryInMs = show ? null : nextWelcomeRetryDelayMs(verdict.reason, attempt);
      console.log('[WELCOME-STORY]', 'show_decision', JSON.stringify({ condition: show ? 'new_user_not_shown_yet' : verdict.isNew ? 'already_shown' : 'not_new_user', show, isNew: verdict.isNew, reason: verdict.reason, alreadyShown: shown !== null, attempt })); // guard-ok: условие показа истории приветствия (владелец 06.11: приветствие — только формат истории)
      console.log('[WELCOME-B3]', JSON.stringify({ show, isNew: verdict.isNew, reason: verdict.reason, alreadyShown: shown !== null, attempt, retryInMs })); // guard-ok: одна строка на проверку
      if (cancelled) return;
      if (show) {
        // зачем (владелец 11.11: «только история! ничего поверх главной!»): при включённых историях приветствие не открывается само —
        // новичку приходит кадр в «Истории», у монеты загорается кольцо. «Показано» ставим после записи: не записалось — приветствие
        // не теряется, шлюз попробует при следующем входе. Истории выключены (флаг stories_v1) — три экрана, как раньше.
        if (storiesReplaceWindows()) {
          const record = await recordHelloStory();
          if (cancelled) return;
          if (!insteadStoryLanded(record)) {
            console.warn('[WELCOME-B3] история приветствия не записана', record.recorded ? 'ok' : record.reason, '— «показано» не ставим'); // guard-ok: ранний выход называет причину
            return;
          }
          console.log('[WELCOME-STORY]', 'as_story', JSON.stringify({ recorded: record.recorded, persistedForever: true })); // guard-ok: одна строка на аккаунт
          // «показано» — тот же ключ аккаунта, что ставит закрытие трёх экранов; здесь показом считается записанная история
          const shownKey = welcomeB3ShownKey(owner);
          await AsyncStorage.setItem(shownKey, String(Date.now())).catch((error: unknown) => {
            console.warn('[WELCOME-B3] shown mark failed', error instanceof Error ? error.message : String(error));
          });
          return;
        }
        setWants(true);
        return;
      }
      if (retryInMs !== null) {
        retryTimer = setTimeout(() => {
          retryTimer = null;
          void check(attempt + 1).catch((error: unknown) => console.warn('[WELCOME-B3] gate retry failed', error instanceof Error ? error.message : String(error)));
        }, retryInMs);
      }
    };
    void check(0).catch((error: unknown) => {
      console.warn('[WELCOME-B3] gate read failed', error instanceof Error ? error.message : String(error));
    });
    return () => { cancelled = true; if (retryTimer) clearTimeout(retryTimer); };
  }, [force, owner]);

  // «показано» отмечаем сразу при закрытии любым способом — повтор не нужен
  const close = useCallback((how: 'skip' | 'start') => {
    console.log('[WELCOME-B3]', JSON.stringify({ event: how, slot: 'released' })); // guard-ok: одна строка на выход
    console.log('[WELCOME-STORY]', how === 'skip' ? 'skip' : 'finish', JSON.stringify({ how, persistedForever: !force, force })); // guard-ok: история приветствия закрыта; «Пропустить» = навсегда, «Начать занятие» = finish
    setWants(false);
    if (force) return;
    if (!owner) {
      console.warn('[WELCOME-B3] shown mark skipped — нет активного аккаунта'); // guard-ok: ранний выход называет причину
      return;
    }
    void AsyncStorage.setItem(welcomeB3ShownKey(owner), String(Date.now())).catch((error: unknown) => {
      console.warn('[WELCOME-B3] shown mark failed', error instanceof Error ? error.message : String(error));
    });
  }, [force, owner]);
  const onSkip = useCallback(() => close('skip'), [close]);
  const onStart = useCallback(() => {
    close('start');
    if (!force) router.push('/(tabs)/lessons' as never);
  }, [close, router, force]);

  if (!visible) return null;
  // зачем (слово владельца 05.11): пелена обязана накрывать ВСЁ — Главную, нижнюю панель и статус-бар. Слой внутри экрана Главной лежал ниже панели вкладок,
  // поэтому приветствие идёт в прозрачной Modal на весь экран; «Next» тогда не прячется под капсулу панели, низ считаем от обычного отступа.
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onSkip}>
    <ApprovedWelcome
      homeBackdrop={<></>}
      selectedLanguage={welcomeLanguageName(lang, String(studyTarget))}
      lang={lang as Lang}
      active
      reducedMotion={reducedMotion}
      safeTop={insets.top}
      // зачем (находка Maestro 05.11): «Next» уходил под плавающую капсулу таб-бара — низ экрана считаем от ВЕРХА капсулы (общая геометрия tab_bar_geometry), а не от системной полосы. В dev-превью (force) таб-бара нет.
      safeBottom={insets.bottom}
      dimColor={welcomeDimColor(palette.accentGraphic)}
      onSkip={onSkip}
      onStart={onStart}
    />
    </Modal>
  );
}
