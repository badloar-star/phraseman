/**
 * PerfectWeekHost — модал «Идеальная неделя» (Weekly Boon модификатор perfect_week).
 *
 * Когда все 7 дней недели закрыты (week_days_done) и приз ещё не выдан — крупная
 * награда осколками, раз в неделю. Это самый ценный недельный приз → золотой сундук
 * (общий BoonChestModal). Монтируется из _layout.tsx внутри OverlayArbiterProvider;
 * видимость через useOverlayVisible('perfectWeekReward', …).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLang } from './LangContext';
import { useOverlayVisible } from './OverlayArbiter';
import { onAppEvent } from '../app/events';
import { isBoonModifierActive } from '../app/boons/boon_engine';
import { triLang, type Lang } from '../constants/i18n';
import { grantBoonReward } from '../app/boons/boon_rewards';
import {
  checkPerfectWeekEligible,
  PERFECT_WEEK_CLAIMED_KEY,
  PERFECT_WEEK_REWARD,
} from '../app/boons/perfect_week';
import BoonChestModal from './BoonChestModal';

function makeL(lang: Lang) {
  return (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

export default function PerfectWeekHost() {
  const { lang } = useLang();
  const L = makeL(lang as Lang);

  const [wantShow, setWantShow] = useState(false);
  const grantedRef = useRef(false);
  const visible = useOverlayVisible('perfectWeekReward', wantShow);

  // Начислить награду и ПОМЕТИТЬ неделю забранной — единожды (in-memory гард). Порядок
  // Маркер claimed и награда входят в одну composite-операцию: повтор безопасен,
  // а падение не оставляет ни сиротского маркера, ни сиротского начисления.
  const claim = useCallback(async (): Promise<void> => {
    if (!isBoonModifierActive('perfect_week')) {
      setWantShow(false);
      return;
    }
    if (grantedRef.current) return;
    grantedRef.current = true;
    const weekKey = await AsyncStorage.getItem('week_days_week_key');
    if (!weekKey) return;
    if (!isBoonModifierActive('perfect_week')) {
      setWantShow(false);
      return;
    }
    await grantBoonReward(
      PERFECT_WEEK_REWARD,
      'boon_perfect_week',
      weekKey,
      [[PERFECT_WEEK_CLAIMED_KEY, weekKey]],
    );
  }, []);

  useEffect(() => {
    let alive = true;
    let generation = 0;

    const refresh = () => {
      const currentGeneration = ++generation;
      if (!isBoonModifierActive('perfect_week')) setWantShow(false);
      checkPerfectWeekEligible()
        .then(async (eligible) => {
          if (
            !alive
            || currentGeneration !== generation
            || !eligible
            || !isBoonModifierActive('perfect_week')
          ) return;
        // КРИТИЧНО: фиксируем claim СРАЗУ при решении показать сундук, ДО рендера модалки.
        // Раньше отметка «забрано» писалась только по тапу/закрытию — если юзер быстро
        // сворачивал/выгружал приложение, запись не успевала, и на холодном старте тот же
        // (уже фактически полученный) сундук всплывал снова, путая юзера «есть ещё награда».
        // Награда идемпотентна (grantedRef), повторный onClaim из модалки её не задвоит.
          await claim();
          if (
            alive
            && currentGeneration === generation
            && isBoonModifierActive('perfect_week')
          ) {
            setWantShow(true);
          } else if (alive && currentGeneration === generation) {
            setWantShow(false);
          }
        })
        .catch(() => {});
    };

    refresh();
    const remoteConfigSub = onAppEvent('remote_config_changed', refresh);
    return () => {
      alive = false;
      generation += 1;
      remoteConfigSub.remove();
    };
  }, [claim]);

  if (!visible) return null;

  const title = L(
    'Идеальная неделя', 'Ідеальний тиждень', 'Semana perfecta', 'Semana perfeita',
    'Tuần hoàn hảo', 'Minggu sempurna', 'Kusursuz hafta', 'Idealny tydzień',
  );
  // зачем (владелец, 2026-08-26): наградой были жемчужины — заменены на спины
  // общей рулетки, как во всех остальных сундуках. Число склоняем.
  const pwSpins = Math.max(1, Math.floor(Number(PERFECT_WEEK_REWARD.spins) || 1));
  const pwOne = pwSpins % 10 === 1 && pwSpins % 100 !== 11;
  const pwFew = pwSpins % 10 >= 2 && pwSpins % 10 <= 4 && (pwSpins % 100 < 12 || pwSpins % 100 > 14);
  const pwRuSpin = pwOne ? 'спин' : pwFew ? 'спина' : 'спинов';
  const pwUkSpin = pwOne ? 'спін' : pwFew ? 'спіни' : 'спінів';
  const rewardLine = L(
    `Награда за неделю — ${pwSpins} ${pwRuSpin} начислено`,
    `Нагорода за тиждень — ${pwSpins} ${pwUkSpin} зараховано`,
    `Recompensa de la semana: ${pwSpins} ${pwSpins === 1 ? 'giro añadido' : 'giros añadidos'}`,
    `Recompensa da semana: ${pwSpins} ${pwSpins === 1 ? 'giro creditado' : 'giros creditados'}`,
    `Phần thưởng tuần — đã cộng ${pwSpins} lượt quay`,
    `Hadiah mingguan — ${pwSpins} putaran ditambahkan`,
    `Haftalık ödül — ${pwSpins} çevirme eklendi`,
    `Nagroda za tydzień — dodano ${pwSpins} ${pwSpins === 1 ? 'spin' : 'spinów'}`,
  );
  const tapHint = L(
    'Нажми, чтобы открыть', 'Натисни, щоб відкрити', 'Toca para abrir', 'Toque para abrir',
    'Nhấn để mở', 'Ketuk untuk membuka', 'Açmak için dokun', 'Dotknij, aby otworzyć',
  );
  const claimCta = L('Забрать', 'Забрати', 'Recoger', 'Pegar', 'Nhận', 'Ambil', 'Al', 'Odbierz');
  const closeLabel = L('Закрыть', 'Закрити', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij');

  return (
    <BoonChestModal
      visible={visible}
      rarity="epic"
      title={title}
      rewardLine={rewardLine}
      rewardArt="spin"
      tapHint={tapHint}
      claimCta={claimCta}
      closeLabel={closeLabel}
      onClaim={() => { void claim(); }}
      onClose={() => setWantShow(false)}
    />
  );
}
