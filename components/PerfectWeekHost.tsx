/**
 * PerfectWeekHost — модал «Идеальная неделя» (Weekly Boon модификатор perfect_week).
 *
 * Когда все 7 дней недели закрыты (week_days_done) и приз ещё не выдан — крупная
 * награда осколками, раз в неделю. Это самый ценный недельный приз → золотой сундук
 * (общий BoonChestModal). Монтируется из _layout.tsx внутри OverlayArbiterProvider;
 * видимость через useOverlayVisible('perfectWeekReward', …).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { useOverlayVisible } from './OverlayArbiter';
import { triLang, type Lang } from '../constants/i18n';
import { grantBoonReward } from '../app/boons/boon_rewards';
import {
  checkPerfectWeekEligible,
  markPerfectWeekClaimed,
  PERFECT_WEEK_REWARD,
} from '../app/boons/perfect_week';
import { getThemedShardIcon } from '../constants/levelGiftRewardIcons';
import {
  ruKnowledgeShardsAfterNumber,
  ukKnowledgeShardsAfterNumber,
} from '../constants/shard_plurals';
import BoonChestModal from './BoonChestModal';

function makeL(lang: Lang) {
  return (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

export default function PerfectWeekHost() {
  const { themeMode } = useTheme();
  const { lang } = useLang();
  const L = makeL(lang as Lang);

  const [wantShow, setWantShow] = useState(false);
  const grantedRef = useRef(false);
  const visible = useOverlayVisible('perfectWeekReward', wantShow);

  // Начислить награду и ПОМЕТИТЬ неделю забранной — единожды (in-memory гард). Порядок
  // важен: сначала фиксируем claimed (анти-повтор), потом начисляем осколки (best-effort).
  // Если grant упадёт — повторного показа всё равно не будет, награда не задвоится.
  const claim = useCallback(async () => {
    if (grantedRef.current) return;
    grantedRef.current = true;
    await markPerfectWeekClaimed();
    await grantBoonReward(PERFECT_WEEK_REWARD, 'boon_perfect_week');
  }, []);

  useEffect(() => {
    let alive = true;
    checkPerfectWeekEligible()
      .then(async (eligible) => {
        if (!alive || !eligible) return;
        // КРИТИЧНО: фиксируем claim СРАЗУ при решении показать сундук, ДО рендера модалки.
        // Раньше отметка «забрано» писалась только по тапу/закрытию — если юзер быстро
        // сворачивал/выгружал приложение, запись не успевала, и на холодном старте тот же
        // (уже фактически полученный) сундук всплывал снова, путая юзера «есть ещё награда».
        // Награда идемпотентна (grantedRef), повторный onClaim из модалки её не задвоит.
        await claim();
        if (alive) setWantShow(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [claim]);

  if (!visible) return null;

  const title = L(
    'Идеальная неделя', 'Ідеальний тиждень', 'Semana perfecta', 'Semana perfeita',
    'Tuần hoàn hảo', 'Minggu sempurna', 'Kusursuz hafta', 'Idealny tydzień',
  );
  // зачем: склоняем слово по числу (было жёсткое «жемчужин» → «1 жемчужин»).
  // UK-строка раньше использовала русское слово вместо «перлина/перлин».
  const rewardLine = L(
    `Награда за неделю — ${PERFECT_WEEK_REWARD.shards} ${ruKnowledgeShardsAfterNumber(PERFECT_WEEK_REWARD.shards)} начислено`,
    `Нагорода за тиждень — ${PERFECT_WEEK_REWARD.shards} ${ukKnowledgeShardsAfterNumber(PERFECT_WEEK_REWARD.shards)} зараховано`,
    `Recompensa de la semana: ${PERFECT_WEEK_REWARD.shards} perlas añadidos`,
    `Recompensa da semana: ${PERFECT_WEEK_REWARD.shards} perlas creditados`,
    `Phần thưởng tuần — đã cộng ${PERFECT_WEEK_REWARD.shards} mảnh`,
    `Hadiah mingguan — ${PERFECT_WEEK_REWARD.shards} serpihan ditambahkan`,
    `Haftalık ödül — ${PERFECT_WEEK_REWARD.shards} parça eklendi`,
    `Nagroda za tydzień — dodano ${PERFECT_WEEK_REWARD.shards} monet`,
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
      rewardIcon={getThemedShardIcon(themeMode)}
      title={title}
      rewardLine={rewardLine}
      tapHint={tapHint}
      claimCta={claimCta}
      closeLabel={closeLabel}
      onClaim={() => { void claim(); }}
      onClose={() => setWantShow(false)}
    />
  );
}
