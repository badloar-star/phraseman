/**
 * ThroneRewardModal — награда за удержание трона в Арене.
 * Мигрировано на RewardCardV2 (стандарт 2026-06-10).
 *
 * История: 420 строк с 7 анимационными нитями и хардкодом rgba(0,0,0,0.88).
 * Теперь — единая анатомия, тема-aware, 60 строк.
 */
import React, { memo } from 'react';
import { Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { triLang } from '../constants/i18n';
import { monoIcon } from '../constants/monoIcon';
import { oskolokImageForPackShards } from '../app/oskolok';
import RewardCardV2 from './reward_v2/RewardCardV2';

interface ThroneRewardModalProps {
  visible: boolean;
  shards: number;
  wins: number;
  onClose: () => void;
}

function ThroneRewardModal({ visible, shards, wins, onClose }: ThroneRewardModalProps) {
  const { lang } = useLang();
  const { themeMode } = useTheme();

  const titleText = triLang(lang, {
    ru: 'Ты удержал трон!',
    uk: 'Ти втримав трон!',
    es: '¡Mantuviste el trono!',
    'pt-BR': 'Você manteve o trono!',
    vi: 'Bạn đã giữ được ngai!',
    id: 'Kamu mempertahankan takhta!',
    tr: 'Tahtı korudun!',
    pl: 'Utrzymałeś tron!',
  });

  const valueText = triLang(lang, {
    ru: `${wins} побед${wins === 1 ? 'а' : wins < 5 ? 'ы' : ''} сегодня — никто тебя не скинул`,
    uk: `${wins} перемог сьогодні — ніхто тебе не скинув`,
    es: `${wins} victorias hoy — nadie te destronó`,
    'pt-BR': `${wins} vitória${wins === 1 ? '' : 's'} hoje — ninguém tirou você do trono`,
    vi: `${wins} chiến thắng hôm nay — chưa ai hạ bạn khỏi ngai`,
    id: `${wins} kemenangan hari ini — belum ada yang menjatuhkanmu`,
    tr: `Bugün ${wins} galibiyet — kimse seni tahttan indirmedi`,
    pl: `Wygrane dzisiaj: ${wins} — nikt Cię nie zrzucił`,
  });

  const ctaText = triLang(lang, {
    ru: 'Забрать награду',
    uk: 'Забрати нагороду',
    es: 'Reclamar recompensa',
    'pt-BR': 'Resgatar recompensa',
    vi: 'Nhận thưởng',
    id: 'Klaim hadiah',
    tr: 'Ödülü al',
    pl: 'Odbierz nagrodę',
  });

  const shardsLabel = triLang(lang, {
    ru: 'ОСКОЛКОВ',
    uk: 'УЛАМКІВ',
    es: 'FRAGMENTOS',
    'pt-BR': 'FRAGMENTOS',
    vi: 'MẢNH',
    id: 'FRAGMEN',
    tr: 'PARÇA',
    pl: 'ODŁAMKI',
  });

  const icon = <Ionicons name="trophy" size={46} color={monoIcon(themeMode, '#FFE566')} />;

  return (
    <RewardCardV2
      visible={visible}
      semantic="gold"
      kicker={triLang(lang, {
        ru: 'Арена · Трон',
        uk: 'Арена · Трон',
        es: 'Arena · Trono',
        'pt-BR': 'Arena · Trono',
        vi: 'Đấu trường · Ngai',
        id: 'Arena · Takhta',
        tr: 'Arena · Taht',
        pl: 'Arena · Tron',
      })}
      icon={icon}
      title={titleText}
      value={valueText}
      reasonLabel={shardsLabel}
      reasonText={`+${shards}`}
      ctaLabel={ctaText}
      onCta={onClose}
      backdropAction="cta"
    />
  );
}

export default memo(ThroneRewardModal);
