// Секция QA-панели: единый список всех dev-лабораторий. До редизайна 2026-06
// celebration-лаба и anim-demo вообще не были доступны из панели.
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { AccordionSection, AdminHint, ButtonRow } from '../ui';
import CompassStackPreviewModal, { makeCompassStackPreviewSeed } from '../CompassStackPreviewModal';

interface Props {
  open: boolean;
  onToggle: (id: string) => void;
  /** Засев и запуск тест-бенча «Повтор: 7 карточек» (из хаба). */
  onOpenReviewBench: () => void;
}

export default function LabsSection({ open, onToggle, onOpenReviewBench }: Props) {
  const router = useRouter();
  const [compassStackPreviewSeed, setCompassStackPreviewSeed] = useState(() => makeCompassStackPreviewSeed());
  const [compassStackPreviewVisible, setCompassStackPreviewVisible] = useState(false);

  const openCompassStackPreview = () => {
    setCompassStackPreviewSeed(makeCompassStackPreviewSeed());
    setCompassStackPreviewVisible(true);
  };

  return (
    <>
      <AccordionSection
        id="labs_hub"
        icon="flask-outline"
        title="Лаборатории (все)"
        badge={11}
        open={open}
        onToggle={onToggle}
      >
        <AdminHint>Отдельные dev-экраны с изолированными превью.</AdminHint>
        <ButtonRow
          testID="admin-lab-day-closing-ritual"
          icon="moon-outline"
          label="Компас: итог дня"
          sub="Вечерний ритуал, free/premium-состояния и custom seed"
          onPress={() => router.push({ pathname: '/admin_compass_lab', params: { panel: 'day_closing' } } as any)}
        />
        <ButtonRow
          testID="admin-lab-compass-stack-open"
          icon="albums-outline"
          label="Компас: очередь событий"
          sub="Рандомный seed, пачка soft-модалок и свайп-стек с видимым краем следующей карточки"
          onPress={openCompassStackPreview}
        />
        <ButtonRow
          testID="admin-lab-speaking"
          icon="mic-outline"
          label="Speaking Lab"
          sub="8 статусов SpeakingPanel + пейвол context=speaking"
          onPress={() => router.push('/admin_speaking_lab' as any)}
        />
        <ButtonRow
          testID="admin-lab-referral"
          icon="people-outline"
          label="Referral Lab"
          sub="VIP за друзей: 3 варианта Activated + Ended"
          onPress={() => router.push('/admin_referral_lab' as any)}
        />
        <ButtonRow
          testID="admin-lab-premium-delivery"
          icon="cloud-done-outline"
          label="Premium Delivery Test"
          sub="E2E: VIP реально приходит с сервера и не утекает при смене аккаунта"
          onPress={() => router.push('/admin_premium_delivery_test' as any)}
        />
        <ButtonRow
          testID="admin-lab-celebration"
          icon="trophy-outline"
          label="Celebration Lab"
          sub="«Дорогой» экран завершения урока: трофей, конфетти, XP-каунтер"
          onPress={() => router.push('/admin_celebration_lab' as any)}
        />
        <ButtonRow
          testID="admin-lab-anim-demo"
          icon="color-wand-outline"
          label="Anim Demo Lab"
          sub="Возможности стека: FLIP, SHINE, BURST, Duolingo-кнопка"
          onPress={() => router.push('/anim_demo_lab' as any)}
        />
        <ButtonRow
          testID="admin-lab-review-bench"
          icon="refresh-outline"
          label="Повтор: 7 тестовых карточек"
          sub="Сид урока 99 и экран «Повторение»"
          onPress={onOpenReviewBench}
        />
      </AccordionSection>
      <CompassStackPreviewModal
        visible={compassStackPreviewVisible}
        seed={compassStackPreviewSeed}
        onClose={() => setCompassStackPreviewVisible(false)}
        onReroll={() => setCompassStackPreviewSeed(makeCompassStackPreviewSeed())}
      />
    </>
  );
}
