// ─── Своя визитка: «Про», стиль, свой текст (D114, макет profile-card-pro.html) ─
// зачем: одна точка для своей визитки. Первый кадр — синхронно из кэша в памяти
// (без «обычная → Про» прыжка, если уже читали в этом запуске), затем диск.
// Optimistic UI (правило владельца):
//  • покупка/стиль — телефон авторитетен, сети в операции нет: визитка меняется
//    сразу после записи на диск (одним multiSet с тратой);
//  • свой текст — новый текст виден СРАЗУ, сервер догоняет; отказ → откат к
//    прежнему тексту + понятная причина; повторный тап во время сохранения
//    возвращает тот же промис; поздний ответ не затирает более свежий текст.
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from '../app/account_generation';
import { DebugLogger } from '../app/debug-logger';
import {
  purchaseProfileCardPro,
  setProfileCardProStyle,
  type ProfileCardProPurchaseResult,
  type ProfileCardStyleChangeResult,
} from '../app/profile_card_pro_v1';
import {
  peekProfileCardBio,
  peekProfileCardPro,
  persistProfileCardBioCache,
  publishProfileCardBio,
  readProfileCardBioCache,
  readProfileCardPro,
  subscribeProfileCardPro,
  type ProfileCardProView,
} from '../app/profile_card_pro_state_v1';
import { fetchPublicProfileCard, saveMyProfileCardBio, type ProfileCardBioSaveResult } from '../app/profile_card_public';
import type { ProfileCardProStyle } from '../app/profile_card_styles';
import { syncPublicProfileSnapshot } from '../app/public_profile_snapshot';

const LOG = '[PROFILE-CARD]';

function activeOwner(token: AccountGenerationToken): string | null {
  if (token.phase !== 'active') return null;
  return token.stableId?.trim() || null;
}

export type UseMyProfileCard = Readonly<{
  ownerStableId: string | null;
  /** null — ещё не прочитано (кнопки «Про» не показываем, чтобы не мигали). */
  pro: ProfileCardProView | null;
  bio: string;
  bioSaving: boolean;
  purchase: (style: ProfileCardProStyle) => Promise<ProfileCardProPurchaseResult>;
  changeStyle: (style: ProfileCardProStyle) => Promise<ProfileCardStyleChangeResult>;
  saveBio: (text: string) => Promise<ProfileCardBioSaveResult>;
}>;

export function useMyProfileCard(enabled: boolean): UseMyProfileCard {
  const initialToken = useRef<AccountGenerationToken>(captureAccountGeneration());
  const [token, setToken] = useState<AccountGenerationToken>(initialToken.current);
  const owner = enabled ? activeOwner(token) : null;
  const [pro, setPro] = useState<ProfileCardProView | null>(() => (owner ? peekProfileCardPro(owner) : null));
  const [bio, setBio] = useState<string>(() => (owner ? peekProfileCardBio(owner) ?? '' : ''));
  const [bioSaving, setBioSaving] = useState(false);
  const bioInFlight = useRef<Promise<ProfileCardBioSaveResult> | null>(null);
  const bioVersion = useRef(0);
  const purchaseInFlight = useRef<Promise<ProfileCardProPurchaseResult> | null>(null);

  useEffect(() => {
    const sub = subscribeAccountGeneration((next) => setToken(next));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!owner) {
      setPro(null);
      setBio('');
      return undefined;
    }
    let alive = true;
    const commitFromMemory = () => {
      if (!alive || !isCurrentAccountGeneration(token, owner)) return;
      setPro(peekProfileCardPro(owner));
      const cachedBio = peekProfileCardBio(owner);
      if (cachedBio !== null) setBio(cachedBio);
    };
    commitFromMemory();
    void Promise.all([readProfileCardPro(owner), readProfileCardBioCache(owner)]).then(([view, cachedBio]) => {
      if (!alive || !isCurrentAccountGeneration(token, owner)) return;
      DebugLogger.info(LOG, `своя визитка: прочитано с диска ${JSON.stringify({ owner, owned: view?.owned ?? null, style: view?.style ?? null, bioCached: cachedBio !== null })}`);
      setPro(view ?? { owned: false, style: null });
      if (cachedBio !== null) setBio(cachedBio);
    });
    // Сверка своего текста с сервером (после переустановки кэша на телефоне нет).
    // Один документ, кэш 10 минут; во время сохранения ответ не применяем.
    const versionAtStart = bioVersion.current;
    void fetchPublicProfileCard(owner).then((card) => {
      if (!alive || !isCurrentAccountGeneration(token, owner)) return;
      if (bioVersion.current !== versionAtStart || bioInFlight.current) {
        DebugLogger.info(LOG, 'своя визитка: серверный текст пришёл во время правки — не применяем');
        return;
      }
      if (!card.pro) return;
      publishProfileCardBio(owner, card.bio);
      void persistProfileCardBioCache(owner, card.bio);
      setBio(card.bio);
    });
    const unsubscribe = subscribeProfileCardPro((changed) => {
      if (changed === owner) commitFromMemory();
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [owner, token]);

  const purchase = useCallback((style: ProfileCardProStyle): Promise<ProfileCardProPurchaseResult> => {
    if (purchaseInFlight.current) {
      DebugLogger.info(LOG, 'покупка: повторный тап во время покупки — ждём тот же результат');
      return purchaseInFlight.current;
    }
    const run = purchaseProfileCardPro({ token: captureAccountGeneration(), style })
      .finally(() => { purchaseInFlight.current = null; });
    purchaseInFlight.current = run;
    return run;
  }, []);

  const changeStyle = useCallback(
    (style: ProfileCardProStyle) => setProfileCardProStyle({ token: captureAccountGeneration(), style }),
    [],
  );

  const saveBio = useCallback((text: string): Promise<ProfileCardBioSaveResult> => {
    if (bioInFlight.current) {
      DebugLogger.info(LOG, 'свой текст: повторный тап во время сохранения — ждём тот же результат');
      return bioInFlight.current;
    }
    const tokenAtTap = captureAccountGeneration();
    const ownerAtTap = activeOwner(tokenAtTap);
    if (!ownerAtTap) {
      DebugLogger.info(LOG, 'свой текст: нет активного аккаунта — не сохраняем');
      return Promise.resolve({ ok: false, reason: 'failed' } as const);
    }
    const previous = peekProfileCardBio(ownerAtTap) ?? bio;
    const optimistic = text.replace(/\s+/g, ' ').trim();
    bioVersion.current += 1;
    const version = bioVersion.current;
    // Мгновенно: новый текст на визитке до ответа сервера.
    publishProfileCardBio(ownerAtTap, optimistic);
    setBio(optimistic);
    setBioSaving(true);
    const run = saveMyProfileCardBio({ stableId: ownerAtTap, text: optimistic })
      .then(async (first) => {
        // Сервер решает «Про» по публичной визитке. Если она ещё не догнала покупку
        // (покупка была офлайн / проекция не дошла) — дотягиваем проекцию и пробуем
        // ОДИН раз, вместо ложного «доступно только с Про» человеку, который купил.
        if (first.ok || first.reason !== 'pro_required' || peekProfileCardPro(ownerAtTap)?.owned !== true) return first;
        DebugLogger.info(LOG, 'свой текст: сервер не видит «Про» — обновляем публичную визитку и повторяем');
        try {
          await syncPublicProfileSnapshot({ reason: 'entitlement_change' }, tokenAtTap);
        } catch (error) {
          DebugLogger.warn(LOG, `свой текст: обновление публичной визитки упало ${JSON.stringify({ error: String(error) })}`);
          return first;
        }
        return saveMyProfileCardBio({ stableId: ownerAtTap, text: optimistic });
      })
      .then((result) => {
        const stillCurrent = isCurrentAccountGeneration(tokenAtTap, ownerAtTap) && bioVersion.current === version;
        DebugLogger.info(LOG, `свой текст: итог ${JSON.stringify({ ok: result.ok, reason: result.ok ? null : result.reason, stillCurrent })}`);
        if (!stillCurrent) return result;
        if (result.ok) {
          publishProfileCardBio(ownerAtTap, result.text);
          void persistProfileCardBioCache(ownerAtTap, result.text);
          setBio(result.text);
        } else {
          // Откат: показываем то, что реально видят другие.
          publishProfileCardBio(ownerAtTap, previous);
          setBio(previous);
        }
        return result;
      })
      .finally(() => {
        bioInFlight.current = null;
        setBioSaving(false);
      });
    bioInFlight.current = run;
    return run;
  }, [bio]);

  return { ownerStableId: owner, pro, bio, bioSaving, purchase, changeStyle, saveBio };
}
