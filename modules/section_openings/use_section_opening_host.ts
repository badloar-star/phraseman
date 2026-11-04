// use_section_opening_host.ts — хост праздничных окон «Открытие разделов»: факты доступа → решение → очередь → слот арбитра окон.
//
// зачем (владелец одобрил макет; координатор 04.11): поводом служит само решение useRankAccess «раздел доступен» + нет отметки «показано»
// (а не только событие onRankSectionOpened) — так окно приходит и когда ранг вырос при закрытом приложении. Старым и неизвестным
// пользователям всё уже открытое молча помечается «показано» (section_opening_core). Флаг section_openings_enabled (Пульт) ВЫКЛ
// по умолчанию; пока он выключен или ранговые гейты выключены — хост ничего не делает и НИЧЕГО не помечает. Сеть 0, чтения 0.
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { onAppEvent } from '../../app/events';
import { getRemoteBool } from '../../app/remote_flags';
import { readRankGateUserVerdict, type RankGateUserVerdict } from '../../app/rank_gates_new_user';
import { useOverlayVisible } from '../../components/OverlayArbiter';
import { usePremium } from '../../components/PremiumContext';
import { useRankAccess } from '../../hooks/use_rank_access';
import {
  SECTION_OPENING_ROUTES, type SectionOpeningFacts, type SectionOpeningId, type SectionOpeningSurface,
} from './section_opening_core';
import {
  dismissSectionOpening, noteSectionOpeningShown, peekSectionOpening, reconcileSectionOpenings, subscribeSectionOpening,
} from './section_opening_store';

const LOG = '[SECTION-OPENING]';
export const isSectionOpeningsEnabled = (): boolean => getRemoteBool('section_openings_enabled') === true;

function useSectionOpeningsEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => isSectionOpeningsEnabled());
  useEffect(() => {
    const sub = onAppEvent('remote_config_changed', () => {
      const next = isSectionOpeningsEnabled();
      setEnabled((current) => {
        if (current !== next) console.log(LOG, 'флаг сменился', JSON.stringify({ from: current, to: next })); // guard-ok: смена флага
        return current === next ? current : next;
      });
    });
    return () => sub.remove();
  }, []);
  return enabled;
}

export type SectionOpeningHost = Readonly<{
  /** Окно на экране (после арбитра) или null. */
  current: SectionOpeningId | null;
  /** CTA: закрыть и вернуть маршрут раздела (null — rank/plus просто идут дальше). */
  accept: () => string | null;
  /** «Пропустить» / «Назад»: закрыть, следующее окно очереди появится само. */
  dismiss: () => void;
}>;

export function useSectionOpeningHost(active: boolean): SectionOpeningHost {
  const enabled = useSectionOpeningsEnabled();
  const premium = usePremium();
  const video = useRankAccess('video');
  const dialogues = useRankAccess('dialogues');
  const peak = useRankAccess('peak');
  const cardsHub = useRankAccess('cards_hub');
  const [verdict, setVerdict] = useState<RankGateUserVerdict | null>(null);

  useEffect(() => {
    if (!enabled || verdict) return;
    let alive = true;
    readRankGateUserVerdict()
      .then((v) => { if (alive) setVerdict(v); })
      .catch((error: unknown) => {
        // зачем: не прочли вердикт — решать нельзя (старому нельзя дать поток окон): окон не будет до следующего запуска
        console.warn(LOG, 'verdict_read_failed — окон не будет', error instanceof Error ? error.message : String(error)); // guard-ok: catch с причиной
      });
    return () => { alive = false; };
  }, [enabled, verdict]);

  const gatesOn = getRemoteBool('rank_gates_enabled') !== false;
  const decisions: readonly (readonly [SectionOpeningSurface, ReturnType<typeof useRankAccess>])[] = [
    ['video', video], ['dialogues', dialogues], ['peak', peak], ['cards_hub', cardsHub],
  ];
  const openKey = decisions.filter(([, d]) => d.status === 'allowed').map(([surface]) => surface).join(',');
  const anyPending = decisions.some(([, d]) => d.status === 'pending');
  const facts = useMemo<SectionOpeningFacts | null>(() => {
    if (!enabled || !gatesOn || !verdict || anyPending || !premium.accessResolved) return null;
    return { resolved: true, isNew: verdict.isNew, open: openKey ? (openKey.split(',') as SectionOpeningSurface[]) : [], plusActive: premium.isPremium };
  }, [enabled, gatesOn, verdict, anyPending, premium.accessResolved, premium.isPremium, openKey]);

  useEffect(() => {
    if (!facts || !active) return;
    void reconcileSectionOpenings(facts);
  }, [facts, active]);

  const snap = useSyncExternalStore(subscribeSectionOpening, peekSectionOpening, peekSectionOpening);
  const wanted = enabled && active && snap.current !== null;
  const visible = useOverlayVisible('sectionOpening', wanted);
  const shown = visible ? snap.current : null;

  useEffect(() => {
    if (shown) noteSectionOpeningShown(shown); // зачем: «показано» — в момент появления на экране, не при решении
  }, [shown]);

  return useMemo<SectionOpeningHost>(() => ({
    current: shown,
    accept: () => {
      const closed = dismissSectionOpening();
      return closed ? SECTION_OPENING_ROUTES[closed] : null;
    },
    dismiss: () => { dismissSectionOpening(); },
  }), [shown]);
}

