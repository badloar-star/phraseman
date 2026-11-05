// ═══════════════════════════════════════════════════════════════════════════
// home_moment_slots.tsx — хосты окон Главной «итог недели Пика» (D191) и «С возвращением» (D193).
//
// зачем (Моменты, docs/work/moments-perf-2026-10-25.md №4; координатор 26.10): состояние этих окон жило в HomeScreen —
// решение, открытие и закрытие окна перерисовывали всю Главную (самый большой экран) в том же коммите, что и первый кадр
// окна. Теперь хук окна вызывается внутри маленького хоста: Главная на это состояние не подписана и не перерисовывается.
// Поведение то же: когда показывать — гейты хуков, порядок окон — таблица приоритетов арбитра (overlay_arbiter_core),
// окна грузятся лениво и монтируются только по слоту.
// ═══════════════════════════════════════════════════════════════════════════
import React, { Suspense, lazy, memo, useEffect, useRef } from 'react';
import { Modal } from 'react-native';

import type { Lang } from '../../constants/i18n';
import { useSpireWeekMoment } from '../../app/spire/use_spire_week_moment';
import { useWelcomeBackMoment } from '../../hooks/use_welcome_back_moment';
import { useSectionOpeningHost } from '../../modules/section_openings/use_section_opening_host';
import { SheetSwipeRoot } from '../modal_fx/SheetSwipeClose';

// зачем (D191, владелец 14.10): окно итога недели (m01–m03) тяжёлое (башня, SVG, фейерверк) и нужно раз в неделю — грузится лениво и только когда хук Ядра дал слот
const SpireWeekMomentHost = lazy(() => import('../spire/moments/SpireWeekMomentHost'));
// зачем (D193, владелец 14.10): «С возвращением» (m21) — раз после долгой отлучки; грузится лениво, когда хук дал слот
const WelcomeBackMoment = lazy(() => import('../moments/WelcomeBackMoment'));

// зачем (владелец 04.11, «Открытие разделов»): праздничное окно открытия раздела — тяжёлое только по слоту, грузится лениво
const SectionOpeningCeremony = lazy(() => import('../section_openings/SectionOpeningCeremony').then((m) => ({ default: m.SectionOpeningCeremony })));

const LOG = '[HOME-MOMENT-SLOT]';

type WeekSlotProps = Readonly<{
  lang: Lang;
  studyTarget: string;
  spireTabEnabled: boolean;
  active: boolean;
  coinRank: number | null;
  /** «Играть» → раздел Пика; undefined — Пик недоступен этому языку, кнопка только закрывает окно. */
  onPlay: (() => void) | undefined;
}>;

export const HomeWeekMomentSlot = memo(function HomeWeekMomentSlot({ lang, studyTarget, spireTabEnabled, active, coinRank, onPlay }: WeekSlotProps) {
  const weekMoment = useSpireWeekMoment({ uiLang: lang, studyTarget, tabEnabled: spireTabEnabled, active });
  const kind = weekMoment.decision ? 'decided' : 'none';
  useEffect(() => {
    console.log(LOG, JSON.stringify({ moment: 'spire_week', decision: kind, visible: weekMoment.visible })); // guard-ok: одна строка на смену решения/слота
  }, [kind, weekMoment.visible]);
  if (!weekMoment.visible || !weekMoment.decision) return null;
  return (
    <Suspense fallback={null}>
      <SpireWeekMomentHost lang={lang} decision={weekMoment.decision} coinRank={coinRank} onClose={weekMoment.close} onPlay={onPlay} onRemind={weekMoment.remind.available ? weekMoment.remind.schedule : undefined} />
    </Suspense>
  );
});

type WelcomeBackSlotProps = Readonly<{
  lang: Lang;
  studyTarget: string;
  active: boolean;
  coinRank: number | null;
  /** Энергия из памяти Главной (peekEnergy, без чтений); null — ещё не известна. */
  energyCurrent: number | null;
  energyMax: number | null;
  /** «К карточкам» — тот же путь, что у плитки «Сохранённые» на Главной. */
  onOpenSavedCards: () => void;
}>;

export const HomeWelcomeBackSlot = memo(function HomeWelcomeBackSlot({ lang, studyTarget, active, coinRank, energyCurrent, energyMax, onOpenSavedCards }: WelcomeBackSlotProps) {
  const welcomeBack = useWelcomeBackMoment({
    studyTarget,
    coinRank,
    energy: energyCurrent !== null && energyMax !== null ? { current: energyCurrent, max: energyMax } : null,
    active,
  });
  const kind = welcomeBack.decision ? 'decided' : 'none';
  useEffect(() => {
    console.log(LOG, JSON.stringify({ moment: 'welcome_back', decision: kind, visible: welcomeBack.visible })); // guard-ok: одна строка на смену решения/слота
  }, [kind, welcomeBack.visible]);
  if (!welcomeBack.visible || !welcomeBack.decision) return null;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={welcomeBack.close}>
      <SheetSwipeRoot>
        <Suspense fallback={null}>
          <WelcomeBackMoment
            lang={lang}
            coinRank={coinRank}
            decision={welcomeBack.decision}
            onCards={() => { welcomeBack.close(); onOpenSavedCards(); }}
            onHome={welcomeBack.close}
          />
        </Suspense>
      </SheetSwipeRoot>
    </Modal>
  );
});

type SectionOpeningSlotProps = Readonly<{
  lang: Lang;
  active: boolean;
  /** CTA раздела: тот же переход, что у плитки Главной (маршрут из section_opening_core). */
  onNavigate: (route: string) => void;
}>;

export const HomeSectionOpeningSlot = memo(function HomeSectionOpeningSlot({ lang, active, onNavigate }: SectionOpeningSlotProps) {
  const sectionOpening = useSectionOpeningHost(active);
  // зачем (владелец 05.11 «ЭТО ИСТОРИЯ»): сегменты полоски = вся очередь этой «истории» (Ранг · Видео · Диалоги); число кадров запоминаем с первого показа, текущий = всего − осталось
  const totalRef = useRef(0);
  if (!sectionOpening.current) { totalRef.current = 0; return null; }
  totalRef.current = Math.max(totalRef.current, 1 + sectionOpening.remaining);
  const segments = totalRef.current;
  const segmentIndex = Math.max(0, segments - 1 - sectionOpening.remaining);
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => sectionOpening.dismiss('back')}>
      <SheetSwipeRoot>
        <Suspense fallback={null}>
          <SectionOpeningCeremony
            id={sectionOpening.current}
            lang={lang}
            segments={segments}
            segmentIndex={segmentIndex}
            onSkip={() => sectionOpening.dismiss('skip')}
            onPrev={() => sectionOpening.back()}
            onCta={() => { const route = sectionOpening.accept(); if (route) onNavigate(route); }}
          />
        </Suspense>
      </SheetSwipeRoot>
    </Modal>
  );
});
