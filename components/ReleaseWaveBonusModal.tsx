// Модалка разового бонуса осколков за волну релиза (см. config RELEASE_WAVE_BONUS_VERSION).
// С 2026-06 — на едином стандарте RewardCardV2 (docs/reports/MODALS_TOASTS_AUDIT_2026-06-10.md).
import React, { memo, useState } from 'react';
import { Image } from 'expo-image';
import { useLang } from './LangContext';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import {
  getReleaseWaveBonusLabelAmount,
  claimReleaseWaveBonus,
  persistNativeBuildIdAfterReleaseWaveFlow,
} from '../app/release_wave_bonus';
import { oskolokImageForPackShards } from '../app/oskolok';
import RewardCardV2 from './reward_v2/RewardCardV2';

const TEXTS = {
  ru: {
    kicker: 'Бонус обновления',
    value: 'Спасибо, что ты с нами! Подарок за свежий релиз.',
    title: (n: number) => `+${n} осколков знаний`,
    cta: 'Забрать',
    ctaPreview: 'Закрыть',
  },
  uk: {
    kicker: 'Бонус оновлення',
    value: 'Дякуємо, що ти з нами! Подарунок за свіжий реліз.',
    title: (n: number) => `+${n} осколків знань`,
    cta: 'Забрати',
    ctaPreview: 'Закрити',
  },
  es: {
    kicker: 'Bono de actualización',
    value: '¡Gracias por estar con nosotros! Un regalo por la nueva versión.',
    title: (n: number) => `+${n} fragmentos`,
    cta: 'Reclamar',
    ctaPreview: 'Cerrar',
  },
  'pt-BR': {
    kicker: 'Bônus de atualização',
    value: 'Obrigado por estar conosco! Um presente pela nova versão.',
    title: (n: number) => `+${n} fragmentos`,
    cta: 'Resgatar',
    ctaPreview: 'Fechar',
  },
  vi: {
    kicker: 'Thưởng cập nhật',
    value: 'Cảm ơn bạn đã đồng hành! Món quà cho bản cập nhật mới.',
    title: (n: number) => `+${n} mảnh kiến thức`,
    cta: 'Nhận',
    ctaPreview: 'Đóng',
  },
  id: {
    kicker: 'Bonus pembaruan',
    value: 'Terima kasih sudah bersama kami! Hadiah untuk versi baru.',
    title: (n: number) => `+${n} shard pengetahuan`,
    cta: 'Ambil',
    ctaPreview: 'Tutup',
  },
  tr: {
    kicker: 'Güncelleme bonusu',
    value: 'Bizimle olduğun için teşekkürler! Yeni sürüm hediyesi.',
    title: (n: number) => `+${n} bilgi parçası`,
    cta: 'Al',
    ctaPreview: 'Kapat',
  },
  pl: {
    kicker: 'Bonus za aktualizację',
    value: 'Dzięki, że jesteś z nami! Prezent za nową wersję.',
    title: (n: number) => `+${n} odłamków wiedzy`,
    cta: 'Odbierz',
    ctaPreview: 'Zamknij',
  },
} as const;

const pickReleaseWaveText = (lang: string) => TEXTS[lang as keyof typeof TEXTS] ?? TEXTS.ru;

type Props = {
  visible: boolean;
  onClose: () => void;
  previewMode?: boolean;
};

function ReleaseWaveBonusModal({ visible, onClose, previewMode = false }: Props) {
  const { lang } = useLang();
  const tx = pickReleaseWaveText(lang);
  const [busy, setBusy] = useState(false);
  const amount = getReleaseWaveBonusLabelAmount();
  const oskolokImage = oskolokImageForPackShards(amount);

  /**
   * Клейм идемпотентен. Кнопка «Забрать» — не закрываем при сбое сети (можно тапнуть снова).
   * Тап по фону / back — пробуем клейм и закрываем; flow_closed и persist build пишем
   * только после успешного клейма, иначе при следующем запуске модалка снова предложится.
   */
  const runClaim = async (closeAlways: boolean) => {
    hapticTap();
    if (previewMode) {
      onClose();
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const ok = await claimReleaseWaveBonus();
      if (ok) hapticSuccess();
      if (ok) {
        // Ждём persist до onClose: иначе при быстром сворачивании/убийстве процесса
        // flow_closed в AsyncStorage не успевает записаться — модалка снова на следующем дне.
        await persistNativeBuildIdAfterReleaseWaveFlow();
        onClose();
      } else if (closeAlways) {
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <RewardCardV2
      visible={visible}
      semantic="shards"
      kicker={tx.kicker}
      icon={<Image source={oskolokImage} style={{ width: 64, height: 64 }} contentFit="contain" />}
      title={tx.title(amount)}
      value={tx.value}
      ctaLabel={previewMode ? tx.ctaPreview : tx.cta}
      onCta={() => void runClaim(false)}
      /** Тап по фону и системный back = клейм + закрыть в любом случае (ghost-кнопка не рендерится без ghostLabel). */
      backdropAction="ghost"
      onGhost={() => void runClaim(true)}
    />
  );
}

export default memo(ReleaseWaveBonusModal);
