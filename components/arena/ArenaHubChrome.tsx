import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { useTournamentPalette } from '../tournament/tournament_theme';

import { ArenaChromeInsetContext } from './arena_chrome_inset';
import { ArenaTabBar, type ArenaTabDef, type ArenaTabKey } from './ArenaTabBar';
import { ArenaModeSheet, type ArenaModeKey, type ArenaModeOption } from './ArenaModeSheet';
import { useLang } from '../LangContext';
import { arenaV2Home, createArenaRequestId } from '../../app/arena_client';
import { arenaText } from '../../modules/arena/copy';
import {
  ARENA_HUB_ROUTES,
  arenaHubBodyPaddingBottom,
  arenaHubTabForRoute,
  arenaMatchButtonAction,
  arenaModeChoices,
  type ArenaModeAvailability,
} from '../../modules/arena/hub_nav';

/**
 * Общая обвязка разделов Арены: собственный таббар снизу и выпадающий выбор
 * режима по центральной кнопке.
 *
 * Владелец (D-30): у Арены свой таббар с крупной кнопкой «Начать матч» в
 * центре; по нажатию выпадает список режимов, как в «Карточках 2.1». По бокам
 * — важные вкладки.
 *
 * Обвязка одна на все разделы, чтобы таббар не расходился между экранами:
 * скопированный по разделам, он рано или поздно начинает подсвечивать не то и
 * вести не туда.
 *
 * Решения о навигации сюда не пишутся — они в `modules/arena/hub_nav.ts`, где
 * их видно тесту.
 */

export function ArenaHubChrome({
  children,
  availability,
  activeMatchId,
  activeQueue,
}: Readonly<{
  children: React.ReactNode;
  availability?: ArenaModeAvailability | null;
  activeMatchId?: string | null;
  activeQueue?: Readonly<{ status?: string; mode?: string; requestId?: string; stableUid?: string }> | null;
}>) {
  const router = useRouter();
  /**
   * Экраны, у которых своего ответа сервера нет, получают его здесь — иначе
   * центральная кнопка была бы мёртвой: без сведений о доступности выбор
   * режима гасится целиком, и игрок упирается в кнопку, которая ничего не
   * делает и не объясняет почему.
   *
   * Один запрос на открытие такого экрана, не подписка. Экраны, у которых
   * ответ уже есть, передают его пропсом и не платят ничего.
   */
  const [ownHome, setOwnHome] = useState<Awaited<ReturnType<typeof arenaV2Home>> | null>(null);
  useEffect(() => {
    if (availability) return;
    let alive = true;
    void arenaV2Home().then((home) => { if (alive) setOwnHome(home); }).catch(() => {});
    return () => { alive = false; };
  }, [availability]);

  const resolvedAvailability = availability ?? ownHome?.availability ?? null;
  const resolvedMatchId = activeMatchId ?? ownHome?.activeMatch?.matchId ?? null;
  const resolvedQueue = activeQueue ?? ownHome?.activeQueue ?? null;
  const P = useTournamentPalette();
  const pathname = usePathname();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Активная вкладка берётся из пути, а не из состояния: состояние разъезжается
  // при переходе «назад», и таббар начинает подсвечивать не тот раздел.
  const activeTab = arenaHubTabForRoute(pathname);

  const tabs: readonly ArenaTabDef[] = useMemo(() => ([
    { key: 'today', icon: 'today-outline', active: 'today', label: arenaText(lang, 'todayTab') },
    { key: 'rank', icon: 'podium-outline', active: 'podium', label: arenaText(lang, 'ranks') },
    { key: 'tops', icon: 'trophy-outline', active: 'trophy', label: arenaText(lang, 'topsTab') },
    { key: 'history', icon: 'time-outline', active: 'time', label: arenaText(lang, 'historyTab') },
  ]), [lang]);

  const modeOptions: readonly ArenaModeOption[] = useMemo(() => {
    const choices = arenaModeChoices(resolvedAvailability);
    const copy: Record<ArenaModeKey, { title: string; body: string; badge: string }> = {
      quick: { title: arenaText(lang, 'quick'), body: arenaText(lang, 'quickHint'), badge: '5' },
      ranked: { title: arenaText(lang, 'ranked'), body: arenaText(lang, 'rankedHint'), badge: '10' },
      friend: { title: arenaText(lang, 'friend'), body: arenaText(lang, 'friendHint'), badge: '10' },
    };
    const icons: Record<ArenaModeKey, ArenaModeOption['icon']> = {
      quick: 'flash', ranked: 'trophy', friend: 'people',
    };
    return choices.map((choice) => ({
      key: choice.key,
      icon: icons[choice.key],
      ...copy[choice.key],
      // Погашенная строка объясняет ПРИЧИНУ вместо обычного описания: иначе
      // это кнопка без реакции — игрок жмёт, ничего не происходит, и он
      // решает, что сломалось приложение.
      ...(choice.reason === 'ok' ? {} : {
        body: arenaText(lang, choice.reason === 'arena_off' ? 'modeArenaOff' : 'modeOff'),
      }),
      accent: choice.key === 'quick',
      // Отключённый режим гасится, а не прячется: спрятанный выглядит как
      // отсутствующая возможность, и игрок про него не узнаёт вовсе.
      disabled: !choice.enabled,
    }));
  }, [resolvedAvailability, lang]);

  const onSelectTab = useCallback((key: ArenaTabKey) => {
    if (key === activeTab) return;
    router.replace(ARENA_HUB_ROUTES[key] as never);
  }, [activeTab, router]);

  const onMatch = useCallback(() => {
    const action = arenaMatchButtonAction({
      enabled: resolvedAvailability?.enabled === true,
      activeMatchId: resolvedMatchId,
      activeQueue: resolvedQueue,
    });
    if (action.kind === 'resume_match') {
      router.push({ pathname: '/arena_match', params: { matchId: action.matchId } } as never);
      return;
    }
    if (action.kind === 'resume_queue') {
      router.push({
        pathname: '/arena_matchmaking',
        params: { mode: action.mode, requestId: action.requestId, stableUid: action.stableUid },
      } as never);
      return;
    }
    /**
     * Выключенная Арена — не повод молчать. Раньше нажатие на центральную
     * кнопку просто НИЧЕГО не делало: игрок жал, ничего не происходило, и
     * это выглядело как поломка приложения. Теперь выпадающий список всё
     * равно открывается — и каждая строка в нём объясняет, почему сейчас
     * нельзя.
     */
    setSheetOpen(true);
  }, [resolvedMatchId, resolvedQueue, resolvedAvailability?.enabled, router]);

  const onSelectMode = useCallback((key: ArenaModeKey) => {
    setSheetOpen(false);
    const choice = arenaModeChoices(resolvedAvailability).find((row) => row.key === key);
    if (!choice || !choice.enabled) return;
    router.push((choice.params
      ? {
        pathname: choice.route,
        params: choice.route === '/arena_matchmaking'
          ? { ...choice.params, requestId: createArenaRequestId('queue') }
          : choice.params,
      }
      : choice.route) as never);
  }, [resolvedAvailability, router]);

  return (
    /*
      Фон под таббаром — цвет страницы, а не дыра. Полоса внизу оставалась
      незакрашенной: экран рисует свой фон только над таббаром, а под ним
      просвечивал чёрный корень, и владелец увидел это как чёрную полосу.
    */
    <View style={[styles.root, { backgroundColor: P.bg }]}>
      {/* Место под таббар: он лежит поверх содержимого, и без этого отступа
          последние строки длинного списка закрыты полосой. Отступ идёт
          содержимому через контекст, а не этому контейнеру: иначе экран вместе
          со своим фоном кончался бы над таббаром, и вокруг плавающей пилюли
          оставалась полоса ровной заливки вместо арта. */}
      <ArenaChromeInsetContext.Provider value={arenaHubBodyPaddingBottom(insets.bottom)}>
        <View style={styles.body}>
          {children}
        </View>
      </ArenaChromeInsetContext.Provider>
      <ArenaTabBar
        tabs={tabs}
        active={activeTab}
        matchLabel={arenaText(lang, 'matchCta')}
        onSelect={onSelectTab}
        onMatch={onMatch}
      />
      <ArenaModeSheet
        visible={sheetOpen}
        title={arenaText(lang, 'matchCta')}
        options={modeOptions}
        onSelect={onSelectMode}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
});
