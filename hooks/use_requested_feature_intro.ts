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
    if (!owner.current.active || checking.current || pending.current) return;
    checking.current = true;
    const token = epoch.current;
    const show = await shouldShowFeatureIntro(id);
    if (token !== epoch.current || !owner.current.active) return;
    checking.current = false;
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
