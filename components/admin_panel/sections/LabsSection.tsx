// Секция QA-панели: единый список всех dev-лабораторий. До редизайна 2026-06
// celebration-лаба и anim-demo вообще не были доступны из панели.
import React from 'react';
import { useRouter } from 'expo-router';
import { AccordionSection, AdminHint, ButtonRow } from '../ui';

interface Props {
  open: boolean;
  onToggle: (id: string) => void;
  /** Засев и запуск тест-бенча «Повтор: 7 карточек» (из хаба). */
  onOpenReviewBench: () => void;
}

export default function LabsSection({ open, onToggle, onOpenReviewBench }: Props) {
  const router = useRouter();
  return (
    <AccordionSection
      id="labs_hub"
      icon="flask-outline"
      title="Лаборатории (все)"
      badge={7}
      open={open}
      onToggle={onToggle}
    >
      <AdminHint>Отдельные dev-экраны с изолированными превью.</AdminHint>
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
        testID="admin-lab-intro-preview"
        icon="book-outline"
        label="Intro Preview"
        sub="Онбординг-экраны уроков 1–32, сброс intro-флагов"
        onPress={() => router.push('/admin_intro_preview' as any)}
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
  );
}
