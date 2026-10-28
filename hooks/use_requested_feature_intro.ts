import { useCallback, useEffect, useRef, useState } from 'react';
import { markFeatureIntroSeen, shouldShowFeatureIntro } from '../app/feature_intro_registry';

/** An explicit tap owns this intro; the existing sheet waits for native dismissal. */
export function useRequestedFeatureIntro(id: string, active: boolean, onOpen: () => void) {
  const [visible, setVisible] = useState(false);
  const owner = useRef({ active, onOpen });
  owner.current = { active, onOpen };
  const epoch = useRef(0);
  const pending = useRef(false);
  const checking = useRef(false);

  useEffect(() => {
    owner.current.active = active;
    if (!active) setVisible(false);
    return () => {
      owner.current.active = false;
      epoch.current += 1;
      pending.current = false;
      checking.current = false;
    };
  }, [active, id]);

  const request = useCallback(async () => {
    // зачем (координатор 28.10, жалоба #3 «натискаю на класичні уроки і уроків немає»): все три выхода ниже были немыми —
    // нажатие на кнопку с вводным окном («Классический курс») могло ничего не сделать, и по логу этого не видно.
    if (!owner.current.active || checking.current || pending.current) {
      console.log('[FEATURE-INTRO] request:ignored', JSON.stringify({ id, active: owner.current.active, checking: checking.current, pending: pending.current })); // guard-ok: ранний выход
      return;
    }
    checking.current = true;
    const token = epoch.current;
    const show = await shouldShowFeatureIntro(id);
    if (token !== epoch.current || !owner.current.active) {
      console.log('[FEATURE-INTRO] request:dropped', JSON.stringify({ id, epochChanged: token !== epoch.current, active: owner.current.active, show })); // guard-ok: ранний выход
      return;
    }
    checking.current = false;
    console.log('[FEATURE-INTRO] request:result', JSON.stringify({ id, show, next: show ? "intro" : "open" })); // guard-ok: итог нажатия
    if (show) {
      pending.current = true;
      setVisible(true);
      // Registry suppresses this write in DEV replay; dismissal never writes.
      void markFeatureIntroSeen(id);
    } else {
      owner.current.onOpen();
    }
  }, [id]);

  const close = useCallback(() => setVisible(false), []);
  const cancel = useCallback(() => {
    pending.current = false;
    setVisible(false);
  }, []);
  const finish = useCallback(() => {
    if (!pending.current) return;
    pending.current = false;
    setVisible(false);
    if (owner.current.active) owner.current.onOpen();
  }, []);

  return { visible: visible && active, request, close, cancel, finish };
}
