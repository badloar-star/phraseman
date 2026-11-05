// use_section_opening_host.ts — хост праздничных окон «Открытие разделов»: факты доступа → решение → очередь → слот арбитра окон.
//
// зачем (владелец одобрил макет; координатор 04.11): поводом служит само решение useRankAccess «раздел доступен» + нет отметки «показано»
// (а не только событие onRankSectionOpened) — так окно приходит и когда ранг вырос при закрытом приложении. Старым и неизвестным
// пользователям всё уже открытое молча помечается «показано» (section_opening_core). Флаг section_openings_enabled (Пульт) ВЫКЛ
// по умолчанию; пока он выключен или ранговые гейты выключены — хост ничего не делает и НИЧЕГО не помечает. Сеть 0, чтения 0.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { onAppEvent } from '../../app/events';
import { getRemoteBool } from '../../app/remote_flags';
import { readRankGateUserVerdict, type RankGateUserVerdict } from '../../app/rank_gates_new_user';
import { useOverlayVisible } from '../../components/OverlayArbiter';
import { usePremium } from '../../components/PremiumContext';
import { useRankAccess } from '../../hooks/use_rank_access';
import { useActiveAccountOwner } from '../../hooks/use_active_account_owner';
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
  dismiss: (source?: 'skip' | 'back') => void;
}>;

export function useSectionOpeningHost(active: boolean): SectionOpeningHost {
  const enabled = useSectionOpeningsEnabled();
  const premium = usePremium();
  const video = useRankAccess('video');
  const dialogues = useRankAccess('dialogues');
  const peak = useRankAccess('peak');
  const cardsHub = useRankAccess('cards_hub');
  const [verdict, setVerdict] = useState<RankGateUserVerdict | null>(null);
  const owner = useActiveAccountOwner();

  // зачем (владелец 04.11, дыры новичка/восстановления): вердикт принадлежит аккаунту — при смене аккаунта (выход, удаление, второй человек) он читается заново
  useEffect(() => { setVerdict(null); }, [owner]);

  useEffect(() => {
    if (!enabled || verdict || !owner) return;
    let alive = true;
    readRankGateUserVerdict()
      .then((v) => { if (alive) setVerdict(v); })
      .catch((error: unknown) => {
        // зачем: не прочли вердикт — решать нельзя (старому нельзя дать поток окон): окон не будет до следующего запуска
        console.warn(LOG, 'verdict_read_failed — окон не будет', error instanceof Error ? error.message : String(error)); // guard-ok: catch с причиной
      });
    return () => { alive = false; };
  }, [enabled, verdict, owner]);

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

  // зачем (слово владельца 05.11, «включи!»; сперва логи): одна строка на смену решения — какой раздел, ранг/доступ и ПОЧЕМУ показан или не показан.
  const lastDecisionRef = useRef('');
  useEffect(() => {
    const reason = !enabled ? 'flag_off'
      : !gatesOn ? 'rank_gates_off'
      : !owner ? 'no_owner'
      : !verdict ? 'verdict_pending'
      : anyPending ? 'access_pending'
      : !premium.accessResolved ? 'premium_unresolved'
      : !active ? 'host_inactive'
      : snap.current === null ? 'nothing_queued'
      : !visible ? 'overlay_blocked'
      : 'shown';
    const line = JSON.stringify({
      reason, shown, queued: snap.current, open: openKey || null, isNew: verdict?.isNew ?? null,
      plusActive: premium.isPremium, statuses: decisions.map(([surface, d]) => `${surface}:${d.status}`).join(','),
    });
    if (line === lastDecisionRef.current) return;
    lastDecisionRef.current = line;
    console.log(LOG, 'decision', line); // guard-ok: решение хоста окон с причиной, без идентификаторов
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, gatesOn, owner, verdict, anyPending, premium.accessResolved, premium.isPremium, active, snap.current, visible, shown, openKey]);

  return useMemo<SectionOpeningHost>(() => ({
    current: shown,
    accept: () => {
      const closed = dismissSectionOpening('cta');
      return closed ? SECTION_OPENING_ROUTES[closed] : null;
    },
    dismiss: (source = 'back') => { dismissSectionOpening(source); },
  }), [shown]);
}

